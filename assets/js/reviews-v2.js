"use strict";

// AromaLParfum Frontend V2 — PASO 58
// Reseñas Verificadas V2: lectura pública bajo demanda + compra verificada + moderación Admin.

const reviews58ProductState = new Map();

const alp58ReviewsState = {
  loaded: false,
  loading: false,
  error: "",
  status: "pending",
  search: "",
  page: 1,
  pageSize: 20,
  total: 0,
  rows: [],
  stats: {
    pending: 0,
    approved: 0,
    rejected: 0,
    featured: 0,
    approved_average: 0,
  },
};

function reviewsV2Text(es, en)
{
  return state.language === "en" ? en : es;
}

function reviewsV2Num(value, fallback = 0)
{
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function reviewsV2Date(value)
{
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(state.language === "en" ? "en-US" : "es-AR", {
    dateStyle: "medium",
  }).format(date);
}

function reviewsV2Stars(value, label = true)
{
  const rating = Math.max(0, Math.min(5, reviewsV2Num(value, 0)));
  const rounded = Math.round(rating);
  const stars = Array.from({ length: 5 }, (_, index) => index < rounded ? "★" : "☆").join("");
  return `<span class="review58-stars" aria-label="${escapeAttribute(`${rating.toFixed(1)} / 5`)}">${stars}</span>${label ? `<strong>${escapeHtml(rating.toFixed(1))}</strong>` : ""}`;
}

function reviewsV2Summary(data)
{
  return data?.summary && typeof data.summary === "object"
    ? data.summary
    : { average_rating: 0, review_count: 0, ratings: {} };
}

function reviewsV2RenderHeroSummary(data)
{
  const summary = reviewsV2Summary(data);
  const count = Math.max(0, reviewsV2Num(summary.review_count, 0));

  if (!count)
  {
    return `
      <button class="review58-hero-empty" type="button" data-review58-action="write" data-product-id="${escapeAttribute(data?.product_id || 0)}">
        <span class="review58-stars" aria-hidden="true">☆☆☆☆☆</span>
        <span>${reviewsV2Text("Sé el primero en reseñar", "Be the first to review")}</span>
      </button>
    `;
  }

  return `
    <button class="review58-hero-summary" type="button" data-review58-action="scroll" data-product-id="${escapeAttribute(data?.product_id || 0)}">
      ${reviewsV2Stars(summary.average_rating)}
      <span>${escapeHtml(String(count))} ${count === 1 ? reviewsV2Text("reseña", "review") : reviewsV2Text("reseñas", "reviews")}</span>
      <span aria-hidden="true">→</span>
    </button>
  `;
}

function reviewsV2RenderBreakdown(summary)
{
  const total = Math.max(0, reviewsV2Num(summary.review_count, 0));
  const ratings = summary.ratings && typeof summary.ratings === "object" ? summary.ratings : {};

  return `<div class="review58-breakdown">${[5, 4, 3, 2, 1].map(star => {
    const amount = Math.max(0, reviewsV2Num(ratings[String(star)], 0));
    const percent = total > 0 ? Math.round((amount / total) * 100) : 0;
    return `
      <div class="review58-breakdown-row">
        <span>${star} ★</span>
        <div><i style="width:${percent}%"></i></div>
        <strong>${amount}</strong>
      </div>
    `;
  }).join("")}</div>`;
}

function reviewsV2RenderCard(review)
{
  const displayName = String(review?.display_name || reviewsV2Text("Cliente verificado", "Verified customer"));
  const purchaseType = String(review?.purchase_type || "product");
  const purchaseLabel = purchaseType === "decant"
    ? reviewsV2Text("Compra verificada · Decant", "Verified purchase · Decant")
    : reviewsV2Text("Compra verificada", "Verified purchase");

  return `
    <article class="review58-card ${review?.featured ? "is-featured" : ""}">
      <div class="review58-card-head">
        <div>
          ${reviewsV2Stars(review?.rating, false)}
          <strong>${escapeHtml(displayName)}</strong>
        </div>
        <span>${escapeHtml(reviewsV2Date(review?.created_at))}</span>
      </div>
      ${review?.title ? `<h4>${escapeHtml(review.title)}</h4>` : ""}
      <p>${escapeHtml(review?.body || "")}</p>
      <div class="review58-badges">
        ${review?.verified_purchase ? `<span class="review58-verified">✓ ${escapeHtml(purchaseLabel)}</span>` : ""}
        ${review?.featured ? `<span class="review58-featured">✦ ${reviewsV2Text("Destacada", "Featured")}</span>` : ""}
      </div>
    </article>
  `;
}

function reviewsV2RenderProductSection(productId, data)
{
  const product = getProductById(productId);
  const summary = reviewsV2Summary(data);
  const rows = Array.isArray(data?.reviews) ? data.reviews : [];
  const count = Math.max(0, reviewsV2Num(summary.review_count, 0));

  return `
    <section class="review58-section" id="productReviews58">
      <div class="review58-section-head">
        <div>
          <p class="eyebrow">${reviewsV2Text("Experiencias reales", "Real experiences")}</p>
          <h2>${reviewsV2Text("Reseñas verificadas", "Verified reviews")}</h2>
          <p>${reviewsV2Text("Solo pueden reseñar clientes con un pedido entregado que incluya esta fragancia.", "Only customers with a delivered order containing this fragrance can review it.")}</p>
        </div>
        <button class="btn" type="button" data-review58-action="write" data-product-id="${escapeAttribute(productId)}">
          ${reviewsV2Text("Escribir reseña", "Write a review")}
        </button>
      </div>

      ${count ? `
        <div class="review58-overview">
          <div class="review58-score">
            <strong>${escapeHtml(reviewsV2Num(summary.average_rating, 0).toFixed(1))}</strong>
            ${reviewsV2Stars(summary.average_rating, false)}
            <span>${escapeHtml(String(count))} ${count === 1 ? reviewsV2Text("reseña publicada", "published review") : reviewsV2Text("reseñas publicadas", "published reviews")}</span>
          </div>
          ${reviewsV2RenderBreakdown(summary)}
        </div>
      ` : `
        <div class="review58-empty">
          <span>✦</span>
          <div>
            <strong>${reviewsV2Text("Todavía no hay reseñas publicadas", "No published reviews yet")}</strong>
            <p>${reviewsV2Text(`Si compraste ${product?.nombre || "esta fragancia"} y tu pedido ya fue entregado, podés dejar la primera.`, `If you bought ${product?.nombre || "this fragrance"} and your order was delivered, you can leave the first one.`)}</p>
          </div>
        </div>
      `}

      ${rows.length ? `<div class="review58-grid">${rows.map(reviewsV2RenderCard).join("")}</div>` : ""}
    </section>
  `;
}

function reviewsV2RenderLoadingSection(productId)
{
  return `
    <section class="review58-section" id="productReviews58">
      <div class="review58-loading">
        <span></span>
        ${reviewsV2Text("Cargando reseñas verificadas…", "Loading verified reviews…")}
      </div>
      <button class="btn secondary small" type="button" data-review58-action="write" data-product-id="${escapeAttribute(productId)}">
        ${reviewsV2Text("Escribir reseña", "Write a review")}
      </button>
    </section>
  `;
}

function reviewsV2EnsureHosts(productId)
{
  const page = document.querySelector(".product-v2-page");
  if (!page) return;

  const summary = page.querySelector(".product-v2-summary");
  const title = summary?.querySelector("h1");
  if (title && !document.getElementById("productReviewHero58"))
  {
    title.insertAdjacentHTML("afterend", `<div id="productReviewHero58" class="review58-hero-host"><div class="review58-mini-loading"></div></div>`);
  }

  if (!document.getElementById("productReviews58"))
  {
    const contentGrid = page.querySelector(".product-v2-content-grid");
    if (contentGrid)
    {
      contentGrid.insertAdjacentHTML("afterend", reviewsV2RenderLoadingSection(productId));
    }
  }
}

function reviewsV2HydrateProduct(productId, data)
{
  if (Number(state.routePayload?.id || 0) !== Number(productId) || state.route !== "product") return;

  const hero = document.getElementById("productReviewHero58");
  if (hero) hero.innerHTML = reviewsV2RenderHeroSummary(data);

  const section = document.getElementById("productReviews58");
  if (section) section.outerHTML = reviewsV2RenderProductSection(productId, data);
}

function reviewsV2HydrateError(productId)
{
  if (Number(state.routePayload?.id || 0) !== Number(productId) || state.route !== "product") return;

  const hero = document.getElementById("productReviewHero58");
  if (hero) hero.innerHTML = "";

  const section = document.getElementById("productReviews58");
  if (section)
  {
    section.innerHTML = `
      <div class="review58-soft-error">
        <strong>${reviewsV2Text("Reseñas temporalmente no disponibles", "Reviews temporarily unavailable")}</strong>
        <p>${reviewsV2Text("La compra y el resto de la ficha siguen funcionando normalmente.", "Shopping and the rest of this product page still work normally.")}</p>
      </div>
    `;
  }
}

async function reviewsV2LoadProduct(productId, force = false)
{
  const id = Number(productId || 0);
  if (!id) return null;

  const cached = reviews58ProductState.get(id);
  if (cached?.data && !force)
  {
    reviewsV2HydrateProduct(id, cached.data);
    return cached.data;
  }

  if (cached?.loading && cached.promise) return cached.promise;

  const promise = (async () => {
    try
    {
      const response = await supabaseClient.rpc("get_product_reviews_v2", {
        p_product_id: id,
        p_limit: 8,
        p_offset: 0,
      });

      if (response.error) throw response.error;

      const data = response.data && typeof response.data === "object"
        ? response.data
        : { ok: true, product_id: id, summary: { average_rating: 0, review_count: 0, ratings: {} }, reviews: [] };

      if (!data.ok) throw new Error(data.error || "reviews_unavailable");

      reviews58ProductState.set(id, { loading: false, data, error: "" });
      reviewsV2HydrateProduct(id, data);
      return data;
    }
    catch (error)
    {
      reviews58ProductState.set(id, { loading: false, data: null, error: error?.message || String(error) });
      console.debug("PASO58 public reviews:", error);
      reviewsV2HydrateError(id);
      return null;
    }
  })();

  reviews58ProductState.set(id, { loading: true, promise, data: null, error: "" });
  return promise;
}

async function reviewsV2AfterProductRender(productId)
{
  const id = Number(productId || 0);
  if (!id || state.route !== "product") return;
  reviewsV2EnsureHosts(id);
  await reviewsV2LoadProduct(id);
}

function reviewsV2RecentIdentity()
{
  try
  {
    if (typeof orderTrackingV2ReadRecent === "function")
    {
      const recent = orderTrackingV2ReadRecent()[0];
      if (recent) return { orderCode: recent.orderCode || "", contact: recent.contact || "" };
    }
  }
  catch (_) {}
  return { orderCode: "", contact: "" };
}

function reviewsV2OpenForm(productId, defaults = {})
{
  const id = Number(productId || 0);
  const product = getProductById(id);
  if (!product) return;

  const recent = reviewsV2RecentIdentity();
  const orderCode = String(defaults.orderCode || recent.orderCode || "").trim();
  const contact = String(defaults.contact || recent.contact || "").trim();

  openModal(
    reviewsV2Text("Dejá tu reseña", "Write your review"),
    `
      <div class="review58-form">
        <div class="review58-form-product">
          <span>${reviewsV2Text("Fragancia", "Fragrance")}</span>
          <strong>${escapeHtml(product.nombre)}</strong>
          <small>✓ ${reviewsV2Text("La compra se verifica de forma privada con Supabase.", "Purchase is privately verified with Supabase.")}</small>
        </div>

        <div class="admin-field">
          <label for="review58Rating">${reviewsV2Text("Calificación", "Rating")}</label>
          <select id="review58Rating" class="select-input">
            <option value="5">★★★★★ · 5/5</option>
            <option value="4">★★★★☆ · 4/5</option>
            <option value="3">★★★☆☆ · 3/5</option>
            <option value="2">★★☆☆☆ · 2/5</option>
            <option value="1">★☆☆☆☆ · 1/5</option>
          </select>
        </div>

        <div class="admin-form-grid review58-form-grid">
          <div class="admin-field">
            <label for="review58OrderCode">${reviewsV2Text("Código del pedido", "Order code")}</label>
            <input id="review58OrderCode" class="text-input" autocomplete="off" placeholder="ALP-..." value="${escapeAttribute(orderCode)}">
          </div>
          <div class="admin-field">
            <label for="review58Contact">${reviewsV2Text("Email o teléfono de la compra", "Purchase email or phone")}</label>
            <input id="review58Contact" class="text-input" autocomplete="email" value="${escapeAttribute(contact)}">
          </div>
        </div>

        <div class="admin-field">
          <label for="review58Name">${reviewsV2Text("Nombre público", "Public display name")}</label>
          <input id="review58Name" class="text-input" maxlength="40" placeholder="${reviewsV2Text("Ej.: Santiago", "Example: Santiago")}">
        </div>

        <div class="admin-field">
          <label for="review58Title">${reviewsV2Text("Título opcional", "Optional title")}</label>
          <input id="review58Title" class="text-input" maxlength="90" placeholder="${reviewsV2Text("Ej.: Ideal para salir de noche", "Example: Perfect for nights out")}">
        </div>

        <div class="admin-field">
          <label for="review58Body">${reviewsV2Text("Tu experiencia", "Your experience")}</label>
          <textarea id="review58Body" class="text-input review58-textarea" maxlength="1200" placeholder="${reviewsV2Text("Contá cómo te resultó el aroma, duración, proyección o para qué ocasiones lo usás.", "Share your experience with the scent, longevity, projection or occasions you wear it for.")}"></textarea>
        </div>

        <div id="review58FormMessage"></div>

        <div class="review58-form-actions">
          <button class="btn secondary" type="button" data-action="close-modal">${reviewsV2Text("Cancelar", "Cancel")}</button>
          <button class="btn" id="review58SubmitButton" type="button" data-review58-action="submit" data-product-id="${escapeAttribute(id)}">
            ${reviewsV2Text("Enviar reseña", "Submit review")}
          </button>
        </div>

        <p class="review58-privacy">${reviewsV2Text("Tu email, teléfono y código de pedido se usan únicamente para validar la compra y nunca aparecen públicamente.", "Your email, phone and order code are used only to verify the purchase and are never shown publicly.")}</p>
      </div>
    `
  );
}

function reviewsV2FormMessage(message, type = "error")
{
  const host = document.getElementById("review58FormMessage");
  if (!host) return;
  host.innerHTML = `<div class="review58-form-message ${escapeAttribute(type)}">${escapeHtml(message)}</div>`;
}

function reviewsV2SubmissionError(error)
{
  const map = {
    missing_order_identity: reviewsV2Text("Completá el código del pedido y el email o teléfono usado al comprar.", "Enter the order code and the email or phone used at checkout."),
    invalid_rating: reviewsV2Text("Elegí una calificación válida.", "Choose a valid rating."),
    review_too_short: reviewsV2Text("Contanos un poco más: la reseña debe tener al menos 10 caracteres.", "Tell us a little more: the review needs at least 10 characters."),
    review_too_long: reviewsV2Text("La reseña es demasiado larga.", "The review is too long."),
    title_too_long: reviewsV2Text("El título es demasiado largo.", "The title is too long."),
    order_not_found: reviewsV2Text("No encontramos un pedido que coincida con esos datos.", "We couldn't find an order matching those details."),
    order_not_delivered: reviewsV2Text("Podés reseñar cuando el pedido figure como Entregado.", "You can review once the order is marked Delivered."),
    product_not_in_order: reviewsV2Text("Ese perfume no figura dentro de ese pedido.", "That fragrance is not part of this order."),
    already_reviewed: reviewsV2Text("Ese perfume ya fue reseñado con este pedido.", "This fragrance has already been reviewed with this order."),
  };
  return map[String(error || "")] || reviewsV2Text("No pudimos enviar la reseña. Revisá los datos y probá de nuevo.", "We couldn't submit the review. Check the details and try again.");
}

async function reviewsV2Submit(productId)
{
  const id = Number(productId || 0);
  if (!id) return;

  const button = document.getElementById("review58SubmitButton");
  if (button) button.disabled = true;

  try
  {
    const payload = {
      p_product_id: id,
      p_order_code: document.getElementById("review58OrderCode")?.value || "",
      p_contact: document.getElementById("review58Contact")?.value || "",
      p_rating: Number(document.getElementById("review58Rating")?.value || 0),
      p_title: document.getElementById("review58Title")?.value || null,
      p_body: document.getElementById("review58Body")?.value || "",
      p_display_name: document.getElementById("review58Name")?.value || null,
    };

    if (!String(payload.p_body || "").trim() || String(payload.p_body || "").trim().length < 10)
    {
      reviewsV2FormMessage(reviewsV2SubmissionError("review_too_short"));
      return;
    }

    const response = await supabaseClient.rpc("submit_verified_product_review_v2", payload);
    if (response.error) throw response.error;

    const data = response.data && typeof response.data === "object" ? response.data : {};
    if (!data.ok)
    {
      reviewsV2FormMessage(reviewsV2SubmissionError(data.error));
      return;
    }

    closeModal();
    toast(reviewsV2Text("Reseña verificada y enviada a moderación. Gracias.", "Verified review submitted for moderation. Thank you."), "success");

    reviews58ProductState.delete(id);

    if (typeof order57State !== "undefined" && state.route === "order-tracking" && order57State.result)
    {
      const code = order57State.orderCode || order57State.result.order_code || "";
      const contact = order57State.contact || "";
      if (code && contact && typeof orderTrackingV2Lookup === "function")
      {
        await orderTrackingV2Lookup(code, contact);
      }
    }
  }
  catch (error)
  {
    console.debug("PASO58 submit review:", error);
    reviewsV2FormMessage(
      String(error?.message || "").includes("submit_verified_product_review_v2")
        ? reviewsV2Text("Primero activá el PASO 58 en Supabase.", "Enable STEP 58 in Supabase first.")
        : reviewsV2SubmissionError("")
    );
  }
  finally
  {
    if (button) button.disabled = false;
  }
}

function reviewsV2OpenFromOrder(productId, orderCode)
{
  const contact = (typeof order57State !== "undefined" ? order57State.contact : "") || "";
  reviewsV2OpenForm(productId, { orderCode, contact });
}

// -------------------- ADMIN --------------------

function alp58StatusLabel(status)
{
  const en = state.language === "en";
  const map = {
    pending: en ? "Pending" : "Pendiente",
    approved: en ? "Approved" : "Aprobada",
    rejected: en ? "Rejected" : "Rechazada",
  };
  return map[String(status || "")] || String(status || "");
}

function alp58StatusBadge(status)
{
  return `<span class="alp58-status is-${escapeAttribute(status || "pending")}">${escapeHtml(alp58StatusLabel(status))}</span>`;
}

async function alp58LoadReviews({ force = false } = {})
{
  if (alp58ReviewsState.loading) return;
  if (alp58ReviewsState.loaded && !force) return;

  alp58ReviewsState.loading = true;
  alp58ReviewsState.error = "";
  if (state.admin?.tab === "reviews") refreshAdminTab();

  try
  {
    const response = await supabaseClient.rpc("admin_get_product_reviews_v2", {
      p_status: alp58ReviewsState.status,
      p_search: alp58ReviewsState.search,
      p_limit: alp58ReviewsState.pageSize,
      p_offset: (alp58ReviewsState.page - 1) * alp58ReviewsState.pageSize,
    });

    if (response.error) throw response.error;
    const data = response.data && typeof response.data === "object" ? response.data : {};
    if (!data.ok) throw new Error(data.error || "reviews_admin_unavailable");

    alp58ReviewsState.rows = Array.isArray(data.rows) ? data.rows : [];
    alp58ReviewsState.total = reviewsV2Num(data.total, 0);
    alp58ReviewsState.stats = { ...alp58ReviewsState.stats, ...(data.stats || {}) };
    alp58ReviewsState.loaded = true;
  }
  catch (error)
  {
    console.error("PASO58 admin reviews:", error);
    alp58ReviewsState.error = error?.message || String(error);
    alp58ReviewsState.rows = [];
  }
  finally
  {
    alp58ReviewsState.loading = false;
    if (state.admin?.tab === "reviews") refreshAdminTab();
  }
}

function alp58EnsureReviewsLoaded()
{
  if (!alp58ReviewsState.loaded && !alp58ReviewsState.loading)
  {
    alp58LoadReviews();
  }
}

function alp58RenderStats()
{
  const s = alp58ReviewsState.stats || {};
  const items = [
    [reviewsV2Text("Pendientes", "Pending"), reviewsV2Num(s.pending, 0)],
    [reviewsV2Text("Aprobadas", "Approved"), reviewsV2Num(s.approved, 0)],
    [reviewsV2Text("Rechazadas", "Rejected"), reviewsV2Num(s.rejected, 0)],
    [reviewsV2Text("Destacadas", "Featured"), reviewsV2Num(s.featured, 0)],
    [reviewsV2Text("Promedio público", "Public average"), `${reviewsV2Num(s.approved_average, 0).toFixed(1)} ★`],
  ];

  return `<div class="alp58-stats">${items.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`).join("")}</div>`;
}

function alp58RenderFilters()
{
  return `
    <div class="alp58-filters">
      <label>
        <span>${reviewsV2Text("Estado", "Status")}</span>
        <select id="alp58ReviewStatus" class="select-input">
          <option value="pending" ${alp58ReviewsState.status === "pending" ? "selected" : ""}>${reviewsV2Text("Pendientes", "Pending")}</option>
          <option value="approved" ${alp58ReviewsState.status === "approved" ? "selected" : ""}>${reviewsV2Text("Aprobadas", "Approved")}</option>
          <option value="rejected" ${alp58ReviewsState.status === "rejected" ? "selected" : ""}>${reviewsV2Text("Rechazadas", "Rejected")}</option>
          <option value="all" ${alp58ReviewsState.status === "all" ? "selected" : ""}>${reviewsV2Text("Todas", "All")}</option>
        </select>
      </label>
      <label class="alp58-search">
        <span>${reviewsV2Text("Buscar", "Search")}</span>
        <input id="alp58ReviewSearch" class="text-input" value="${escapeAttribute(alp58ReviewsState.search)}" placeholder="${reviewsV2Text("Perfume, cliente o texto…", "Product, customer or text…")}">
      </label>
      <button class="btn" type="button" data-review58-action="admin-filter">${reviewsV2Text("Aplicar", "Apply")}</button>
      <button class="btn secondary" type="button" data-review58-action="admin-refresh">${reviewsV2Text("Actualizar", "Refresh")}</button>
    </div>
  `;
}

function alp58RenderAdminRow(row)
{
  const approved = row.status === "approved";
  return `
    <article class="alp58-review-row ${row.featured ? "is-featured" : ""}">
      <div class="alp58-review-main">
        <div class="alp58-review-topline">
          <div>${reviewsV2Stars(row.rating)} ${alp58StatusBadge(row.status)}</div>
          <span>${escapeHtml(reviewsV2Date(row.created_at))}</span>
        </div>
        <h3>${escapeHtml(row.product_name || reviewsV2Text("Producto", "Product"))}</h3>
        <div class="alp58-review-meta">
          <span>✓ ${escapeHtml(row.display_name || reviewsV2Text("Cliente verificado", "Verified customer"))}</span>
          <span>${escapeHtml(row.order_code || "")}</span>
          <span>${escapeHtml(row.purchase_type || "product")}</span>
        </div>
        ${row.title ? `<h4>${escapeHtml(row.title)}</h4>` : ""}
        <p>${escapeHtml(row.body || "")}</p>
      </div>
      <div class="alp58-review-actions">
        ${row.status !== "approved" ? `<button class="btn small" type="button" data-review58-action="admin-status" data-review-id="${escapeAttribute(row.id)}" data-status="approved">✓ ${reviewsV2Text("Aprobar", "Approve")}</button>` : ""}
        ${row.status !== "rejected" ? `<button class="btn danger small" type="button" data-review58-action="admin-status" data-review-id="${escapeAttribute(row.id)}" data-status="rejected">${reviewsV2Text("Rechazar", "Reject")}</button>` : ""}
        ${row.status !== "pending" ? `<button class="btn secondary small" type="button" data-review58-action="admin-status" data-review-id="${escapeAttribute(row.id)}" data-status="pending">${reviewsV2Text("Volver a pendiente", "Back to pending")}</button>` : ""}
        ${approved ? `<button class="btn secondary small ${row.featured ? "active" : ""}" type="button" data-review58-action="admin-feature" data-review-id="${escapeAttribute(row.id)}" data-featured="${row.featured ? "false" : "true"}">${row.featured ? "★ " + reviewsV2Text("Quitar destacada", "Unfeature") : "☆ " + reviewsV2Text("Destacar", "Feature")}</button>` : ""}
        <button class="btn ghost small" type="button" data-review58-action="admin-copy-order" data-order-code="${escapeAttribute(row.order_code || "")}">${reviewsV2Text("Copiar pedido", "Copy order")}</button>
      </div>
    </article>
  `;
}

function alp58RenderPaginator()
{
  const pages = Math.max(1, Math.ceil(alp58ReviewsState.total / alp58ReviewsState.pageSize));
  if (pages <= 1) return "";
  return `
    <div class="alp58-pager">
      <button class="btn secondary small" type="button" data-review58-action="admin-page" data-page="${alp58ReviewsState.page - 1}" ${alp58ReviewsState.page <= 1 ? "disabled" : ""}>←</button>
      <span>${reviewsV2Text("Página", "Page")} ${alp58ReviewsState.page} / ${pages}</span>
      <button class="btn secondary small" type="button" data-review58-action="admin-page" data-page="${alp58ReviewsState.page + 1}" ${alp58ReviewsState.page >= pages ? "disabled" : ""}>→</button>
    </div>
  `;
}

function renderAdminReviewsV2()
{
  if (alp58ReviewsState.loading && !alp58ReviewsState.loaded)
  {
    return `<div class="alp58-admin-loading"><div class="loader"></div><p>${reviewsV2Text("Cargando reseñas…", "Loading reviews…")}</p></div>`;
  }

  return `
    <section class="alp58-admin-shell">
      <div class="alp58-admin-head">
        <div>
          <p class="eyebrow">${reviewsV2Text("Prueba social", "Social proof")}</p>
          <h2>${reviewsV2Text("Reseñas verificadas", "Verified reviews")}</h2>
          <p>${reviewsV2Text("Moderá compras verificadas antes de que aparezcan en las fichas de producto.", "Moderate verified purchases before they appear on product pages.")}</p>
        </div>
        <button class="btn" type="button" data-review58-action="admin-refresh">${reviewsV2Text("Actualizar", "Refresh")}</button>
      </div>

      ${alp58RenderStats()}
      ${alp58RenderFilters()}

      ${alp58ReviewsState.error ? `<div class="admin-message error">${escapeHtml(alp58ReviewsState.error)}</div>` : ""}

      <div class="alp58-review-list">
        ${alp58ReviewsState.rows.length
          ? alp58ReviewsState.rows.map(alp58RenderAdminRow).join("")
          : `<div class="empty-state"><h3>${reviewsV2Text("No hay reseñas en este filtro", "No reviews in this filter")}</h3><p>${reviewsV2Text("Las nuevas reseñas verificadas aparecerán acá para moderación.", "New verified reviews will appear here for moderation.")}</p></div>`
        }
      </div>

      ${alp58RenderPaginator()}
    </section>
  `;
}

async function alp58UpdateReview(reviewId, { status = null, featured = null } = {})
{
  const id = Number(reviewId || 0);
  if (!id) return;

  try
  {
    const response = await supabaseClient.rpc("admin_update_product_review_v2", {
      p_review_id: id,
      p_status: status,
      p_featured: featured,
      p_admin_note: null,
    });
    if (response.error) throw response.error;
    const data = response.data && typeof response.data === "object" ? response.data : {};
    if (!data.ok) throw new Error(data.error || "review_update_failed");

    toast(reviewsV2Text("Reseña actualizada.", "Review updated."), "success");
    alp58ReviewsState.loaded = false;
    await alp58LoadReviews({ force: true });
  }
  catch (error)
  {
    console.error("PASO58 update review:", error);
    adminMessage(error?.message || String(error), "error");
  }
}

async function alp58ApplyFilter()
{
  alp58ReviewsState.status = document.getElementById("alp58ReviewStatus")?.value || "pending";
  alp58ReviewsState.search = document.getElementById("alp58ReviewSearch")?.value.trim() || "";
  alp58ReviewsState.page = 1;
  alp58ReviewsState.loaded = false;
  await alp58LoadReviews({ force: true });
}

async function alp58SetPage(page)
{
  const pages = Math.max(1, Math.ceil(alp58ReviewsState.total / alp58ReviewsState.pageSize));
  alp58ReviewsState.page = Math.max(1, Math.min(reviewsV2Num(page, 1), pages));
  alp58ReviewsState.loaded = false;
  await alp58LoadReviews({ force: true });
}

async function reviewsV2Copy(text)
{
  const value = String(text || "").trim();
  if (!value) return;
  try
  {
    await navigator.clipboard.writeText(value);
    toast(reviewsV2Text("Copiado.", "Copied."), "success");
  }
  catch (_)
  {
    toast(value, "success");
  }
}

if (!window.__alp58ReviewListeners)
{
  window.__alp58ReviewListeners = true;

  document.addEventListener("click", async event => {
    const button = event.target.closest("[data-review58-action]");
    if (!button) return;

    const action = button.dataset.review58Action;

    if (action === "scroll")
    {
      document.getElementById("productReviews58")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (action === "write")
    {
      reviewsV2OpenForm(button.dataset.productId);
      return;
    }

    if (action === "from-order")
    {
      reviewsV2OpenFromOrder(button.dataset.productId, button.dataset.orderCode || "");
      return;
    }

    if (action === "submit")
    {
      await reviewsV2Submit(button.dataset.productId);
      return;
    }

    if (action === "admin-refresh")
    {
      alp58ReviewsState.loaded = false;
      await alp58LoadReviews({ force: true });
      return;
    }

    if (action === "admin-filter")
    {
      await alp58ApplyFilter();
      return;
    }

    if (action === "admin-page")
    {
      await alp58SetPage(button.dataset.page);
      return;
    }

    if (action === "admin-status")
    {
      await alp58UpdateReview(button.dataset.reviewId, { status: button.dataset.status || "pending" });
      return;
    }

    if (action === "admin-feature")
    {
      await alp58UpdateReview(button.dataset.reviewId, { featured: button.dataset.featured === "true" });
      return;
    }

    if (action === "admin-copy-order")
    {
      await reviewsV2Copy(button.dataset.orderCode || "");
    }
  });

  document.addEventListener("keydown", async event => {
    if (event.key === "Enter" && event.target?.id === "alp58ReviewSearch")
    {
      event.preventDefault();
      await alp58ApplyFilter();
    }
  });
}
