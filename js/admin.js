import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// Administrácia používa rovnaký Firebase ako objednávkový formulár.
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
let orders = [];

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function money(order) {
  const value = Number(order.total || 0);
  if (order.currency === "CZK") return Math.round(value) + " Kč";
  return value.toFixed(2).replace(".", ",") + " €";
}

function dateText(order) {
  try {
    if (order.createdAt && typeof order.createdAt.toDate === "function") {
      return order.createdAt.toDate().toLocaleString("sk-SK");
    }
  } catch (error) {
    console.error(error);
  }
  return "-";
}

function itemsText(order) {
  if (Array.isArray(order.items) && order.items.length) {
    return order.items.map(item => `${escapeHtml(item.language)}: ${escapeHtml(item.quantity)} ks`).join("<br>");
  }
  return escapeHtml(order.itemSummary || `${order.quantity || 0} ks`);
}

function paymentBadge(order) {
  if (order.paymentStatus === "paid" || order.paid === true) return `<span class="badge badge-paid">zaplatené</span>`;
  return `<span class="badge badge-waiting">čaká</span>`;
}

function paymentMethodText(order) {
  if (order.paymentMethod === "card") return "kartou";
  if (order.paymentMethod === "bank") return "QR / prevod";
  return "-";
}

function discountText(order) {
  if (Array.isArray(order.discounts) && order.discounts.length) {
    return order.discounts.map(discount => {
      const value = Number(discount.amount || 0);
      const amount = order.currency === "CZK"
        ? Math.round(value) + " Kč"
        : value.toFixed(2).replace(".", ",") + " €";
      const name = discount.title || discount.code || "-";

      return `${escapeHtml(name)} / ${escapeHtml(discount.type || "-")} / ${amount}`;
    }).join("<br>");
  }

  if (!order.discountCode) return "Zľava: -";

  const value = Number(order.discountAmount || 0);
  const amount = order.currency === "CZK"
    ? Math.round(value) + " Kč"
    : value.toFixed(2).replace(".", ",") + " €";

  return `${escapeHtml(order.discountCode)} / ${escapeHtml(order.discountType || "-")} / ${amount}`;
}

function statusBadge(order) {
  if (order.status === "cancelled") return `<span class="badge badge-cancelled">zrušené</span>`;
  if (order.status === "shipped" || order.shipped === true) return `<span class="badge badge-shipped">odoslané</span>`;
  return `<span class="badge badge-new">nová</span>`;
}

function deliveryText(order) {
  if (order.shippingMethod === "pickup") {
    return `Packeta / Z-BOX<br><span class="small">${escapeHtml(order.packetaName || "-")}<br>${escapeHtml(order.packetaAddress || "")}</span>`;
  }
  return `Na adresu<br><span class="small">${escapeHtml(order.street || "")}<br>${escapeHtml(order.zip || "")} ${escapeHtml(order.city || "")}</span>`;
}

function showMessage(text, type = "success") {
  const box = document.getElementById("message");
  box.textContent = text;
  box.className = "message show " + type;
  setTimeout(() => { box.className = "message"; }, 3500);
}

async function loadOrders() {
  const summary = document.getElementById("summary");
  summary.textContent = "Načítavam objednávky...";

  try {
    const ordersQuery = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const snap = await getDocs(ordersQuery);
    orders = snap.docs.map(item => ({ id: item.id, ...item.data() }));
    renderOrders();
  } catch (error) {
    console.error(error);
    summary.textContent = "Objednávky sa nepodarilo načítať. Skontrolujte Firestore pravidlá.";
    showMessage("Chyba pri načítaní objednávok.", "danger");
  }
}

function filteredOrders() {
  const term = document.getElementById("searchInput").value.trim().toLowerCase();
  const filter = document.getElementById("statusFilter").value;

  return orders.filter(order => {
    const haystack = [
      order.orderNumber,
      order.customerName,
      order.email,
      order.phone,
      order.itemSummary,
      order.packetaName
    ].join(" ").toLowerCase();

    const matchesTerm = !term || haystack.includes(term);
    let matchesStatus = true;

    if (filter === "waiting") matchesStatus = order.paymentStatus !== "paid" && order.paid !== true && order.status !== "cancelled";
    if (filter === "paid") matchesStatus = order.paymentStatus === "paid" || order.paid === true;
    if (filter === "shipped") matchesStatus = order.status === "shipped" || order.shipped === true;
    if (filter === "cancelled") matchesStatus = order.status === "cancelled";

    return matchesTerm && matchesStatus;
  });
}

