const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const Stripe = require("stripe");

admin.initializeApp();

const db = admin.firestore();

// Firebase Secrets. Hodnoty sa citaju az vo vnutri funkcii cez .value().
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");
const FRONTEND_SUCCESS_URL = defineSecret("FRONTEND_SUCCESS_URL");
const FRONTEND_CANCEL_URL = defineSecret("FRONTEND_CANCEL_URL");

// Nastavi zakladne CORS hlavicky pre volanie zo statickeho frontendu.
function setCorsHeaders(response) {
  response.set("Access-Control-Allow-Origin", "*");
  response.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.set("Access-Control-Allow-Headers", "Content-Type");
}

// Vrati chybu, ak este nie je nastavena skutocna konfiguracia.
function assertStripeConfig(config) {
  const missingValues = [];

  if (!config.stripeSecretKey || config.stripeSecretKey === "STRIPE_SECRET_KEY") missingValues.push("STRIPE_SECRET_KEY");
  if (!config.frontendSuccessUrl || config.frontendSuccessUrl === "FRONTEND_SUCCESS_URL") missingValues.push("FRONTEND_SUCCESS_URL");
  if (!config.frontendCancelUrl || config.frontendCancelUrl === "FRONTEND_CANCEL_URL") missingValues.push("FRONTEND_CANCEL_URL");

  if (missingValues.length) {
    throw new Error("Chyba konfiguracia: " + missingValues.join(", "));
  }
}

// Vytvori Stripe klienta zo secretu dostupneho iba v backend funkcii.
function createStripeClient(stripeSecretKey) {
  return new Stripe(stripeSecretKey);
}

// Prevedie sumu objednavky na najmensiu jednotku meny pre Stripe.
function toStripeAmount(total) {
  return Math.round(Number(total) * 100);
}

// Overi, ci je zlavovy kod stale pouzitelny pre ulozenu objednavku.
function validateDiscountForOrder(discount, order) {
  if (!discount || discount.active !== true) {
    return "Zlavovy kod nie je platny.";
  }

  if (!["percent", "fixed", "shipping"].includes(discount.type)) {
    return "Zlavovy kod ma nepodporovany typ.";
  }

  if (!Number.isFinite(Number(discount.value)) || Number(discount.value) <= 0) {
    return "Zlavovy kod nema platnu hodnotu.";
  }

  if (discount.usageLimit !== null && discount.usageLimit !== undefined && Number(discount.usedCount || 0) >= Number(discount.usageLimit)) {
    return "Zlavovy kod uz bol pouzity maximalny pocet krat.";
  }

  if (discount.minSubtotal !== null && discount.minSubtotal !== undefined && Number(order.booksSubtotal || 0) < Number(discount.minSubtotal)) {
    return "Na tento zlavovy kod je potrebna vyssia hodnota objednavky.";
  }

  return "";
}

// Vrati zoznam zlavovych kodov ulozenych v objednavke.
function getOrderDiscountCodes(order) {
  if (Array.isArray(order.discountCodes)) {
    return order.discountCodes.map(code => String(code).trim().toUpperCase()).filter(Boolean);
  }

  if (order.discountCode) {
    return String(order.discountCode)
      .split(/[\s,]+/)
      .map(code => code.trim().toUpperCase())
      .filter(Boolean);
  }

  return [];
}

// V transakcii zapocita pouzitie zlavoveho kodu presne raz.
async function countDiscountUsageInTransaction(transaction, orderRef, order) {
  const codes = [...new Set(getOrderDiscountCodes(order))];

  if (!codes.length) {
    return;
  }

  const countedCodes = Array.isArray(order.discountUsageCountedCodes)
    ? order.discountUsageCountedCodes.map(code => String(code).trim().toUpperCase())
    : [];

  const codesToCount = codes.filter(code => !countedCodes.includes(code));

  if (!codesToCount.length) {
    return;
  }

  const discountReads = [];
  let bookDiscountCount = 0;
  let shippingDiscountCount = 0;

  for (const code of codesToCount) {
    const discountRef = db.collection("discountCodes").doc(code);
    const discountSnap = await transaction.get(discountRef);

    if (!discountSnap.exists) {
      throw new Error("Zlavovy kod " + code + " neexistuje.");
    }

    const discount = discountSnap.data();
    const validationError = validateDiscountForOrder(discount, order);

    if (validationError) {
      throw new Error(code + ": " + validationError);
    }

    if (discount.type === "shipping") {
      shippingDiscountCount += 1;
    } else {
      bookDiscountCount += 1;
    }

    discountReads.push({ code, ref: discountRef, data: discount });
  }

  if (bookDiscountCount > 1) {
    throw new Error("Objednavka obsahuje viac ako jednu zlavu na knihy.");
  }

  if (shippingDiscountCount > 1) {
    throw new Error("Objednavka obsahuje viac ako jednu zlavu na dopravu.");
  }

  for (const item of discountReads) {
    transaction.set(item.ref, {
      usedCount: Number(item.data.usedCount || 0) + 1,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  transaction.set(orderRef, {
    discountUsageCounted: true,
    discountUsageCountedAt: admin.firestore.FieldValue.serverTimestamp(),
    discountUsageCountedCodes: admin.firestore.FieldValue.arrayUnion(...codesToCount)
  }, { merge: true });
}

// Bezpecne nacita objednavku z Firestore podla cisla objednavky.
async function loadOrder(orderNumber) {
  const orderRef = db.collection("orders").doc(orderNumber);
  const orderSnap = await orderRef.get();

  if (!orderSnap.exists) {
    throw new Error("Objednavka neexistuje.");
  }

  return {
    ref: orderRef,
    data: orderSnap.data()
  };
}

// Vytvori Stripe Checkout Session pre existujucu objednavku.
exports.createCheckoutSession = onRequest({
  secrets: [STRIPE_SECRET_KEY, FRONTEND_SUCCESS_URL, FRONTEND_CANCEL_URL]
}, async (request, response) => {
  setCorsHeaders(response);

  if (request.method === "OPTIONS") {
    response.status(204).send("");
    return;
  }

  if (request.method !== "POST") {
    response.status(405).json({ error: "Pouzi POST poziadavku." });
    return;
  }

  try {
    const config = {
      stripeSecretKey: STRIPE_SECRET_KEY.value(),
      frontendSuccessUrl: FRONTEND_SUCCESS_URL.value(),
      frontendCancelUrl: FRONTEND_CANCEL_URL.value()
    };
    assertStripeConfig(config);
    const stripe = createStripeClient(config.stripeSecretKey);

    const { orderNumber } = request.body || {};

    if (!orderNumber) {
      response.status(400).json({ error: "Chyba orderNumber." });
      return;
    }

    const { data: order } = await loadOrder(orderNumber);
    const total = Number(order.total);
    const currency = String(order.currency || "EUR").toLowerCase();

    if (!Number.isFinite(total) || total <= 0) {
      response.status(400).json({ error: "Objednavka nema platnu sumu." });
      return;
    }

    if (order.paymentStatus === "paid" || order.paid === true) {
      response.status(400).json({ error: "Objednavka je uz zaplatena." });
      return;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: order.email,
      mode: "payment",
      client_reference_id: orderNumber,
      metadata: {
        orderNumber: orderNumber
      },
      payment_intent_data: {
        metadata: {
          orderNumber: orderNumber
        }
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: currency,
            unit_amount: toStripeAmount(total),
            product_data: {
              name: "Objednavka " + orderNumber,
              description: order.itemSummary || "Knihy Miroslav Vanco Studio"
            }
          }
        }
      ],
      success_url: config.frontendSuccessUrl + "?orderNumber=" + encodeURIComponent(orderNumber),
      cancel_url: config.frontendCancelUrl + "?orderNumber=" + encodeURIComponent(orderNumber)
    });

    response.json({
      checkoutUrl: session.url,
      sessionId: session.id
    });
  } catch (error) {
    logger.error(error);
    response.status(500).json({ error: error.message || "Stripe Checkout Session sa nepodarilo vytvorit." });
  }
});

