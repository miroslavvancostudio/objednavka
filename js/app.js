
// Zobrazenie výsledku platby po návrate zo Stripe
setTimeout(() => {
  const params = new URLSearchParams(window.location.search);
  const payment = params.get("payment");
  const orderNumber = params.get("orderNumber");

  if (!payment) return;

  const card = document.querySelector(".card");
  if (!card) return;

  if (payment && payment.startsWith("success")) {
    card.innerHTML = `
      <h1>✅ Ďakujeme za Vašu objednávku!</h1>
      <p><strong>Platba bola úspešne prijatá.</strong></p>
      <p>Objednávka${orderNumber ? " č. <strong>" + orderNumber + "</strong>" : ""} bola zaevidovaná.</p>
      <p>Vašu zásielku pripravíme na odoslanie. Po odoslaní Vám pošleme ďalšie informácie o doručení.</p>
      <p>V prípade otázok nás kontaktujte na:</p>
      <p><strong>mv.studio.slovakia@gmail.com</strong></p>
      <p style="margin-top:24px;">
        <a href="index.html" style="display:inline-block;padding:12px 18px;background:#111;color:#fff;text-decoration:none;border-radius:8px;">Objednať ďalšie knihy</a>
      </p>
    `;
  }

  if (payment && payment.startsWith("cancel")) {
    card.innerHTML = `
      <h1>Platba bola zrušená</h1>
      <p>Objednávka nebola dokončená, pretože platba neprebehla.</p>
      <p>Môžete sa vrátiť späť a objednávku skúsiť znova.</p>
      <p style="margin-top:24px;">
        <a href="index.html" style="display:inline-block;padding:12px 18px;background:#111;color:#fff;text-decoration:none;border-radius:8px;">Späť na objednávku</a>
      </p>
    `;
  }
}, 0);

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  addDoc,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  CurrencyCode,
  encode,
  PaymentOptions
} from "https://esm.sh/bysquare@4.0.0/pay";