function renderOrders() {
  const list = filteredOrders();
  const body = document.getElementById("ordersBody");
  const summary = document.getElementById("summary");
  summary.textContent = `Zobrazených ${list.length} z ${orders.length} objednávok.`;

  if (!list.length) {
    body.innerHTML = `<tr><td colspan="8" class="muted">Žiadne objednávky na zobrazenie.</td></tr>`;
    return;
  }

  body.innerHTML = list.map(order => `
    <tr>
      <td data-label="Číslo"><strong>${escapeHtml(order.orderNumber || order.id)}</strong><br><span class="small">${dateText(order)}</span></td>
      <td data-label="Zákazník">${escapeHtml(order.customerName || "-")}<br><span class="small">${escapeHtml(order.email || "-")}<br>${escapeHtml(order.phone || "-")}</span></td>
      <td data-label="Objednávka">${itemsText(order)}<br><span class="small">Spolu: ${escapeHtml(order.quantity || 0)} ks</span></td>
      <td data-label="Suma"><strong>${money(order)}</strong><br><span class="small">Doprava: ${order.shippingPrice === 0 ? "zdarma" : escapeHtml(order.shippingPrice || "-") + " " + escapeHtml(order.currency || "")}<br>Zľava:<br>${discountText(order)}</span></td>
      <td data-label="Platba">${paymentBadge(order)}<br><span class="small">${paymentMethodText(order)}<br>VS: ${escapeHtml(order.orderNumber || "-")}</span></td>
      <td data-label="Stav">${statusBadge(order)}</td>
      <td data-label="Doručenie">${deliveryText(order)}</td>
      <td data-label="Akcie">
        <div class="actions">
          <button class="secondary" data-action="detail" data-id="${escapeHtml(order.id)}">Detail</button>
          <button class="success" data-action="paid" data-id="${escapeHtml(order.id)}">Zaplatené</button>
          <button class="primary" data-action="shipped" data-id="${escapeHtml(order.id)}">Odoslané</button>
          <button class="danger" data-action="cancel" data-id="${escapeHtml(order.id)}">Zrušiť</button>
        </div>
        <div id="details-${escapeHtml(order.id)}" class="details">
          <div class="grid">
            <div>
              <strong>Platobná správa:</strong><br>${escapeHtml(order.paymentMessage || "-")}<br><br>
              <strong>Zľavový kód:</strong><br>${discountText(order)}<br><br>
              <strong>Poznámka:</strong><br>${escapeHtml(order.note || "-")}
            </div>
            <div>
              <strong>Packeta ID:</strong> ${escapeHtml(order.packetaId || "-")}<br>
              <strong>Tracking:</strong> ${escapeHtml(order.trackingNumber || "-")}<br>
              <strong>Faktúra:</strong> ${escapeHtml(order.invoiceNumber || "-")}
            </div>
          </div>
        </div>
      </td>
    </tr>
  `).join("");
}

function updateLocal(id, patch) {
  orders = orders.map(order => order.id === id ? { ...order, ...patch } : order);
  renderOrders();
}

async function patchOrder(id, patch, successText) {
  try {
    await updateDoc(doc(db, "orders", id), { ...patch, updatedAt: serverTimestamp() });
    updateLocal(id, patch);
    showMessage(successText);
  } catch (error) {
    console.error(error);
    showMessage("Zmenu sa nepodarilo uložiť.", "danger");
  }
}

function toggleDetails(id) {
  const box = document.getElementById("details-" + id);
  if (box) box.classList.toggle("open");
}

function markPaid(id) {
  patchOrder(id, { paymentStatus: "paid", paid: true, paidAt: serverTimestamp() }, "Objednávka označená ako zaplatená.");
}

async function markShipped(id) {
  const trackingNumber = prompt("Zadajte podacie číslo / tracking zásielky:");
  if (trackingNumber === null) return;

  const tracking = trackingNumber.trim();
  if (!tracking) {
    showMessage("Tracking číslo nebolo zadané.", "danger");
    return;
  }

  try {
    const orderRef = doc(db, "orders", id);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      showMessage("Objednávka neexistuje.", "danger");
      return;
    }

    const order = orderSnap.data();

    await updateDoc(orderRef, {
      status: "shipped",
      shipped: true,
      shippedAt: serverTimestamp(),
      trackingNumber: tracking,
      carrier: "Packeta"
    });

    if (order.email) {
      await addDoc(collection(db, "mail"), {
        to: [order.email],
        message: {
          subject: "Objednávka " + id + " bola odoslaná",
          html: `
            <h2>Vaša objednávka bola odoslaná</h2>
            <p>Dobrý deň, ${escapeHtml(order.customerName || "")},</p>
            <p>vaša objednávka <strong>${escapeHtml(id)}</strong> bola odoslaná.</p>
            <p><strong>Dopravca:</strong> Packeta</p>
            <p><strong>Podacie / sledovacie číslo:</strong> ${escapeHtml(tracking)}</p>
            <p>Zásielku môžete sledovať cez systém Packeta alebo podľa informácií, ktoré vám doručí dopravca.</p>
            <p>S pozdravom<br>Miroslav Vančo Studio</p>
          `
        },
        createdAt: serverTimestamp()
      });
    }

    showMessage("Objednávka označená ako odoslaná a zákazníkovi bol pripravený e-mail.", "success");
    loadOrders();
  } catch (error) {
    console.error(error);
    showMessage("Objednávku sa nepodarilo označiť ako odoslanú.", "danger");
  }
}

function cancelOrder(id) {
  if (!confirm("Naozaj zrušiť túto objednávku?")) return;
  patchOrder(id, { status: "cancelled" }, "Objednávka označená ako zrušená.");
}

// Tlačidlá v tabuľke riešime jedným spoločným listenerom.
document.getElementById("ordersBody").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const id = button.dataset.id;
  const action = button.dataset.action;

  if (action === "detail") toggleDetails(id);
  if (action === "paid") markPaid(id);
  if (action === "shipped") markShipped(id);
  if (action === "cancel") cancelOrder(id);
});

document.getElementById("searchInput").addEventListener("input", renderOrders);
document.getElementById("statusFilter").addEventListener("change", renderOrders);
document.getElementById("refreshButton").addEventListener("click", loadOrders);

loadOrders();
