"use strict";

// AromaLParfum Frontend V2 — PASO 58
// Seguimiento de Pedido V2 + acceso a reseñas verificadas en pedidos entregados.

const ORDER57_STORAGE_KEY = "alp_recent_orders_v2";

const order57State = {
  loading: false,
  error: "",
  result: null,
  orderCode: "",
  contact: "",
};

function orderTrackingV2Text(es, en)
{
  return state.language === "en" ? en : es;
}

function orderTrackingV2SafeJson(value, fallback)
{
  try { return JSON.parse(value); } catch (_) { return fallback; }
}

function orderTrackingV2ReadRecent()
{
  const rows = orderTrackingV2SafeJson(localStorage.getItem(ORDER57_STORAGE_KEY) || "[]", []);
  return Array.isArray(rows) ? rows.filter(row => row && row.orderCode).slice(0, 5) : [];
}

function orderTrackingV2WriteRecent(rows)
{
  try { localStorage.setItem(ORDER57_STORAGE_KEY, JSON.stringify(rows.slice(0, 5))); } catch (_) {}
}

function orderTrackingV2RememberOrder(order)
{
  const code = String(order?.order_code || order?.orderCode || "").trim();
  if (!code) return;

  const customer = order?.customer || {};
  const contact = String(customer.email || customer.phone || "").trim();
  const rows = orderTrackingV2ReadRecent().filter(row => String(row.orderCode) !== code);
  rows.unshift({
    orderCode: code,
    contact,
    total: Number(order?.total || 0),
    savedAt: new Date().toISOString(),
  });
  orderTrackingV2WriteRecent(rows);
}

function orderTrackingV2FindRecent(code)
{
  const normalized = String(code || "").trim().toUpperCase();
  return orderTrackingV2ReadRecent().find(row => String(row.orderCode || "").trim().toUpperCase() === normalized) || null;
}

function orderTrackingV2MaskContact(value)
{
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.includes("@"))
  {
    const [name, domain] = raw.split("@");
    const visible = name.slice(0, 2);
    return `${visible}${"•".repeat(Math.max(2, Math.min(6, name.length - 2)))}@${domain}`;
  }
  const digits = raw.replace(/\D/g, "");
  return digits.length > 4 ? `••••••${digits.slice(-4)}` : raw;
}

function orderTrackingV2StatusMeta(status)
{
  const key = String(status || "pendiente").toLowerCase();
  const map = {
    pendiente: { index: 0, es: "Pedido recibido", en: "Order received" },
    confirmado: { index: 1, es: "Confirmado", en: "Confirmed" },
    preparando: { index: 2, es: "Preparando", en: "Preparing" },
    enviado: { index: 3, es: "Enviado", en: "Shipped" },
    entregado: { index: 4, es: "Entregado", en: "Delivered" },
    cancelado: { index: -1, es: "Cancelado", en: "Cancelled" },
  };
  return map[key] || map.pendiente;
}

function orderTrackingV2PaymentLabel(status)
{
  const key = String(status || "pendiente").toLowerCase();
  const map = {
    pendiente: ["Pendiente", "Pending"],
    parcial: ["Pago parcial", "Partially paid"],
    pagado: ["Pagado", "Paid"],
    reembolsado: ["Reembolsado", "Refunded"],
  };
  const pair = map[key] || [key || "Pendiente", key || "Pending"];
  return state.language === "en" ? pair[1] : pair[0];
}