// Firebase zostáva napojený na pôvodný projekt.
const firebaseConfig = {
  apiKey: "AIzaSyARD41YMYeLj4oaczhdK5yPNxoL4JHU7_M",
  authDomain: "mvstudio-orders.firebaseapp.com",
  projectId: "mvstudio-orders",
  storageBucket: "mvstudio-orders.firebasestorage.app",
  messagingSenderId: "816393925153",
  appId: "1:816393925153:web:a20a3f89201f36d1afa960"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// Packeta zostáva napojená cez pôvodný API kľúč.
const PACKETA_API_KEY = "6a29cb20b2ac689f";
const STRIPE_CHECKOUT_FUNCTION_URL = "https://us-central1-mvstudio-orders.cloudfunctions.net/createCheckoutSession";
const COUNT_DISCOUNT_USAGE_FUNCTION_URL = "https://us-central1-mvstudio-orders.cloudfunctions.net/countDiscountUsage";

const priceSettings = {
  EUR: {
    bookPrice: 19.90,
    pickup: 4,
    home: 5,
    symbol: "€",
    currency: "EUR",
    ibanDisplay: "SK56 5600 0000 0010 0869 8006",
    ibanRaw: "SK5656000000001008698006",
    recipient: "Miroslav Vančo",
    accountNote: ""
  },
  CZK: {
    bookPrice: 499,
    pickup: 125,
    home: 150,
    symbol: "Kč",
    currency: "CZK",
    ibanDisplay: "CZ12 2010 0000 0027 0007 4413",
    ibanRaw: "CZ1220100000002700074413",
    recipient: "Miroslav Vančo",
    accountNote: "Číslo účtu: <strong>2700074413 / 2010</strong><br>"
  }
};

let lastOrderNumber = "";
let appliedDiscounts = [];

function currentCurrency() {
  return document.getElementById("currency").value;
}

function currentSettings() {
  return priceSettings[currentCurrency()];
}

function money(value) {
  const settings = currentSettings();
  if (settings.currency === "EUR") {
    return value.toFixed(2).replace(".", ",") + " €";
  }
  return Math.round(value) + " Kč";
}

function removeDiacritics(text) {
  const extraMap = {
    "ľ": "l", "ĺ": "l", "ŕ": "r", "ť": "t", "ď": "d", "ň": "n", "š": "s", "č": "c", "ž": "z", "ý": "y", "á": "a", "í": "i", "é": "e", "ú": "u", "ä": "a", "ô": "o", "ö": "o", "ü": "u",
    "Ľ": "L", "Ĺ": "L", "Ŕ": "R", "Ť": "T", "Ď": "D", "Ň": "N", "Š": "S", "Č": "C", "Ž": "Z", "Ý": "Y", "Á": "A", "Í": "I", "É": "E", "Ú": "U", "Ä": "A", "Ô": "O", "Ö": "O", "Ü": "U"
  };

  return text
    .split("").map(char => extraMap[char] || char).join("")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getPaymentMessage() {
  const name = document.getElementById("name").value || "";
  const cleanName = removeDiacritics(name);
  return cleanName ? "kniha: " + cleanName : "kniha:";
}

async function generateOrderNumber() {
  const year = new Date().getFullYear();
  const counterRef = doc(db, "counters", "orders-" + year);

  return await runTransaction(db, async (transaction) => {
    const counterSnap = await transaction.get(counterRef);
    let nextNumber = 1;

    if (counterSnap.exists()) {
      nextNumber = (counterSnap.data().lastNumber || 0) + 1;
    }

    transaction.set(counterRef, {
      year: year,
      lastNumber: nextNumber,
      updatedAt: serverTimestamp()
    }, { merge: true });

    return String(year) + String(nextNumber).padStart(6, "0");
  });
}

function quantityFromInput(id) {
  const field = document.getElementById(id);
  const value = Math.max(0, parseInt(field.value, 10) || 0);
  field.value = value;
  return value;
}

function getItemQuantities() {
  return {
    sk: quantityFromInput("qtySk"),
    en: quantityFromInput("qtyEn")
  };
}

function getOrderItems() {
  const q = getItemQuantities();
  const allItems = [
    {
      productId: "putin",
      productName: "PUTIN - Zbožňovaný. Nenávidený.",
      languageCode: "sk",
      language: "Slovenčina",
      format: "paperback",
      quantity: q.sk
    },
    {
      productId: "putin",
      productName: "PUTIN - Adored. Hated.",
      languageCode: "en",
      language: "English",
      format: "paperback",
      quantity: q.en
    }
  ];

  return allItems.filter(item => item.quantity > 0);
}

function getQuantity() {
  const q = getItemQuantities();
  return q.sk + q.en;
}

function getItemsSummaryText() {
  const items = getOrderItems();
  if (!items.length) return "Nie je vybraná žiadna kniha.";
  return items.map(item => item.language + ": " + item.quantity + " ks").join("<br>");
}

function getItemsSummaryPlain() {
  const items = getOrderItems();
  if (!items.length) return "-";
  return items.map(item => "- " + item.language + ": " + item.quantity + " ks").join("\n");
}

function getItemsSummaryHtml() {
  const items = getOrderItems();
  if (!items.length) return "<p>-</p>";
  return "<ul>" + items.map(item => "<li>" + item.productName + " - " + item.language + ": <strong>" + item.quantity + " ks</strong></li>").join("") + "</ul>";
}

function getUnitBookPrice() {
  const quantity = getQuantity();
  const currency = currentCurrency();
  const settings = currentSettings();

  if (quantity < 1) return settings.bookPrice;

  const tiers = {
    EUR: [
      { min: 50, price: 14.90 },
      { min: 40, price: 15.90 },
      { min: 30, price: 16.90 },
      { min: 20, price: 17.90 },
      { min: 10, price: 18.90 },
      { min: 1, price: 19.90 }
    ],
    CZK: [
      { min: 50, price: 375 },
      { min: 40, price: 399 },
      { min: 30, price: 425 },
      { min: 20, price: 449 },
      { min: 10, price: 475 },
      { min: 1, price: 499 }
    ]
  };

  return tiers[currency].find(tier => quantity >= tier.min).price;
}

function getShippingPrice() {
  const settings = currentSettings();
  const quantity = getQuantity();
  const shipping = document.getElementById("shipping").value;

  if (quantity < 1) return 0;
  if (quantity >= 5) return 0;

  return shipping === "pickup" ? settings.pickup : settings.home;
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function getBooksSubtotalNumber() {
  const quantity = getQuantity();
  if (quantity < 1) return 0;
  return getUnitBookPrice() * quantity;
}

function getBookDiscount() {
  const booksSubtotal = getBooksSubtotalNumber();
  const discount = appliedDiscounts.find(item => item.type === "percent" || item.type === "fixed");

  if (!discount) {
    return { amount: 0, discount: null };
  }

  if (discount.type === "percent") {
    return { amount: roundMoney(booksSubtotal * (Number(discount.value) / 100)), discount };
  }

  return { amount: roundMoney(Math.min(Number(discount.value), booksSubtotal)), discount };
}

function getShippingDiscount() {
  const shippingPrice = getShippingPrice();
  const discount = appliedDiscounts.find(item => item.type === "shipping");

  if (!discount) {
    return { amount: 0, discount: null };
  }

  return { amount: roundMoney(shippingPrice * (Number(discount.value) / 100)), discount };
}

function getDiscountAmount() {
  return roundMoney(getBookDiscount().amount + getShippingDiscount().amount);
}

function getDiscountedBooksSubtotalNumber() {
  return Math.max(0, roundMoney(getBooksSubtotalNumber() - getBookDiscount().amount));
}

function getDiscountedShippingPrice() {
  return Math.max(0, roundMoney(getShippingPrice() - getShippingDiscount().amount));
}

function getTotalNumber() {
  return roundMoney(getDiscountedBooksSubtotalNumber() + getDiscountedShippingPrice());
}

function getDiscountText() {
  const settings = currentSettings();
  const quantity = getQuantity();

  if (quantity < 1) return "vyberte aspoň jednu knihu";

  const unitPrice = getUnitBookPrice();
  const parts = [];

  if (unitPrice < settings.bookPrice) {
    parts.push("množstevná cena " + money(unitPrice) + " / ks");
  }

  if (quantity >= 5) {
    parts.push("doprava zdarma");
  }

  return parts.length ? parts.join(" + ") : "bez zľavy";
}

function getAppliedDiscountText() {
  if (!appliedDiscounts.length) return "-";

  const parts = [];
  const bookDiscount = getBookDiscount();
  const shippingDiscount = getShippingDiscount();

  if (bookDiscount.discount) {
    parts.push("Zľava na knihy " + getDiscountDisplayName(bookDiscount.discount) + ": -" + money(bookDiscount.amount));
  }

  if (shippingDiscount.discount) {
    parts.push("Zľava na dopravu " + getDiscountDisplayName(shippingDiscount.discount) + ": -" + money(shippingDiscount.amount));
  }

  return parts.join(" + ");
}

function getDiscountDisplayName(discount) {
  return discount.title || discount.code;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getDiscountBreakdownHtml() {
  if (!appliedDiscounts.length) return "";

  const rows = [];
  const bookDiscount = getBookDiscount();
  const shippingDiscount = getShippingDiscount();

  if (bookDiscount.discount) {
    rows.push({
      type: "📚 Zľava na knihu",
      name: getDiscountDisplayName(bookDiscount.discount),
      amount: bookDiscount.amount
    });
  }

  if (shippingDiscount.discount) {
    rows.push({
      type: "🚚 Doprava zdarma",
      name: getDiscountDisplayName(shippingDiscount.discount),
      amount: shippingDiscount.amount
    });
  }

  return `
    <div class="discount-breakdown-title">Použité zľavy</div>
    ${rows.map(row => `
      <div class="discount-row">
        <div class="discount-row-type">${escapeHtml(row.type)}</div>
        <div class="discount-row-line">
          <span class="discount-row-name">✓ ${escapeHtml(row.name)}</span>
          <span class="discount-row-amount">-${money(row.amount)}</span>
        </div>
      </div>
    `).join("")}
  `;
}

function showDiscountMessage(message, type) {
  const box = document.getElementById("discountMessage");
  box.textContent = message;
  box.className = "discount-message show " + type;
}

function hideDiscountMessage() {
  const box = document.getElementById("discountMessage");
  box.textContent = "";
  box.className = "discount-message";
}

async function loadDiscountCode(code) {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) return null;

  const snap = await getDoc(doc(db, "discountCodes", cleanCode));
  if (!snap.exists()) return null;

  return {
    code: cleanCode,
    ...snap.data()
  };
}

function parseDiscountCodes(value) {
  return value
    .split(/[\s,]+/)
    .map(code => code.trim().toUpperCase())
    .filter(Boolean);
}

function validateDiscountCode(discount) {
  if (!discount || discount.active !== true) {
    return "Zľavový kód nie je platný.";
  }

  if (!["percent", "fixed", "shipping"].includes(discount.type)) {
    return "Zľavový kód má nepodporovaný typ.";
  }

  if (!Number.isFinite(Number(discount.value)) || Number(discount.value) <= 0) {
    return "Zľavový kód nemá platnú hodnotu.";
  }

  if (discount.usageLimit !== null && discount.usageLimit !== undefined && Number(discount.usedCount || 0) >= Number(discount.usageLimit)) {
    return "Zľavový kód už bol použitý maximálny počet krát.";
  }

  if (discount.minSubtotal !== null && discount.minSubtotal !== undefined && getBooksSubtotalNumber() < Number(discount.minSubtotal)) {
    return "Na tento zľavový kód je potrebná vyššia hodnota objednávky.";
  }

  return "";
}

async function applyDiscountCode() {
  hideError();
  hideDiscountMessage();

  const input = document.getElementById("discountCode");
  const codes = [...new Set(parseDiscountCodes(input.value))];

  if (!codes.length) {
    appliedDiscounts = [];
    calculateTotal();
    showDiscountMessage("Zľavové kódy boli odstránené.", "success");
    return;
  }

  try {
    const discounts = [];

    for (const code of codes) {
      const discount = await loadDiscountCode(code);
      const validationError = validateDiscountCode(discount);

      if (validationError) {
        appliedDiscounts = [];
        calculateTotal();
        showDiscountMessage(code + ": " + validationError, "error");
        return;
      }

      discounts.push({
        code: discount.code,
        title: discount.title || "",
        type: discount.type,
        value: Number(discount.value),
        note: discount.note || "",
        usageLimit: discount.usageLimit ?? null,
        usedCount: Number(discount.usedCount || 0),
        minSubtotal: discount.minSubtotal ?? null
      });
    }

    if (discounts.filter(discount => discount.type === "percent" || discount.type === "fixed").length > 1) {
      appliedDiscounts = [];
      calculateTotal();
      showDiscountMessage("Môžete použiť maximálne jednu zľavu na knihy.", "error");
      return;
    }

    if (discounts.filter(discount => discount.type === "shipping").length > 1) {
      appliedDiscounts = [];
      calculateTotal();
      showDiscountMessage("Môžete použiť maximálne jednu zľavu na dopravu.", "error");
      return;
    }

    appliedDiscounts = discounts;

    calculateTotal();
    showDiscountMessage("Použité zľavy: " + appliedDiscounts.map(getDiscountDisplayName).join(", "), "success");
  } catch (error) {
    console.error(error);
    appliedDiscounts = [];
    calculateTotal();
    showDiscountMessage("Zľavové kódy sa nepodarilo overiť. Skontrolujte pripojenie alebo Firestore pravidlá.", "error");
  }
}

function updateSubmitButtonState() {
  const quantity = getQuantity();
  const submitButton = document.getElementById("submitButton");
  const warning = document.getElementById("itemsWarning");

  warning.classList.toggle("show", quantity < 1);

  if (submitButton && submitButton.textContent !== "Objednávka odoslaná") {
    submitButton.disabled = quantity < 1;
  }
}

function calculateTotal() {
  const quantity = getQuantity();
  const unitPrice = getUnitBookPrice();
  const shippingPrice = getShippingPrice();
  const discountedShippingPrice = getDiscountedShippingPrice();
  const booksSubtotal = getBooksSubtotalNumber();
  const total = getTotalNumber();

  document.getElementById("itemsSummaryText").innerHTML = getItemsSummaryText();
  document.getElementById("bookPriceText").textContent = quantity > 0 ? money(unitPrice) : "-";
  document.getElementById("booksSubtotalText").textContent = money(booksSubtotal);
  document.getElementById("discountText").textContent = getDiscountText();
  const discountBreakdown = document.getElementById("discountBreakdown");
  discountBreakdown.innerHTML = getDiscountBreakdownHtml();
  discountBreakdown.classList.toggle("show", appliedDiscounts.length > 0);
  document.getElementById("shippingPrice").innerHTML = quantity < 1 ? "-" : (discountedShippingPrice === 0 ? '<span class="free-shipping">zdarma</span>' : money(discountedShippingPrice));
  document.getElementById("qtyText").textContent = quantity;
  document.getElementById("total").textContent = money(total);
  document.getElementById("bankTotal").textContent = money(total);

  updateSubmitButtonState();
  updateBankDetails();
  updateBankPayment();
}

function updateBankDetails() {
  const settings = currentSettings();
  document.getElementById("bankIban").textContent = settings.ibanDisplay;
  document.getElementById("bankRecipient").textContent = settings.recipient;
  document.getElementById("czAccountLine").innerHTML = settings.accountNote;
}

function hideQr(message) {
  const qrElement = document.getElementById("qrCode");
  const qrImage = document.getElementById("qrImage");
  const qrNote = document.getElementById("qrNote");

  qrElement.style.display = "none";
  qrImage.removeAttribute("src");
  qrNote.textContent = message || "";
}

function createPayBySquareString({ amount, variableSymbol, paymentNote }) {
  return encode({
    payments: [
      {
        type: PaymentOptions.PaymentOrder,
        amount: amount,
        variableSymbol: variableSymbol,
        paymentNote: paymentNote,
        currencyCode: CurrencyCode.EUR,
        beneficiary: { name: "Miroslav Vanco" },
        bankAccounts: [{ iban: "SK5656000000001008698006" }]
      }
    ]
  });
}

function renderPayBySquareQr({ amount, variableSymbol, paymentNote }) {
  const qrElement = document.getElementById("qrCode");
  const qrImage = document.getElementById("qrImage");
  const qrNote = document.getElementById("qrNote");

  try {
    const payBySquareString = createPayBySquareString({
      amount: amount,
      variableSymbol: variableSymbol,
      paymentNote: paymentNote
    });

    qrImage.src =
      "https://api.qrserver.com/v1/create-qr-code/?size=320x320&ecc=M&data=" +
      encodeURIComponent(payBySquareString);

    qrElement.style.display = "block";
    qrNote.textContent = "Naskenujte v slovenskej bankovej aplikácii ako PAY by square.";
  } catch (error) {
    console.error(error);
    hideQr("PAY by square QR sa nepodarilo vytvoriť. Použite, prosím, bankové údaje vyššie.");
  }
}

function renderCzechSpdQr({ amount, variableSymbol, paymentNote }) {
  const qrElement = document.getElementById("qrCode");
  const qrImage = document.getElementById("qrImage");
  const qrNote = document.getElementById("qrNote");
  const settings = priceSettings.CZK;

  const safeMessage = removeDiacritics(paymentNote)
    .replace(/\*/g, "")
    .replace(/:/g, "")
    .trim()
    .slice(0, 60);

  const spd =
    "SPD*1.0" +
    "*ACC:" + settings.ibanRaw +
    "*AM:" + Number(amount).toFixed(2) +
    "*CC:CZK" +
    "*X-VS:" + variableSymbol +
    "*MSG:" + safeMessage;

  qrImage.src =
    "https://api.qrserver.com/v1/create-qr-code/?size=320x320&ecc=M&data=" +
    encodeURIComponent(spd);

  qrElement.style.display = "block";
  qrNote.textContent = "Naskenujte v českej bankovej aplikácii ako QR platbu.";
}

function updateBankPayment() {
  const settings = currentSettings();
  const total = getTotalNumber();
  const message = getPaymentMessage();

  document.getElementById("paymentMessage").textContent = message;
  document.getElementById("bankOrderNumber").textContent = lastOrderNumber || "bude vytvorený po odoslaní objednávky";

  if (!lastOrderNumber) {
    hideQr("QR kód sa vytvorí po odoslaní objednávky.");
    return;
  }

  if (settings.currency === "EUR") {
    renderPayBySquareQr({
      amount: Number(total.toFixed(2)),
      variableSymbol: lastOrderNumber,
      paymentNote: message
    });
    return;
  }

  renderCzechSpdQr({
    amount: Math.round(total),
    variableSymbol: lastOrderNumber,
    paymentNote: message
  });
}

function toggleShipping() {
  const shipping = document.getElementById("shipping").value;
  const isPickup = shipping === "pickup";

  document.getElementById("packetaBox").style.display = isPickup ? "block" : "none";
  document.getElementById("homeAddressBox").style.display = isPickup ? "none" : "block";
  document.getElementById("pickupAddressNote").classList.toggle("hidden", !isPickup);

  calculateTotal();
}

function clearPacketaSelection() {
  document.getElementById("packetaId").value = "";
  document.getElementById("packetaName").value = "";
  document.getElementById("packetaAddress").value = "";
  document.getElementById("packetaSelected").textContent = "Zatiaľ nie je vybrané žiadne výdajné miesto ani Z-BOX.";
}

function updateAll() {
  clearPacketaSelection();
  toggleShipping();
  calculateTotal();
}

function openPacketaWidget() {
  if (!PACKETA_API_KEY || PACKETA_API_KEY === "SEM_VLOZ_PACKETA_API_KLUC") {
    alert("Najprv treba doplniť Packeta API kľúč z klientskej sekcie Packety.");
    return;
  }

  const country = document.getElementById("country").value;
  const widgetLanguage = country === "cz" ? "cs" : "sk";

  Packeta.Widget.pick(PACKETA_API_KEY, function(point) {
    if (!point) return;

    const address = point.formatedValue || point.formattedValue || point.address || point.name || "";

    document.getElementById("packetaId").value = point.id || "";
    document.getElementById("packetaName").value = point.name || "";
    document.getElementById("packetaAddress").value = address;

    document.getElementById("packetaSelected").innerHTML =
      "<strong>Vybrané miesto / Z-BOX:</strong><br>" +
      (point.name || "") +
      (address && address !== point.name ? "<br>" + address : "");
  }, {
    country: country,
    language: widgetLanguage
  });
}

function showBankPayment() {
  calculateTotal();
  document.getElementById("bankBox").style.display = "block";
}

function showError(message) {
  const box = document.getElementById("errorBox");
  box.textContent = message;
  box.style.display = "block";
}

function hideError() {
  const box = document.getElementById("errorBox");
  box.textContent = "";
  box.style.display = "none";
}

// Vytvori Stripe Checkout Session cez Firebase Function.
async function createStripeCheckoutSession(orderNumber) {
  const response = await fetch(STRIPE_CHECKOUT_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ orderNumber: orderNumber })
  });

  let data = {};

  try {
    data = await response.json();
  } catch (error) {
    console.error(error);
  }

  if (!response.ok || !data.checkoutUrl) {
    throw new Error(data.error || "Platbu kartou sa nepodarilo pripraviť. Objednávka je uložená, skúste to prosím znova alebo použite QR platbu.");
  }

  return data.checkoutUrl;
}