// Započíta použitie zľavového kódu pre QR/bankovú platbu po vytvorení objednávky.
exports.countDiscountUsage = onRequest(async (request, response) => {
  setCorsHeaders(response);

  if (request.method === "OPTIONS") {
    response.status(204).send("");
    return;
  }

  if (request.method !== "POST") {
    response.status(405).json({ error: "Pouzi POST poziadavku." });
    return;
  }

  try {
    const { orderNumber, email } = request.body || {};

    if (!orderNumber || !email) {
      response.status(400).json({ error: "Chyba orderNumber alebo email." });
      return;
    }

    await db.runTransaction(async (transaction) => {
      const orderRef = db.collection("orders").doc(orderNumber);
      const orderSnap = await transaction.get(orderRef);

      if (!orderSnap.exists) {
        throw new Error("Objednavka neexistuje.");
      }

      const order = orderSnap.data();

      if (order.paymentMethod !== "bank") {
        throw new Error("Pouzitie zlavoveho kodu cez tuto funkciu je povolene iba pre QR/bankovu platbu.");
      }

      if (String(order.email || "").trim() !== String(email || "").trim()) {
        throw new Error("Email objednavky nesedi.");
      }

      await countDiscountUsageInTransaction(transaction, orderRef, order);
    });

    response.json({ counted: true });
  } catch (error) {
    logger.error(error);
    response.status(500).json({ error: error.message || "Pouzitie zlavoveho kodu sa nepodarilo zapocitat." });
  }
});

// Spracuje Stripe webhook a oznaci objednavku ako zaplatenu kartou.
exports.stripeWebhook = onRequest({
  secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET]
}, async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).send("Pouzi POST poziadavku.");
    return;
  }

  const stripeSecretKey = STRIPE_SECRET_KEY.value();
  const stripeWebhookSecret = STRIPE_WEBHOOK_SECRET.value();

  if (!stripeSecretKey || stripeSecretKey === "STRIPE_SECRET_KEY" || !stripeWebhookSecret || stripeWebhookSecret === "STRIPE_WEBHOOK_SECRET") {
    response.status(500).send("Chyba Stripe konfiguracia.");
    return;
  }

  const stripe = createStripeClient(stripeSecretKey);
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      request.rawBody,
      request.headers["stripe-signature"],
      stripeWebhookSecret
    );
  } catch (error) {
    logger.error("Neplatny Stripe webhook podpis.", error);
    response.status(400).send("Webhook podpis nie je platny.");
    return;
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const orderNumber = session.metadata && session.metadata.orderNumber;

      if (!orderNumber) {
        throw new Error("Webhook neobsahuje orderNumber.");
      }

      await db.runTransaction(async (transaction) => {
        const orderRef = db.collection("orders").doc(orderNumber);
        const orderSnap = await transaction.get(orderRef);

        if (!orderSnap.exists) {
          throw new Error("Objednavka neexistuje.");
        }

        const order = orderSnap.data();

        await countDiscountUsageInTransaction(transaction, orderRef, order);

        transaction.set(orderRef, {
          paymentStatus: "paid",
          paymentMethod: "card",
          paid: true,
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
          stripeSessionId: session.id,
          stripePaymentIntentId: session.payment_intent || "",
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      });
    }

    response.json({ received: true });
  } catch (error) {
    logger.error(error);
    response.status(500).send(error.message || "Webhook sa nepodarilo spracovat.");
  }
});