function orderTrackingV2Date(value)
{
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(state.language === "en" ? "en-US" : "es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function orderTrackingV2Money(value)
{
  return money(Number(value || 0));
}

function orderTrackingV2CurrentPrefill()
{
  const payloadCode = String(state.routePayload?.orderCode || state.routePayload?.order_code || "").trim();
  const payloadContact = String(state.routePayload?.contact || "").trim();
  const recent = payloadCode ? orderTrackingV2FindRecent(payloadCode) : orderTrackingV2ReadRecent()[0];
  return {
    orderCode: order57State.orderCode || payloadCode || "",
    contact: order57State.contact || payloadContact || recent?.contact || "",
  };
}

function orderTrackingV2RenderTimeline(order)
{
  const status = orderTrackingV2StatusMeta(order.status);
  if (String(order.status || "").toLowerCase() === "cancelado")
  {
    return `<div class="order57-cancelled"><strong>${orderTrackingV2Text("Pedido cancelado", "Order cancelled")}</strong>${order.cancelled_at ? `<span>${escapeHtml(orderTrackingV2Date(order.cancelled_at))}</span>` : ""}</div>`;
  }

  const steps = [
    { es: "Recibido", en: "Received", date: order.created_at },
    { es: "Confirmado", en: "Confirmed", date: order.confirmed_at },
    { es: "Preparando", en: "Preparing", date: order.preparing_at },
    { es: "Enviado", en: "Shipped", date: order.shipped_at },
    { es: "Entregado", en: "Delivered", date: order.delivered_at },
  ];

  return `<div class="order57-timeline">${steps.map((step, index) => {
    const done = index <= status.index;
    const current = index === status.index;
    const date = orderTrackingV2Date(step.date);
    return `<div class="order57-step ${done ? "is-done" : ""} ${current ? "is-current" : ""}"><div class="order57-step-dot">${done ? "✓" : index + 1}</div><div><strong>${escapeHtml(state.language === "en" ? step.en : step.es)}</strong>${date ? `<span>${escapeHtml(date)}</span>` : ""}</div></div>`;
  }).join("")}</div>`;
}

function orderTrackingV2RenderItems(items, order = {})
{
  const rows = Array.isArray(items) ? items : [];
  if (!rows.length) return "";
  const delivered = String(order.status || "").toLowerCase() === "entregado";

  return `<div class="order57-card"><div class="order57-card-head"><h3>${orderTrackingV2Text("Productos", "Items")}</h3><span>${rows.length}</span></div><div class="order57-items">${rows.map(item => {
    const qty = Math.max(1, Number(item.quantity || 1));
    const ml = Number(item.ml || 0);
    const productId = Number(item.product_id || 0);
    const reviewStatus = String(item.review_status || "").toLowerCase();
    const canReview = delivered && productId > 0 && !reviewStatus;
    const reviewLabel = reviewStatus === "approved"
      ? orderTrackingV2Text("Reseña publicada", "Review published")
      : reviewStatus === "pending"
      ? orderTrackingV2Text("Reseña en moderación", "Review pending moderation")
      : reviewStatus === "rejected"
      ? orderTrackingV2Text("Reseña revisada", "Review reviewed")
      : "";

    return `<div class="order57-item order58-reviewable"><div><strong>${escapeHtml(item.display_name || orderTrackingV2Text("Producto", "Product"))}</strong><span>${qty > 1 ? `×${qty}` : ""}${ml > 0 ? `${qty > 1 ? " · " : ""}${ml} ml` : ""}</span>${reviewLabel ? `<small class="order58-review-status">✓ ${escapeHtml(reviewLabel)}</small>` : ""}</div><div class="order58-item-side"><strong>${orderTrackingV2Money(item.total_price)}</strong>${canReview ? `<button class="btn secondary small" type="button" data-review58-action="from-order" data-product-id="${escapeAttribute(productId)}" data-order-code="${escapeAttribute(order.order_code || "")}">${orderTrackingV2Text("Dejar reseña", "Write review")}</button>` : ""}</div></div>`;
  }).join("")}</div>${delivered ? `<p class="order58-delivered-note">${orderTrackingV2Text("Tu pedido fue entregado. Las reseñas se verifican contra esta compra antes de pasar a moderación.", "Your order was delivered. Reviews are verified against this purchase before moderation.")}</p>` : ""}</div>`;
}

function orderTrackingV2RenderResult(order)
{
  if (!order?.ok) return "";
  const status = orderTrackingV2StatusMeta(order.status);
  const carrier = String(order.carrier || "").trim();
  const tracking = String(order.tracking_code || "").trim();
  const paymentPlan = String(order.payment_plan || "").toLowerCase();
  const paymentStatus = orderTrackingV2PaymentLabel(order.payment_status);
  const amountPaid = Number(order.amount_paid || 0);
  const balance = Number(order.balance_due || 0);

  return `
    <div class="order57-result">
      <div class="order57-result-head">
        <div><p class="eyebrow">${orderTrackingV2Text("Estado actual", "Current status")}</p><h2>${escapeHtml(state.language === "en" ? status.en : status.es)}</h2><p>${escapeHtml(order.order_code || "")}</p></div>
        <button class="btn secondary small" type="button" data-order57-action="share">${orderTrackingV2Text("Compartir seguimiento", "Share tracking")}</button>
      </div>

      <div class="order57-card">${orderTrackingV2RenderTimeline(order)}</div>

      <div class="order57-summary-grid">
        <div class="order57-card">
          <div class="order57-card-head"><h3>${orderTrackingV2Text("Pago", "Payment")}</h3><span class="order57-pill">${escapeHtml(paymentStatus)}</span></div>
          <div class="order57-kv"><span>${orderTrackingV2Text("Método", "Method")}</span><strong>${escapeHtml(order.payment_method || "—")}</strong></div>
          ${paymentPlan === "deposit" ? `<div class="order57-kv"><span>${orderTrackingV2Text("Seña requerida", "Required deposit")}</span><strong>${orderTrackingV2Money(order.required_initial_payment)}</strong></div>` : ""}
          <div class="order57-kv"><span>${orderTrackingV2Text("Pagado", "Paid")}</span><strong>${orderTrackingV2Money(amountPaid)}</strong></div>
          <div class="order57-kv"><span>${orderTrackingV2Text("Saldo", "Balance")}</span><strong>${orderTrackingV2Money(balance)}</strong></div>
          <div class="order57-kv is-total"><span>Total</span><strong>${orderTrackingV2Money(order.total)}</strong></div>
        </div>

        <div class="order57-card">
          <div class="order57-card-head"><h3>${orderTrackingV2Text("Entrega", "Delivery")}</h3><span>${escapeHtml(order.shipping_method === "pickup" ? orderTrackingV2Text("Retiro", "Pickup") : orderTrackingV2Text("Envío", "Shipping"))}</span></div>
          ${carrier ? `<div class="order57-kv"><span>${orderTrackingV2Text("Correo / transporte", "Carrier")}</span><strong>${escapeHtml(carrier)}</strong></div>` : `<p class="order57-muted">${orderTrackingV2Text("El transporte aparecerá cuando el pedido sea despachado.", "Carrier details will appear once the order ships.")}</p>`}
          ${tracking ? `<div class="order57-tracking-code"><span>${orderTrackingV2Text("Código de seguimiento", "Tracking code")}</span><strong>${escapeHtml(tracking)}</strong><button class="btn secondary small" type="button" data-order57-action="copy-tracking">${orderTrackingV2Text("Copiar", "Copy")}</button></div>` : ""}
        </div>
      </div>

      ${orderTrackingV2RenderItems(order.items, order)}

      <div class="order57-actions">
        <button class="btn secondary" type="button" data-order57-action="copy-order">${orderTrackingV2Text("Copiar código del pedido", "Copy order code")}</button>
        <button class="btn" type="button" data-order57-action="whatsapp">${orderTrackingV2Text("Consultar por WhatsApp", "Ask on WhatsApp")}</button>
      </div>
    </div>`;
}

function orderTrackingV2RenderRecent()
{
  const rows = orderTrackingV2ReadRecent();
  if (!rows.length) return "";
  return `<div class="order57-recent"><p class="eyebrow">${orderTrackingV2Text("En este dispositivo", "On this device")}</p><h3>${orderTrackingV2Text("Pedidos recientes", "Recent orders")}</h3><div class="order57-recent-list">${rows.map(row => `<button type="button" class="order57-recent-row" data-order57-action="recent" data-order-code="${escapeAttribute(row.orderCode)}" data-contact="${escapeAttribute(row.contact || "")}"><span><strong>${escapeHtml(row.orderCode)}</strong><small>${escapeHtml(orderTrackingV2MaskContact(row.contact))}</small></span>${row.total ? `<strong>${orderTrackingV2Money(row.total)}</strong>` : ""}</button>`).join("")}</div></div>`;
}

function orderTrackingV2RenderPage()
{
  const prefill = orderTrackingV2CurrentPrefill();
  return `
    <section class="section order57-page">
      <div class="container order57-shell">
        <div class="order57-intro">
          <p class="eyebrow">AromaLParfum</p>
          <h1 class="section-title">${orderTrackingV2Text("Seguimiento de pedido", "Order tracking")}</h1>
          <p class="section-subtitle">${orderTrackingV2Text("Consultá el estado de tu compra sin crear una cuenta. Por seguridad te pedimos el código del pedido y el mismo email o teléfono usado al comprar.", "Check your order without creating an account. For security, enter your order code and the same email or phone used at checkout.")}</p>
        </div>

        <div class="order57-layout">
          <form class="order57-form" id="order57Form">
            <div class="admin-field"><label for="order57Code">${orderTrackingV2Text("Código del pedido", "Order code")}</label><input id="order57Code" class="text-input" autocomplete="off" placeholder="ALP-..." value="${escapeAttribute(prefill.orderCode)}"></div>
            <div class="admin-field"><label for="order57Contact">${orderTrackingV2Text("Email o teléfono", "Email or phone")}</label><input id="order57Contact" class="text-input" autocomplete="email" placeholder="${orderTrackingV2Text("El mismo que usaste al comprar", "Same one used at checkout")}" value="${escapeAttribute(prefill.contact)}"></div>
            <button class="btn" id="order57Submit" type="submit" ${order57State.loading ? "disabled" : ""}>${order57State.loading ? orderTrackingV2Text("Consultando...", "Checking...") : orderTrackingV2Text("Consultar pedido", "Track order")}</button>
            <p class="order57-security">⌁ ${orderTrackingV2Text("La consulta no muestra tu dirección, contacto ni información interna de la tienda.", "Tracking never shows your address, contact details or internal store data.")}</p>
            ${order57State.error ? `<div class="order57-error">${escapeHtml(order57State.error)}</div>` : ""}
          </form>
          ${orderTrackingV2RenderRecent()}
        </div>

        ${order57State.result ? orderTrackingV2RenderResult(order57State.result) : ""}
      </div>
    </section>`;
}

async function orderTrackingV2Lookup(orderCode, contact)
{
  const code = String(orderCode || "").trim();
  const identity = String(contact || "").trim();
  if (!code || !identity)
  {
    order57State.error = orderTrackingV2Text("Completá el código del pedido y tu email o teléfono.", "Enter the order code and your email or phone.");
    order57State.result = null;
    renderCurrentRoute();
    return;
  }

  order57State.loading = true;
  order57State.error = "";
  order57State.orderCode = code;
  order57State.contact = identity;
  renderCurrentRoute();

  try
  {
    const response = await supabaseClient.rpc("get_public_order_status", {
      p_order_code: code,
      p_contact: identity,
    });
    if (response.error) throw response.error;
    const data = response.data && typeof response.data === "object" ? response.data : {};
    if (!data.ok)
    {
      order57State.result = null;
      order57State.error = data.error === "not_found"
        ? orderTrackingV2Text("No encontramos un pedido con esos datos. Revisá el código y usá el mismo email o teléfono de la compra.", "We couldn't find an order matching those details. Check the code and use the same email or phone from checkout.")
        : orderTrackingV2Text("No pudimos consultar el pedido.", "We couldn't check the order.");
    }
    else
    {
      order57State.result = data;
      order57State.error = "";
      const rows = orderTrackingV2ReadRecent().filter(row => String(row.orderCode).toUpperCase() !== String(data.order_code).toUpperCase());
      rows.unshift({ orderCode: data.order_code, contact: identity, total: Number(data.total || 0), savedAt: new Date().toISOString() });
      orderTrackingV2WriteRecent(rows);
    }
  }
  catch (error)
  {
    console.debug("Order tracking V2:", error);
    order57State.result = null;
    order57State.error = String(error?.message || "").toLowerCase().includes("get_public_order_status")
      ? orderTrackingV2Text("El seguimiento todavía no está activado en Supabase.", "Order tracking is not enabled in Supabase yet.")
      : orderTrackingV2Text("No pudimos consultar el pedido. Probá de nuevo.", "We couldn't check the order. Try again.");
  }
  finally
  {
    order57State.loading = false;
    renderCurrentRoute();
  }
}

function orderTrackingV2ApplyInitialRoute()
{
  if (location.pathname.includes("/admin")) return false;
  const params = new URLSearchParams(location.search);
  const code = String(params.get("pedido") || params.get("order") || "").trim();
  if (!code) return false;
  const recent = orderTrackingV2FindRecent(code);
  state.route = "order-tracking";
  state.routePayload = { orderCode: code, contact: recent?.contact || "" };
  return true;
}

function orderTrackingV2Open(orderCode, contact = "")
{
  order57State.error = "";
  order57State.result = null;
  order57State.orderCode = String(orderCode || "").trim();
  order57State.contact = String(contact || "").trim();
  setRoute("order-tracking", { orderCode: order57State.orderCode, contact: order57State.contact });
}

async function orderTrackingV2Copy(text, successMessage)
{
  const value = String(text || "").trim();
  if (!value) return;
  try { await navigator.clipboard.writeText(value); toast(successMessage, "success"); }
  catch (_) { toast(value, "success"); }
}

function orderTrackingV2WhatsApp()
{
  const order = order57State.result;
  if (!order) return;
  const number = String(getSiteSetting("contact", "whatsapp", CONFIG.whatsappNumber) || "").replace(/\D/g, "");
  const text = orderTrackingV2Text(`Hola AromaLParfum. Quiero consultar por mi pedido ${order.order_code}.`, `Hello AromaLParfum. I have a question about order ${order.order_code}.`);
  window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
}

if (!window.__alp57OrderTrackingListeners)
{
  window.__alp57OrderTrackingListeners = true;

  document.addEventListener("submit", event => {
    if (event.target?.id !== "order57Form") return;
    event.preventDefault();
    const code = document.getElementById("order57Code")?.value || "";
    const contact = document.getElementById("order57Contact")?.value || "";
    orderTrackingV2Lookup(code, contact);
  });

  document.addEventListener("click", async event => {
    const button = event.target.closest("[data-order57-action]");
    if (!button) return;
    const action = button.dataset.order57Action;
    if (action === "recent")
    {
      const code = button.dataset.orderCode || "";
      const contact = button.dataset.contact || "";
      order57State.result = null;
      order57State.error = "";
      order57State.orderCode = code;
      order57State.contact = contact;
      if (code && contact) await orderTrackingV2Lookup(code, contact);
      else renderCurrentRoute();
      return;
    }
    const order = order57State.result;
    if (!order) return;
    if (action === "copy-order") await orderTrackingV2Copy(order.order_code, orderTrackingV2Text("Código del pedido copiado.", "Order code copied."));
    if (action === "copy-tracking") await orderTrackingV2Copy(order.tracking_code, orderTrackingV2Text("Código de seguimiento copiado.", "Tracking code copied."));
    if (action === "whatsapp") orderTrackingV2WhatsApp();
    if (action === "share")
    {
      const url = new URL(location.href);
      url.search = "";
      url.searchParams.set("pedido", order.order_code);
      const shareData = { title: `AromaLParfum · ${order.order_code}`, text: orderTrackingV2Text("Seguimiento de mi pedido AromaLParfum", "My AromaLParfum order tracking"), url: url.toString() };
      if (navigator.share) navigator.share(shareData).catch(() => {});
      else await orderTrackingV2Copy(url.toString(), orderTrackingV2Text("Link de seguimiento copiado.", "Tracking link copied."));
    }
  });
}


// Si el usuario sale de Seguimiento, limpiamos ?pedido= de la URL para que
// un refresh futuro respete la ruta actual. Se encadena sobre wrappers previos.
if (typeof setRoute === "function" && !window.__alp57SetRouteWrapped)
{
  window.__alp57SetRouteWrapped = true;
  const order57BaseSetRoute = setRoute;
  setRoute = function(route, payload = {})
  {
    if (route !== "order-tracking")
    {
      const url = new URL(location.href);
      if (url.searchParams.has("pedido") || url.searchParams.has("order"))
      {
        url.searchParams.delete("pedido");
        url.searchParams.delete("order");
        history.replaceState({}, "", url.toString());
      }
    }
    return order57BaseSetRoute(route, payload);
  };
}