// Započíta použitie zľavového kódu cez backend, nie priamo z prehliadača.
async function countDiscountUsage(orderNumber) {
  if (!appliedDiscounts.length) return;

  const response = await fetch(COUNT_DISCOUNT_USAGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      orderNumber: orderNumber,
      email: document.getElementById("email").value.trim()
    })
  });

  let data = {};

  try {
    data = await response.json();
  } catch (error) {
    console.error(error);
  }

  if (!response.ok) {
    throw new Error(data.error || "Zľavový kód sa nepodarilo započítať. Objednávka je uložená, kontaktujte nás prosím.");
  }
}

function validateOrder() {
  const shipping = document.getElementById("shipping").value;

  // Objednávka musí obsahovať aspoň jednu knihu.
  if (getQuantity() < 1) {
    const warning = document.getElementById("itemsWarning");
    warning.classList.add("show");
    showError("Vyberte aspoň jednu knihu, inak objednávku nie je možné odoslať.");
    document.getElementById("qtySk").focus();
    return false;
  }

  const requiredFields = ["name", "phone", "email"];

  if (shipping === "home") {
    requiredFields.push("street", "zip", "city");
  }

  for (const id of requiredFields) {
    const el = document.getElementById(id);
    if (!el.value.trim()) {
      alert("Prosím, vyplňte všetky povinné údaje.");
      el.focus();
      return false;
    }
  }

  if (shipping === "pickup" && !document.getElementById("packetaId").value) {
    alert("Prosím, vyberte výdajné miesto Packety alebo Z-BOX.");
    return false;
  }

  return true;
}

