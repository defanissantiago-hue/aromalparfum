"use strict";

// =========================================================
// AromaLParfum — PASO 49
// Pedidos V2 (solo Admin)
// Pipeline + stock + pagos + tracking + cancelaciones
// =========================================================

const ALP49_PAGE_SIZE = 20;

const alp49OrdersState = {
  loaded: false,
  loading: false,
  error: "",
  rows: [],
  count: 0,
  page: 1,
  query: "",
  status: "all",
  payment: "all",
  selectedId: null,
  detailLoading: false,
  detailError: "",
  detail: null,
  paymentMethods: [],
};

window.alp49OrdersState = alp49OrdersState;

function alp49Text(value, fallback = "—")
{
  const text = String(value ?? "").trim();
  return text || fallback;
}

function alp49Num(value, fallback = 0)
{
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function alp49Date(value, withTime = true)
{
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(
    state.language === "en" ? "en-US" : "es-AR",
    withTime
      ? { dateStyle: "short", timeStyle: "short" }
      : { dateStyle: "short" }
  ).format(date);
}

function alp49StatusLabel(value)
{
  const en = state.language === "en";
  const esMap = {
    pendiente: "Pendiente",
    confirmado: "Confirmado",
    preparando: "Preparando",
    enviado: "Enviado",
    entregado: "Entregado",
    cancelado: "Cancelado",
  };
  const enMap = {
    pendiente: "Pending",
    confirmado: "Confirmed",
    preparando: "Preparing",
    enviado: "Shipped",
    entregado: "Delivered",
    cancelado: "Cancelled",
  };
  return (en ? enMap : esMap)[value] || alp49Text(value);
}

function alp49PaymentLabel(value)
{
  const en = state.language === "en";
  const esMap = {
    pendiente: "Pendiente",
    parcial: "Parcial",
    pagado: "Pagado",
    reembolsado: "Reembolsado",
  };
  const enMap = {
    pendiente: "Pending",
    parcial: "Partial",
    pagado: "Paid",
    reembolsado: "Refunded",
  };
  return (en ? enMap : esMap)[value] || alp49Text(value);
}

function alp49Badge(value, kind = "status")
{
  const normalized = String(value || "").toLowerCase();
  const label = kind === "payment"
    ? alp49PaymentLabel(normalized)
    : alp49StatusLabel(normalized);

  return `<span class="alp49-badge is-${escapeAttribute(normalized || "unknown")}">${escapeHtml(label)}</span>`;
}

function alp49OrderSelectColumns()
{
  return [
    "id",
    "order_code",
    "customer_id",
    "customer_name",
    "customer_phone",
    "customer_email",
    "status",
    "payment_status",
    "payment_method",
    "payment_plan",
    "deposit_percent",
    "required_initial_payment",
    "amount_paid",
    "balance_due",
    "subtotal",
    "discount_total",
    "try_before_credit_total",
    "shipping_total",
    "total",
    "cost_complete",
    "stock_applied",
    "stock_applied_at",
    "shipping_method",
    "shipping_address",
    "carrier",
    "tracking_code",
    "notes",
    "source",
    "created_at",
    "confirmed_at",
    "preparing_at",
    "shipped_at",
    "delivered_at",
    "completed_at",
    "cancelled_at",
    "payment_confirmed_at",
    "refunded_at",
  ].join(",");
}

async function alp49LoadOrders({ force = false, page = null } = {})
{
  if (alp49OrdersState.loading) return;

  if (page !== null)
  {
    alp49OrdersState.page = Math.max(1, Number(page) || 1);
  }

  if (alp49OrdersState.loaded && !force)
  {
    alp49RenderOrdersTab();
    return;
  }

  alp49OrdersState.loading = true;
  alp49OrdersState.error = "";
  alp49RenderOrdersTab();

  try
  {
    const start = (alp49OrdersState.page - 1) * ALP49_PAGE_SIZE;
    const end = start + ALP49_PAGE_SIZE - 1;

    let query = supabaseClient
      .from("orders")
      .select(alp49OrderSelectColumns(), { count: "exact" })
      .order("created_at", { ascending: false })
      .range(start, end);

    if (alp49OrdersState.status !== "all")
    {
      query = query.eq("status", alp49OrdersState.status);
    }

    if (alp49OrdersState.payment !== "all")
    {
      query = query.eq("payment_status", alp49OrdersState.payment);
    }

    const cleanQuery = alp49OrdersState.query
      .trim()
      .replace(/[(),]/g, " ")
      .replace(/\s+/g, " ");

    if (cleanQuery)
    {
      const pattern = `%${cleanQuery}%`;
      query = query.or([
        `order_code.ilike.${pattern}`,
        `customer_name.ilike.${pattern}`,
        `customer_phone.ilike.${pattern}`,
        `customer_email.ilike.${pattern}`,
      ].join(","));
    }

    const [ordersResult, methodsResult] = await Promise.all([
      query,
      alp49OrdersState.paymentMethods.length
        ? Promise.resolve({ data: alp49OrdersState.paymentMethods, error: null })
        : supabaseClient
            .from("payment_methods")
            .select("id,slug,nombre_es,payment_flow,allows_full,allows_deposit,deposit_percent,activo")
            .order("orden", { ascending: true }),
    ]);

    if (ordersResult.error) throw ordersResult.error;
    if (methodsResult.error) throw methodsResult.error;

    alp49OrdersState.rows = Array.isArray(ordersResult.data) ? ordersResult.data : [];
    alp49OrdersState.count = Number(ordersResult.count) || 0;
    alp49OrdersState.paymentMethods = Array.isArray(methodsResult.data) ? methodsResult.data : [];
    alp49OrdersState.loaded = true;
  }
  catch (error)
  {
    console.error("PASO49 orders:", error);
    alp49OrdersState.error = error?.message || String(error);
  }
  finally
  {
    alp49OrdersState.loading = false;
    alp49RenderOrdersTab();
  }
}

function alp49EnsureOrdersLoaded()
{
  if (state.admin?.tab !== "orders") return;

  if (!alp49OrdersState.loaded && !alp49OrdersState.loading)
  {
    alp49LoadOrders();
  }
}

function alp49RenderOrdersTab()
{
  if (state.admin?.tab !== "orders") return;

  const host = document.getElementById("adminTabContent");
  if (host)
  {
    host.innerHTML = renderAdminOrdersV2();
  }
}

function alp49ApplyFilters()
{
  const queryInput = document.getElementById("alp49OrderSearch");
  const statusInput = document.getElementById("alp49OrderStatus");
  const paymentInput = document.getElementById("alp49PaymentStatus");

  alp49OrdersState.query = queryInput?.value || "";
  alp49OrdersState.status = statusInput?.value || "all";
  alp49OrdersState.payment = paymentInput?.value || "all";
  alp49OrdersState.page = 1;
  alp49OrdersState.loaded = false;
  alp49LoadOrders({ force: true });
}

function alp49SetPage(page)
{
  const totalPages = Math.max(1, Math.ceil(alp49OrdersState.count / ALP49_PAGE_SIZE));
  alp49OrdersState.page = Math.min(totalPages, Math.max(1, Number(page) || 1));
  alp49OrdersState.loaded = false;
  alp49LoadOrders({ force: true });
}

function alp49RenderPaginator()
{
  const en = state.language === "en";
  const totalPages = Math.max(1, Math.ceil(alp49OrdersState.count / ALP49_PAGE_SIZE));

  if (totalPages <= 1) return "";

  return `
    <div class="alp49-pagination">
      <button class="btn outline" type="button" data-action="admin-order-page" data-page="${Math.max(1, alp49OrdersState.page - 1)}" ${alp49OrdersState.page <= 1 ? "disabled" : ""}>
        ${en ? "Previous" : "Anterior"}
      </button>
      <span>${en ? "Page" : "Página"} ${formatInteger(alp49OrdersState.page)} / ${formatInteger(totalPages)}</span>
      <button class="btn outline" type="button" data-action="admin-order-page" data-page="${Math.min(totalPages, alp49OrdersState.page + 1)}" ${alp49OrdersState.page >= totalPages ? "disabled" : ""}>
        ${en ? "Next" : "Siguiente"}
      </button>
    </div>
  `;
}

function alp49RenderOrdersRows()
{
  const en = state.language === "en";

  if (!alp49OrdersState.rows.length)
  {
    return `
      <div class="alp49-empty">
        <strong>${en ? "No orders found" : "No encontramos pedidos"}</strong>
        <span>${en ? "Change the filters or wait for the next order." : "Cambiá los filtros o esperá el próximo pedido."}</span>
      </div>
    `;
  }

  return `
    <div class="admin-table-wrap alp49-table-wrap">
      <table class="admin-table alp49-orders-table">
        <thead>
          <tr>
            <th>${en ? "Order" : "Pedido"}</th>
            <th>${en ? "Customer" : "Cliente"}</th>
            <th>${en ? "Status" : "Estado"}</th>
            <th>${en ? "Payment" : "Pago"}</th>
            <th>${en ? "Total" : "Total"}</th>
            <th>${en ? "Balance" : "Saldo"}</th>
            <th>${en ? "Date" : "Fecha"}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${alp49OrdersState.rows.map(order => `
            <tr>
              <td>
                <strong>${escapeHtml(alp49Text(order.order_code, `#${order.id}`))}</strong>
                <small>#${formatInteger(order.id)}</small>
              </td>
              <td>
                <strong>${escapeHtml(alp49Text(order.customer_name, en ? "Customer" : "Cliente"))}</strong>
                <small>${escapeHtml(alp49Text(order.customer_phone, ""))}</small>
              </td>
              <td>${alp49Badge(order.status)}</td>
              <td>${alp49Badge(order.payment_status, "payment")}</td>
              <td><strong>${money(alp49Num(order.total))}</strong></td>
              <td>${money(alp49Num(order.balance_due))}</td>
              <td>${escapeHtml(alp49Date(order.created_at))}</td>
              <td>
                <button class="btn outline" type="button" data-action="admin-order-open" data-order-id="${escapeAttribute(order.id)}">
                  ${en ? "Open" : "Abrir"}
                </button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderAdminOrdersV2()
{
  const en = state.language === "en";

  if (alp49OrdersState.loading && !alp49OrdersState.loaded)
  {
    return `
      <div class="alp49-loading">
        <div class="loader"></div>
        <p>${en ? "Loading orders…" : "Cargando pedidos…"}</p>
      </div>
    `;
  }

  if (alp49OrdersState.error)
  {
    return `
      <div class="admin-message error">
        ${escapeHtml(alp49OrdersState.error)}
      </div>
      <button class="btn" type="button" data-action="admin-orders-refresh">${en ? "Retry" : "Reintentar"}</button>
    `;
  }

  if (alp49OrdersState.selectedId)
  {
    return alp49RenderOrderDetail();
  }

  const pending = alp49OrdersState.rows.filter(order => order.status === "pendiente").length;
  const awaitingPayment = alp49OrdersState.rows.filter(order => ["pendiente", "parcial"].includes(order.payment_status)).length;
  const paid = alp49OrdersState.rows.filter(order => order.payment_status === "pagado").length;

  return `
    <section class="alp49-orders-shell">
      <div class="alp49-orders-head">
        <div>
          <p class="eyebrow">${en ? "Operations" : "Operaciones"}</p>
          <h2>${en ? "Orders V2" : "Pedidos V2"}</h2>
          <p>${en ? "Control status, inventory, payments, delivery and refunds without leaving the Admin." : "Controlá estado, stock, pagos, envío y reembolsos sin salir del Admin."}</p>
        </div>
        <button class="btn outline" type="button" data-action="admin-orders-refresh">${en ? "Refresh" : "Actualizar"}</button>
      </div>

      <div class="alp49-kpis">
        <article><span>${en ? "Results" : "Resultados"}</span><strong>${formatInteger(alp49OrdersState.count)}</strong></article>
        <article><span>${en ? "Pending on this page" : "Pendientes en esta página"}</span><strong>${formatInteger(pending)}</strong></article>
        <article><span>${en ? "Awaiting payment" : "Esperando pago"}</span><strong>${formatInteger(awaitingPayment)}</strong></article>
        <article><span>${en ? "Paid" : "Pagados"}</span><strong>${formatInteger(paid)}</strong></article>
      </div>

      <div class="alp49-filters">
        <label>
          <span>${en ? "Search" : "Buscar"}</span>
          <input id="alp49OrderSearch" class="text-input" type="search" value="${escapeAttribute(alp49OrdersState.query)}" placeholder="${en ? "Code, name, phone or email" : "Código, nombre, teléfono o email"}">
        </label>

        <label>
          <span>${en ? "Order status" : "Estado del pedido"}</span>
          <select id="alp49OrderStatus" class="text-input">
            ${alp49SelectOption("all", en ? "All" : "Todos", alp49OrdersState.status)}
            ${alp49SelectOption("pendiente", alp49StatusLabel("pendiente"), alp49OrdersState.status)}
            ${alp49SelectOption("confirmado", alp49StatusLabel("confirmado"), alp49OrdersState.status)}
            ${alp49SelectOption("preparando", alp49StatusLabel("preparando"), alp49OrdersState.status)}
            ${alp49SelectOption("enviado", alp49StatusLabel("enviado"), alp49OrdersState.status)}
            ${alp49SelectOption("entregado", alp49StatusLabel("entregado"), alp49OrdersState.status)}
            ${alp49SelectOption("cancelado", alp49StatusLabel("cancelado"), alp49OrdersState.status)}
          </select>
        </label>

        <label>
          <span>${en ? "Payment" : "Pago"}</span>
          <select id="alp49PaymentStatus" class="text-input">
            ${alp49SelectOption("all", en ? "All" : "Todos", alp49OrdersState.payment)}
            ${alp49SelectOption("pendiente", alp49PaymentLabel("pendiente"), alp49OrdersState.payment)}
            ${alp49SelectOption("parcial", alp49PaymentLabel("parcial"), alp49OrdersState.payment)}
            ${alp49SelectOption("pagado", alp49PaymentLabel("pagado"), alp49OrdersState.payment)}
            ${alp49SelectOption("reembolsado", alp49PaymentLabel("reembolsado"), alp49OrdersState.payment)}
          </select>
        </label>

        <button class="btn" type="button" data-action="admin-orders-filter">${en ? "Apply" : "Aplicar"}</button>
      </div>

      ${alp49RenderOrdersRows()}
      ${alp49RenderPaginator()}
    </section>
  `;
}

function alp49SelectOption(value, label, selected)
{
  return `<option value="${escapeAttribute(value)}" ${selected === value ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

async function alp49OpenOrder(orderId)
{
  const id = Number(orderId);
  if (!id) return;

  alp49OrdersState.selectedId = id;
  alp49OrdersState.detailLoading = true;
  alp49OrdersState.detailError = "";
  alp49OrdersState.detail = null;
  alp49RenderOrdersTab();

  try
  {
    const [orderResult, itemsResult, paymentsResult, auditResult] = await Promise.all([
      supabaseClient
        .from("orders")
        .select(alp49OrderSelectColumns())
        .eq("id", id)
        .single(),

      supabaseClient
        .from("order_items")
        .select("id,item_type,product_id,quantity,ml,unit_price,total_price,display_name,reference_id,bundle_group_id,metadata")
        .eq("order_id", id)
        .order("id", { ascending: true }),

      supabaseClient
        .from("order_payments")
        .select("id,payment_method_slug,payment_method_name,payment_kind,amount,currency,status,provider,external_reference,notes,confirmed_at,created_at")
        .eq("order_id", id)
        .order("created_at", { ascending: false }),

      supabaseClient
        .from("order_audit_log")
        .select("id,event_type,old_status,new_status,old_payment_status,new_payment_status,actor_email,created_at")
        .eq("order_id", id)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    if (orderResult.error) throw orderResult.error;
    if (itemsResult.error) throw itemsResult.error;
    if (paymentsResult.error) throw paymentsResult.error;
    if (auditResult.error) throw auditResult.error;

    alp49OrdersState.detail = {
      order: orderResult.data,
      items: itemsResult.data || [],
      payments: paymentsResult.data || [],
      audit: auditResult.data || [],
    };
  }
  catch (error)
  {
    console.error("PASO49 order detail:", error);
    alp49OrdersState.detailError = error?.message || String(error);
  }
  finally
  {
    alp49OrdersState.detailLoading = false;
    alp49RenderOrdersTab();
  }
}

function alp49CloseOrder()
{
  alp49OrdersState.selectedId = null;
  alp49OrdersState.detail = null;
  alp49OrdersState.detailError = "";
  alp49RenderOrdersTab();
}

function alp49RenderOrderDetail()
{
  const en = state.language === "en";

  if (alp49OrdersState.detailLoading)
  {
    return `<div class="alp49-loading"><div class="loader"></div><p>${en ? "Loading order…" : "Cargando pedido…"}</p></div>`;
  }

  if (alp49OrdersState.detailError)
  {
    return `
      <button class="btn outline" type="button" data-action="admin-order-close">← ${en ? "Back" : "Volver"}</button>
      <div class="admin-message error u-mt-20">${escapeHtml(alp49OrdersState.detailError)}</div>
    `;
  }

  const detail = alp49OrdersState.detail;
  if (!detail?.order) return "";

  const order = detail.order;
  const amountPaid = alp49Num(order.amount_paid);
  const balance = alp49Num(order.balance_due);
  const initial = alp49Num(order.required_initial_payment);
  const suggestedPayment = balance > 0
    ? (amountPaid <= 0 && initial > 0 ? Math.min(initial, balance) : balance)
    : 0;

  return `
    <section class="alp49-order-detail">
      <div class="alp49-detail-head">
        <div>
          <button class="alp49-back" type="button" data-action="admin-order-close">← ${en ? "Orders" : "Pedidos"}</button>
          <p class="eyebrow">${en ? "Order" : "Pedido"}</p>
          <h2>${escapeHtml(alp49Text(order.order_code, `#${order.id}`))}</h2>
          <div class="alp49-badge-row">${alp49Badge(order.status)} ${alp49Badge(order.payment_status, "payment")}</div>
        </div>
        <div class="alp49-detail-head-actions">
          <button class="btn outline" type="button" data-action="admin-order-copy-code" data-order-id="${escapeAttribute(order.id)}">${en ? "Copy code" : "Copiar código"}</button>
          ${order.customer_phone ? `<button class="btn outline" type="button" data-action="admin-order-whatsapp" data-order-id="${escapeAttribute(order.id)}">WhatsApp</button>` : ""}
        </div>
      </div>

      <div class="alp49-detail-grid">
        <article class="alp49-panel">
          <h3>${en ? "Customer" : "Cliente"}</h3>
          <strong>${escapeHtml(alp49Text(order.customer_name, en ? "Customer" : "Cliente"))}</strong>
          <span>${escapeHtml(alp49Text(order.customer_phone))}</span>
          <span>${escapeHtml(alp49Text(order.customer_email))}</span>
          <small>${en ? "Created" : "Creado"}: ${escapeHtml(alp49Date(order.created_at))}</small>
        </article>

        <article class="alp49-panel">
          <h3>${en ? "Payment summary" : "Resumen de pago"}</h3>
          <div class="alp49-money-row"><span>Subtotal</span><strong>${money(alp49Num(order.subtotal))}</strong></div>
          ${alp49Num(order.discount_total) > 0 ? `<div class="alp49-money-row"><span>${en ? "Benefits" : "Beneficios"}</span><strong>−${money(alp49Num(order.discount_total))}</strong></div>` : ""}
          <div class="alp49-money-row"><span>${en ? "Shipping" : "Envío"}</span><strong>${money(alp49Num(order.shipping_total))}</strong></div>
          <div class="alp49-money-row is-total"><span>Total</span><strong>${money(alp49Num(order.total))}</strong></div>
          <div class="alp49-money-row"><span>${en ? "Paid" : "Pagado"}</span><strong>${money(amountPaid)}</strong></div>
          <div class="alp49-money-row"><span>${en ? "Balance" : "Saldo"}</span><strong>${money(balance)}</strong></div>
          <small>${escapeHtml(alp49Text(order.payment_method))} · ${escapeHtml(order.payment_plan === "deposit" ? (en ? "Deposit" : "Seña") : (en ? "Full payment" : "Pago completo"))}</small>
        </article>

        <article class="alp49-panel">
          <h3>${en ? "Inventory" : "Stock"}</h3>
          <div class="alp49-stock-state ${order.stock_applied ? "is-ok" : "is-pending"}">
            <strong>${order.stock_applied ? (en ? "Stock applied" : "Stock descontado") : (en ? "Stock not applied" : "Stock todavía no descontado")}</strong>
            <span>${order.stock_applied_at ? alp49Date(order.stock_applied_at) : (en ? "Confirm the order to apply inventory." : "Confirmá el pedido para aplicar inventario.")}</span>
          </div>
          ${!order.stock_applied && order.status !== "cancelado" ? `
            <button class="btn" type="button" data-action="admin-order-confirm-stock" data-order-id="${escapeAttribute(order.id)}">
              ${en ? "Confirm order + apply stock" : "Confirmar pedido + descontar stock"}
            </button>
          ` : ""}
        </article>
      </div>

      ${alp49RenderPipeline(order)}

      <div class="alp49-detail-columns">
        <article class="alp49-panel alp49-items-panel">
          <h3>${en ? "Order contents" : "Contenido del pedido"}</h3>
          ${alp49RenderItems(detail.items)}
        </article>

        <article class="alp49-panel">
          <h3>${en ? "Register payment" : "Registrar pago"}</h3>
          ${order.status === "cancelado" && amountPaid <= 0 ? `<p>${en ? "This order is cancelled and has no paid balance to refund." : "Este pedido está cancelado y no tiene pagos para reembolsar."}</p>` : alp49RenderPaymentForm(order, suggestedPayment)}
        </article>
      </div>

      <div class="alp49-detail-columns">
        <article class="alp49-panel">
          <h3>${en ? "Payments" : "Movimientos de pago"}</h3>
          ${alp49RenderPayments(detail.payments)}
        </article>

        <article class="alp49-panel">
          <h3>${en ? "Audit trail" : "Historial"}</h3>
          ${alp49RenderAudit(detail.audit)}
        </article>
      </div>

      ${order.status !== "cancelado" ? `
        <article class="alp49-danger-zone">
          <div>
            <strong>${en ? "Cancel order" : "Cancelar pedido"}</strong>
            <span>${en ? "If stock was already applied, the backend will release what can safely be released." : "Si el stock ya fue aplicado, el backend libera lo que puede devolverse de forma segura."}</span>
          </div>
          <button class="btn danger" type="button" data-action="admin-order-cancel" data-order-id="${escapeAttribute(order.id)}">
            ${en ? "Cancel order" : "Cancelar pedido"}
          </button>
        </article>
      ` : ""}
    </section>
  `;
}

function alp49RenderPipeline(order)
{
  const en = state.language === "en";
  const steps = ["confirmado", "preparando", "enviado", "entregado"];
  const currentIndex = steps.indexOf(order.status);

  if (order.status === "cancelado")
  {
    return `<div class="alp49-cancelled-banner">${en ? "Order cancelled" : "Pedido cancelado"}${order.cancelled_at ? ` · ${escapeHtml(alp49Date(order.cancelled_at))}` : ""}</div>`;
  }

  return `
    <article class="alp49-panel alp49-pipeline-panel">
      <div class="alp49-panel-head">
        <div>
          <h3>${en ? "Order pipeline" : "Flujo del pedido"}</h3>
          <p>${en ? "Inventory must be confirmed before preparation." : "Primero confirmá el stock; después avanzá la preparación."}</p>
        </div>
      </div>

      <div class="alp49-pipeline">
        ${steps.map((step, index) => `
          <div class="alp49-pipeline-step ${currentIndex >= index ? "is-done" : ""} ${order.status === step ? "is-current" : ""}">
            <span>${index + 1}</span>
            <strong>${escapeHtml(alp49StatusLabel(step))}</strong>
          </div>
        `).join("")}
      </div>

      <div class="alp49-pipeline-actions">
        ${order.stock_applied && ["confirmado", "pendiente"].includes(order.status) ? `
          <button class="btn" type="button" data-action="admin-order-set-status" data-order-id="${escapeAttribute(order.id)}" data-status="preparando">${en ? "Start preparing" : "Empezar preparación"}</button>
        ` : ""}

        ${order.stock_applied && order.status === "preparando" ? `
          <div class="alp49-shipping-inline">
            <input id="alp49Carrier" class="text-input" type="text" value="${escapeAttribute(order.carrier || "")}" placeholder="${en ? "Carrier" : "Transportista"}">
            <input id="alp49Tracking" class="text-input" type="text" value="${escapeAttribute(order.tracking_code || "")}" placeholder="Tracking">
            <button class="btn" type="button" data-action="admin-order-set-status" data-order-id="${escapeAttribute(order.id)}" data-status="enviado">${en ? "Mark shipped" : "Marcar enviado"}</button>
          </div>
        ` : ""}

        ${order.stock_applied && order.status === "enviado" ? `
          <div class="alp49-shipping-data">
            <span>${en ? "Carrier" : "Transportista"}: <strong>${escapeHtml(alp49Text(order.carrier))}</strong></span>
            <span>Tracking: <strong>${escapeHtml(alp49Text(order.tracking_code))}</strong></span>
          </div>
          <button class="btn" type="button" data-action="admin-order-set-status" data-order-id="${escapeAttribute(order.id)}" data-status="entregado">${en ? "Mark delivered" : "Marcar entregado"}</button>
        ` : ""}

        ${order.status === "entregado" ? `<span class="alp49-success-note">✓ ${en ? "Delivered" : "Entregado"} · ${escapeHtml(alp49Date(order.delivered_at))}</span>` : ""}
      </div>
    </article>
  `;
}

function alp49RenderItems(items)
{
  const en = state.language === "en";
  const list = Array.isArray(items) ? items : [];

  if (!list.length) return `<div class="alp49-empty">${en ? "No item lines." : "No hay líneas de artículos."}</div>`;

  return `
    <div class="alp49-item-list">
      ${list.map(item => {
        const role = item.metadata?.role || "";
        const origin = item.metadata?.origin || item.metadata?.bundle_type || "";
        const freeComponent = alp49Num(item.total_price) === 0 && role === "component";
        return `
          <div class="alp49-item ${freeComponent ? "is-component" : ""}">
            <div>
              <strong>${escapeHtml(alp49Text(item.display_name, en ? "Item" : "Artículo"))}</strong>
              <span>${formatInteger(item.quantity)} × ${item.ml ? `${formatInteger(item.ml)} ml` : escapeHtml(alp49Text(item.item_type, ""))}</span>
              ${origin ? `<small>${escapeHtml(String(origin).replaceAll("_", " "))}</small>` : ""}
            </div>
            <strong>${freeComponent ? (en ? "Included" : "Incluido") : money(alp49Num(item.total_price, alp49Num(item.unit_price) * alp49Num(item.quantity, 1)))}</strong>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function alp49RenderPaymentForm(order, suggestedPayment)
{
  const en = state.language === "en";
  const methods = alp49OrdersState.paymentMethods.filter(method => method.activo !== false);
  const defaultSlug = methods.find(method => method.slug === "transferencia")?.slug || methods[0]?.slug || "transferencia";
  const normalizedOrderMethod = String(order.payment_method || "").toLowerCase();
  const selectedMethodSlug = methods.find(method =>
    normalizedOrderMethod && normalizedOrderMethod.includes(String(method.nombre_es || method.slug || "").toLowerCase())
  )?.slug || defaultSlug;
  const paymentKind = (order.status === "cancelado" && alp49Num(order.amount_paid) > 0) || order.payment_status === "pagado"
    ? "refund"
    : (alp49Num(order.amount_paid) > 0 ? "balance" : (order.payment_plan === "deposit" ? "deposit" : "full"));

  return `
    <div class="alp49-payment-form">
      <label>
        <span>${en ? "Movement" : "Movimiento"}</span>
        <select id="alp49PaymentKind" class="text-input">
          ${alp49SelectOption("deposit", en ? "Deposit" : "Seña", paymentKind)}
          ${alp49SelectOption("balance", en ? "Balance payment" : "Pago de saldo", paymentKind)}
          ${alp49SelectOption("full", en ? "Full payment" : "Pago completo", paymentKind)}
          ${alp49SelectOption("adjustment", en ? "Adjustment" : "Ajuste", paymentKind)}
          ${alp49SelectOption("refund", en ? "Refund" : "Reembolso", paymentKind)}
        </select>
      </label>

      <label>
        <span>${en ? "Method" : "Método"}</span>
        <select id="alp49PaymentMethod" class="text-input">
          ${methods.map(method => alp49SelectOption(method.slug, method.nombre_es || method.slug, selectedMethodSlug)).join("")}
        </select>
      </label>

      <label>
        <span>${en ? "Amount" : "Importe"}</span>
        <input id="alp49PaymentAmount" class="text-input" type="number" min="0.01" step="0.01" value="${escapeAttribute(suggestedPayment > 0 ? suggestedPayment.toFixed(2) : "")}">
      </label>

      <label>
        <span>${en ? "Reference / receipt" : "Referencia / comprobante"}</span>
        <input id="alp49PaymentReference" class="text-input" type="text" maxlength="200" placeholder="${en ? "Optional" : "Opcional"}">
      </label>

      <label class="alp49-full-field">
        <span>${en ? "Note" : "Nota"}</span>
        <textarea id="alp49PaymentNote" class="text-input" rows="2" maxlength="1000" placeholder="${en ? "Optional internal note" : "Nota interna opcional"}"></textarea>
      </label>

      <button class="btn alp49-full-field" type="button" data-action="admin-order-register-payment" data-order-id="${escapeAttribute(order.id)}">
        ${en ? "Register movement" : "Registrar movimiento"}
      </button>
    </div>
  `;
}

function alp49RenderPayments(payments)
{
  const en = state.language === "en";
  const list = Array.isArray(payments) ? payments : [];

  if (!list.length) return `<div class="alp49-empty">${en ? "No payment movements yet." : "Todavía no hay movimientos de pago."}</div>`;

  return `
    <div class="alp49-timeline">
      ${list.map(payment => `
        <div class="alp49-timeline-row">
          <span></span>
          <div>
            <strong>${escapeHtml(alp49Text(payment.payment_method_name, payment.payment_method_slug || "Pago"))} · ${escapeHtml(alp49Text(payment.payment_kind))}</strong>
            <small>${escapeHtml(alp49Date(payment.confirmed_at || payment.created_at))}</small>
            ${payment.external_reference ? `<small>Ref: ${escapeHtml(payment.external_reference)}</small>` : ""}
            ${payment.notes ? `<small>${escapeHtml(payment.notes)}</small>` : ""}
          </div>
          <strong>${payment.payment_kind === "refund" ? "−" : "+"}${money(alp49Num(payment.amount))}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function alp49RenderAudit(audit)
{
  const en = state.language === "en";
  const list = Array.isArray(audit) ? audit : [];

  if (!list.length) return `<div class="alp49-empty">${en ? "No audit entries yet." : "Todavía no hay cambios registrados."}</div>`;

  return `
    <div class="alp49-timeline">
      ${list.map(entry => `
        <div class="alp49-timeline-row is-audit">
          <span></span>
          <div>
            <strong>${escapeHtml(alp49Text(entry.event_type).replaceAll("_", " "))}</strong>
            <small>${escapeHtml(alp49Date(entry.created_at))}</small>
            ${entry.old_status !== entry.new_status ? `<small>${escapeHtml(alp49StatusLabel(entry.old_status))} → ${escapeHtml(alp49StatusLabel(entry.new_status))}</small>` : ""}
            ${entry.old_payment_status !== entry.new_payment_status ? `<small>${escapeHtml(alp49PaymentLabel(entry.old_payment_status))} → ${escapeHtml(alp49PaymentLabel(entry.new_payment_status))}</small>` : ""}
          </div>
          <small>${escapeHtml(alp49Text(entry.actor_email, "system"))}</small>
        </div>
      `).join("")}
    </div>
  `;
}

async function alp49ReloadAfterMutation(orderId, message)
{
  alp49OrdersState.loaded = false;
  if (typeof alp48DashboardState === "object")
  {
    alp48DashboardState.loaded = false;
  }

  if (message) toast(message, "success");

  await alp49LoadOrders({ force: true, page: alp49OrdersState.page });
  if (orderId) await alp49OpenOrder(orderId);
}

async function alp49ConfirmOrderStock(orderId)
{
  const en = state.language === "en";
  const id = Number(orderId);
  if (!id) return;

  if (!window.confirm(en
    ? "Confirm this order and apply its inventory movements?"
    : "¿Confirmar este pedido y descontar el stock correspondiente?")) return;

  const result = await supabaseClient.rpc("admin_confirm_order", {
    p_order_id: id,
    p_mark_paid: false,
  });

  if (result.error)
  {
    toast(result.error.message || String(result.error), "error");
    return;
  }

  await alp49ReloadAfterMutation(id, en ? "Order confirmed and inventory applied." : "Pedido confirmado y stock aplicado.");
}

async function alp49SetOrderStatus(orderId, newStatus)
{
  const en = state.language === "en";
  const id = Number(orderId);
  if (!id) return;

  const order = alp49OrdersState.detail?.order;
  if (!order || Number(order.id) !== id) return;

  if (!order.stock_applied && ["preparando", "enviado", "entregado"].includes(newStatus))
  {
    toast(en ? "Confirm inventory before moving the order forward." : "Confirmá el stock antes de avanzar el pedido.", "error");
    return;
  }

  const carrier = document.getElementById("alp49Carrier")?.value?.trim() || order.carrier || null;
  const tracking = document.getElementById("alp49Tracking")?.value?.trim() || order.tracking_code || null;

  if (newStatus === "enviado" && (!carrier || !tracking))
  {
    toast(en ? "Enter carrier and tracking before shipping." : "Ingresá transportista y tracking antes de marcar enviado.", "error");
    return;
  }

  const result = await supabaseClient.rpc("admin_update_order_status", {
    p_order_id: id,
    p_new_status: newStatus,
    p_mark_paid: false,
    p_carrier: carrier,
    p_tracking: tracking,
    p_note: null,
  });

  if (result.error)
  {
    toast(result.error.message || String(result.error), "error");
    return;
  }

  await alp49ReloadAfterMutation(id, en ? "Order status updated." : "Estado del pedido actualizado.");
}

async function alp49RegisterPayment(orderId)
{
  const en = state.language === "en";
  const id = Number(orderId);
  if (!id) return;

  const kind = document.getElementById("alp49PaymentKind")?.value || "deposit";
  const method = document.getElementById("alp49PaymentMethod")?.value || "transferencia";
  const amount = Number(document.getElementById("alp49PaymentAmount")?.value || 0);
  const reference = document.getElementById("alp49PaymentReference")?.value?.trim() || null;
  const note = document.getElementById("alp49PaymentNote")?.value?.trim() || null;

  if (!Number.isFinite(amount) || amount <= 0)
  {
    toast(en ? "Enter a valid amount." : "Ingresá un importe válido.", "error");
    return;
  }

  if (kind === "refund")
  {
    if (!window.confirm(en
      ? `Register a refund of ${money(amount)}?`
      : `¿Registrar un reembolso de ${money(amount)}?`)) return;
  }

  const result = await supabaseClient.rpc("admin_record_order_payment", {
    p_order_id: id,
    p_method_slug: method,
    p_payment_kind: kind,
    p_amount: amount,
    p_external_reference: reference,
    p_notes: note,
  });

  if (result.error)
  {
    toast(result.error.message || String(result.error), "error");
    return;
  }

  await alp49ReloadAfterMutation(id, en ? "Payment movement registered." : "Movimiento de pago registrado.");
}

async function alp49CancelOrder(orderId)
{
  const en = state.language === "en";
  const id = Number(orderId);
  if (!id) return;

  const reason = window.prompt(
    en ? "Reason for cancellation:" : "Motivo de la cancelación:",
    ""
  );

  if (reason === null) return;

  if (!window.confirm(en
    ? "Cancel this order? This action changes inventory and payment workflow."
    : "¿Cancelar este pedido? Esta acción modifica el flujo de stock y pagos.")) return;

  const result = await supabaseClient.rpc("admin_cancel_order", {
    p_order_id: id,
    p_reason: reason.trim() || null,
  });

  if (result.error)
  {
    toast(result.error.message || String(result.error), "error");
    return;
  }

  await alp49ReloadAfterMutation(id, en ? "Order cancelled." : "Pedido cancelado.");
}

function alp49GetOrderById(orderId)
{
  const id = Number(orderId);
  if (alp49OrdersState.detail?.order && Number(alp49OrdersState.detail.order.id) === id)
  {
    return alp49OrdersState.detail.order;
  }
  return alp49OrdersState.rows.find(order => Number(order.id) === id) || null;
}

async function alp49CopyOrderCode(orderId)
{
  const order = alp49GetOrderById(orderId);
  if (!order) return;
  const code = alp49Text(order.order_code, String(order.id));

  try
  {
    await navigator.clipboard.writeText(code);
    toast(state.language === "en" ? "Order code copied." : "Código del pedido copiado.", "success");
  }
  catch
  {
    window.prompt(state.language === "en" ? "Copy order code:" : "Copiá el código:", code);
  }
}

function alp49OpenOrderWhatsApp(orderId)
{
  const order = alp49GetOrderById(orderId);
  if (!order?.customer_phone) return;

  const phone = String(order.customer_phone).replace(/\D/g, "");
  if (!phone) return;

  const en = state.language === "en";
  const message = en
    ? `Hi ${order.customer_name || ""}, I'm contacting you from AromaLParfum about order ${order.order_code || order.id}.`
    : `Hola ${order.customer_name || ""}, te escribo de AromaLParfum por tu pedido ${order.order_code || order.id}.`;

  window.open(`https://wa.me/${encodeURIComponent(phone)}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
}

window.renderAdminOrdersV2 = renderAdminOrdersV2;
window.alp49LoadOrders = alp49LoadOrders;
window.alp49EnsureOrdersLoaded = alp49EnsureOrdersLoaded;
window.alp49ApplyFilters = alp49ApplyFilters;
window.alp49SetPage = alp49SetPage;
window.alp49OpenOrder = alp49OpenOrder;
window.alp49CloseOrder = alp49CloseOrder;
window.alp49ConfirmOrderStock = alp49ConfirmOrderStock;
window.alp49SetOrderStatus = alp49SetOrderStatus;
window.alp49RegisterPayment = alp49RegisterPayment;
window.alp49CancelOrder = alp49CancelOrder;
window.alp49CopyOrderCode = alp49CopyOrderCode;
window.alp49OpenOrderWhatsApp = alp49OpenOrderWhatsApp;
