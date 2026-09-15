"use strict";

// AromaLParfum Frontend V2 — Paso 37
// Módulo: administración

function normalizeEmail(
  value
)
{
  return String(
    value ||
    ""
  )
  .trim()
  .toLowerCase();
}

function isAdminEmail(
  email
)
{
  return CONFIG.adminEmails.includes(
    normalizeEmail(
      email
    )
  );
}

async function getCurrentSession()
{
  const result =
  await supabaseClient.auth.getSession();

  if (
    result.error
  )
  {
    console.warn(
      "getSession:",
      result.error.message
    );

    return null;
  }

  return result.data?.session
  ||
  null;
}

async function reloadAdminData()
{
  adminMessage(
    state.language === "en" ? "Refreshing..." : "Actualizando...",
    "ok"
  );

  try
  {
    switch (state.admin.tab)
    {
      case "dashboard":
        if (typeof alp48LoadDashboard === "function")
        {
          await alp48LoadDashboard({ force: true });
        }
        break;

      case "analytics":
        if (typeof alp61LoadAdminAnalytics === "function")
        {
          await alp61LoadAdminAnalytics({ force: true });
        }
        break;

      case "settings":
        await loadSiteSettings();
        await Promise.all([
          loadSiteCoverUrls(),
          loadSeasonalVideoUrl(),
        ]);
        break;

      case "collections":
        await Promise.all([
          loadCollections(),
          loadSiteSettings(),
        ]);
        await loadSiteCoverUrls();
        break;

      case "games":
        await Promise.all([
          loadGameConfigs(),
          loadDailyLeaderboard(),
        ]);
        break;

      case "stats":
        await Promise.all([
          loadPopularity(),
          loadDailyLeaderboard(),
        ]);
        break;

      case "inventory":
        if (typeof alp50LoadInventory === "function")
        {
          await alp50LoadInventory({ force: true });
        }
        break;

      case "finance":
        if (typeof alp51LoadFinance === "function")
        {
          await alp51LoadFinance({ force: true });
        }
        break;

      case "merchandising":
        if (typeof alp52LoadMerchandising === "function")
        {
          await alp52LoadMerchandising({ force: true });
        }
        break;

      case "packs":
        if (typeof alp53LoadPacks === "function")
        {
          await alp53LoadPacks({ force: true });
        }
        break;

      case "customers":
        if (typeof alp47LoadCustomers === "function")
        {
          await alp47LoadCustomers({ force: true });
        }
        break;

      case "orders":
        if (typeof alp49LoadOrders === "function")
        {
          await alp49LoadOrders({ force: true });
        }
        break;

      case "reviews":
        if (typeof alp58LoadReviews === "function")
        {
          alp58ReviewsState.loaded = false;
          await alp58LoadReviews({ force: true });
        }
        break;

      case "club":
        if (typeof alp59LoadClub === "function")
        {
          alp59ClubState.loaded = false;
          await alp59LoadClub({ force: true });
        }
        break;

      case "reactivation":
        if (typeof alp60LoadReactivation === "function")
        {
          crm60State.loaded = false;
          await alp60LoadReactivation({ force: true });
        }
        break;

      case "new":
      case "products":
      default:
        await loadProducts();
        break;
    }

    refreshAdminTab();

    adminMessage(
      state.language === "en" ? "Updated." : "Actualizado.",
      "ok"
    );
  }
  catch (error)
  {
    adminMessage(
      error?.message || String(error),
      "error"
    );
  }
}

async function renderAdminRoute()
{
  const app =
  document.getElementById(
    "app"
  );

  if (!app)
  {
    return;
  }

  // Si ya tenemos una sesión admin válida en memoria, no volvemos a pedirla
  // en cada render del panel. onAuthStateChange mantiene este valor al día.
  let user =
  state.admin.currentUser;

  if (!user)
  {
    app.innerHTML =
    `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>${escapeHtml(t("common.loading"))}</p>
      </div>
    `;

    const session =
    await getCurrentSession();

    if (!session)
    {
      state.admin.currentUser = null;
      app.innerHTML = renderAdminLogin();
      return;
    }

    user = session.user;
  }

  if (!isAdminEmail(user?.email))
  {
    await supabaseClient.auth.signOut();
    state.admin.currentUser = null;

    app.innerHTML =
    `
      <section class="section">
        <div class="container">
          <div class="empty-state">
            <h3>${state.language === "en" ? "Access denied" : "Sin permisos"}</h3>
            <p>${state.language === "en"
              ? "This account is not authorized to manage AromaLParfum."
              : "Esta cuenta no está autorizada para administrar AromaLParfum."
            }</p>
          </div>
        </div>
      </section>
    `;

    return;
  }

  state.admin.currentUser = user;

  // IMPORTANTE: no llamamos loadProductImages() acá. Esa función trae todas
  // las fotos secundarias de todo el catálogo. El admin usa la foto principal
  // ya cargada y consulta la galería de un producto solo cuando se solicita.
  app.innerHTML = renderAdminDashboard();

  if (state.admin.tab === "dashboard" && typeof alp48EnsureDashboardLoaded === "function")
  {
    queueMicrotask(() => alp48EnsureDashboardLoaded());
  }
}


function renderAdminLogin()
{
  return `
    <section class="section">
      <div class="container">
        <div
          class="settings-card"
          style="
            max-width:500px;
            margin:0 auto;
          ">
          <p class="eyebrow">
            AromaLParfum
          </p>

          <h1 class="section-title">
            ${escapeHtml(t("admin.title"))}
          </h1>

          <p class="section-subtitle">
            ${escapeHtml(t("admin.login"))}
          </p>

          <div class="admin-form u-mt-20">
            <div class="admin-field">
              <label for="adminLoginEmail">
                ${escapeHtml(t("admin.email"))}
              </label>

              <input
                id="adminLoginEmail"
                class="text-input"
                type="email"
                autocomplete="username">
            </div>

            <div class="admin-field">
              <label for="adminLoginPassword">
                ${escapeHtml(t("admin.password"))}
              </label>

              <input
                id="adminLoginPassword"
                class="text-input"
                type="password"
                autocomplete="current-password">
            </div>

            <button
              class="btn"
              type="button"
              data-action="admin-login">
              ${escapeHtml(t("admin.enter"))}
            </button>

            <button
              class="btn outline"
              type="button"
              data-action="admin-recover">
              ${state.language === "en" ? "Recover password" : "Recuperar contraseña"}
            </button>
          </div>
        </div>
      </div>
    </section>
  `;
}

async function adminLogin()
{
  const email =
  document.getElementById(
    "adminLoginEmail"
  )?.value.trim()
  ||
  "";

  const password =
  document.getElementById(
    "adminLoginPassword"
  )?.value
  ||
  "";

  if (
    !email ||
    !password
  )
  {
    toast(
      state.language === "en"
      ?
      "Enter email and password."
      :
      "Completá email y contraseña.",
      "error"
    );

    return;
  }

  const result =
  await supabaseClient.auth.signInWithPassword(
    {
      email:
      email,

      password:
      password,
    }
  );

  if (
    result.error
  )
  {
    toast(
      result.error.message,
      "error"
    );

    return;
  }

  if (
    !isAdminEmail(
      result.data?.user?.email
    )
  )
  {
    await supabaseClient.auth.signOut();

    toast(
      state.language === "en"
      ?
      "This account is not an administrator."
      :
      "Esta cuenta no es administradora.",
      "error"
    );

    return;
  }

  state.admin.currentUser =
  result.data.user;

  renderCurrentRoute();
}

async function adminRecoverPassword()
{
  const email =
  document.getElementById(
    "adminLoginEmail"
  )?.value.trim()
  ||
  "";

  if (
    !email
  )
  {
    toast(
      state.language === "en"
      ?
      "Enter your email first."
      :
      "Primero escribí tu email.",
      "error"
    );

    return;
  }

  const result =
  await supabaseClient.auth.resetPasswordForEmail(
    email,
    {
      redirectTo:
      window.location.origin +
      window.location.pathname,
    }
  );

  if (
    result.error
  )
  {
    toast(
      result.error.message,
      "error"
    );

    return;
  }

  toast(
    state.language === "en"
    ?
    "Check your email."
    :
    "Revisá tu correo."
  );
}

async function adminLogout()
{
  await supabaseClient.auth.signOut();

  state.admin.currentUser =
  null;

  state.route =
  "home";

  renderCurrentRoute();
}

function renderAdminDashboard()
{
  const lowStock =
  state.products.filter(
    product =>
    product.stock > 0 &&
    product.stock <= 2
  ).length;

  const outStock =
  state.products.filter(
    product =>
    product.stock <= 0
  ).length;

  const featured =
  state.products.filter(
    product =>
    product.destacado
  ).length;

  const newCount =
  state.products.filter(
    isNewProduct
  ).length;

  const totalAdds =
  [
    ...state.popularity.values(),
  ]
  .reduce(
    (
      sum,
      value
    ) =>
    sum +
    asNumber(
      value,
      0
    ),
    0
  );

  return `
    <div class="admin-shell">
      <div class="admin-head">
        <div>
          <p class="eyebrow">
            AromaLParfum
          </p>

          <h1>
            ${escapeHtml(t("admin.title"))}
          </h1>

          <p class="section-subtitle">
            ${escapeHtml(state.admin.currentUser?.email || "")}
          </p>
        </div>

        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button
            class="btn outline"
            type="button"
            data-action="admin-reload">
            ${state.language === "en" ? "Refresh" : "Actualizar"}
          </button>

          <button
            class="btn danger"
            type="button"
            data-action="admin-logout">
            ${escapeHtml(t("admin.logout"))}
          </button>
        </div>
      </div>

      <div class="admin-stats">
        ${renderAdminStat(state.language === "en" ? "Products" : "Productos", state.products.length)}
        ${renderAdminStat(state.language === "en" ? "Featured" : "Destacados", featured)}
        ${renderAdminStat(state.language === "en" ? "New" : "Nuevos", newCount)}
        ${renderAdminStat(state.language === "en" ? "Low stock" : "Stock bajo", lowStock)}
        ${renderAdminStat(state.language === "en" ? "Out of stock" : "Sin stock", outStock)}
        ${renderAdminStat(state.language === "en" ? "Cart adds" : "Agregados al carrito", totalAdds)}
      </div>

      <div class="admin-tabs">
        ${renderAdminTabButton("dashboard", state.language === "en" ? "Dashboard" : "Dashboard")}
        ${renderAdminTabButton("analytics", state.language === "en" ? "Analytics" : "Analytics")}
        ${renderAdminTabButton("products", t("admin.products"))}
        ${renderAdminTabButton("new", t("admin.new"))}
        ${renderAdminTabButton("settings", t("admin.settings"))}
        ${renderAdminTabButton("collections", t("admin.collections"))}
        ${renderAdminTabButton("merchandising", state.language === "en" ? "Merchandising" : "Merchandising")}
        ${renderAdminTabButton("packs", state.language === "en" ? "Sets & Boxes" : "Sets & Boxes")}
        ${renderAdminTabButton("games", t("admin.games"))}
        ${renderAdminTabButton("stats", t("admin.stats"))}
        ${renderAdminTabButton("orders", state.language === "en" ? "Orders" : "Pedidos")}
        ${renderAdminTabButton("reviews", state.language === "en" ? "Reviews" : "Reseñas")}
        ${renderAdminTabButton("club", state.language === "en" ? "Club" : "Club")}
        ${renderAdminTabButton("inventory", state.language === "en" ? "Inventory" : "Inventario")}
        ${renderAdminTabButton("finance", state.language === "en" ? "Finance" : "Finanzas")}
        ${renderAdminTabButton("customers", state.language === "en" ? "Customers" : "Clientes")}
        ${renderAdminTabButton("reactivation", state.language === "en" ? "Reactivation" : "Reactivación")}
      </div>

      <div id="adminMessage"></div>

      <div id="adminTabContent">
        ${renderAdminTabContent()}
      </div>
    </div>
  `;
}

function renderAdminStat(
  label,
  value
)
{
  return `
    <div class="admin-stat">
      <span>
        ${escapeHtml(label)}
      </span>

      <strong>
        ${formatInteger(value)}
      </strong>
    </div>
  `;
}

function renderAdminTabButton(
  tab,
  label
)
{
  return `
    <button
      class="admin-tab ${state.admin.tab === tab ? "active" : ""}"
      type="button"
      data-action="admin-tab"
      data-tab="${escapeAttribute(tab)}">
      ${escapeHtml(label)}
    </button>
  `;
}