async function saveOrderToFirestore(orderNumber) {
  const currency = currentCurrency();
  const settings = currentSettings();
  const quantity = getQuantity();
  const items = getOrderItems();
  const shipping = document.getElementById("shipping").value;
  const payment = document.getElementById("payment").value;
  const total = getTotalNumber();
  const unitBookPrice = getUnitBookPrice();
  const booksSubtotal = getBooksSubtotalNumber();
  const discountAmount = getDiscountAmount();
  const bookDiscount = getBookDiscount();
  const shippingDiscount = getShippingDiscount();
  const discountedShippingPrice = getDiscountedShippingPrice();
  const discounts = appliedDiscounts.map(discount => ({
    code: discount.code,
    title: discount.title || "",
    type: discount.type,
    value: discount.value,
    amount: discount.type === "shipping" ? shippingDiscount.amount : bookDiscount.amount,
    note: discount.note || ""
  }));

  const orderData = {
    orderNumber: orderNumber,
    status: "new",
    paymentStatus: "waiting",
    paymentMethod: payment,
    currency: currency,
    total: total,
    standardBookPrice: settings.bookPrice,
    bookPrice: unitBookPrice,
    booksSubtotal: booksSubtotal,
    discountText: getDiscountText(),
    discountCodes: appliedDiscounts.map(discount => discount.code),
    discounts: discounts,
    discountCode: appliedDiscounts.length ? appliedDiscounts.map(discount => discount.code).join(", ") : "",
    discountType: appliedDiscounts.length ? appliedDiscounts.map(discount => discount.type).join(", ") : "",
    discountValue: appliedDiscounts.length ? appliedDiscounts.map(discount => discount.value).join(", ") : "",
    discountAmount: discountAmount,
    shippingPrice: discountedShippingPrice,
    originalShippingPrice: getShippingPrice(),
    quantity: quantity,
    items: items,
    itemSummary: getItemsSummaryPlain(),
    paid: false,
    shipped: false,
    trackingNumber: "",
    invoiceNumber: "",
    packetaExportStatus: "not_created",

    deliveryCountry: document.getElementById("country").value,
    shippingMethod: shipping,

    customerName: document.getElementById("name").value.trim(),
    customerNameNoDiacritics: removeDiacritics(document.getElementById("name").value.trim()),
    phone: document.getElementById("phone").value.trim(),
    email: document.getElementById("email").value.trim(),
    street: document.getElementById("street").value.trim(),
    zip: document.getElementById("zip").value.trim(),
    city: document.getElementById("city").value.trim(),
    note: document.getElementById("note").value.trim(),

    packetaId: document.getElementById("packetaId").value,
    packetaName: document.getElementById("packetaName").value,
    packetaAddress: document.getElementById("packetaAddress").value,

    paymentMessage: getPaymentMessage(),
    createdAt: serverTimestamp()
  };

  await setDoc(doc(db, "orders", orderNumber), orderData);

  if (payment === "bank") {
    await countDiscountUsage(orderNumber);
  }

  await createOrderEmails(orderData);
}

