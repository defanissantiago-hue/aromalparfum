"use strict";

// =========================================================
// AromaLParfum — PASO 47
// Clientes V2 + postventa (solo Admin)
// =========================================================

const ALP47_CUSTOMER_PAGE_SIZE = 20;

const alp47CustomersState = {
  loaded: false,
  loading: false,
  error: "",
  customers: [],
  reminders: [],
  repurchaseError: "",
  query: "",
  page: 1,
  selectedCustomerId: null,
  detailLoading: false,
  detailError: "",
  detail: null,
};

window.alp47CustomersState = alp47CustomersState;

function alp47Num(value, fallback = 0)
{
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function alp47Text(value)
{
  return String(value ?? "").trim();
}

function alp47Pick(row, keys, fallback = null)
{
  if (!row || typeof row !== "object") return fallback;

  for (const key of keys)
  {
    const value = row[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return fallback;
}

function alp47DateValue(value)
{
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function alp47FormatDateTime(value)
{
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(
    state.language === "en" ? "en-US" : "es-AR",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}

function alp47NormalizeCustomer(summary, profile)
{
  const row = summary || {};
  const source = profile || {};

  const id = Number(
    alp47Pick(row, ["customer_id", "id"], source.id)
  );

  return {
    id,
    fullName: alp47Text(
      alp47Pick(
        row,
        ["full_name", "customer_name", "name"],
        source.full_name || "Cliente"
      )
    ) || "Cliente",
    phone: alp47Text(
      alp47Pick(row, ["phone", "customer_phone", "phone_normalized"], source.phone || source.phone_normalized)
    ),
    phoneNormalized: alp47Text(source.phone_normalized || alp47Pick(row, ["phone_normalized"], "")),
    email: alp47Text(
      alp47Pick(row, ["email", "customer_email"], source.email)
    ),
    orders: alp47Num(
      alp47Pick(row, ["total_orders", "orders_count", "paid_orders", "order_count", "orders"], 0)
    ),
    spent: alp47Num(
      alp47Pick(row, ["total_spent", "total_revenue", "lifetime_value", "revenue", "spent", "total_amount"], 0)
    ),
    firstOrderAt: alp47Pick(row, ["first_order_at", "first_purchase_at", "first_order_date"], null),
    lastOrderAt: alp47Pick(row, ["last_order_at", "last_purchase_at", "last_order_date", "latest_order_at"], null),
    createdAt: source.created_at || null,
    rawSummary: row,
    rawProfile: source,
  };
}

function alp47NormalizeReminder(row)
{
  const dueAt = alp47Pick(
    row,
    [
      "next_repurchase_at",
      "next_purchase_at",
      "reminder_at",
      "remind_at",
      "due_at",
      "next_contact_at",
      "scheduled_for",
      "next_reminder_at",
    ],
    null
  );

  return {
    id: alp47Pick(row, ["id"], null),
    customerId: Number(alp47Pick(row, ["customer_id"], 0)) || null,
    productId: Number(alp47Pick(row, ["product_id"], 0)) || null,
    dueAt,
    status: alp47Text(alp47Pick(row, ["status", "state"], "pending")).toLowerCase(),
    reason: alp47Text(alp47Pick(row, ["reason", "note", "notes", "motivo"], "")),
    lastOrderId: alp47Pick(row, ["last_order_id", "source_order_id", "order_id"], null),
    raw: row,
  };
}

function alp47ReminderIsClosed(reminder)
{
  return [
    "sent",
    "done",
    "completed",
    "cancelled",
    "canceled",
    "disabled",
  ].includes(reminder.status);
}

function alp47ReminderIsDue(reminder)
{
  if (alp47ReminderIsClosed(reminder)) return false;
  if (!reminder.dueAt) return false;
  return alp47DateValue(reminder.dueAt) <= Date.now();
}

async function alp47LoadCustomers({ force = false } = {})
{
  if (alp47CustomersState.loading) return;
  if (alp47CustomersState.loaded && !force)
  {
    alp47RenderCustomersTab();
    return;
  }

  alp47CustomersState.loading = true;
  alp47CustomersState.error = "";
  alp47CustomersState.repurchaseError = "";
  alp47RenderCustomersTab();

  try
  {
    const [profilesResult, summaryResult, repurchaseResult] = await Promise.all([
      supabaseClient
        .from("customer_profiles")
        .select("id,full_name,phone,phone_normalized,email,created_at,updated_at")
        .order("created_at", { ascending: false })
        .range(0, 999),

      // Vista agregada privada. select(*) se usa solo en Admin porque la vista
      // puede evolucionar sin romper el frontend y no contiene catálogo público.
      supabaseClient
        .from("customer_summary")
        .select("*")
        .range(0, 999),

      supabaseClient
        .from("customer_repurchase")
        .select("*")
        .range(0, 499),
    ]);

    if (profilesResult.error) throw profilesResult.error;
    if (summaryResult.error) throw summaryResult.error;

    const profiles = Array.isArray(profilesResult.data) ? profilesResult.data : [];
    const summaries = Array.isArray(summaryResult.data) ? summaryResult.data : [];

    const profileById = new Map(
      profiles.map(profile => [Number(profile.id), profile])
    );

    const summaryById = new Map();
    summaries.forEach(row =>
    {
      const id = Number(alp47Pick(row, ["customer_id", "id"], 0));
      if (id) summaryById.set(id, row);
    });

    const ids = new Set([
      ...profileById.keys(),
      ...summaryById.keys(),
    ]);

    alp47CustomersState.customers = [...ids]
      .map(id => alp47NormalizeCustomer(summaryById.get(id), profileById.get(id)))
      .filter(customer => Number.isFinite(customer.id) && customer.id > 0)
      .sort((a, b) =>
      {
        const byLast = alp47DateValue(b.lastOrderAt) - alp47DateValue(a.lastOrderAt);
        if (byLast) return byLast;
        return b.spent - a.spent;
      });

    if (repurchaseResult.error)
    {
      alp47CustomersState.repurchaseError = repurchaseResult.error.message || String(repurchaseResult.error);
      alp47CustomersState.reminders = [];
    }
    else
    {
      alp47CustomersState.reminders = (Array.isArray(repurchaseResult.data) ? repurchaseResult.data : [])
        .map(alp47NormalizeReminder)
        .filter(reminder => reminder.customerId)
        .sort((a, b) =>
        {
          const aTime = alp47DateValue(a.dueAt) || Number.MAX_SAFE_INTEGER;
          const bTime = alp47DateValue(b.dueAt) || Number.MAX_SAFE_INTEGER;
          return aTime - bTime;
        });
    }

    alp47CustomersState.loaded = true;
    alp47CustomersState.page = 1;
  }
  catch (error)
  {
    console.error("PASO47 customers:", error);
    alp47CustomersState.error = error?.message || String(error);
  }
  finally
  {
    alp47CustomersState.loading = false;
    alp47RenderCustomersTab();
  }
}

function alp47EnsureCustomersLoaded()
{
  if (state.admin?.tab !== "customers") return;

  if (!alp47CustomersState.loaded && !alp47CustomersState.loading)
  {
    alp47LoadCustomers();
  }
}

function alp47CustomerSearchResults()
{
  const query = alp47CustomersState.query.toLowerCase().trim();

  if (!query) return alp47CustomersState.customers;

  return alp47CustomersState.customers.filter(customer =>
    [
      customer.fullName,
      customer.phone,
      customer.phoneNormalized,
      customer.email,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query)
  );
}

function alp47CustomersSummary()
{
  const customers = alp47CustomersState.customers;
  const dueReminders = alp47CustomersState.reminders.filter(alp47ReminderIsDue);

  const buyers = customers.filter(customer => customer.orders > 0);
  const revenue = customers.reduce((sum, customer) => sum + customer.spent, 0);
  const repeat = customers.filter(customer => customer.orders >= 2).length;

  return {
    customers: customers.length,
    buyers: buyers.length,
    repeat,
    revenue,
    avgValue: buyers.length ? revenue / buyers.length : 0,
    dueReminders: dueReminders.length,
  };
}

function renderAdminCustomersV2()
{
  const en = state.language === "en";

  if (alp47CustomersState.loading && !alp47CustomersState.loaded)
  {
    return `
      <div class="alp47-loading">
        <div class="loader"></div>
        <p>${en ? "Loading private customer data…" : "Cargando datos privados de clientes…"}</p>
      </div>
    `;
  }

  if (alp47CustomersState.error)
  {
    return `
      <div class="admin-message error">
        ${escapeHtml(alp47CustomersState.error)}
      </div>
      <button class="btn" type="button" data-action="admin-customers-refresh">
        ${en ? "Try again" : "Reintentar"}
      </button>
    `;
  }

  if (!alp47CustomersState.loaded)
  {
    return `
      <div class="alp47-loading">
        <p>${en ? "Preparing customers…" : "Preparando clientes…"}</p>
      </div>
    `;
  }

  const summary = alp47CustomersSummary();
  const results = alp47CustomerSearchResults();
  const pages = Math.max(1, Math.ceil(results.length / ALP47_CUSTOMER_PAGE_SIZE));
  alp47CustomersState.page = Math.min(alp47CustomersState.page, pages);

  const start = (alp47CustomersState.page - 1) * ALP47_CUSTOMER_PAGE_SIZE;
  const pageRows = results.slice(start, start + ALP47_CUSTOMER_PAGE_SIZE);

  return `
    <section class="alp47-customers-admin">
      <div class="alp47-head">
        <div>
          <p class="eyebrow">CRM · POSTVENTA</p>
          <h2>${en ? "Customers" : "Clientes"}</h2>
          <p class="section-subtitle">
            ${en
              ? "Purchase history, customer value and repurchase suggestions. Private Admin data only."
              : "Historial de compras, valor del cliente y sugerencias de recompra. Datos privados visibles solo en Admin."}
          </p>
        </div>

        <button class="btn outline" type="button" data-action="admin-customers-refresh">
          ${en ? "Refresh" : "Actualizar"}
        </button>
      </div>

      <div class="alp47-kpis">
        ${alp47Kpi(en ? "Customers" : "Clientes", formatInteger(summary.customers), en ? "profiles" : "perfiles")}
        ${alp47Kpi(en ? "Repeat customers" : "Clientes recurrentes", formatInteger(summary.repeat), en ? "2+ purchases" : "2+ compras")}
        ${alp47Kpi(en ? "Verified revenue" : "Facturación atribuida", money(summary.revenue), en ? "customer lifetime" : "histórico por cliente")}
        ${alp47Kpi(en ? "Average customer value" : "Valor promedio", money(summary.avgValue), en ? "buyers only" : "solo compradores")}
        ${alp47Kpi(en ? "Repurchase due" : "Recompras pendientes", formatInteger(summary.dueReminders), en ? "manual follow-up" : "seguimiento manual")}
      </div>

      <div class="alp47-toolbar">
        <div class="alp47-search-wrap">
          <input
            id="adminCustomerSearch"
            type="search"
            value="${escapeAttribute(alp47CustomersState.query)}"
            placeholder="${en ? "Name, phone or email" : "Nombre, teléfono o email"}">
          <button class="btn" type="button" data-action="admin-customers-search">
            ${en ? "Search" : "Buscar"}
          </button>
        </div>
        <span class="alp47-result-count">
          ${formatInteger(results.length)} ${en ? "results" : "resultados"}
        </span>
      </div>

      ${alp47RenderReminderPanel()}

      <div class="admin-table-wrap alp47-table-wrap">
        <table class="admin-table alp47-table">
          <thead>
            <tr>
              <th>${en ? "Customer" : "Cliente"}</th>
              <th>${en ? "Contact" : "Contacto"}</th>
              <th>${en ? "Purchases" : "Compras"}</th>
              <th>${en ? "Spent" : "Gastado"}</th>
              <th>${en ? "Last purchase" : "Última compra"}</th>
              <th>${en ? "Action" : "Acción"}</th>
            </tr>
          </thead>
          <tbody>
            ${pageRows.length
              ? pageRows.map(alp47RenderCustomerRow).join("")
              : `<tr><td colspan="6" class="alp47-empty">${en ? "No customers found." : "No encontramos clientes."}</td></tr>`}
          </tbody>
        </table>
      </div>

      ${alp47RenderPagination(pages)}

      <p class="alp47-privacy-note">
        ${en
          ? "Customer information is loaded only after an authorized administrator opens this tab. No customer data is exposed on the public storefront."
          : "La información de clientes se carga únicamente cuando un administrador autorizado abre esta pestaña. Ningún dato de clientes se expone en la tienda pública."}
      </p>

      ${alp47RenderCustomerDetail()}
    </section>
  `;
}

function alp47Kpi(label, value, note)
{
  return `
    <article class="alp47-kpi">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      <small>${escapeHtml(note)}</small>
    </article>
  `;
}

function alp47RenderCustomerRow(customer)
{
  const en = state.language === "en";
  const dueCount = alp47CustomersState.reminders.filter(reminder =>
    reminder.customerId === customer.id && alp47ReminderIsDue(reminder)
  ).length;

  return `
    <tr>
      <td>
        <div class="alp47-customer-name">
          <strong>${escapeHtml(customer.fullName)}</strong>
          ${dueCount ? `<span class="alp47-badge is-due">${dueCount} ${en ? "follow-up" : "recompra"}</span>` : ""}
        </div>
      </td>
      <td>
        <div class="alp47-contact-cell">
          <span>${escapeHtml(customer.phone || "—")}</span>
          <small>${escapeHtml(customer.email || "—")}</small>
        </div>
      </td>
      <td>${formatInteger(customer.orders)}</td>
      <td><strong>${money(customer.spent)}</strong></td>
      <td>${escapeHtml(alp47FormatDateTime(customer.lastOrderAt))}</td>
      <td>
        <button
          class="btn small outline"
          type="button"
          data-action="admin-customer-open"
          data-customer-id="${customer.id}">
          ${en ? "View profile" : "Ver perfil"}
        </button>
      </td>
    </tr>
  `;
}

function alp47RenderPagination(pages)
{
  if (pages <= 1) return "";

  const current = alp47CustomersState.page;
  const buttons = [];
  const from = Math.max(1, current - 2);
  const to = Math.min(pages, current + 2);

  for (let page = from; page <= to; page += 1)
  {
    buttons.push(`
      <button
        class="admin-tab ${page === current ? "active" : ""}"
        type="button"
        data-action="admin-customer-page"
        data-page="${page}">
        ${page}
      </button>
    `);
  }

  return `
    <div class="alp47-pagination">
      <button class="btn small outline" type="button" data-action="admin-customer-page" data-page="${Math.max(1, current - 1)}" ${current <= 1 ? "disabled" : ""}>←</button>
      ${buttons.join("")}
      <button class="btn small outline" type="button" data-action="admin-customer-page" data-page="${Math.min(pages, current + 1)}" ${current >= pages ? "disabled" : ""}>→</button>
    </div>
  `;
}

function alp47RenderReminderPanel()
{
  const en = state.language === "en";
  const due = alp47CustomersState.reminders
    .filter(alp47ReminderIsDue)
    .slice(0, 8);

  if (!due.length && !alp47CustomersState.repurchaseError) return "";

  if (alp47CustomersState.repurchaseError)
  {
    return `
      <div class="alp47-reminder-panel is-warning">
        <strong>${en ? "Repurchase suggestions unavailable" : "Sugerencias de recompra no disponibles"}</strong>
        <small>${escapeHtml(alp47CustomersState.repurchaseError)}</small>
      </div>
    `;
  }

  return `
    <div class="alp47-reminder-panel">
      <div class="alp47-reminder-heading">
        <div>
          <strong>${en ? "Repurchase follow-up" : "Seguimiento de recompra"}</strong>
          <small>${en ? "Suggested contacts that are already due." : "Contactos sugeridos cuya fecha ya llegó."}</small>
        </div>
        <span class="alp47-badge is-due">${due.length}</span>
      </div>

      <div class="alp47-reminder-list">
        ${due.map(reminder =>
        {
          const customer = alp47CustomersState.customers.find(item => item.id === reminder.customerId);
          const product = state.products.find(item => Number(item.id) === Number(reminder.productId));
          return `
            <div class="alp47-reminder-item">
              <div>
                <strong>${escapeHtml(customer?.fullName || `Cliente #${reminder.customerId}`)}</strong>
                <small>
                  ${escapeHtml(product?.nombre || (en ? "Fragrance follow-up" : "Seguimiento de fragancia"))}
                  · ${escapeHtml(alp47FormatDateTime(reminder.dueAt))}
                </small>
              </div>
              <button
                class="btn small outline"
                type="button"
                data-action="admin-customer-reminder"
                data-customer-id="${reminder.customerId}"
                data-product-id="${reminder.productId || ""}">
                ${en ? "Manage contact" : "Gestionar contacto"}
              </button>
            </div>
          `;
        }).join("")}
      </div>

      <p class="alp47-consent-note">
        ${en
          ? "Manual follow-up only. Contact customers only when you have permission to send commercial messages."
          : "Seguimiento manual únicamente. Contactá al cliente solo si tenés autorización para enviarle mensajes comerciales."}
      </p>
    </div>
  `;
}

function alp47RenderCustomerDetail()
{
  if (!alp47CustomersState.selectedCustomerId) return "";

  const en = state.language === "en";

  if (alp47CustomersState.detailLoading)
  {
    return `
      <div class="alp47-detail-backdrop">
        <aside class="alp47-detail-panel">
          <div class="alp47-loading"><div class="loader"></div><p>${en ? "Loading profile…" : "Cargando perfil…"}</p></div>
        </aside>
      </div>
    `;
  }

  if (alp47CustomersState.detailError)
  {
    return `
      <div class="alp47-detail-backdrop">
        <aside class="alp47-detail-panel">
          <button class="alp47-detail-close" type="button" data-action="admin-customer-close">×</button>
          <div class="admin-message error">${escapeHtml(alp47CustomersState.detailError)}</div>
        </aside>
      </div>
    `;
  }

  const detail = alp47CustomersState.detail;
  if (!detail) return "";

  const customer = detail.customer;

  return `
    <div class="alp47-detail-backdrop">
      <aside class="alp47-detail-panel">
        <button class="alp47-detail-close" type="button" data-action="admin-customer-close" aria-label="Cerrar">×</button>

        <div class="alp47-profile-head">
          <p class="eyebrow">${en ? "CUSTOMER PROFILE" : "PERFIL DE CLIENTE"}</p>
          <h2>${escapeHtml(customer.fullName)}</h2>
          <p>${escapeHtml(customer.phone || "—")} · ${escapeHtml(customer.email || "—")}</p>
        </div>

        <div class="alp47-detail-kpis">
          ${alp47Kpi(en ? "Paid orders" : "Pedidos pagados", formatInteger(detail.stats.orders), en ? "verified" : "verificados")}
          ${alp47Kpi(en ? "Lifetime spend" : "Gasto histórico", money(detail.stats.spent), en ? "paid orders" : "pedidos pagados")}
          ${alp47Kpi(en ? "Average ticket" : "Ticket promedio", money(detail.stats.averageTicket), en ? "per paid order" : "por pedido pagado")}
          ${alp47Kpi(en ? "Last purchase" : "Última compra", alp47FormatDateTime(detail.stats.lastOrderAt), en ? "paid" : "pagada")}
        </div>

        <div class="alp47-detail-actions">
          <button
            class="btn outline"
            type="button"
            data-action="admin-customer-reminder"
            data-customer-id="${customer.id}">
            ${en ? "Manage contact" : "Gestionar contacto"}
          </button>
        </div>

        <div class="alp47-detail-section">
          <h3>${en ? "Purchase history" : "Historial de compras"}</h3>
          ${detail.orders.length
            ? `<div class="alp47-order-list">${detail.orders.slice(0, 20).map(order => alp47RenderOrder(order)).join("")}</div>`
            : `<p class="alp47-empty">${en ? "No orders found." : "No hay pedidos registrados."}</p>`}
        </div>

        <div class="alp47-detail-section">
          <h3>${en ? "Fragrances purchased" : "Perfumes comprados"}</h3>
          ${detail.products.length
            ? `<div class="alp47-product-history">${detail.products.map(item => alp47RenderPurchasedProduct(item)).join("")}</div>`
            : `<p class="alp47-empty">${en ? "No product history yet." : "Todavía no hay historial de productos."}</p>`}
        </div>

        <div class="alp47-detail-section">
          <h3>${en ? "Repurchase suggestions" : "Sugerencias de recompra"}</h3>
          ${detail.reminders.length
            ? `<div class="alp47-order-list">${detail.reminders.map(reminder => alp47RenderCustomerReminder(reminder)).join("")}</div>`
            : `<p class="alp47-empty">${en ? "No active repurchase suggestions." : "No hay sugerencias activas de recompra."}</p>`}
          <p class="alp47-consent-note">
            ${en
              ? "The site does not message customers automatically. Use follow-up only with the customer's consent."
              : "La tienda no envía mensajes automáticamente. Usá el seguimiento únicamente con consentimiento del cliente."}
          </p>
        </div>
      </aside>
    </div>
  `;
}

function alp47RenderOrder(order)
{
  const en = state.language === "en";
  return `
    <article class="alp47-order-card">
      <div>
        <strong>${escapeHtml(order.order_code || `#${order.id}`)}</strong>
        <small>${escapeHtml(alp47FormatDateTime(order.payment_confirmed_at || order.completed_at || order.created_at))}</small>
      </div>
      <div class="alp47-order-status">
        <span>${escapeHtml(order.status || "—")}</span>
        <span>${escapeHtml(order.payment_status || "—")}</span>
      </div>
      <strong>${money(alp47Num(order.total, 0))}</strong>
    </article>
  `;
}

function alp47RenderPurchasedProduct(item)
{
  const en = state.language === "en";
  return `
    <article class="alp47-purchased-product">
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <small>${formatInteger(item.quantity)} ${en ? "units / selections" : "unidades / selecciones"}${item.ml ? ` · ${item.ml} ml` : ""}</small>
      </div>
      <div>
        <strong>${money(item.revenue)}</strong>
        <small>${formatInteger(item.orders)} ${en ? "orders" : "pedidos"}</small>
      </div>
    </article>
  `;
}

function alp47RenderCustomerReminder(reminder)
{
  const product = state.products.find(item => Number(item.id) === Number(reminder.productId));
  const en = state.language === "en";
  return `
    <article class="alp47-order-card">
      <div>
        <strong>${escapeHtml(product?.nombre || (en ? "Fragrance follow-up" : "Seguimiento de fragancia"))}</strong>
        <small>${escapeHtml(reminder.dueAt ? alp47FormatDateTime(reminder.dueAt) : (en ? "Date not available" : "Fecha no disponible"))}</small>
      </div>
      <span class="alp47-badge ${alp47ReminderIsDue(reminder) ? "is-due" : ""}">${escapeHtml(reminder.status || "pending")}</span>
    </article>
  `;
}

async function alp47OpenCustomer(customerId)
{
  const id = Number(customerId);
  const customer = alp47CustomersState.customers.find(item => item.id === id);
  if (!customer) return;

  alp47CustomersState.selectedCustomerId = id;
  alp47CustomersState.detailLoading = true;
  alp47CustomersState.detailError = "";
  alp47CustomersState.detail = null;
  alp47RenderCustomersTab();

  try
  {
    const ordersResult = await supabaseClient
      .from("orders")
      .select("id,order_code,customer_id,status,payment_status,total,created_at,completed_at,payment_confirmed_at")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .range(0, 199);

    if (ordersResult.error) throw ordersResult.error;

    const orders = Array.isArray(ordersResult.data) ? ordersResult.data : [];
    const orderIds = orders.map(order => Number(order.id)).filter(Boolean);

    let items = [];
    if (orderIds.length)
    {
      const itemsResult = await supabaseClient
        .from("order_items")
        .select("order_id,product_id,item_type,quantity,ml,unit_price,total_price,display_name,metadata")
        .in("order_id", orderIds)
        .range(0, 999);

      if (itemsResult.error) throw itemsResult.error;
      items = Array.isArray(itemsResult.data) ? itemsResult.data : [];
    }

    const validOrderIds = new Set(
      orders
        .filter(order => order.payment_status === "pagado" && order.status !== "cancelado")
        .map(order => Number(order.id))
    );

    const paidOrders = orders.filter(order => validOrderIds.has(Number(order.id)));
    const spent = paidOrders.reduce((sum, order) => sum + alp47Num(order.total, 0), 0);

    const productMap = new Map();
    items
      .filter(item => validOrderIds.has(Number(item.order_id)))
      .forEach(item =>
      {
        const productId = Number(item.product_id) || 0;
        const product = state.products.find(candidate => Number(candidate.id) === productId);
        const key = productId
          ? `product:${productId}:${item.ml || 0}`
          : `label:${alp47Text(item.display_name)}:${item.ml || 0}`;

        if (!productMap.has(key))
        {
          productMap.set(key, {
            productId: productId || null,
            name: alp47Text(item.display_name) || product?.nombre || "Producto",
            quantity: 0,
            revenue: 0,
            orders: new Set(),
            ml: alp47Num(item.ml, 0) || null,
          });
        }

        const entry = productMap.get(key);
        entry.quantity += Math.max(1, alp47Num(item.quantity, 1));
        entry.revenue += alp47Num(item.total_price, alp47Num(item.unit_price, 0) * Math.max(1, alp47Num(item.quantity, 1)));
        entry.orders.add(Number(item.order_id));
      });

    const products = [...productMap.values()]
      .map(item => ({ ...item, orders: item.orders.size }))
      .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue);

    alp47CustomersState.detail = {
      customer,
      orders,
      products,
      reminders: alp47CustomersState.reminders.filter(reminder => reminder.customerId === id && !alp47ReminderIsClosed(reminder)),
      stats: {
        orders: paidOrders.length,
        spent,
        averageTicket: paidOrders.length ? spent / paidOrders.length : 0,
        lastOrderAt: paidOrders.length
          ? (paidOrders[0].payment_confirmed_at || paidOrders[0].completed_at || paidOrders[0].created_at)
          : null,
      },
    };
  }
  catch (error)
  {
    console.error("PASO47 detail:", error);
    alp47CustomersState.detailError = error?.message || String(error);
  }
  finally
  {
    alp47CustomersState.detailLoading = false;
    alp47RenderCustomersTab();
  }
}

function alp47CloseCustomer()
{
  alp47CustomersState.selectedCustomerId = null;
  alp47CustomersState.detailLoading = false;
  alp47CustomersState.detailError = "";
  alp47CustomersState.detail = null;
  alp47RenderCustomersTab();
}

function alp47ApplyCustomerSearchFromInput()
{
  const input = document.getElementById("adminCustomerSearch");
  alp47CustomersState.query = alp47Text(input?.value);
  alp47CustomersState.page = 1;
  alp47RenderCustomersTab();
}

function alp47SetCustomerPage(page)
{
  alp47CustomersState.page = Math.max(1, Number(page) || 1);
  alp47RenderCustomersTab();
}

function alp47NormalizeArgentinaWhatsApp(phone)
{
  let digits = String(phone || "").replace(/\D/g, "");
  digits = digits.replace(/^00/, "");
  digits = digits.replace(/^0+/, "");

  if (digits.startsWith("54")) return digits;

  // Números móviles argentinos guardados como código de área + número.
  if (digits.length === 10) return `549${digits}`;

  return digits;
}

async function alp47OpenReminderWhatsApp(customerId, productId = null)
{
  if (typeof alp60OpenCustomerFollowup === "function")
  {
    await alp60OpenCustomerFollowup(customerId, productId);
    return;
  }

  const customer = alp47CustomersState.customers.find(item => item.id === Number(customerId));
  if (!customer)
  {
    adminMessage(state.language === "en" ? "Customer not found." : "Cliente no encontrado.", "error");
    return;
  }

  const number = alp47NormalizeArgentinaWhatsApp(customer.phoneNormalized || customer.phone);
  if (!number)
  {
    adminMessage(state.language === "en" ? "This customer has no phone number." : "Este cliente no tiene teléfono cargado.", "error");
    return;
  }

  const product = state.products.find(item => Number(item.id) === Number(productId));
  const firstName = customer.fullName.split(/\s+/)[0] || customer.fullName;

  const message = state.language === "en"
    ? `Hi ${firstName}! How are you? This is AromaLParfum. We wanted to check in${product ? ` regarding ${product.nombre}` : " about your last fragrance purchase"}. If you'd like, we can help you choose your next fragrance or replacement.`
    : `¡Hola ${firstName}! ¿Cómo estás? Somos AromaLParfum. Queríamos hacer un seguimiento${product ? ` de ${product.nombre}` : " de tu última compra de fragancias"}. Si querés, podemos ayudarte con una reposición o a elegir tu próximo perfume.`;

  window.open(
    `https://wa.me/${number}?text=${encodeURIComponent(message)}`,
    "_blank",
    "noopener"
  );
}

function alp47RenderCustomersTab()
{
  if (state.admin?.tab !== "customers") return;

  const host = document.getElementById("adminTabContent");
  if (!host) return;

  host.innerHTML = renderAdminCustomersV2();
}

window.renderAdminCustomersV2 = renderAdminCustomersV2;
window.alp47EnsureCustomersLoaded = alp47EnsureCustomersLoaded;
window.alp47LoadCustomers = alp47LoadCustomers;
window.alp47OpenCustomer = alp47OpenCustomer;
window.alp47CloseCustomer = alp47CloseCustomer;
window.alp47ApplyCustomerSearchFromInput = alp47ApplyCustomerSearchFromInput;
window.alp47SetCustomerPage = alp47SetCustomerPage;
window.alp47OpenReminderWhatsApp = alp47OpenReminderWhatsApp;