function renderAdminTabContent()
{
  switch (
    state.admin.tab
  )
  {
    case "dashboard":
    {
      return typeof renderAdminDashboardV2 === "function"
        ? renderAdminDashboardV2()
        : `<div class="admin-message error">Dashboard V2 no disponible.</div>`;
    }

    case "analytics":
    {
      return typeof renderAdminAnalyticsV2 === "function"
        ? renderAdminAnalyticsV2()
        : `<div class="admin-message error">Módulo Analytics V2 no disponible.</div>`;
    }

    case "new":
    {
      return renderAdminNewProduct();
    }

    case "settings":
    {
      return renderAdminSettings();
    }

    case "collections":
    {
      return typeof renderAdminCollectionsV2 === "function"
        ? renderAdminCollectionsV2()
        : renderAdminCollections();
    }

    case "games":
    {
      return renderAdminGames();
    }

    case "stats":
    {
      return renderAdminStats();
    }

    case "inventory":
    {
      return typeof renderAdminInventoryV2 === "function"
        ? renderAdminInventoryV2()
        : `<div class="admin-message error">Módulo Inventario V2 no disponible.</div>`;
    }

    case "finance":
    {
      return typeof renderAdminFinanceV2 === "function"
        ? renderAdminFinanceV2()
        : `<div class="admin-message error">Módulo Finanzas V2 no disponible.</div>`;
    }

    case "merchandising":
    {
      return typeof renderAdminMerchandisingV2 === "function"
        ? renderAdminMerchandisingV2()
        : `<div class="admin-message error">Módulo Merchandising V2 no disponible.</div>`;
    }

    case "packs":
    {
      return typeof renderAdminGiftPacksV2 === "function"
        ? renderAdminGiftPacksV2()
        : `<div class="admin-message error">Módulo Gift Sets + Discovery Boxes no disponible.</div>`;
    }

    case "customers":
    {
      return typeof renderAdminCustomersV2 === "function"
        ? renderAdminCustomersV2()
        : `<div class="admin-message error">Módulo Clientes V2 no disponible.</div>`;
    }

    case "orders":
    {
      return typeof renderAdminOrdersV2 === "function"
        ? renderAdminOrdersV2()
        : `<div class="admin-message error">Módulo Pedidos V2 no disponible.</div>`;
    }

    case "reviews":
    {
      return typeof renderAdminReviewsV2 === "function"
        ? renderAdminReviewsV2()
        : `<div class="admin-message error">Módulo Reseñas V2 no disponible.</div>`;
    }

    case "club":
    {
      return typeof renderAdminClubV2 === "function"
        ? renderAdminClubV2()
        : `<div class="admin-message error">Módulo Club AromaLParfum no disponible.</div>`;
    }

    case "reactivation":
    {
      return typeof renderAdminReactivationV2 === "function"
        ? renderAdminReactivationV2()
        : `<div class="admin-message error">Módulo Reactivación CRM V2 no disponible.</div>`;
    }

    case "products":
    default:
    {
      return renderAdminProducts();
    }
  }
}

function refreshAdminTab()
{
  const host =
  document.getElementById(
    "adminTabContent"
  );

  if (
    host
  )
  {
    host.innerHTML =
    renderAdminTabContent();
  }

  if (state.admin.tab === "dashboard" && typeof alp48EnsureDashboardLoaded === "function")
  {
    queueMicrotask(() => alp48EnsureDashboardLoaded());
  }

  if (state.admin.tab === "analytics" && typeof alp61EnsureAdminAnalyticsLoaded === "function")
  {
    queueMicrotask(() => alp61EnsureAdminAnalyticsLoaded());
  }

  if (state.admin.tab === "inventory" && typeof alp50EnsureInventoryLoaded === "function")
  {
    queueMicrotask(() => alp50EnsureInventoryLoaded());
  }

  if (state.admin.tab === "finance" && typeof alp51EnsureFinanceLoaded === "function")
  {
    queueMicrotask(() => alp51EnsureFinanceLoaded());
  }

  if (state.admin.tab === "merchandising" && typeof alp52EnsureMerchandisingLoaded === "function")
  {
    queueMicrotask(() => alp52EnsureMerchandisingLoaded());
  }

  if (state.admin.tab === "packs" && typeof alp53EnsureLoaded === "function")
  {
    queueMicrotask(() => alp53EnsureLoaded());
  }

  if (state.admin.tab === "customers" && typeof alp47EnsureCustomersLoaded === "function")
  {
    queueMicrotask(() => alp47EnsureCustomersLoaded());
  }

  if (state.admin.tab === "orders" && typeof alp49EnsureOrdersLoaded === "function")
  {
    queueMicrotask(() => alp49EnsureOrdersLoaded());
  }

  if (state.admin.tab === "reviews" && typeof alp58EnsureReviewsLoaded === "function")
  {
    queueMicrotask(() => alp58EnsureReviewsLoaded());
  }

  if (state.admin.tab === "club" && typeof alp59EnsureClubLoaded === "function")
  {
    queueMicrotask(() => alp59EnsureClubLoaded());
  }

  if (state.admin.tab === "reactivation" && typeof alp60EnsureLoaded === "function")
  {
    queueMicrotask(() => alp60EnsureLoaded());
  }

  document.querySelectorAll(
    ".admin-tab"
  )
  .forEach(
    button =>
    {
      button.classList.toggle(
        "active",
        button.dataset.tab ===
        state.admin.tab
      );
    }
  );
}

function adminMessage(
  message,
  type = "ok"
)
{
  const host =
  document.getElementById(
    "adminMessage"
  );

  if (
    !host
  )
  {
    toast(
      message,
      type === "error"
      ?
      "error"
      :
      "success"
    );

    return;
  }

  host.innerHTML =
  `
    <div class="admin-message ${type}">
      ${escapeHtml(message)}
    </div>
  `;
}

function getAdminFilteredProducts()
{
  const term =
  normalizeText(
    state.admin.productSearch
  );

  if (!term)
  {
    return state.products;
  }

  return state.products.filter(
    product =>
    {
      const haystack =
      normalizeText(
        [
          product.id,
          product.nombre,
          product.marca,
          product.categoria,
          product.genero,
          product.tipo_producto,
          product.ml,
        ]
        .filter(value => value !== null && value !== undefined)
        .join(" ")
      );

      return haystack.includes(term);
    }
  );
}

function getAdminProductPageData()
{
  const list =
  getAdminFilteredProducts();

  const pageSize =
  Math.max(
    10,
    asNumber(
      state.admin.productPageSize,
      20
    )
  );

  const totalPages =
  Math.max(
    1,
    Math.ceil(
      list.length / pageSize
    )
  );

  state.admin.productPage =
  Math.min(
    totalPages,
    Math.max(
      1,
      asNumber(
        state.admin.productPage,
        1
      )
    )
  );

  const start =
  (state.admin.productPage - 1) * pageSize;

  return {
    list,
    pageSize,
    totalPages,
    start,
    items: list.slice(start, start + pageSize),
  };
}

function renderAdminProductPagination(totalPages)
{
  if (totalPages <= 1)
  {
    return "";
  }

  const page =
  state.admin.productPage;

  const buttons =
  [];

  const from =
  Math.max(1, page - 2);

  const to =
  Math.min(totalPages, page + 2);

  for (let current = from; current <= to; current += 1)
  {
    buttons.push(
      `
        <button
          class="btn small ${current === page ? "" : "outline"}"
          type="button"
          data-action="admin-product-page"
          data-page="${current}">
          ${current}
        </button>
      `
    );
  }

  return `
    <div style="display:flex;gap:6px;align-items:center;justify-content:center;flex-wrap:wrap;margin-top:14px">
      <button
        class="btn outline small"
        type="button"
        data-action="admin-product-page"
        data-page="${Math.max(1, page - 1)}"
        ${page <= 1 ? "disabled" : ""}>
        ‹
      </button>

      ${buttons.join("")}

      <button
        class="btn outline small"
        type="button"
        data-action="admin-product-page"
        data-page="${Math.min(totalPages, page + 1)}"
        ${page >= totalPages ? "disabled" : ""}>
        ›
      </button>

      <span style="font-size:11px;color:var(--muted);margin-left:6px">
        ${page} / ${totalPages}
      </span>
    </div>
  `;
}

function renderAdminProducts()
{
  const page =
  getAdminProductPageData();

  return `
    <div class="settings-card" style="margin-bottom:12px;padding:12px">
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <input
          id="adminProductSearch"
          class="text-input"
          type="search"
          autocomplete="off"
          placeholder="${state.language === "en" ? "Search product, brand, category or ID..." : "Buscar perfume, marca, categoría o ID..."}"
          value="${escapeAttribute(state.admin.productSearch)}"
          style="flex:1;min-width:220px">

        <select
          id="adminProductPageSize"
          class="select-input"
          style="width:auto;min-width:95px">
          ${[20, 40, 80].map(size => `
            <option value="${size}" ${size === Number(state.admin.productPageSize) ? "selected" : ""}>
              ${size} / pág.
            </option>
          `).join("")}
        </select>

        <span style="font-size:11px;color:var(--muted)">
          ${formatInteger(page.list.length)} ${state.language === "en" ? "results" : "resultados"}
        </span>
      </div>
    </div>

    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>${escapeHtml(t("admin.photos"))}</th>
            <th>${escapeHtml(t("admin.name"))}</th>
            <th>${escapeHtml(t("admin.brand"))}</th>
            <th>${escapeHtml(t("admin.price"))}</th>
            <th>${escapeHtml(t("admin.ml"))}</th>
            <th>${escapeHtml(t("admin.stock"))}</th>
            <th>${escapeHtml(t("admin.category"))}</th>
            <th>${escapeHtml(t("admin.gender"))}</th>
            <th>${escapeHtml(t("admin.family"))}</th>
            <th>${escapeHtml(t("admin.description"))}</th>
            <th>${escapeHtml(t("admin.top"))}</th>
            <th>${escapeHtml(t("admin.heart"))}</th>
            <th>${escapeHtml(t("admin.base"))}</th>
            <th>${escapeHtml(t("admin.duration"))}</th>
            <th>${escapeHtml(t("admin.projection"))}</th>
            <th>${escapeHtml(t("admin.seasons"))}</th>
            <th>${escapeHtml(t("admin.occasions"))}</th>
            <th>${escapeHtml(t("admin.type"))}</th>
            <th>${escapeHtml(t("admin.featured"))}</th>
            <th>${escapeHtml(t("admin.newflag"))}</th>
            <th>${escapeHtml(t("admin.save"))}</th>
          </tr>
        </thead>

        <tbody>
          ${page.items
            .map(product => renderAdminProductRow(product))
            .join("")
          }
        </tbody>
      </table>
    </div>

    ${renderAdminProductPagination(page.totalPages)}
  `;
}

function renderAdminProductRow(
  product
)
{
  return `
    <tr data-product-row="${product.id}">
      <td data-admin-photo-cell="${product.id}">
        ${renderAdminPhotoCell(product)}
      </td>

      <td>
        <input
          id="ap-name-${product.id}"
          value="${escapeAttribute(product.nombre)}">
      </td>

      <td>
        <input
          id="ap-brand-${product.id}"
          value="${escapeAttribute(product.marca)}">
      </td>

      <td>
        <input
          id="ap-price-${product.id}"
          type="number"
          min="0"
          value="${product.precio}">
      </td>

      <td>
        <input
          id="ap-ml-${product.id}"
          type="number"
          min="0"
          value="${product.ml}">
      </td>

      <td>
        <input
          id="ap-stock-${product.id}"
          type="number"
          min="0"
          value="${product.stock}">
      </td>

      <td>
        ${renderAdminCategorySelect(product)}
      </td>

      <td>
        ${renderAdminGenderSelect(product)}
      </td>

      <td>
        <input
          id="ap-family-${product.id}"
          value="${escapeAttribute(product.familia)}">
      </td>

      <td>
        <textarea
          id="ap-description-${product.id}">${escapeHtml(product.descripcion)}</textarea>
      </td>

      <td>
        <input
          id="ap-top-${product.id}"
          value="${escapeAttribute(product.salida)}">
      </td>

      <td>
        <input
          id="ap-heart-${product.id}"
          value="${escapeAttribute(product.corazon)}">
      </td>

      <td>
        <input
          id="ap-base-${product.id}"
          value="${escapeAttribute(product.fondo)}">
      </td>

      <td>
        <input
          id="ap-duration-${product.id}"
          value="${escapeAttribute(product.duracion)}">
      </td>

      <td>
        <input
          id="ap-projection-${product.id}"
          value="${escapeAttribute(product.proyeccion)}">
      </td>

      <td>
        <input
          id="ap-seasons-${product.id}"
          value="${escapeAttribute(arrayToInput(product.estaciones))}">
      </td>

      <td>
        <input
          id="ap-occasions-${product.id}"
          value="${escapeAttribute(arrayToInput(product.ocasiones))}">
      </td>

      <td>
        ${renderAdminProductTypeSelect(product)}
      </td>

      <td style="text-align:center">
        <input
          id="ap-featured-${product.id}"
          type="checkbox"
          ${product.destacado ? "checked" : ""}>
      </td>

      <td style="text-align:center">
        <input
          id="ap-new-${product.id}"
          type="checkbox"
          ${isNewProduct(product) ? "checked" : ""}>

        ${product.new_until
          ?
          `
            <div style="font-size:8px;margin-top:5px">
              ${escapeHtml(formatDate(product.new_until))}
            </div>
          `
          :
          ""
        }
      </td>

      <td>
        <div style="display:grid;gap:6px;min-width:105px">
          <button
            class="btn small"
            type="button"
            data-action="admin-save-product"
            data-product-id="${product.id}">
            ${escapeHtml(t("admin.save"))}
          </button>

          <button
            class="btn soft small"
            type="button"
            data-action="admin-ai-existing"
            data-product-id="${product.id}"
            ${isAiEnabled("admin_assistant_enabled") ? "" : "disabled"}>
            ✦ IA
          </button>

          <button
            class="btn danger small"
            type="button"
            data-action="admin-delete-product"
            data-product-id="${product.id}">
            ${escapeHtml(t("admin.delete"))}
          </button>
        </div>
      </td>
    </tr>
  `;
}