async function createOrderEmails(orderData) {
  const shippingText =
    orderData.shippingMethod === "pickup"
      ? "Packeta / Z-BOX - výdajné miesto"
      : "Doručenie na adresu";

  const paymentText =
    orderData.paymentMethod === "bank"
      ? "Bankový prevod / QR platba"
      : "Platba kartou";

  const orderItemsHtml = getItemsSummaryHtml();
  const bankDetails = priceSettings[orderData.currency];
  const bankPaymentBlock = `
    <p><strong>Platobné údaje:</strong></p>
    <p>IBAN: <strong>${bankDetails.ibanDisplay}</strong></p>
    ${bankDetails.accountNote ? `<p>${bankDetails.accountNote}</p>` : ""}
    <p>Príjemca: <strong>${bankDetails.recipient}</strong></p>
    <p>Suma: <strong>${money(orderData.total)}</strong></p>
    <p>Variabilný symbol: <strong>${orderData.orderNumber}</strong></p>
    <p>Správa pre príjemcu: <strong>${orderData.paymentMessage}</strong></p>
  `;

  const packetaBlock =
    orderData.shippingMethod === "pickup"
      ? `
        <p><strong>Packeta ID:</strong> ${orderData.packetaId || "-"}</p>
        <p><strong>Výdajné miesto / Z-BOX:</strong> ${orderData.packetaName || "-"}</p>
        <p><strong>Adresa výdajného miesta:</strong> ${orderData.packetaAddress || "-"}</p>
      `
      : "";

  const deliveryAddressBlock =
    orderData.shippingMethod === "home"
      ? `
        <p><strong>Adresa:</strong><br>
        ${orderData.street}<br>
        ${orderData.zip} ${orderData.city}</p>
      `
      : "";

  const adminHtml = `
    <h2>Nová objednávka knihy PUTIN</h2>
    <p><strong>Číslo objednávky / VS:</strong> ${orderData.orderNumber}</p>
    <p><strong>Stav:</strong> ${orderData.status}</p>
    <p><strong>Platba:</strong> ${paymentText}</p>
    <p><strong>Stav platby:</strong> ${orderData.paymentStatus}</p>
    <hr>
    <h3>Zákazník</h3>
    <p><strong>Meno:</strong> ${orderData.customerName}</p>
    <p><strong>E-mail:</strong> ${orderData.email}</p>
    <p><strong>Telefón:</strong> ${orderData.phone}</p>
    <hr>
    <h3>Objednávka</h3>
    <p><strong>Objednané knihy:</strong></p>
    ${orderItemsHtml}
    <p><strong>Počet kusov spolu:</strong> ${orderData.quantity}</p>
    <p><strong>Mena:</strong> ${orderData.currency}</p>
    <p><strong>Cena za kus:</strong> ${orderData.bookPrice} ${orderData.currency}</p>
    <p><strong>Medzisúčet za knihy:</strong> ${orderData.booksSubtotal} ${orderData.currency}</p>
    <p><strong>Doprava:</strong> ${orderData.shippingPrice === 0 ? "zdarma" : orderData.shippingPrice + " " + orderData.currency}</p>
    <p><strong>Spolu:</strong> ${orderData.total} ${orderData.currency}</p>
    <hr>
    <h3>Doručenie</h3>
    <p><strong>Krajina:</strong> ${orderData.deliveryCountry}</p>
    <p><strong>Spôsob doručenia:</strong> ${shippingText}</p>
    ${packetaBlock}
    ${deliveryAddressBlock}
    <hr>
    <p><strong>Správa pre platbu:</strong> ${orderData.paymentMessage}</p>
    <p><strong>Poznámka:</strong> ${orderData.note || "-"}</p>
  `;

  const customerHtml = `
    <h2>Ďakujeme za objednávku</h2>
    <p>Dobrý deň, ${orderData.customerName},</p>
    <p>vaša objednávka knihy <strong>PUTIN</strong> bola prijatá.</p>
    <p><strong>Číslo objednávky / variabilný symbol:</strong> ${orderData.orderNumber}</p>
    <p><strong>Objednané knihy:</strong></p>
    ${orderItemsHtml}
    <p><strong>Počet kusov spolu:</strong> ${orderData.quantity}</p>
    <p><strong>Spolu:</strong> ${orderData.total} ${orderData.currency}</p>
    <hr>
    <p><strong>Spôsob platby:</strong> ${paymentText}</p>
    <p><strong>Správa pre príjemcu:</strong> ${orderData.paymentMessage}</p>
    ${bankPaymentBlock}
    <hr>
    <p><strong>Doručenie:</strong> ${shippingText}</p>
    ${orderData.shippingMethod === "pickup"
      ? `<p><strong>Výdajné miesto / Z-BOX:</strong><br>${orderData.packetaName || "-"}<br>${orderData.packetaAddress || ""}</p>`
      : `<p>${orderData.street}<br>${orderData.zip} ${orderData.city}</p>`}
    <p>Po prijatí platby bude objednávka spracovaná.</p>
    <p>S pozdravom<br>Miroslav Vančo Studio</p>
  `;

  await addDoc(collection(db, "mail"), {
    to: ["mv.studio.slovakia@gmail.com"],
    message: {
      subject: "Nová objednávka " + orderData.orderNumber,
      html: adminHtml
    },
    createdAt: serverTimestamp()
  });

  await addDoc(collection(db, "mail"), {
    to: [orderData.email],
    message: {
      subject: "Potvrdenie objednávky " + orderData.orderNumber,
      html: customerHtml
    },
    createdAt: serverTimestamp()
  });
}

async function submitOrder() {
  hideError();
  calculateTotal();

  if (!validateOrder()) return;

  const payment = document.getElementById("payment").value;
  const orderNumber = await generateOrderNumber();
  lastOrderNumber = orderNumber;
  const submitButton = document.getElementById("submitButton");

  submitButton.disabled = true;
  submitButton.textContent = payment === "card" ? "Pripravujem platbu kartou..." : "Odosielam objednávku...";

  try {
    await saveOrderToFirestore(orderNumber);

    if (payment === "card") {
      const checkoutUrl = await createStripeCheckoutSession(orderNumber);
      window.location.href = checkoutUrl;
      return;
    }

    document.getElementById("successBox").style.display = "block";
    document.getElementById("orderNumberText").textContent = orderNumber;
    updateBankPayment();
    showBankPayment();

    submitButton.textContent = "Objednávka odoslaná";
    submitButton.disabled = true;

    document.getElementById("successBox").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  } catch (error) {
    console.error(error);
    submitButton.textContent = "Odoslať objednávku";
    submitButton.disabled = false;
    showError(error.message || "Objednávku alebo platbu sa nepodarilo dokončiť. Skontrolujte pripojenie k internetu a skúste to znova.");
  }
}

// Po načítaní stránky zapojíme ovládanie formulára.
document.getElementById("qtySk").addEventListener("input", calculateTotal);
document.getElementById("qtyEn").addEventListener("input", calculateTotal);
document.getElementById("shipping").addEventListener("change", toggleShipping);
document.getElementById("currency").addEventListener("change", updateAll);
document.getElementById("country").addEventListener("change", updateAll);
document.getElementById("name").addEventListener("input", updateBankPayment);
document.getElementById("submitButton").addEventListener("click", submitOrder);
document.getElementById("packetaButton").addEventListener("click", openPacketaWidget);
document.getElementById("applyDiscountButton").addEventListener("click", applyDiscountCode);
document.getElementById("discountCode").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    applyDiscountCode();
  }
});

updateAll();