function renderAdminPhotoCell(product)
{
  return `
    ${renderAdminPhotos(product)}

    <input
      type="file"
      accept="image/*"
      multiple
      data-admin-upload="${product.id}">
  `;
}

function updateAdminPhotoCell(productId)
{
  const id =
  Number(productId);

  const product =
  getProductById(id);

  const cell =
  document.querySelector(
    `[data-admin-photo-cell="${id}"]`
  );

  if (product && cell)
  {
    cell.innerHTML =
    renderAdminPhotoCell(product);
  }
}

function renderAdminPhotos(
  product
)
{
  const id =
  Number(product.id);

  const meta =
  state.productImageMeta[id]
  ||
  [];

  const galleryLoaded =
  state.productGalleryLoaded.has(id);

  const loading =
  state.productGalleryLoading.has(id);

  const visibleMeta =
  galleryLoaded
  ? meta
  : meta.slice(0, 1);

  return `
    <div class="admin-photo-list">
      ${visibleMeta.length
        ? visibleMeta.map(
            (image, index) =>
            `
              <div class="admin-photo">
                ${image.url
                  ? `
                    <img
                      src="${escapeAttribute(image.url)}"
                      alt=""
                      loading="lazy"
                      decoding="async"
                      fetchpriority="low">
                  `
                  : ""
                }

                ${image.id && galleryLoaded
                  ? `
                    <button
                      type="button"
                      title="${escapeAttribute(t("admin.delete"))}"
                      data-action="admin-delete-photo"
                      data-image-id="${image.id}"
                      data-product-id="${product.id}"
                      data-storage-path="${escapeAttribute(image.path || "")}">
                      ×
                    </button>
                  `
                  : ""
                }

                ${index === 0
                  ? `
                    <span
                      style="position:absolute;left:2px;bottom:2px;background:var(--dark);color:#fff;font-size:7px;padding:2px 4px">
                      MAIN
                    </span>
                  `
                  : ""
                }
              </div>
            `
          ).join("")
        : `
          <span style="font-size:9px;color:var(--muted)">
            ${state.language === "en" ? "No photos" : "Sin fotos"}
          </span>
        `
      }
    </div>

    ${!galleryLoaded
      ? `
        <button
          class="btn outline small"
          style="margin-top:5px;width:100%"
          type="button"
          data-action="admin-load-gallery"
          data-product-id="${product.id}"
          ${loading ? "disabled" : ""}>
          ${loading
            ? (state.language === "en" ? "Loading..." : "Cargando...")
            : (state.language === "en" ? "Manage photos" : "Gestionar fotos")
          }
        </button>
      `
      : ""
    }
  `;
}

function renderAdminCategorySelect(
  product
)
{
  const categories =
  [
    "Árabe",
    "Argentina",
    "Nicho",
    "Diseñador",
    "Otros",
  ];

  if (
    product.categoria &&
    !categories.includes(
      product.categoria
    )
  )
  {
    categories.push(
      product.categoria
    );
  }

  return `
    <select id="ap-category-${product.id}">
      ${categories
        .map(
          category =>
          `
            <option
              value="${escapeAttribute(category)}"
              ${category === product.categoria ? "selected" : ""}>
              ${escapeHtml(category)}
            </option>
          `
        )
        .join("")
      }
    </select>
  `;
}

function renderAdminGenderSelect(
  product
)
{
  const genders =
  [
    "Hombre",
    "Mujer",
    "Unisex",
  ];

  return `
    <select id="ap-gender-${product.id}">
      ${genders
        .map(
          gender =>
          `
            <option
              value="${escapeAttribute(gender)}"
              ${gender === product.genero ? "selected" : ""}>
              ${escapeHtml(gender)}
            </option>
          `
        )
        .join("")
      }
    </select>
  `;
}

function renderAdminProductTypeSelect(
  product
)
{
  const types =
  state.productTypes.length
  ?
  state.productTypes
  :
  [
    {
      slug:
      "perfume",

      nombre_es:
      "Perfume",

      nombre_en:
      "Perfume",
    },

    {
      slug:
      "decant",

      nombre_es:
      "Decant",

      nombre_en:
      "Decant",
    },

    {
      slug:
      "desodorante",

      nombre_es:
      "Desodorante",

      nombre_en:
      "Deodorant",
    },

    {
      slug:
      "crema-corporal",

      nombre_es:
      "Crema corporal",

      nombre_en:
      "Body cream",
    },

    {
      slug:
      "set-regalo",

      nombre_es:
      "Set de regalo",

      nombre_en:
      "Gift set",
    },
  ];

  return `
    <select id="ap-type-${product.id}">
      ${types
        .map(
          type =>
          `
            <option
              value="${escapeAttribute(type.slug)}"
              ${type.slug === product.tipo_producto_slug ? "selected" : ""}>
              ${escapeHtml(
                state.language === "en"
                ?
                type.nombre_en
                :
                type.nombre_es
              )}
            </option>
          `
        )
        .join("")
      }
    </select>
  `;
}

function renderAdminNewProduct()
{
  const aiEnabled =
  isAiEnabled(
    "admin_assistant_enabled"
  );

  return `
    <div class="admin-form">
      <div class="ai-fill-card">
        <h3>
          ${escapeHtml(t("admin.ai.title"))}
        </h3>

        <p class="section-subtitle">
          ${escapeHtml(
            aiEnabled
            ?
            t("admin.ai.desc")
            :
            t("admin.ai.disabled")
          )}
        </p>

        <div class="ai-fill-grid">
          <input
            id="adminAiPerfumeName"
            class="text-input"
            type="text"
            placeholder="Lattafa Khamrah Qahwa"
            ${aiEnabled ? "" : "disabled"}>

          <button
            class="btn"
            type="button"
            data-action="admin-ai-new"
            ${aiEnabled ? "" : "disabled"}>
            ✦
            ${escapeHtml(t("admin.ai.button"))}
          </button>
        </div>

        <div
          id="adminAiImageSearch"
          class="u-mt-12">
        </div>
      </div>

      <div class="settings-card">
        <h3>
          ${escapeHtml(t("admin.new"))}
        </h3>

        <div class="admin-form-grid">
          ${renderNewProductField("np-name", t("admin.name"), "text", 2)}
          ${renderNewProductField("np-brand", t("admin.brand"), "text", 1)}
          ${renderNewProductField("np-price", t("admin.price"), "number", 1)}
          ${renderNewProductField("np-ml", t("admin.ml"), "number", 1)}
          ${renderNewProductField("np-stock", t("admin.stock"), "number", 1, "1")}

          <div class="admin-field">
            <label for="np-category">
              ${escapeHtml(t("admin.category"))}
            </label>

            <select
              id="np-category"
              class="select-input">
              <option value="Árabe">Árabe</option>
              <option value="Argentina">Argentina</option>
              <option value="Nicho">Nicho</option>
              <option value="Diseñador">Diseñador</option>
              <option value="Otros">Otros</option>
            </select>
          </div>

          <div class="admin-field">
            <label for="np-gender">
              ${escapeHtml(t("admin.gender"))}
            </label>

            <select
              id="np-gender"
              class="select-input">
              <option value="Hombre">Hombre</option>
              <option value="Mujer">Mujer</option>
              <option value="Unisex">Unisex</option>
            </select>
          </div>

          ${renderNewProductField("np-family", t("admin.family"), "text", 2)}
          ${renderNewProductField("np-top", t("admin.top"), "text", 1)}
          ${renderNewProductField("np-heart", t("admin.heart"), "text", 1)}
          ${renderNewProductField("np-base", t("admin.base"), "text", 1)}
          ${renderNewProductField("np-duration", t("admin.duration"), "text", 1, "Consultar")}
          ${renderNewProductField("np-projection", t("admin.projection"), "text", 1, "Consultar")}
          ${renderNewProductField("np-seasons", t("admin.seasons"), "text", 2)}
          ${renderNewProductField("np-occasions", t("admin.occasions"), "text", 2)}
          ${renderNewProductField("np-use", t("admin.use"), "text", 2, "Consultar")}

          <div class="admin-field span-2">
            <label for="np-type">
              ${escapeHtml(t("admin.type"))}
            </label>

            <select
              id="np-type"
              class="select-input">
              ${renderProductTypeOptions("perfume")}
            </select>
          </div>

          <div class="admin-field span-4">
            <label for="np-description">
              ${escapeHtml(t("admin.description"))}
            </label>

            <textarea
              id="np-description"
              class="textarea-input"></textarea>
          </div>

          <div class="admin-field span-4">
            <label for="np-description-en">
              Description EN
            </label>

            <textarea
              id="np-description-en"
              class="textarea-input"></textarea>
          </div>

          ${renderNewProductField("np-top-en", "Top notes EN", "text", 1)}
          ${renderNewProductField("np-heart-en", "Heart notes EN", "text", 1)}
          ${renderNewProductField("np-base-en", "Base notes EN", "text", 1)}
          ${renderNewProductField("np-family-en", "Olfactory family EN", "text", 1)}

          <div class="admin-field span-4">
            <label for="np-images">
              ${escapeHtml(t("admin.photos"))}
            </label>

            <input
              id="np-images"
              type="file"
              accept="image/*"
              multiple>
          </div>
        </div>

        <div class="admin-check-row u-mt-18">
          <label class="admin-check">
            <input
              id="np-featured"
              type="checkbox">
            ${escapeHtml(t("admin.featured"))}
          </label>

          <label class="admin-check">
            <input
              id="np-new"
              type="checkbox"
              checked>
            ${escapeHtml(t("admin.newflag"))}
          </label>

          <label class="admin-check">
            <input
              id="np-created-ai"
              type="checkbox"
              disabled>
            created_by_ai
          </label>
        </div>

        <div class="u-mt-20">
          <button
            class="btn"
            type="button"
            data-action="admin-create-product">
            ${escapeHtml(t("admin.save"))}
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderNewProductField(
  id,
  label,
  type = "text",
  span = 1,
  value = ""
)
{
  return `
    <div class="admin-field ${span > 1 ? `span-${span}` : ""}">
      <label for="${escapeAttribute(id)}">
        ${escapeHtml(label)}
      </label>

      <input
        id="${escapeAttribute(id)}"
        class="${type === "number" ? "number-input" : "text-input"}"
        type="${escapeAttribute(type)}"
        value="${escapeAttribute(value)}"
        ${type === "number" ? 'min="0"' : ""}>
    </div>
  `;
}

function renderProductTypeOptions(
  selected
)
{
  const types =
  state.productTypes.length
  ?
  state.productTypes
  :
  [
    {
      slug:
      "perfume",

      nombre_es:
      "Perfume",

      nombre_en:
      "Perfume",
    },
  ];

  return types
  .map(
    type =>
    `
      <option
        value="${escapeAttribute(type.slug)}"
        ${type.slug === selected ? "selected" : ""}>
        ${escapeHtml(
          state.language === "en"
          ?
          type.nombre_en
          :
          type.nombre_es
        )}
      </option>
    `
  )
  .join(
    ""
  );
}

function getInputValue(
  id
)
{
  return document.getElementById(
    id
  )?.value?.trim()
  ||
  "";
}

function getInputNumber(
  id,
  fallback = 0
)
{
  return asNumber(
    document.getElementById(
      id
    )?.value,
    fallback
  );
}

function getInputChecked(
  id
)
{
  return Boolean(
    document.getElementById(
      id
    )?.checked
  );
}

function filterProductPayload(
  payload
)
{
  const alwaysSafe =
  new Set(
    [
      "nombre",
      "precio",
      "ml",
      "categoria",
      "genero",
      "stock",
      "imagen_url",
      "descripcion",
      "salida",
      "corazon",
      "fondo",
      "familia",
      "marca",
      "duracion",
      "proyeccion",
      "recomendacion_uso",
      "estaciones",
      "ocasiones",
      "tipo_producto",
      "tipo_producto_slug",
      "subcategoria",
      "destacado",
      "nuevo",
      "vendido",
      "created_by_ai",
      "descripcion_en",
      "salida_en",
      "corazon_en",
      "fondo_en",
      "familia_en",
      "new_until",
    ]
  );

  const clean =
  {};

  for (
    const [
      key,
      value,
    ]
    of
    Object.entries(
      payload
    )
  )
  {
    if (
      state.productColumns.size
      ? state.productColumns.has(key)
      : PRODUCT_COLUMNS_CORE.has(key)
    )
    {
      clean[
        key
      ] =
      value;
    }
  }

  return clean;
}

async function createProductFromAdmin()
{
  const nombre =
  getInputValue(
    "np-name"
  );

  const precio =
  getInputNumber(
    "np-price",
    NaN
  );

  const ml =
  getInputNumber(
    "np-ml",
    NaN
  );

  const stock =
  getInputNumber(
    "np-stock",
    0
  );

  if (
    !nombre
  )
  {
    adminMessage(
      state.language === "en"
      ?
      "Product name is required."
      :
      "El nombre del producto es obligatorio.",
      "error"
    );

    return;
  }

  if (
    !Number.isFinite(
      precio
    ) ||
    precio < 0
  )
  {
    adminMessage(
      state.language === "en"
      ?
      "Enter a valid price."
      :
      "Ingresá un precio válido.",
      "error"
    );

    return;
  }

  if (
    !Number.isFinite(
      ml
    ) ||
    ml < 0
  )
  {
    adminMessage(
      state.language === "en"
      ?
      "Enter a valid size."
      :
      "Ingresá un tamaño válido.",
      "error"
    );

    return;
  }

  const payload =
  filterProductPayload(
    {
      nombre:
      nombre,

      marca:
      getInputValue(
        "np-brand"
      ),

      precio:
      precio,

      ml:
      ml,

      stock:
      Math.max(
        0,
        stock
      ),

      categoria:
      getInputValue(
        "np-category"
      )
      ||
      "Otros",

      genero:
      getInputValue(
        "np-gender"
      )
      ||
      "Unisex",

      familia:
      getInputValue(
        "np-family"
      ),

      descripcion:
      getInputValue(
        "np-description"
      ),

      salida:
      getInputValue(
        "np-top"
      ),

      corazon:
      getInputValue(
        "np-heart"
      ),

      fondo:
      getInputValue(
        "np-base"
      ),

      duracion:
      getInputValue(
        "np-duration"
      )
      ||
      "Consultar",

      proyeccion:
      getInputValue(
        "np-projection"
      )
      ||
      "Consultar",

      recomendacion_uso:
      getInputValue(
        "np-use"
      )
      ||
      "Consultar",

      estaciones:
      arrayFromDb(
        getInputValue(
          "np-seasons"
        )
      ),

      ocasiones:
      arrayFromDb(
        getInputValue(
          "np-occasions"
        )
      ),

      tipo_producto_slug:
      getInputValue(
        "np-type"
      )
      ||
      "perfume",

      tipo_producto:
      getInputValue(
        "np-type"
      )
      ||
      "Perfume",

      destacado:
      getInputChecked(
        "np-featured"
      ),

      nuevo:
      getInputChecked(
        "np-new"
      ),

      created_by_ai:
      getInputChecked(
        "np-created-ai"
      ),

      descripcion_en:
      getInputValue(
        "np-description-en"
      ),

      salida_en:
      getInputValue(
        "np-top-en"
      ),

      corazon_en:
      getInputValue(
        "np-heart-en"
      ),

      fondo_en:
      getInputValue(
        "np-base-en"
      ),

      familia_en:
      getInputValue(
        "np-family-en"
      ),

      imagen_url:
      null,
    }
  );

  adminMessage(
    state.language === "en"
    ?
    "Creating product..."
    :
    "Creando producto...",
    "ok"
  );

  const result =
  await supabaseClient
    .from(
      "products"
    )
    .insert(
      payload
    )
    .select(
      getProductSelectColumns()
    )
    .single();

  if (
    result.error
  )
  {
    adminMessage(
      (
        state.language === "en"
        ?
        "Could not create product: "
        :
        "No se pudo crear el perfume: "
      )
      +
      result.error.message,
      "error"
    );

    return;
  }

  const product =
  normalizeProduct(
    result.data
  );

  // Lo ponemos en memoria antes de subir fotos para que la primera imagen
  // pueda fijarse como imagen_url principal sin recargar todo el catálogo.
  if (!state.products.some(item => Number(item.id) === Number(product.id)))
  {
    state.products.push(product);
    state.products.sort((a, b) => Number(a.id) - Number(b.id));
  }

  const files =
  Array.from(
    document.getElementById(
      "np-images"
    )?.files
    ||
    []
  );

  if (
    files.length
  )
  {
    try
    {
      await uploadProductImages(
        product.id,
        files,
        {
          quiet:
          true,

          deferReload:
          true,
        }
      );
    }
    catch (
      error
    )
    {
      adminMessage(
        (
          state.language === "en"
          ?
          "Product created, but an image failed: "
          :
          "Producto creado, pero una imagen falló: "
        )
        +
        error.message,
        "error"
      );
    }
  }

  // Ya tenemos la fila creada: la agregamos localmente y evitamos volver a
  // descargar todo products + product_images.
  if (!state.products.some(item => Number(item.id) === Number(product.id)))
  {
    state.products.push(product);
    state.products.sort((a, b) => Number(a.id) - Number(b.id));
  }

  state.admin.tab =
  "products";

  state.admin.productPage =
  Math.max(
    1,
    Math.ceil(
      getAdminFilteredProducts().length /
      Math.max(10, Number(state.admin.productPageSize) || 20)
    )
  );

  refreshAdminTab();

  adminMessage(
    t(
      "admin.created"
    ),
    "ok"
  );
}

function readAdminProductPayload(
  productId
)
{
  return filterProductPayload(
    {
      nombre:
      getInputValue(
        `ap-name-${productId}`
      ),

      marca:
      getInputValue(
        `ap-brand-${productId}`
      ),

      precio:
      getInputNumber(
        `ap-price-${productId}`,
        0
      ),

      ml:
      getInputNumber(
        `ap-ml-${productId}`,
        0
      ),

      stock:
      Math.max(
        0,
        getInputNumber(
          `ap-stock-${productId}`,
          0
        )
      ),

      categoria:
      getInputValue(
        `ap-category-${productId}`
      ),

      genero:
      getInputValue(
        `ap-gender-${productId}`
      ),

      familia:
      getInputValue(
        `ap-family-${productId}`
      ),

      descripcion:
      getInputValue(
        `ap-description-${productId}`
      ),

      salida:
      getInputValue(
        `ap-top-${productId}`
      ),

      corazon:
      getInputValue(
        `ap-heart-${productId}`
      ),

      fondo:
      getInputValue(
        `ap-base-${productId}`
      ),

      duracion:
      getInputValue(
        `ap-duration-${productId}`
      ),

      proyeccion:
      getInputValue(
        `ap-projection-${productId}`
      ),

      estaciones:
      arrayFromDb(
        getInputValue(
          `ap-seasons-${productId}`
        )
      ),

      ocasiones:
      arrayFromDb(
        getInputValue(
          `ap-occasions-${productId}`
        )
      ),

      tipo_producto_slug:
      getInputValue(
        `ap-type-${productId}`
      ),

      destacado:
      getInputChecked(
        `ap-featured-${productId}`
      ),

      nuevo:
      getInputChecked(
        `ap-new-${productId}`
      ),
    }
  );
}

async function saveAdminProduct(
  productId
)
{
  const payload =
  readAdminProductPayload(
    productId
  );

  if (
    !payload.nombre
  )
  {
    adminMessage(
      state.language === "en"
      ?
      "Name is required."
      :
      "El nombre es obligatorio.",
      "error"
    );

    return;
  }

  const result =
  await supabaseClient
    .from(
      "products"
    )
    .update(
      payload
    )
    .eq(
      "id",
      Number(
        productId
      )
    )
    .select(
      getProductSelectColumns()
    )
    .single();

  if (
    result.error
  )
  {
    adminMessage(
      result.error.message,
      "error"
    );

    return;
  }

  const index =
  state.products.findIndex(
    product =>
    product.id ===
    Number(
      productId
    )
  );

  if (
    index >= 0
  )
  {
    state.products[
      index
    ] =
    normalizeProduct(
      result.data
    );
  }

  // Los inputs ya contienen los datos guardados; no recreamos toda la tabla.
  // Así tampoco se pierden cambios todavía no guardados en otras filas.
  adminMessage(
    t(
      "admin.updated"
    ),
    "ok"
  );
}

async function deleteAdminProduct(
  productId
)
{
  const product =
  getProductById(
    productId
  );

  if (
    !product
  )
  {
    return;
  }

  const confirmed =
  window.confirm(
    state.language === "en"
    ?
    `Delete "${product.nombre}"?`
    :
    `¿Eliminar "${product.nombre}"?`
  );

  if (
    !confirmed
  )
  {
    return;
  }

  const imageRows =
  state.productImageMeta[
    product.id
  ]
  ||
  [];

  const storagePaths =
  imageRows
  .map(
    row =>
    row.path
  )
  .filter(
    path =>
    path &&
    !/^https?:\/\//i.test(
      path
    )
  );

  if (
    storagePaths.length
  )
  {
    const storageResult =
    await supabaseClient
      .storage
      .from(
        CONFIG.storageBucket
      )
      .remove(
        storagePaths
      );

    if (
      storageResult.error
    )
    {
      console.warn(
        "No se pudieron borrar todas las fotos:",
        storageResult.error.message
      );
    }
  }

  const result =
  await supabaseClient
    .from(
      "products"
    )
    .delete()
    .eq(
      "id",
      product.id
    );

  if (
    result.error
  )
  {
    adminMessage(
      result.error.message,
      "error"
    );

    return;
  }

  state.cart =
  state.cart.filter(
    line =>
    !(
      line.kind === "product"
      &&
      Number(
        line.productId
        ??
        line.id
      ) ===
      product.id
    )
  );

  state.favorites =
  state.favorites.filter(
    id =>
    id !==
    product.id
  );

  saveLocalState();

  state.products =
  state.products.filter(
    item => Number(item.id) !== Number(product.id)
  );

  delete state.productImages[product.id];
  delete state.productImageMeta[product.id];
  state.productGalleryLoaded.delete(product.id);
  state.productGalleryLoading.delete(product.id);

  refreshAdminTab();

  adminMessage(
    t(
      "admin.deleted"
    ),
    "ok"
  );
}

function sanitizeFileExtension(
  file
)
{
  const raw =
  String(
    file?.name
    ||
    "image.jpg"
  );

  const extension =
  raw.includes(
    "."
  )
  ?
  raw.split(
    "."
  )
  .pop()
  :
  "jpg";

  return String(
    extension
    ||
    "jpg"
  )
  .toLowerCase()
  .replace(
    /[^a-z0-9]/g,
    ""
  )
  ||
  "jpg";
}

async function optimizeImageForUpload(
  file,
  options = {}
)
{
  if (
    !file ||
    !String(file.type || "").startsWith("image/")
  )
  {
    return file;
  }

  // No convertimos SVG ni GIF para no romper vectores o animaciones.
  if (
    file.type === "image/svg+xml" ||
    file.type === "image/gif"
  )
  {
    return file;
  }

  const maxWidth =
  Math.max(320, Number(options.maxWidth) || 1200);

  const maxHeight =
  Math.max(320, Number(options.maxHeight) || 1400);

  const quality =
  Math.min(0.92, Math.max(0.60, Number(options.quality) || 0.82));

  let source = null;
  let width = 0;
  let height = 0;
  let cleanup = () => {};

  try
  {
    if ("createImageBitmap" in window)
    {
      try
      {
        const bitmap =
        await createImageBitmap(file);

        source = bitmap;
        width = bitmap.width;
        height = bitmap.height;
        cleanup = () => bitmap.close?.();
      }
      catch (error)
      {
        // Safari / formatos especiales: usamos Image como fallback.
      }
    }

    if (!source)
    {
      const objectUrl =
      URL.createObjectURL(file);

      const image =
      await new Promise(
        (resolve, reject) =>
        {
          const element =
          new Image();

          element.onload =
          () => resolve(element);

          element.onerror =
          () => reject(new Error("No se pudo procesar la imagen."));

          element.src =
          objectUrl;
        }
      );

      source = image;
      width = image.naturalWidth || image.width;
      height = image.naturalHeight || image.height;
      cleanup = () => URL.revokeObjectURL(objectUrl);
    }

    if (!width || !height)
    {
      cleanup();
      return file;
    }

    const scale =
    Math.min(
      1,
      maxWidth / width,
      maxHeight / height
    );

    const targetWidth =
    Math.max(1, Math.round(width * scale));

    const targetHeight =
    Math.max(1, Math.round(height * scale));

    const canvas =
    document.createElement("canvas");

    canvas.width =
    targetWidth;

    canvas.height =
    targetHeight;

    const context =
    canvas.getContext("2d", { alpha: true });

    if (!context)
    {
      cleanup();
      return file;
    }

    context.drawImage(
      source,
      0,
      0,
      targetWidth,
      targetHeight
    );

    const blob =
    await new Promise(
      resolve =>
      canvas.toBlob(
        resolve,
        "image/webp",
        quality
      )
    );

    cleanup();

    // Si el navegador no pudo generar WebP o queda más pesado, conservamos original.
    if (
      !blob ||
      blob.size >= file.size
    )
    {
      return file;
    }

    const baseName =
    String(file.name || "imagen")
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
    ||
    "imagen";

    return new File(
      [blob],
      `${baseName}.webp`,
      {
        type: "image/webp",
        lastModified: Date.now(),
      }
    );
  }
  catch (error)
  {
    try
    {
      cleanup();
    }
    catch (_) {}

    console.warn(
      "No se pudo optimizar la imagen; se sube el original:",
      error
    );

    return file;
  }
}

async function uploadSingleProductImage(
  productId,
  file,
  order
)
{
  if (
    !file ||
    !String(
      file.type
      ||
      ""
    )
    .startsWith(
      "image/"
    )
  )
  {
    throw new Error(
      state.language === "en"
      ?
      "The selected file is not an image."
      :
      "El archivo seleccionado no es una imagen."
    );
  }

  if (
    file.size >
    CONFIG.maxImageBytes
  )
  {
    throw new Error(
      state.language === "en"
      ?
      "Maximum image size is 8 MB."
      :
      "Cada imagen puede pesar como máximo 8 MB."
    );
  }

  const uploadFile =
  await optimizeImageForUpload(
    file,
    {
      maxWidth: 1000,
      maxHeight: 1200,
      quality: 0.82,
    }
  );

  const extension =
  sanitizeFileExtension(
    uploadFile
  );

  const path =
  "productos/" +
  Number(
    productId
  )
  +
  "/" +
  makeId(
    "img"
  )
  +
  "." +
  extension;

  const storage =
  await supabaseClient
    .storage
    .from(
      CONFIG.storageBucket
    )
    .upload(
      path,
      uploadFile,
      {
        upsert:
        false,

        contentType:
        uploadFile.type,

        cacheControl:
        "31536000",
      }
    );

  if (
    storage.error
  )
  {
    throw storage.error;
  }

  const relation =
  await supabaseClient
    .from(
      CONFIG.productImagesTable
    )
    .insert(
      {
        product_id:
        Number(
          productId
        ),

        image_url:
        path,

        orden:
        Number(
          order
        ),
      }
    )
    .select(
      "id,product_id,image_url,orden"
    )
    .single();

  if (
    relation.error
  )
  {
    await supabaseClient
      .storage
      .from(
        CONFIG.storageBucket
      )
      .remove(
        [
          path,
        ]
      );

    throw relation.error;
  }

  return relation.data;
}

async function uploadProductImages(
  productId,
  files,
  options = {}
)
{
  const id =
  Number(productId);

  const list =
  Array.from(
    files
    ||
    []
  );

  if (list.length === 0)
  {
    return;
  }

  // Consultamos la galería únicamente de ESTE producto para mantener el orden.
  await ensureProductGallery(id);

  const current =
  (state.productImageMeta[id] || [])
  .filter(Boolean);

  const baseOrder =
  current.length;

  const created =
  new Array(list.length);

  // Tres subidas simultáneas: suficientemente rápido sin saturar navegador/Storage.
  await mapWithConcurrency(
    list,
    3,
    async (file, index) =>
    {
      created[index] =
      await uploadSingleProductImage(
        id,
        file,
        baseOrder + index
      );
    }
  );

  const addedMeta =
  [];

  for (const relation of created.filter(Boolean))
  {
    const resolved =
    await resolveImageValue(
      relation.image_url
    );

    addedMeta.push(
      {
        id: relation.id,
        product_id: id,
        path: resolved.path || relation.image_url,
        raw: relation.image_url,
        url: resolved.url,
        orden: asNumber(relation.orden, 0),
      }
    );
  }

  const combined =
  [
    ...current,
    ...addedMeta,
  ]
  .filter((item, index, array) =>
    array.findIndex(other =>
      (item.id && other.id === item.id) ||
      (!item.id && !other.id && other.path === item.path)
    ) === index
  )
  .sort((a, b) =>
    asNumber(a.orden, 0) - asNumber(b.orden, 0)
  );

  state.productImageMeta[id] =
  combined;

  state.productImages[id] =
  combined
  .map(item => item.url)
  .filter(Boolean);

  state.productGalleryLoaded.add(id);

  // Un producto nuevo necesita una imagen principal persistente para que el
  // catálogo público pueda cargarla sin consultar product_images completo.
  const product =
  getProductById(id);

  if (
    product &&
    !product.imagen_url &&
    addedMeta[0]?.path
  )
  {
    const mainPath =
    addedMeta[0].path;

    const mainUpdate =
    await supabaseClient
      .from("products")
      .update({ imagen_url: mainPath })
      .eq("id", id);

    if (mainUpdate.error)
    {
      console.warn(
        "No se pudo fijar imagen principal:",
        mainUpdate.error.message
      );
    }
    else
    {
      product.imagen_url = mainPath;
      product.img = addedMeta[0].url || product.img;
    }
  }

  updateAdminPhotoCell(id);

  if (!options.quiet)
  {
    adminMessage(
      state.language === "en"
      ? "Photos uploaded successfully."
      : "Fotos subidas correctamente.",
      "ok"
    );
  }
}

async function deleteAdminPhoto(
  imageId,
  productId,
  storagePath
)
{
  const id =
  Number(productId);

  const confirmed =
  window.confirm(
    state.language === "en"
    ? "Delete this photo?"
    : "¿Eliminar esta foto?"
  );

  if (!confirmed)
  {
    return;
  }

  const relation =
  await supabaseClient
    .from(CONFIG.productImagesTable)
    .delete()
    .eq("id", Number(imageId));

  if (relation.error)
  {
    adminMessage(relation.error.message, "error");
    return;
  }

  if (storagePath && !/^https?:\/\//i.test(storagePath))
  {
    const storage =
    await supabaseClient
      .storage
      .from(CONFIG.storageBucket)
      .remove([storagePath]);

    if (storage.error)
    {
      console.warn("Storage remove:", storage.error.message);
    }
  }

  const meta =
  (state.productImageMeta[id] || [])
  .filter(item => Number(item.id) !== Number(imageId));

  state.productImageMeta[id] = meta;
  state.productImages[id] = meta.map(item => item.url).filter(Boolean);
  state.productGalleryLoaded.add(id);

  const product =
  getProductById(id);

  if (product && storagePath && product.imagen_url === storagePath)
  {
    const nextPath =
    meta.find(item => item.path)?.path
    ||
    null;

    const mainUpdate =
    await supabaseClient
      .from("products")
      .update({ imagen_url: nextPath })
      .eq("id", id);

    if (!mainUpdate.error)
    {
      product.imagen_url = nextPath || "";
      product.img = meta.find(item => item.url)?.url || "";
    }
  }

  updateAdminPhotoCell(id);

  adminMessage(
    state.language === "en"
    ? "Photo deleted."
    : "Foto eliminada.",
    "ok"
  );
}

function renderAdminSettings()
{
  const contact =
  getSiteSettingObject(
    "contact"
  );

  const social =
  getSiteSettingObject(
    "social_links"
  );

  const shipping =
  getSiteSettingObject(
    "shipping"
  );

  const video =
  getSiteSettingObject(
    "seasonal_video"
  );

  const ai =
  getSiteSettingObject(
    "ai"
  );

  const gameAds =
  getSiteSettingObject(
    "game_ads"
  );

  const coverSlots =
  [
    { slot: "hero", label: "Portada principal · Fragancias para cada historia" },
    { slot: "decants", label: "Portada · Armá tu combo de decants" },
    { slot: "gifts", label: "Portada · Regalos que hablan por vos" },
    { slot: "advisor", label: "Portada · Encontrá tu perfume ideal" },
    { slot: "best_sellers", label: "Portada · Más vendidos" },
    { slot: "collections", label: "Portada · Colecciones" },
    { slot: "personal_care", label: "Portada · Cuidado personal" },
    { slot: "gift_sets", label: "Portada · Sets de regalo" },
    { slot: "discovery", label: "Portada · Discovery Sets" },
    { slot: "games", label: "Portada · Descubrí tu Aroma" },
  ];

  return `
    <div class="settings-grid">
      <div class="settings-card">
        <h3>
          Contacto y redes
        </h3>

        <div class="admin-form">
          ${renderSettingInput("setting-whatsapp", "WhatsApp", contact.whatsapp || CONFIG.whatsappNumber)}
          ${renderSettingInput("setting-email", "Email", contact.email || "")}
          ${renderSettingInput("setting-instagram", "Instagram URL", social.instagram || contact.instagram || "")}
          ${renderSettingInput("setting-tiktok", "TikTok URL", social.tiktok || contact.tiktok || "")}
          ${renderSettingInput("setting-facebook", "Facebook URL", social.facebook || contact.facebook || "")}
          ${renderSettingInput("setting-youtube", "YouTube URL", social.youtube || contact.youtube || "")}

          <button
            class="btn"
            type="button"
            data-action="admin-save-contact-settings">
            ${escapeHtml(t("admin.save"))}
          </button>
        </div>
      </div>

      <div class="settings-card">
        <h3>
          Envío
        </h3>

        <div class="admin-form">
          ${renderSettingInput("setting-shipping-es", "Texto ES", shipping.text_es || "Envío seguro y confiable")}
          ${renderSettingInput("setting-shipping-en", "Text EN", shipping.text_en || "Safe and reliable shipping")}

          <button
            class="btn"
            type="button"
            data-action="admin-save-shipping-settings">
            ${escapeHtml(t("admin.save"))}
          </button>
        </div>
      </div>

      <div class="settings-card">
        <h3>
          Descubrí tu Aroma
        </h3>

        <p class="section-subtitle">
          El quiz y las experiencias funcionan sin publicidad y sin descuentos automáticos. La portada se puede administrar desde el bloque de imágenes de esta sección.
        </p>
      </div>

      <div class="settings-card">
        <h3>
          Video de temporada
        </h3>

        <p class="section-subtitle">
          Podés pegar una URL externa o subir tu propio video desde la computadora. Si subís un archivo, la web lo guarda en Supabase Storage y genera una URL privada al cargar la página.
        </p>

        <div class="admin-form u-mt-14">
          <label class="admin-check">
            <input
              id="setting-video-enabled"
              type="checkbox"
              ${video.enabled === true ? "checked" : ""}>
            Activar video
          </label>

          <div class="admin-video-source-badge">
            ${video.path
              ? "Archivo subido a Supabase"
              : video.url
              ? "URL externa"
              : "Sin video configurado"
            }
          </div>

          <div class="admin-video-preview">
            ${getSeasonalVideoUrl()
              ?
              `
                <video
                  controls
                  playsinline
                  preload="metadata"
                  src="${escapeAttribute(getSeasonalVideoUrl())}">
                </video>
              `
              :
              `
                <span>
                  Todavía no hay un video cargado.<br>
                  Podés subir un MP4/WebM o guardar una URL externa.
                </span>
              `
            }
          </div>

          ${renderSettingInput(
            "setting-video-url",
            "URL externa del video (opcional)",
            video.path ? "" : (video.url || "")
          )}

          <div class="admin-field">
            <label>
              Subir tu propio video
            </label>

            <input
              id="setting-video-file"
              class="text-input"
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              data-admin-seasonal-video-upload>

            <small class="muted">
              Recomendado: MP4 o WebM. Máximo 50 MB. Para que cargue rápido, conviene un video corto y comprimido.
            </small>
          </div>

          ${renderSettingInput(
            "setting-video-title-es",
            "Título ES",
            video.title_es || "Perfumes de temporada"
          )}

          ${renderSettingInput(
            "setting-video-title-en",
            "Title EN",
            video.title_en || "Seasonal Fragrances"
          )}

          <label class="admin-check">
            <input
              id="setting-video-autoplay"
              type="checkbox"
              ${video.autoplay === true ? "checked" : ""}>
            Reproducir automáticamente
          </label>

          <label class="admin-check">
            <input
              id="setting-video-muted"
              type="checkbox"
              ${video.muted === true || video.autoplay === true ? "checked" : ""}>
            Iniciar silenciado
          </label>

          <label class="admin-check">
            <input
              id="setting-video-loop"
              type="checkbox"
              ${video.loop !== false ? "checked" : ""}>
            Repetir en bucle
          </label>

          <div class="admin-video-actions">
            <button
              class="btn"
              type="button"
              data-action="admin-save-video-settings">
              Guardar configuración / URL
            </button>

            <button
              class="btn danger"
              type="button"
              data-action="admin-delete-seasonal-video"
              ${video.path || video.url ? "" : "disabled"}>
              Quitar video
            </button>
          </div>
        </div>
      </div>



      <div class="settings-card" style="grid-column:1/-1">
        <h3>
          Portadas e imágenes principales
        </h3>

        <p class="section-subtitle">
          Desde acá podés cambiar las imágenes grandes de la página sin tocar el código. Podés subir una foto desde tu dispositivo o pegar una URL externa.
        </p>

        <div class="admin-cover-grid u-mt-14">
          ${coverSlots
            .map(
              item =>
              renderAdminCoverCard(
                item.slot,
                item.label
              )
            )
            .join("")
          }
        </div>
      </div>

      <div class="settings-card">
        <h3>
          Inteligencia artificial
        </h3>

        <p class="section-subtitle">
          La estructura está preparada. Mientras no haya saldo de API, mantené estas opciones apagadas.
        </p>

        <div class="admin-form u-mt-14">
          <label class="admin-check">
            <input
              id="setting-ai-enabled"
              type="checkbox"
              ${ai.enabled === true ? "checked" : ""}>
            IA general
          </label>

          <label class="admin-check">
            <input
              id="setting-ai-advisor"
              type="checkbox"
              ${ai.advisor_enabled === true ? "checked" : ""}>
            Asesor para clientes
          </label>

          <label class="admin-check">
            <input
              id="setting-ai-admin"
              type="checkbox"
              ${ai.admin_assistant_enabled === true ? "checked" : ""}>
            Asistente del administrador
          </label>

          <label class="admin-check">
            <input
              id="setting-ai-games"
              type="checkbox"
              ${ai.games_ai_enabled === true ? "checked" : ""}>
            IA para configurar juegos
          </label>

          ${renderSettingInput("setting-ai-endpoint", "Edge Function", ai.endpoint || CONFIG.defaultAiEndpoint)}

          <button
            class="btn"
            type="button"
            data-action="admin-save-ai-settings">
            ${escapeHtml(t("admin.save"))}
          </button>
        </div>
      </div>
    </div>
  `;
}


function renderAdminCoverCard(
  slot,
  label
)
{
  const current =
  getSiteSettingObject(
    "cover_images"
  )[slot]
  ||
  "";

  const preview =
  getSiteCoverUrl(
    slot
  );

  const position =
  getSiteCoverPosition(
    slot
  );

  return `
    <div class="admin-cover-card">
      <h4>
        ${escapeHtml(label)}
      </h4>

      <div class="admin-cover-preview">
        ${preview
          ?
          `
            <img
              src="${escapeAttribute(preview)}"
              alt="${escapeAttribute(label)}">
          `
          :
          `
            <span>
              Sin imagen personalizada<br>
              se usa la imagen automática actual
            </span>
          `
        }
      </div>

      <div class="admin-field">
        <label for="cover-url-${escapeAttribute(slot)}">
          URL externa opcional
        </label>

        <input
          id="cover-url-${escapeAttribute(slot)}"
          class="text-input"
          type="text"
          value="${escapeAttribute(/^https?:\/\//i.test(current) ? current : "")}" 
          placeholder="https://...">
      </div>

      <div class="admin-field">
        <label>
          Subir nueva imagen
        </label>

        <input
          class="admin-cover-file"
          type="file"
          accept="image/*"
          data-admin-cover-upload="${escapeAttribute(slot)}">
      </div>

      <div class="admin-field">
        <label for="cover-position-${escapeAttribute(slot)}">
          Posición de la imagen
        </label>

        <select
          id="cover-position-${escapeAttribute(slot)}"
          class="text-input">
          <option value="left" ${position === "left" ? "selected" : ""}>
            Izquierda
          </option>
          <option value="center" ${position === "center" ? "selected" : ""}>
            Centro
          </option>
          <option value="right" ${position === "right" ? "selected" : ""}>
            Derecha
          </option>
        </select>

        <small class="muted">
          Elegí dónde está el elemento principal de la foto. En la portada de inicio esto ayuda a evitar que el perfume se recorte.
        </small>
      </div>

      <div class="admin-cover-actions">
        <button
          class="btn small"
          type="button"
          data-action="admin-save-cover-url"
          data-cover-slot="${escapeAttribute(slot)}">
          Guardar URL
        </button>

        <button
          class="btn small soft"
          type="button"
          data-action="admin-save-cover-position"
          data-cover-slot="${escapeAttribute(slot)}">
          Guardar posición
        </button>

        <button
          class="btn danger small"
          type="button"
          data-action="admin-delete-cover"
          data-cover-slot="${escapeAttribute(slot)}"
          ${current ? "" : "disabled"}>
          Quitar portada
        </button>
      </div>
    </div>
  `;
}

function renderAdminCollectionCover(
  collection
)
{
  const slug =
  collection?.slug
  ||
  "";

  const current =
  getSiteSettingObject(
    "collection_covers"
  )[slug]
  ||
  "";

  const preview =
  getCollectionCoverUrl(
    slug
  );

  return `
    <div class="collection-cover-admin">
      <div class="admin-cover-preview">
        ${preview
          ?
          `
            <img
              src="${escapeAttribute(preview)}"
              alt="${escapeAttribute(localizedCollectionName(collection))}">
          `
          :
          `
            <span>
              Sin portada personalizada para esta colección
            </span>
          `
        }
      </div>

      <div class="admin-field u-mt-10">
        <label>
          Portada de esta colección
        </label>

        <input
          class="admin-cover-file"
          type="file"
          accept="image/*"
          data-admin-collection-cover-upload="${escapeAttribute(slug)}">
      </div>

      <div class="admin-cover-actions">
        <button
          class="btn danger small"
          type="button"
          data-action="admin-delete-collection-cover"
          data-collection-slug="${escapeAttribute(slug)}"
          ${current ? "" : "disabled"}>
          Quitar portada
        </button>
      </div>
    </div>
  `;
}

function renderSettingInput(
  id,
  label,
  value
)
{
  return `
    <div class="admin-field">
      <label for="${escapeAttribute(id)}">
        ${escapeHtml(label)}
      </label>

      <input
        id="${escapeAttribute(id)}"
        class="text-input"
        type="text"
        value="${escapeAttribute(value)}">
    </div>
  `;
}

async function upsertSiteSetting(
  key,
  value
)
{
  const result =
  await supabaseClient
    .from(
      "site_settings"
    )
    .upsert(
      {
        key:
        key,

        value:
        value,

        updated_at:
        new Date().toISOString(),
      },
      {
        onConflict:
        "key",
      }
    )
    .select(
      "key,value"
    )
    .single();

  if (
    result.error
  )
  {
    throw result.error;
  }

  state.siteSettings[
    key
  ] =
  result.data.value
  ||
  value;

  return result.data;
}

async function saveContactSettings()
{
  try
  {
    const contact =
    {
      whatsapp:
      getInputValue(
        "setting-whatsapp"
      ),

      email:
      getInputValue(
        "setting-email"
      ),

      instagram:
      getInputValue(
        "setting-instagram"
      ),

      tiktok:
      getInputValue(
        "setting-tiktok"
      ),

      facebook:
      getInputValue(
        "setting-facebook"
      ),

      youtube:
      getInputValue(
        "setting-youtube"
      ),
    };

    await upsertSiteSetting(
      "contact",
      contact
    );

    await upsertSiteSetting(
      "social_links",
      {
        instagram:
        contact.instagram,

        tiktok:
        contact.tiktok,

        facebook:
        contact.facebook,

        youtube:
        contact.youtube,
      }
    );

    applyLanguageToChrome();

    adminMessage(
      state.language === "en"
      ?
      "Contact settings saved."
      :
      "Configuración de contacto guardada.",
      "ok"
    );
  }
  catch (
    error
  )
  {
    adminMessage(
      error.message,
      "error"
    );
  }
}

async function saveShippingSettings()
{
  try
  {
    await upsertSiteSetting(
      "shipping",
      {
        text_es:
        getInputValue(
          "setting-shipping-es"
        ),

        text_en:
        getInputValue(
          "setting-shipping-en"
        ),
      }
    );

    applyLanguageToChrome();

    adminMessage(
      state.language === "en"
      ?
      "Shipping settings saved."
      :
      "Configuración de envío guardada.",
      "ok"
    );
  }
  catch (
    error
  )
  {
    adminMessage(
      error.message,
      "error"
    );
  }
}


async function saveGameAdsSettings()
{
  try
  {
    const enabled =
    getInputChecked(
      "setting-game-ads-enabled"
    );

    const clientRaw =
    getInputValue(
      "setting-game-ads-client"
    );

    const slotTop =
    normalizeAdSenseSlot(
      getInputValue(
        "setting-game-ads-slot-top"
      )
    );

    const slotBottom =
    normalizeAdSenseSlot(
      getInputValue(
        "setting-game-ads-slot-bottom"
      )
    );

    const client =
    clientRaw
    ?
    normalizeAdSenseClient(
      clientRaw
    )
    :
    "";

    if (
      enabled &&
      !client
    )
    {
      throw new Error(
        "El ID de AdSense debe tener formato ca-pub-..."
      );
    }

    if (
      enabled &&
      (
        !slotTop ||
        !slotBottom
      )
    )
    {
      throw new Error(
        "Ingresá los dos IDs de bloque de anuncios."
      );
    }

    await upsertSiteSetting(
      "game_ads",
      {
        enabled:
        enabled,

        client:
        client,

        slot_top:
        slotTop,

        slot_bottom:
        slotBottom,
      }
    );

    adminMessage(
      enabled
      ?
      "Publicidad de Juegos guardada. Los anuncios se mostrarán cuando AdSense tenga tu sitio y bloques habilitados."
      :
      "Publicidad de Juegos desactivada.",
      "ok"
    );

    refreshAdminTab();
  }
  catch (
    error
  )
  {
    adminMessage(
      error.message,
      "error"
    );
  }
}

function sanitizeVideoExtension(
  file
)
{
  const fileName =
  String(
    file?.name
    ||
    ""
  );

  const byName =
  fileName.includes(".")
  ?
  fileName
  .split(".")
  .pop()
  .toLowerCase()
  .replace(
    /[^a-z0-9]/g,
    ""
  )
  :
  "";

  if (
    ["mp4", "webm", "mov"].includes(
      byName
    )
  )
  {
    return byName;
  }

  if (
    file?.type === "video/webm"
  )
  {
    return "webm";
  }

  if (
    file?.type === "video/quicktime"
  )
  {
    return "mov";
  }

  return "mp4";
}

async function uploadSeasonalVideoFile(
  file
)
{
  if (
    !file ||
    !String(
      file.type
      ||
      ""
    ).startsWith(
      "video/"
    )
  )
  {
    throw new Error(
      "Seleccioná un archivo de video válido."
    );
  }

  const maxVideoBytes =
  50 * 1024 * 1024;

  if (
    file.size > maxVideoBytes
  )
  {
    throw new Error(
      "El video puede pesar como máximo 50 MB."
    );
  }

  const extension =
  sanitizeVideoExtension(
    file
  );

  const path =
  "site-media/seasonal/" +
  makeId(
    "video"
  ) +
  "." +
  extension;

  const upload =
  await supabaseClient
    .storage
    .from(
      CONFIG.storageBucket
    )
    .upload(
      path,
      file,
      {
        upsert:
        false,

        contentType:
        file.type
        ||
        "video/mp4",

        cacheControl:
        "31536000",
      }
    );

  if (
    upload.error
  )
  {
    throw upload.error;
  }

  const previous =
  getSiteSettingObject(
    "seasonal_video"
  );

  const previousPath =
  normalizeStoragePath(
    previous.path
    ||
    ""
  );

  const next =
  {
    ...previous,

    enabled:
    true,

    source_type:
    "upload",

    path:
    path,

    url:
    "",

    title_es:
    getInputValue(
      "setting-video-title-es"
    )
    ||
    previous.title_es
    ||
    "Perfumes de temporada",

    title_en:
    getInputValue(
      "setting-video-title-en"
    )
    ||
    previous.title_en
    ||
    "Seasonal Fragrances",

    autoplay:
    getInputChecked(
      "setting-video-autoplay"
    ),

    muted:
    getInputChecked(
      "setting-video-muted"
    ),

    loop:
    getInputChecked(
      "setting-video-loop"
    ),
  };

  try
  {
    await upsertSiteSetting(
      "seasonal_video",
      next
    );
  }
  catch (
    error
  )
  {
    await supabaseClient
      .storage
      .from(
        CONFIG.storageBucket
      )
      .remove(
        [
          path,
        ]
      );

    throw error;
  }

  if (
    previousPath.kind === "storage" &&
    previousPath.value &&
    previousPath.value !== path
  )
  {
    const removeOld =
    await supabaseClient
      .storage
      .from(
        CONFIG.storageBucket
      )
      .remove(
        [
          previousPath.value,
        ]
      );

    if (
      removeOld.error
    )
    {
      console.warn(
        "No se pudo borrar el video anterior:",
        removeOld.error.message
      );
    }
  }

  await loadSeasonalVideoUrl();
}

async function deleteSeasonalVideo()
{
  try
  {
    const current =
    getSiteSettingObject(
      "seasonal_video"
    );

    const currentPath =
    normalizeStoragePath(
      current.path
      ||
      ""
    );

    await upsertSiteSetting(
      "seasonal_video",
      {
        ...current,

        enabled:
        false,

        source_type:
        "",

        path:
        "",

        url:
        "",
      }
    );

    if (
      currentPath.kind === "storage" &&
      currentPath.value
    )
    {
      const remove =
      await supabaseClient
        .storage
        .from(
          CONFIG.storageBucket
        )
        .remove(
          [
            currentPath.value,
          ]
        );

      if (
        remove.error
      )
      {
        console.warn(
          "No se pudo borrar el video de Storage:",
          remove.error.message
        );
      }
    }

    await loadSeasonalVideoUrl();

    refreshAdminTab();

    adminMessage(
      "Video de temporada eliminado.",
      "ok"
    );
  }
  catch (
    error
  )
  {
    adminMessage(
      error.message,
      "error"
    );
  }
}

async function saveVideoSettings()
{
  try
  {
    const current =
    getSiteSettingObject(
      "seasonal_video"
    );

    const externalUrl =
    getInputValue(
      "setting-video-url"
    ).trim();

    if (
      externalUrl &&
      !/^https?:\/\//i.test(
        externalUrl
      )
    )
    {
      throw new Error(
        "La URL del video debe comenzar con http:// o https://"
      );
    }

    const previousPath =
    normalizeStoragePath(
      current.path
      ||
      ""
    );

    const useExternalUrl =
    Boolean(
      externalUrl
    );

    const next =
    {
      ...current,

      enabled:
      getInputChecked(
        "setting-video-enabled"
      ),

      source_type:
      useExternalUrl
      ?
      "url"
      :
      current.path
      ?
      "upload"
      :
      "",

      path:
      useExternalUrl
      ?
      ""
      :
      (
        current.path
        ||
        ""
      ),

      url:
      useExternalUrl
      ?
      externalUrl
      :
      "",

      title_es:
      getInputValue(
        "setting-video-title-es"
      ),

      title_en:
      getInputValue(
        "setting-video-title-en"
      ),

      autoplay:
      getInputChecked(
        "setting-video-autoplay"
      ),

      muted:
      getInputChecked(
        "setting-video-muted"
      ),

      loop:
      getInputChecked(
        "setting-video-loop"
      ),
    };

    await upsertSiteSetting(
      "seasonal_video",
      next
    );

    if (
      useExternalUrl &&
      previousPath.kind === "storage" &&
      previousPath.value
    )
    {
      const remove =
      await supabaseClient
        .storage
        .from(
          CONFIG.storageBucket
        )
        .remove(
          [
            previousPath.value,
          ]
        );

      if (
        remove.error
      )
      {
        console.warn(
          "No se pudo borrar el video anterior:",
          remove.error.message
        );
      }
    }

    await loadSeasonalVideoUrl();

    refreshAdminTab();

    adminMessage(
      state.language === "en"
      ?
      "Video settings saved."
      :
      "Configuración del video guardada.",
      "ok"
    );
  }
  catch (
    error
  )
  {
    adminMessage(
      error.message,
      "error"
    );
  }
}

async function saveAiSettings()
{
  try
  {
    await upsertSiteSetting(
      "ai",
      {
        enabled:
        getInputChecked(
          "setting-ai-enabled"
        ),

        advisor_enabled:
        getInputChecked(
          "setting-ai-advisor"
        ),

        admin_assistant_enabled:
        getInputChecked(
          "setting-ai-admin"
        ),

        games_ai_enabled:
        getInputChecked(
          "setting-ai-games"
        ),

        endpoint:
        getInputValue(
          "setting-ai-endpoint"
        )
        ||
        CONFIG.defaultAiEndpoint,
      }
    );

    adminMessage(
      state.language === "en"
      ?
      "AI settings saved."
      :
      "Configuración de IA guardada.",
      "ok"
    );

    refreshAdminTab();
  }
  catch (
    error
  )
  {
    adminMessage(
      error.message,
      "error"
    );
  }
}


function sanitizeCoverSlot(
  value
)
{
  return String(
    value || "cover"
  )
  .toLowerCase()
  .replace(
    /[^a-z0-9_-]/g,
    "-"
  )
  .slice(
    0,
    80
  )
  ||
  "cover";
}

async function uploadSiteCoverFile(
  slot,
  file,
  settingKey = "cover_images"
)
{
  if (
    !file ||
    !String(file.type || "").startsWith("image/")
  )
  {
    throw new Error(
      "Seleccioná un archivo de imagen válido."
    );
  }

  if (
    file.size > CONFIG.maxImageBytes
  )
  {
    throw new Error(
      "La imagen puede pesar como máximo 8 MB."
    );
  }

  const safeSlot =
  sanitizeCoverSlot(
    slot
  );

  const uploadFile =
  await optimizeImageForUpload(
    file,
    {
      maxWidth: 1600,
      maxHeight: 1200,
      quality: 0.82,
    }
  );

  const extension =
  sanitizeFileExtension(
    uploadFile
  );

  const path =
  "portadas/" +
  safeSlot +
  "/" +
  makeId("cover") +
  "." +
  extension;

  const upload =
  await supabaseClient
    .storage
    .from(
      CONFIG.storageBucket
    )
    .upload(
      path,
      uploadFile,
      {
        upsert: false,
        contentType: uploadFile.type,
        cacheControl: "31536000",
      }
    );

  if (upload.error)
  {
    throw upload.error;
  }

  const settings =
  {
    ...getSiteSettingObject(
      settingKey
    ),
  };

  const previous =
  settings[slot]
  ||
  "";

  settings[slot] =
  path;

  try
  {
    await upsertSiteSetting(
      settingKey,
      settings
    );
  }
  catch (error)
  {
    await supabaseClient
      .storage
      .from(
        CONFIG.storageBucket
      )
      .remove([path]);

    throw error;
  }

  const previousNormalized =
  normalizeStoragePath(
    previous
  );

  if (
    previousNormalized.kind === "storage" &&
    previousNormalized.value &&
    previousNormalized.value !== path
  )
  {
    const removeOld =
    await supabaseClient
      .storage
      .from(
        CONFIG.storageBucket
      )
      .remove([
        previousNormalized.value,
      ]);

    if (removeOld.error)
    {
      console.warn(
        "No se pudo eliminar la portada anterior:",
        removeOld.error.message
      );
    }
  }

  await loadSiteCoverUrls();
}

async function saveSiteCoverUrl(
  slot
)
{
  try
  {
    const value =
    getInputValue(
      `cover-url-${slot}`
    );

    if (
      value &&
      !/^https?:\/\//i.test(value)
    )
    {
      throw new Error(
        "La URL debe comenzar con http:// o https://"
      );
    }

    const settings =
    {
      ...getSiteSettingObject(
        "cover_images"
      ),
    };

    const previous =
    settings[slot]
    ||
    "";

    if (value)
    {
      settings[slot] = value;
    }
    else
    {
      delete settings[slot];
    }

    await upsertSiteSetting(
      "cover_images",
      settings
    );

    const previousNormalized =
    normalizeStoragePath(
      previous
    );

    if (
      previousNormalized.kind === "storage" &&
      previousNormalized.value
    )
    {
      await supabaseClient
        .storage
        .from(
          CONFIG.storageBucket
        )
        .remove([
          previousNormalized.value,
        ]);
    }

    await loadSiteCoverUrls();

    refreshAdminTab();

    adminMessage(
      "Portada actualizada.",
      "ok"
    );
  }
  catch (error)
  {
    adminMessage(
      error.message,
      "error"
    );
  }
}

async function saveSiteCoverPosition(
  slot
)
{
  try
  {
    const select =
    document.getElementById(
      `cover-position-${slot}`
    );

    const position =
    normalizeCoverPosition(
      select?.value
    );

    const positions =
    {
      ...getSiteSettingObject(
        "cover_positions"
      ),
    };

    positions[slot] =
    position;

    await upsertSiteSetting(
      "cover_positions",
      positions
    );

    refreshAdminTab();

    adminMessage(
      "Posición de portada guardada.",
      "ok"
    );
  }
  catch (error)
  {
    adminMessage(
      error.message,
      "error"
    );
  }
}

async function deleteSiteCover(
  slot,
  settingKey = "cover_images"
)
{
  try
  {
    const settings =
    {
      ...getSiteSettingObject(
        settingKey
      ),
    };

    const previous =
    settings[slot]
    ||
    "";

    delete settings[slot];

    await upsertSiteSetting(
      settingKey,
      settings
    );

    const previousNormalized =
    normalizeStoragePath(
      previous
    );

    if (
      previousNormalized.kind === "storage" &&
      previousNormalized.value
    )
    {
      const removed =
      await supabaseClient
        .storage
        .from(
          CONFIG.storageBucket
        )
        .remove([
          previousNormalized.value,
        ]);

      if (removed.error)
      {
        console.warn(
          "Storage remove:",
          removed.error.message
        );
      }
    }

    await loadSiteCoverUrls();

    refreshAdminTab();

    adminMessage(
      "Portada eliminada. Se volverá a usar la imagen automática.",
      "ok"
    );
  }
  catch (error)
  {
    adminMessage(
      error.message,
      "error"
    );
  }
}

function renderAdminCollections()
{
  return `
    <div class="settings-grid">
      ${state.collections
        .map(
          collection =>
          `
            <div class="settings-card">
              <p class="eyebrow">
                ${escapeHtml(collection.emoji || "✦")}
                ${escapeHtml(collection.tipo || "")}
              </p>

              <div class="admin-form">
                ${renderSettingInput(
                  `collection-es-${collection.id || collection.slug}`,
                  "Nombre ES",
                  collection.nombre_es || ""
                )}

                ${renderSettingInput(
                  `collection-en-${collection.id || collection.slug}`,
                  "Name EN",
                  collection.nombre_en || ""
                )}

                <div class="admin-field">
                  <label>
                    Descripción ES
                  </label>

                  <textarea
                    id="collection-desc-es-${escapeAttribute(collection.id || collection.slug)}"
                    class="textarea-input">${escapeHtml(collection.descripcion_es || "")}</textarea>
                </div>

                <div class="admin-field">
                  <label>
                    Description EN
                  </label>

                  <textarea
                    id="collection-desc-en-${escapeAttribute(collection.id || collection.slug)}"
                    class="textarea-input">${escapeHtml(collection.descripcion_en || "")}</textarea>
                </div>

                ${renderAdminCollectionCover(collection)}

                ${collection.id
                  ?
                  `
                    <button
                      class="btn"
                      type="button"
                      data-action="admin-save-collection"
                      data-collection-id="${collection.id}">
                      ${escapeHtml(t("admin.save"))}
                    </button>
                  `
                  :
                  ""
                }
              </div>
            </div>
          `
        )
        .join("")
      }
    </div>
  `;
}

async function saveAdminCollection(
  collectionId
)
{
  const collection =
  state.collections.find(
    item =>
    Number(
      item.id
    ) ===
    Number(
      collectionId
    )
  );

  if (
    !collection
  )
  {
    return;
  }

  const key =
  collection.id
  ||
  collection.slug;

  const payload =
  {
    nombre_es:
    getInputValue(
      `collection-es-${key}`
    ),

    nombre_en:
    getInputValue(
      `collection-en-${key}`
    ),

    descripcion_es:
    getInputValue(
      `collection-desc-es-${key}`
    ),

    descripcion_en:
    getInputValue(
      `collection-desc-en-${key}`
    ),

    updated_at:
    new Date().toISOString(),
  };

  const result =
  await supabaseClient
    .from(
      "thematic_collections"
    )
    .update(
      payload
    )
    .eq(
      "id",
      Number(
        collectionId
      )
    )
    .select(
      "id,slug,nombre_es,nombre_en,descripcion_es,descripcion_en,tipo,estacion,ocasion,emoji,orden,activo"
    )
    .single();

  if (
    result.error
  )
  {
    adminMessage(
      result.error.message,
      "error"
    );

    return;
  }

  await loadCollections();

  refreshAdminTab();

  adminMessage(
    state.language === "en"
    ?
    "Collection saved."
    :
    "Colección guardada.",
    "ok"
  );
}


async function loadGameRewardsAdmin()
{
  // Paso 43: el sistema de premios/descuentos de juegos fue retirado.
  state.gameRewards = [];
}

async function awardYesterdayGameWinner()
{
  const result =
  await supabaseClient.rpc(
    "award_game_winner",
    {
      p_reward_date:
      null,
    }
  );

  if (
    result.error
  )
  {
    adminMessage(
      result.error.message,
      "error"
    );

    return;
  }

  await loadGameRewardsAdmin();

  refreshAdminTab();

  const data =
  result.data
  ||
  {};

  if (
    data.status === "no_scores"
  )
  {
    adminMessage(
      state.language === "en"
      ?
      "There were no valid scores yesterday."
      :
      "Ayer no hubo puntajes válidos.",
      "error"
    );

    return;
  }

  adminMessage(
    state.language === "en"
    ?
    "Yesterday's winner reward is ready."
    :
    "El premio del ganador de ayer ya está listo.",
    "ok"
  );
}

function getGameRewardById(
  rewardId
)
{
  return (
    state.gameRewards
    ||
    []
  ).find(
    reward =>
    Number(
      reward.id
    ) ===
    Number(
      rewardId
    )
  )
  ||
  null;
}

function sendGameRewardWhatsApp(
  rewardId
)
{
  const reward =
  getGameRewardById(
    rewardId
  );

  if (
    !reward
  )
  {
    return;
  }

  const phone =
  normalizeGamePhone(
    reward.player_phone
  );

  const message =
  `🏆 ¡Ganaste el ranking diario de AromaLParfum!

Fuiste quien más juegos resolvió el ${reward.reward_date}.

Tu premio es 10% de descuento en tu próxima compra.

Código: ${reward.discount_code}

El código es personal y puede usarse una sola vez.`;

  window.open(
    "https://wa.me/" +
    phone +
    "?text=" +
    encodeURIComponent(
      message
    ),
    "_blank",
    "noopener"
  );
}

async function updateGameRewardStatus(
  rewardId,
  mode
)
{
  const functionName =
  mode === "used"
  ?
  "mark_game_reward_used"
  :
  "mark_game_reward_sent";

  const result =
  await supabaseClient.rpc(
    functionName,
    {
      p_reward_id:
      Number(
        rewardId
      ),
    }
  );

  if (
    result.error
  )
  {
    adminMessage(
      result.error.message,
      "error"
    );

    return;
  }

  await loadGameRewardsAdmin();

  refreshAdminTab();

  adminMessage(
    mode === "used"
    ?
    "Código marcado como utilizado."
    :
    "Premio marcado como enviado.",
    "ok"
  );
}

function renderAdminGameRewards()
{
  return `
    <div class="settings-card u-mb-16">
      <h3>${state.language === "en" ? "Descubrí tu Aroma" : "Descubrí tu Aroma"}</h3>
      <p class="section-subtitle">
        ${state.language === "en"
          ? "The old daily 10% reward and game advertising were removed. Games now work only as a discovery and loyalty experience."
          : "El viejo premio diario del 10% y la publicidad de los juegos fueron eliminados. Los juegos quedan como experiencia de descubrimiento y fidelización."
        }
      </p>
    </div>
  `;
}

function renderAdminGames()
{
  return `
    ${renderAdminGameRewards()}

    <div class="settings-grid">
      ${[
        "puzzle",
        "differences",
        "hidden",
      ]
      .map(
        type =>
        {
          const config =
          getGameConfig(
            type
          );

          const id =
          config.id
          ||
          type;

          const title =
          type === "puzzle"
          ?
          t(
            "games.puzzle"
          )
          :
          type === "differences"
          ?
          t(
            "games.diff"
          )
          :
          t(
            "games.hidden"
          );

          return `
            <div class="settings-card">
              <h3>
                ${escapeHtml(title)}
              </h3>

              <div class="admin-form">
                ${renderSettingInput(
                  `game-time-${id}`,
                  state.language === "en" ? "Time limit (seconds)" : "Tiempo límite (segundos)",
                  config.tiempo_limite || 0
                )}

                ${type === "puzzle"
                  ?
                  renderSettingInput(
                    `game-pieces-${id}`,
                    state.language === "en" ? "Pieces" : "Piezas",
                    config.piezas || 20
                  )
                  :
                  ""
                }

                ${type === "differences"
                  ?
                  renderSettingInput(
                    `game-differences-${id}`,
                    state.language === "en" ? "Differences" : "Diferencias",
                    config.diferencias || 5
                  )
                  :
                  ""
                }

                ${config.id
                  ?
                  `
                    <button
                      class="btn"
                      type="button"
                      data-action="admin-save-game"
                      data-game-id="${config.id}">
                      ${escapeHtml(t("admin.save"))}
                    </button>
                  `
                  :
                  ""
                }
              </div>
            </div>
          `;
        }
      )
      .join("")
      }
    </div>
  `;
}

async function saveAdminGame(
  gameId
)
{
  const config =
  state.gameConfigs.find(
    item =>
    Number(
      item.id
    ) ===
    Number(
      gameId
    )
  );

  if (
    !config
  )
  {
    return;
  }

  const payload =
  {
    tiempo_limite:
    Math.max(
      10,
      getInputNumber(
        `game-time-${gameId}`,
        config.tiempo_limite
      )
    ),

    updated_at:
    new Date().toISOString(),
  };

  if (
    config.tipo === "puzzle"
  )
  {
    payload.piezas =
    20;
  }

  if (
    config.tipo === "differences"
  )
  {
    payload.diferencias =
    5;
  }

  const result =
  await supabaseClient
    .from(
      "aroma_games"
    )
    .update(
      payload
    )
    .eq(
      "id",
      Number(
        gameId
      )
    );

  if (
    result.error
  )
  {
    adminMessage(
      result.error.message,
      "error"
    );

    return;
  }

  await loadGameConfigs();

  refreshAdminTab();

  adminMessage(
    state.language === "en"
    ?
    "Game settings saved."
    :
    "Configuración del juego guardada.",
    "ok"
  );
}

function renderAdminStats()
{
  const best =
  getBestSellerProducts()
  .slice(
    0,
    15
  );

  return `
    <div class="settings-grid">
      <div class="settings-card">
        <h3>
          ${escapeHtml(t("best.title"))}
        </h3>

        ${best
          .map(
            (
              product,
              index
            ) =>
            `
              <div class="builder-summary-item">
                <span>
                  ${index + 1}.
                  ${escapeHtml(product.nombre)}
                </span>

                <strong>
                  ${formatInteger(getPopularity(product.id))}
                </strong>
              </div>
            `
          )
          .join("")
        }
      </div>

      <div class="settings-card">
        <h3>
          Estado del catálogo
        </h3>

        ${renderStatLine("Productos", state.products.length)}
        ${renderStatLine("Destacados", state.products.filter(p => p.destacado).length)}
        ${renderStatLine("Nuevos activos", state.products.filter(isNewProduct).length)}
        ${renderStatLine("Con imagen", state.products.filter(p => Boolean(getProductMainImage(p))).length)}
        ${renderStatLine("Sin imagen", state.products.filter(p => !getProductMainImage(p)).length)}
        ${renderStatLine("Sin stock", state.products.filter(p => p.stock <= 0).length)}
      </div>
    </div>
  `;
}

function renderStatLine(
  label,
  value
)
{
  return `
    <div class="builder-summary-item">
      <span>
        ${escapeHtml(label)}
      </span>

      <strong>
        ${formatInteger(value)}
      </strong>
    </div>
  `;
}

async function fillNewProductWithAI()
{
  if (
    !isAiEnabled(
      "admin_assistant_enabled"
    )
  )
  {
    adminMessage(
      t(
        "admin.ai.disabled"
      ),
      "error"
    );

    return;
  }

  const perfumeName =
  getInputValue(
    "adminAiPerfumeName"
  );

  if (
    !perfumeName
  )
  {
    adminMessage(
      state.language === "en"
      ?
      "Enter a fragrance name."
      :
      "Escribí el nombre de una fragancia.",
      "error"
    );

    return;
  }

  adminMessage(
    state.language === "en"
    ?
    "Consulting AI..."
    :
    "Consultando IA...",
    "ok"
  );

  try
  {
    const result =
    await callAromaAI(
      "admin",
      {
        perfumeName:
        perfumeName,
      }
    );

    const data =
    typeof result === "string"
    ?
    safeJsonParse(
      result,
      null
    )
    :
    result;

    if (
      !data ||
      typeof data !== "object"
    )
    {
      throw new Error(
        state.language === "en"
        ?
        "AI did not return a valid product sheet."
        :
        "La IA no devolvió una ficha válida."
      );
    }

    state.admin.aiDraft =
    data;

    setInputIfExists(
      "np-name",
      data.nombre
    );

    setInputIfExists(
      "np-brand",
      data.marca
    );

    setInputIfExists(
      "np-category",
      data.categoria
    );

    setInputIfExists(
      "np-gender",
      data.genero
    );

    setInputIfExists(
      "np-family",
      data.familia
    );

    setInputIfExists(
      "np-description",
      data.descripcion
    );

    setInputIfExists(
      "np-top",
      data.salida
    );

    setInputIfExists(
      "np-heart",
      data.corazon
    );

    setInputIfExists(
      "np-base",
      data.fondo
    );

    setInputIfExists(
      "np-ml",
      data.ml
    );

    setInputIfExists(
      "np-duration",
      data.duracion
    );

    setInputIfExists(
      "np-projection",
      data.proyeccion
    );

    setInputIfExists(
      "np-use",
      data.recomendacion_uso
    );

    setInputIfExists(
      "np-seasons",
      Array.isArray(
        data.estaciones
      )
      ?
      data.estaciones.join(
        ", "
      )
      :
      data.estaciones
    );

    setInputIfExists(
      "np-occasions",
      Array.isArray(
        data.ocasiones
      )
      ?
      data.ocasiones.join(
        ", "
      )
      :
      data.ocasiones
    );

    const createdAi =
    document.getElementById(
      "np-created-ai"
    );

    if (
      createdAi
    )
    {
      createdAi.checked =
      true;
    }

    const imageSearch =
    document.getElementById(
      "adminAiImageSearch"
    );

    if (
      imageSearch &&
      data.imagen_query
    )
    {
      imageSearch.innerHTML =
      `
        <p class="section-subtitle">
          Búsqueda sugerida:
          <strong>
            ${escapeHtml(data.imagen_query)}
          </strong>
        </p>

        <button
          class="btn outline small"
          type="button"
          data-action="admin-open-image-search"
          data-image-query="${escapeAttribute(data.imagen_query)}">
          Buscar imagen
        </button>
      `;
    }

    adminMessage(
      state.language === "en"
      ?
      "AI completed the draft. Review everything before saving."
      :
      "La IA completó el borrador. Revisá todo antes de guardar.",
      "ok"
    );
  }
  catch (
    error
  )
  {
    adminMessage(
      error.message,
      "error"
    );
  }
}

function setInputIfExists(
  id,
  value
)
{
  const element =
  document.getElementById(
    id
  );

  if (
    !element ||
    value === undefined ||
    value === null
  )
  {
    return;
  }

  element.value =
  String(
    value
  );
}

async function fillExistingProductWithAI(
  productId
)
{
  const product =
  getProductById(
    productId
  );

  if (
    !product
  )
  {
    return;
  }

  if (
    !isAiEnabled(
      "admin_assistant_enabled"
    )
  )
  {
    adminMessage(
      t(
        "admin.ai.disabled"
      ),
      "error"
    );

    return;
  }

  try
  {
    const result =
    await callAromaAI(
      "admin",
      {
        perfumeName:
        product.nombre,
      }
    );

    const data =
    typeof result === "string"
    ?
    safeJsonParse(
      result,
      null
    )
    :
    result;

    if (
      !data
    )
    {
      throw new Error(
        "Respuesta inválida."
      );
    }

    setInputIfExists(
      `ap-brand-${product.id}`,
      data.marca
    );

    setInputIfExists(
      `ap-category-${product.id}`,
      data.categoria
    );

    setInputIfExists(
      `ap-gender-${product.id}`,
      data.genero
    );

    setInputIfExists(
      `ap-family-${product.id}`,
      data.familia
    );

    setInputIfExists(
      `ap-description-${product.id}`,
      data.descripcion
    );

    setInputIfExists(
      `ap-top-${product.id}`,
      data.salida
    );

    setInputIfExists(
      `ap-heart-${product.id}`,
      data.corazon
    );

    setInputIfExists(
      `ap-base-${product.id}`,
      data.fondo
    );

    setInputIfExists(
      `ap-duration-${product.id}`,
      data.duracion
    );

    setInputIfExists(
      `ap-projection-${product.id}`,
      data.proyeccion
    );

    setInputIfExists(
      `ap-seasons-${product.id}`,
      Array.isArray(
        data.estaciones
      )
      ?
      data.estaciones.join(
        ", "
      )
      :
      data.estaciones
    );

    setInputIfExists(
      `ap-occasions-${product.id}`,
      Array.isArray(
        data.ocasiones
      )
      ?
      data.ocasiones.join(
        ", "
      )
      :
      data.ocasiones
    );

    adminMessage(
      state.language === "en"
      ?
      "AI filled the row. Review it and press Save."
      :
      "La IA completó la fila. Revisala y tocá Guardar.",
      "ok"
    );
  }
  catch (
    error
  )
  {
    adminMessage(
      error.message,
      "error"
    );
  }
}

function openImageSearch(
  query
)
{
  const q =
  String(
    query
    ||
    ""
  )
  .trim();

  if (
    !q
  )
  {
    return;
  }

  window.open(
    "https://www.google.com/search?tbm=isch&q=" +
    encodeURIComponent(
      q
    ),
    "_blank",
    "noopener"
  );
}

