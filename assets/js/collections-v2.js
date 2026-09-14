"use strict";

// AromaLParfum Frontend V2 — Paso 55
// Colecciones editoriales + rankings + orden inteligente.

const ALP55_RANKINGS = {
  mas_vendido: { es: "Más vendidos", en: "Best sellers", icon: "★" },
  tendencia: { es: "En tendencia", en: "Trending", icon: "↗" },
  mas_regalado: { es: "Más regalados", en: "Most gifted", icon: "🎁" },
  primavera: { es: "Primavera", en: "Spring", icon: "🌸" },
  citas: { es: "Para citas", en: "Date night", icon: "♥" },
  menos_40000: { es: "Hasta $40.000", en: "Under $40,000", icon: "$" },
};

const alp55State = {
  publicAssignmentsLoaded: false,
  publicAssignmentsLoading: false,
  publicAssignmentsFailed: false,
  assignments: [],
  rankingsLoaded: false,
  rankingsLoading: false,
  rankings: [],
  adminLoaded: false,
  adminLoading: false,
  adminCollections: [],
  adminAssignments: [],
  adminRules: [],
  adminRankings: [],
  selectedCollectionId: null,
};

function alp55IsEnglish() {
  return state.language === "en";
}

function alp55Text(es, en) {
  return alp55IsEnglish() ? en : es;
}

function alp55Product(id) {
  return getProductById(Number(id));
}

function alp55CollectionById(id, source = state.collections) {
  return (source || []).find((item) => Number(item.id) === Number(id)) || null;
}

function alp55FallbackProducts(collection) {
  if (!collection) return [];
  const station = normalizeText(collection.estacion || "");
  const occasion = normalizeText(collection.ocasion || "");

  return state.products.filter((product) => {
    if (collection.tipo === "seasonal" && station) {
      return arrayFromDb(product.estaciones).some((value) => normalizeText(value) === station);
    }
    if (collection.tipo === "occasion" && occasion) {
      return arrayFromDb(product.ocasiones).some((value) => normalizeText(value) === occasion);
    }
    return false;
  });
}

function alp55AssignmentsFor(collectionId, source = alp55State.assignments) {
  return (source || [])
    .filter((row) => Number(row.collection_id) === Number(collectionId) && row.activo !== false)
    .sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0));
}

function alp55ProductsForCollection(collection) {
  if (!collection) return [];

  if (alp55State.publicAssignmentsLoaded) {
    return alp55AssignmentsFor(collection.id)
      .map((row) => ({ row, product: alp55Product(row.product_id) }))
      .filter((entry) => Boolean(entry.product));
  }

  return alp55FallbackProducts(collection).map((product, index) => ({
    product,
    row: { orden: index + 1, destacado: false, score_ia: null, motivo_ia: null },
  }));
}

function alp55RankingRows(type) {
  return alp55State.rankings
    .filter((row) => row.ranking_type === type)
    .sort((a, b) => Number(a.position || 999) - Number(b.position || 999));
}

function alp55RankingProducts(type, limit = 20) {
  return alp55RankingRows(type)
    .slice(0, limit)
    .map((row) => ({ row, product: alp55Product(row.product_id) }))
    .filter((entry) => Boolean(entry.product));
}

async function alp55LoadPublicAssignments(force = false) {
  if (alp55State.publicAssignmentsLoading) return;
  if (alp55State.publicAssignmentsLoaded && !force) return;

  alp55State.publicAssignmentsLoading = true;
  const result = await supabaseClient
    .from("collection_products")
    .select("collection_id,product_id,orden,activo,destacado,score_ia,motivo_ia")
    .eq("activo", true)
    .order("orden", { ascending: true });

  alp55State.publicAssignmentsLoading = false;

  if (result.error) {
    console.warn("Paso 55 collection_products:", result.error.message);
    alp55State.publicAssignmentsFailed = true;
    alp55State.publicAssignmentsLoaded = false;
    return;
  }

  alp55State.assignments = result.data || [];
  alp55State.publicAssignmentsLoaded = true;
  alp55State.publicAssignmentsFailed = false;
}

async function alp55LoadRankings(force = false) {
  if (alp55State.rankingsLoading) return;
  if (alp55State.rankingsLoaded && !force) return;

  alp55State.rankingsLoading = true;
  const result = await supabaseClient
    .from("product_rankings_cache")
    .select("product_id,ranking_type,position,score,label,updated_at")
    .in("ranking_type", Object.keys(ALP55_RANKINGS))
    .order("ranking_type", { ascending: true })
    .order("position", { ascending: true });

  alp55State.rankingsLoading = false;

  if (result.error) {
    console.warn("Paso 55 rankings:", result.error.message);
    return;
  }

  alp55State.rankings = result.data || [];
  alp55State.rankingsLoaded = true;
}

async function alp55EnsurePublicData(kind = "collections") {
  const tasks = [];
  if (kind !== "best") tasks.push(alp55LoadPublicAssignments());
  tasks.push(alp55LoadRankings());
  await Promise.all(tasks);

  if (["collections", "collection", "best"].includes(state.route)) {
    renderCurrentRoute();
  }
}

function alp55SchedulePublicData(kind) {
  const needsAssignments = kind !== "best" && !alp55State.publicAssignmentsLoaded && !alp55State.publicAssignmentsLoading;
  const needsRankings = !alp55State.rankingsLoaded && !alp55State.rankingsLoading;
  if (!needsAssignments && !needsRankings) return;
  window.setTimeout(() => alp55EnsurePublicData(kind), 0);
}

function alp55RankBadge(position) {
  const pos = Number(position || 0);
  if (!pos) return "";
  return `<span class="alp55-rank-badge">#${formatInteger(pos)}</span>`;
}

function alp55RenderRankingPreview(type) {
  const meta = ALP55_RANKINGS[type];
  const entries = alp55RankingProducts(type, 4);
  if (!entries.length) return "";

  return `
    <article class="alp55-ranking-card">
      <div class="alp55-ranking-head">
        <span class="alp55-ranking-icon">${escapeHtml(meta.icon)}</span>
        <div>
          <p class="eyebrow">Ranking</p>
          <h3>${escapeHtml(alp55IsEnglish() ? meta.en : meta.es)}</h3>
        </div>
      </div>
      <div class="alp55-ranking-mini-list">
        ${entries.map(({ product, row }) => `
          <button type="button" class="alp55-ranking-mini" data-route="product" data-product-id="${Number(product.id)}">
            <span>${escapeHtml(`#${row.position}`)}</span>
            <strong>${escapeHtml(product.nombre || "")}</strong>
          </button>
        `).join("")}
      </div>
      <button class="text-link" type="button" data-action="alp55-open-ranking" data-ranking-type="${escapeAttribute(type)}">
        ${escapeHtml(alp55Text("Ver ranking completo", "View full ranking"))} →
      </button>
    </article>
  `;
}

function renderBestSellersPageV2() {
  alp55SchedulePublicData("best");

  let entries = alp55RankingProducts("mas_vendido", 40);
  if (!entries.length) {
    entries = getBestSellerProducts().slice(0, 40).map((product, index) => ({
      product,
      row: { position: index + 1, label: "" },
    }));
  }

  return `
    <section class="section alp55-page">
      <div class="container">
        ${renderPageCoverBanner("best_sellers", t("best.eyebrow"), t("best.title"), t("best.description"))}
        <div class="section-title-row">
          <div>
            <p class="eyebrow">${escapeHtml(t("best.eyebrow"))}</p>
            <h1 class="section-title">${escapeHtml(t("best.title"))}</h1>
            <p class="section-subtitle">${escapeHtml(alp55Text(
              "Ranking basado en ventas reales. Se actualiza desde el panel de administración.",
              "Ranking based on verified sales. It is refreshed from the admin panel."
            ))}</p>
          </div>
        </div>
        ${alp55State.rankingsLoading ? `<div class="alp55-inline-status">${escapeHtml(alp55Text("Actualizando ranking…", "Updating ranking…"))}</div>` : ""}
        <div class="catalog-grid alp55-ranked-grid">
          ${entries.map(({ product, row }) => `
            <div class="alp55-ranked-product">
              ${alp55RankBadge(row.position)}
              ${renderProductCard(product, { badge: "best" })}
            </div>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderCollectionsPageV2() {
  alp55SchedulePublicData("collections");
  const collections = getHeroCollections();
  const rankingBlocks = Object.keys(ALP55_RANKINGS)
    .map(alp55RenderRankingPreview)
    .filter(Boolean)
    .join("");

  return `
    <section class="section alp55-page">
      <div class="container">
        ${renderPageCoverBanner("collections", t("collections.eyebrow"), t("collections.title"))}

        <div class="section-title-row">
          <div>
            <p class="eyebrow">${escapeHtml(t("collections.eyebrow"))}</p>
            <h1 class="section-title">${escapeHtml(t("collections.title"))}</h1>
            <p class="section-subtitle">${escapeHtml(alp55Text(
              "Selecciones editoriales y rankings vivos para descubrir perfumes con una lógica más útil que un catálogo infinito.",
              "Editorial selections and live rankings to discover fragrances without scrolling an endless catalog."
            ))}</p>
          </div>
        </div>

        ${rankingBlocks ? `
          <div class="alp55-section-block">
            <div class="alp55-block-heading">
              <div>
                <p class="eyebrow">${escapeHtml(alp55Text("Rankings", "Rankings"))}</p>
                <h2>${escapeHtml(alp55Text("Lo que está funcionando ahora", "What is performing now"))}</h2>
              </div>
            </div>
            <div class="alp55-ranking-grid">${rankingBlocks}</div>
          </div>
        ` : ""}

        <div class="alp55-section-block">
          <div class="alp55-block-heading">
            <div>
              <p class="eyebrow">${escapeHtml(alp55Text("Edición AromaLParfum", "AromaLParfum edit"))}</p>
              <h2>${escapeHtml(alp55Text("Colecciones curadas", "Curated collections"))}</h2>
            </div>
          </div>

          ${collections.length ? `
            <div class="alp55-collection-grid">
              ${collections.map((collection) => {
                const entries = alp55ProductsForCollection(collection);
                const products = entries.map((entry) => entry.product);
                const cover = getCollectionCoverUrl(collection.slug) || getProductMainImage(products.find((p) => getProductMainImage(p)) || products[0] || null);
                const intelligent = entries.some((entry) => entry.row?.score_ia != null || entry.row?.motivo_ia);
                return `
                  <article class="alp55-collection-card">
                    <button type="button" class="alp55-collection-visual" data-route="collection" data-collection-slug="${escapeAttribute(collection.slug || "")}">
                      ${cover ? `<img src="${escapeAttribute(cover)}" alt="${escapeAttribute(localizedCollectionName(collection))}" loading="lazy" decoding="async">` : `<div class="alp55-collection-placeholder">${escapeHtml(collection.emoji || "✦")}</div>`}
                    </button>
                    <div class="alp55-collection-copy">
                      <div class="alp55-chip-row">
                        <span class="alp55-chip">${escapeHtml(collection.emoji || "✦")} ${escapeHtml(alp55Text("Editorial", "Editorial"))}</span>
                        ${intelligent ? `<span class="alp55-chip subtle">${escapeHtml(alp55Text("Orden inteligente", "Smart order"))}</span>` : ""}
                      </div>
                      <h3>${escapeHtml(localizedCollectionName(collection))}</h3>
                      <p>${escapeHtml(localizedCollectionDescription(collection))}</p>
                      <div class="alp55-collection-meta">${escapeHtml(`${products.length} ${alp55Text("perfumes", "fragrances")}`)}</div>
                      <button class="btn outline" type="button" data-route="collection" data-collection-slug="${escapeAttribute(collection.slug || "")}">
                        ${escapeHtml(alp55Text("Explorar colección", "Explore collection"))} →
                      </button>
                    </div>
                  </article>
                `;
              }).join("")}
            </div>
          ` : `
            <div class="empty-state"><h3>${escapeHtml(t("collections.empty"))}</h3></div>
          `}
        </div>
      </div>
    </section>
  `;
}

function renderCollectionDetailPageV2(slug) {
  alp55SchedulePublicData("collection");
  const collection = getHeroCollections().find((item) => item.slug === slug) || getHeroCollections()[0];
  if (!collection) return renderCollectionsPageV2();

  const entries = alp55ProductsForCollection(collection);
  const smartReasons = entries.filter((entry) => entry.row?.motivo_ia).length;

  return `
    <section class="section alp55-page">
      <div class="container">
        <button class="text-link" type="button" data-route="collections">← ${escapeHtml(t("common.back"))}</button>
        <div class="alp55-collection-hero">
          <div>
            <div class="alp55-chip-row">
              <span class="alp55-chip">${escapeHtml(collection.emoji || "✦")} ${escapeHtml(alp55Text("Selección editorial", "Editorial selection"))}</span>
              ${smartReasons ? `<span class="alp55-chip subtle">${escapeHtml(alp55Text("Ordenada con señales de negocio", "Ordered with business signals"))}</span>` : ""}
            </div>
            <h1>${escapeHtml(localizedCollectionName(collection))}</h1>
            <p>${escapeHtml(localizedCollectionDescription(collection))}</p>
          </div>
          <div class="alp55-collection-count"><strong>${formatInteger(entries.length)}</strong><span>${escapeHtml(alp55Text("fragancias", "fragrances"))}</span></div>
        </div>

        ${alp55State.publicAssignmentsLoading ? `<div class="alp55-inline-status">${escapeHtml(alp55Text("Cargando selección…", "Loading selection…"))}</div>` : ""}

        ${entries.length ? `
          <div class="catalog-grid alp55-ranked-grid">
            ${entries.map(({ product, row }, index) => `
              <div class="alp55-ranked-product">
                ${row.destacado ? `<span class="alp55-editor-pick">${escapeHtml(alp55Text("Selección", "Pick"))}</span>` : ""}
                ${renderProductCard(product)}
                ${row.motivo_ia ? `<p class="alp55-smart-reason">${escapeHtml(row.motivo_ia)}</p>` : ""}
              </div>
            `).join("")}
          </div>
        ` : `
          <div class="empty-state"><h3>${escapeHtml(alp55Text("Todavía no hay fragancias asignadas.", "No fragrances assigned yet."))}</h3></div>
        `}
      </div>
    </section>
  `;
}

function alp55OpenRanking(type) {
  const meta = ALP55_RANKINGS[type];
  if (!meta) return;
  const entries = alp55RankingProducts(type, 20);
  openModal(
    alp55IsEnglish() ? meta.en : meta.es,
    entries.length ? `
      <div class="alp55-modal-ranking">
        ${entries.map(({ product, row }) => `
          <button type="button" class="alp55-modal-ranking-row" data-route="product" data-product-id="${Number(product.id)}">
            <span class="alp55-modal-rank">#${formatInteger(row.position)}</span>
            <span><strong>${escapeHtml(product.nombre || "")}</strong><small>${escapeHtml(product.marca || "")}</small></span>
            <b>${escapeHtml(formatCurrency(product.precio || 0))}</b>
          </button>
        `).join("")}
      </div>
    ` : `<div class="empty-state"><h3>${escapeHtml(alp55Text("Ranking todavía sin datos.", "Ranking has no data yet."))}</h3></div>`
  );
}

// ----------------------------- ADMIN -----------------------------

function alp55AdminRule(collectionId) {
  return alp55State.adminRules.find((rule) => Number(rule.collection_id) === Number(collectionId)) || null;
}

function alp55AdminAssignments(collectionId) {
  return alp55AssignmentsFor(collectionId, alp55State.adminAssignments);
}

async function alp55LoadAdmin(force = false) {
  if (alp55State.adminLoading) return;
  if (alp55State.adminLoaded && !force) return;
  alp55State.adminLoading = true;

  const [collections, assignments, rules, rankings] = await Promise.all([
    supabaseClient.from("thematic_collections").select("id,slug,nombre_es,nombre_en,descripcion_es,descripcion_en,tipo,estacion,ocasion,emoji,orden,activo").order("orden", { ascending: true }),
    supabaseClient.from("collection_products").select("collection_id,product_id,orden,activo,destacado,score_ia,motivo_ia").order("collection_id", { ascending: true }).order("orden", { ascending: true }),
    supabaseClient.from("smart_collection_rules").select("collection_id,ranking_type,max_products,activo,updated_at").order("collection_id", { ascending: true }),
    supabaseClient.from("product_rankings_cache").select("product_id,ranking_type,position,score,label,updated_at").in("ranking_type", Object.keys(ALP55_RANKINGS)).order("ranking_type", { ascending: true }).order("position", { ascending: true }),
  ]);

  alp55State.adminLoading = false;
  const firstError = [collections, assignments, rules, rankings].find((result) => result.error)?.error;
  if (firstError) {
    adminMessage(firstError.message || String(firstError), "error");
    return;
  }

  alp55State.adminCollections = collections.data || [];
  alp55State.adminAssignments = assignments.data || [];
  alp55State.adminRules = rules.data || [];
  alp55State.adminRankings = rankings.data || [];
  alp55State.adminLoaded = true;

  if (!alp55State.selectedCollectionId && alp55State.adminCollections.length) {
    alp55State.selectedCollectionId = alp55State.adminCollections[0].id;
  }

  if (state.admin.tab === "collections") refreshAdminTab();
}

function alp55ScheduleAdminLoad() {
  if (!alp55State.adminLoaded && !alp55State.adminLoading) {
    window.setTimeout(() => alp55LoadAdmin(), 0);
  }
}

function alp55AdminSelectedCollection() {
  return alp55CollectionById(alp55State.selectedCollectionId, alp55State.adminCollections) || alp55State.adminCollections[0] || null;
}

function alp55RankLabel(type) {
  const meta = ALP55_RANKINGS[type];
  return meta ? (alp55IsEnglish() ? meta.en : meta.es) : type;
}

function alp55RenderAdminCollectionList() {
  return `
    <div class="alp55-admin-collection-list">
      ${alp55State.adminCollections.map((collection) => {
        const rule = alp55AdminRule(collection.id);
        const count = alp55AdminAssignments(collection.id).length;
        const selected = Number(collection.id) === Number(alp55State.selectedCollectionId);
        return `
          <button type="button" class="alp55-admin-collection-item ${selected ? "active" : ""}" data-action="alp55-admin-select-collection" data-collection-id="${Number(collection.id)}">
            <span>${escapeHtml(collection.emoji || "✦")}</span>
            <span><strong>${escapeHtml(collection.nombre_es || collection.slug || "Colección")}</strong><small>${escapeHtml(`${count} productos · ${rule?.activo ? alp55Text("Inteligente", "Smart") : alp55Text("Editorial", "Editorial")}`)}</small></span>
            <em class="${collection.activo ? "on" : "off"}">${collection.activo ? alp55Text("Publicada", "Live") : alp55Text("Pausada", "Paused")}</em>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function alp55RenderAdminEditor(collection) {
  if (!collection) return `<div class="empty-state"><h3>${escapeHtml(alp55Text("Creá tu primera colección.", "Create your first collection."))}</h3></div>`;
  const rule = alp55AdminRule(collection.id);
  const smart = Boolean(rule?.activo);
  const rows = alp55AdminAssignments(collection.id);

  return `
    <div class="alp55-admin-editor">
      <div class="alp55-admin-editor-head">
        <div><p class="eyebrow">${escapeHtml(alp55Text("Editor de colección", "Collection editor"))}</p><h2>${escapeHtml(collection.nombre_es || collection.slug || "Colección")}</h2></div>
        <button class="btn ${collection.activo ? "outline" : ""}" type="button" data-action="alp55-admin-toggle-collection" data-collection-id="${Number(collection.id)}" data-active="${collection.activo ? "false" : "true"}">${escapeHtml(collection.activo ? alp55Text("Pausar", "Pause") : alp55Text("Publicar", "Publish"))}</button>
      </div>

      <div class="alp55-admin-form-grid">
        <label><span>Nombre ES</span><input id="alp55NameEs" value="${escapeAttribute(collection.nombre_es || "")}"></label>
        <label><span>Name EN</span><input id="alp55NameEn" value="${escapeAttribute(collection.nombre_en || "")}"></label>
        <label><span>Emoji</span><input id="alp55Emoji" value="${escapeAttribute(collection.emoji || "✦")}" maxlength="8"></label>
        <label><span>Orden</span><input id="alp55Order" type="number" min="0" value="${Number(collection.orden || 0)}"></label>
        <label class="wide"><span>Descripción ES</span><textarea id="alp55DescEs">${escapeHtml(collection.descripcion_es || "")}</textarea></label>
        <label class="wide"><span>Description EN</span><textarea id="alp55DescEn">${escapeHtml(collection.descripcion_en || "")}</textarea></label>
      </div>
      <div class="alp55-admin-actions">
        <button class="btn" type="button" data-action="alp55-admin-save-collection" data-collection-id="${Number(collection.id)}">${escapeHtml(alp55Text("Guardar colección", "Save collection"))}</button>
      </div>

      ${typeof renderAdminCollectionCover === "function" ? `<div class="alp55-cover-wrap">${renderAdminCollectionCover(collection)}</div>` : ""}

      <div class="alp55-smart-panel">
        <div>
          <p class="eyebrow">${escapeHtml(alp55Text("Orden inteligente", "Smart ordering"))}</p>
          <h3>${escapeHtml(alp55Text("Regla automática", "Automatic rule"))}</h3>
          <p>${escapeHtml(alp55Text(
            "Si la activás, el refresco de merchandising reemplaza la selección manual usando el ranking elegido.",
            "When enabled, merchandising refresh replaces manual selection using the chosen ranking."
          ))}</p>
        </div>
        <div class="alp55-smart-controls">
          <label><span>Ranking</span><select id="alp55SmartRanking">${Object.keys(ALP55_RANKINGS).map((type) => `<option value="${type}" ${rule?.ranking_type === type ? "selected" : ""}>${escapeHtml(alp55RankLabel(type))}</option>`).join("")}</select></label>
          <label><span>${escapeHtml(alp55Text("Máximo", "Maximum"))}</span><input id="alp55SmartMax" type="number" min="1" max="30" value="${Number(rule?.max_products || 10)}"></label>
          <label class="alp55-switch"><input id="alp55SmartActive" type="checkbox" ${smart ? "checked" : ""}><span>${escapeHtml(alp55Text("Activar orden inteligente", "Enable smart ordering"))}</span></label>
          <button class="btn outline" type="button" data-action="alp55-admin-save-rule" data-collection-id="${Number(collection.id)}">${escapeHtml(alp55Text("Guardar regla", "Save rule"))}</button>
        </div>
      </div>

      <div class="alp55-admin-products">
        <div class="alp55-block-heading">
          <div><p class="eyebrow">${escapeHtml(smart ? alp55Text("Generada por ranking", "Ranking generated") : alp55Text("Curaduría manual", "Manual curation"))}</p><h3>${escapeHtml(alp55Text("Productos de la colección", "Collection products"))}</h3></div>
          <span>${formatInteger(rows.length)} ${escapeHtml(alp55Text("productos", "products"))}</span>
        </div>

        ${!smart ? `
          <div class="alp55-add-product-row">
            <input id="alp55ProductPicker" list="alp55ProductDatalist" placeholder="${escapeAttribute(alp55Text("Buscar por nombre o ID…", "Search by name or ID…"))}">
            <datalist id="alp55ProductDatalist">
              ${state.products.map((product) => `<option value="#${Number(product.id)} · ${escapeAttribute(product.nombre || "")} — ${escapeAttribute(product.marca || "")}"></option>`).join("")}
            </datalist>
            <button class="btn" type="button" data-action="alp55-admin-add-product" data-collection-id="${Number(collection.id)}">${escapeHtml(alp55Text("Agregar", "Add"))}</button>
          </div>
        ` : `<div class="alp55-inline-status">${escapeHtml(alp55Text("Esta colección se administra con el ranking seleccionado. Para editar a mano, desactivá la regla.", "This collection is managed by the selected ranking. Disable the rule to edit manually."))}</div>`}

        <div class="alp55-admin-product-list">
          ${rows.length ? rows.map((row, index) => {
            const product = alp55Product(row.product_id);
            return `
              <div class="alp55-admin-product-row">
                <span class="alp55-order-number">${formatInteger(index + 1)}</span>
                <div class="alp55-admin-product-main"><strong>${escapeHtml(product?.nombre || `#${row.product_id}`)}</strong><small>${escapeHtml(product?.marca || "")}${row.motivo_ia ? ` · ${escapeHtml(row.motivo_ia)}` : ""}</small></div>
                ${row.score_ia != null ? `<span class="alp55-score">${escapeHtml(String(Math.round(Number(row.score_ia) * 100) / 100))}</span>` : ""}
                <label class="alp55-feature-check"><input type="checkbox" data-action="alp55-admin-feature-product" data-collection-id="${Number(collection.id)}" data-product-id="${Number(row.product_id)}" ${row.destacado ? "checked" : ""} ${smart ? "disabled" : ""}><span>★</span></label>
                ${!smart ? `
                  <div class="alp55-row-actions">
                    <button type="button" title="Subir" data-action="alp55-admin-move-product" data-direction="up" data-collection-id="${Number(collection.id)}" data-product-id="${Number(row.product_id)}" ${index === 0 ? "disabled" : ""}>↑</button>
                    <button type="button" title="Bajar" data-action="alp55-admin-move-product" data-direction="down" data-collection-id="${Number(collection.id)}" data-product-id="${Number(row.product_id)}" ${index === rows.length - 1 ? "disabled" : ""}>↓</button>
                    <button type="button" class="danger" title="Quitar" data-action="alp55-admin-remove-product" data-collection-id="${Number(collection.id)}" data-product-id="${Number(row.product_id)}">×</button>
                  </div>
                ` : ""}
              </div>
            `;
          }).join("") : `<div class="empty-state compact"><p>${escapeHtml(alp55Text("Todavía no hay productos en esta colección.", "There are no products in this collection yet."))}</p></div>`}
        </div>
      </div>
    </div>
  `;
}

function renderAdminCollectionsV2() {
  alp55ScheduleAdminLoad();
  if (alp55State.adminLoading && !alp55State.adminLoaded) {
    return `<div class="alp55-admin-loading"><div class="spinner"></div><p>${escapeHtml(alp55Text("Cargando Colecciones V2…", "Loading Collections V2…"))}</p></div>`;
  }

  if (!alp55State.adminLoaded) {
    return `<div class="admin-message error">${escapeHtml(alp55Text("No se pudieron cargar las colecciones.", "Collections could not be loaded."))}</div>`;
  }

  const smartCount = alp55State.adminRules.filter((rule) => rule.activo).length;
  const liveCount = alp55State.adminCollections.filter((collection) => collection.activo).length;
  const rankedAt = alp55State.adminRankings.map((row) => row.updated_at).filter(Boolean).sort().pop();

  return `
    <div class="alp55-admin-shell">
      <div class="alp55-admin-topbar">
        <div><p class="eyebrow">Colecciones V2</p><h2>${escapeHtml(alp55Text("Editorial + rankings + orden inteligente", "Editorial + rankings + smart ordering"))}</h2><p>${escapeHtml(alp55Text("La tienda pública usa productos asignados de forma explícita. Las reglas inteligentes se actualizan sólo cuando vos lo pedís.", "The public store uses explicit product assignments. Smart rules refresh only when you request it."))}</p></div>
        <div class="alp55-admin-top-actions">
          <button class="btn outline" type="button" data-action="alp55-admin-new-collection">+ ${escapeHtml(alp55Text("Nueva colección", "New collection"))}</button>
          <button class="btn" type="button" data-action="alp55-admin-refresh-merchandising">↻ ${escapeHtml(alp55Text("Actualizar rankings", "Refresh rankings"))}</button>
        </div>
      </div>

      <div class="alp55-admin-stats">
        <div><span>${escapeHtml(alp55Text("Colecciones", "Collections"))}</span><strong>${formatInteger(alp55State.adminCollections.length)}</strong></div>
        <div><span>${escapeHtml(alp55Text("Publicadas", "Live"))}</span><strong>${formatInteger(liveCount)}</strong></div>
        <div><span>${escapeHtml(alp55Text("Inteligentes", "Smart"))}</span><strong>${formatInteger(smartCount)}</strong></div>
        <div><span>${escapeHtml(alp55Text("Último ranking", "Last ranking"))}</span><strong class="small">${escapeHtml(rankedAt ? new Date(rankedAt).toLocaleString("es-AR") : "—")}</strong></div>
      </div>

      <div class="alp55-admin-layout">
        <aside>${alp55RenderAdminCollectionList()}</aside>
        <section>${alp55RenderAdminEditor(alp55AdminSelectedCollection())}</section>
      </div>
    </div>
  `;
}

function alp55Slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function alp55AdminCreateCollection() {
  openModal(alp55Text("Nueva colección", "New collection"), `
    <div class="admin-form alp55-modal-form">
      <label><span>Nombre ES</span><input id="alp55NewNameEs" placeholder="Ej: Noches de verano"></label>
      <label><span>Name EN</span><input id="alp55NewNameEn" placeholder="Summer nights"></label>
      <label><span>Slug</span><input id="alp55NewSlug" placeholder="noches-de-verano"></label>
      <label><span>Emoji</span><input id="alp55NewEmoji" value="✦" maxlength="8"></label>
      <p class="alp55-helper">${escapeHtml(alp55Text("Se crea como colección editorial/manual. Después podés activar una regla inteligente si querés.", "It is created as a manual/editorial collection. You can enable a smart rule later."))}</p>
      <button class="btn" type="button" data-action="alp55-admin-confirm-new">${escapeHtml(alp55Text("Crear colección", "Create collection"))}</button>
    </div>
  `);
}

async function alp55AdminConfirmNew() {
  const nameEs = document.getElementById("alp55NewNameEs")?.value.trim() || "";
  const nameEn = document.getElementById("alp55NewNameEn")?.value.trim() || nameEs;
  const rawSlug = document.getElementById("alp55NewSlug")?.value.trim() || nameEs;
  const slug = alp55Slugify(rawSlug);
  const emoji = document.getElementById("alp55NewEmoji")?.value.trim() || "✦";
  if (!nameEs || !slug) return adminMessage(alp55Text("Completá nombre y slug.", "Enter name and slug."), "error");

  const payload = {
    slug,
    nombre_es: nameEs,
    nombre_en: nameEn,
    descripcion_es: "",
    descripcion_en: "",
    tipo: "seasonal",
    estacion: null,
    ocasion: null,
    emoji,
    orden: (alp55State.adminCollections.length + 1) * 10,
    activo: false,
  };

  const result = await supabaseClient.from("thematic_collections").insert(payload).select("id").single();
  if (result.error) return adminMessage(result.error.message, "error");
  closeModal();
  alp55State.selectedCollectionId = result.data.id;
  alp55State.adminLoaded = false;
  await alp55LoadAdmin(true);
  adminMessage(alp55Text("Colección creada como borrador.", "Collection created as draft."), "ok");
}

async function alp55AdminSaveCollection(id) {
  const payload = {
    nombre_es: document.getElementById("alp55NameEs")?.value.trim() || "",
    nombre_en: document.getElementById("alp55NameEn")?.value.trim() || "",
    descripcion_es: document.getElementById("alp55DescEs")?.value.trim() || "",
    descripcion_en: document.getElementById("alp55DescEn")?.value.trim() || "",
    emoji: document.getElementById("alp55Emoji")?.value.trim() || "✦",
    orden: Number(document.getElementById("alp55Order")?.value || 0),
  };
  const result = await supabaseClient.from("thematic_collections").update(payload).eq("id", Number(id));
  if (result.error) return adminMessage(result.error.message, "error");
  alp55State.adminLoaded = false;
  await alp55LoadAdmin(true);
  await loadCollections();
  adminMessage(alp55Text("Colección guardada.", "Collection saved."), "ok");
}

async function alp55AdminToggleCollection(id, active) {
  const rpc = await supabaseClient.rpc("admin_set_entity_visibility", {
    p_entity_type: "collection",
    p_entity_id: Number(id),
    p_active: Boolean(active),
  });
  if (rpc.error) return adminMessage(rpc.error.message, "error");
  alp55State.adminLoaded = false;
  await Promise.all([alp55LoadAdmin(true), loadCollections()]);
  adminMessage(active ? alp55Text("Colección publicada.", "Collection published.") : alp55Text("Colección pausada.", "Collection paused."), "ok");
}

async function alp55AdminSaveRule(id) {
  const ranking = document.getElementById("alp55SmartRanking")?.value || "mas_vendido";
  const maxProducts = Math.max(1, Math.min(30, Number(document.getElementById("alp55SmartMax")?.value || 10)));
  const active = Boolean(document.getElementById("alp55SmartActive")?.checked);
  const payload = { collection_id: Number(id), ranking_type: ranking, max_products: maxProducts, activo: active, updated_at: new Date().toISOString() };
  const result = await supabaseClient.from("smart_collection_rules").upsert(payload, { onConflict: "collection_id" });
  if (result.error) return adminMessage(result.error.message, "error");
  alp55State.adminLoaded = false;
  await alp55LoadAdmin(true);
  adminMessage(active ? alp55Text("Regla inteligente activada. Tocá “Actualizar rankings” para regenerar la colección.", "Smart rule enabled. Press “Refresh rankings” to regenerate the collection.") : alp55Text("Regla desactivada. La colección vuelve a edición manual.", "Rule disabled. The collection returns to manual editing."), "ok");
}

function alp55ParsePickedProduct() {
  const value = document.getElementById("alp55ProductPicker")?.value || "";
  const match = value.match(/^#(\d+)/);
  return match ? Number(match[1]) : Number(value.trim()) || 0;
}

async function alp55AdminAddProduct(collectionId) {
  const productId = alp55ParsePickedProduct();
  if (!productId || !alp55Product(productId)) return adminMessage(alp55Text("Elegí un producto válido.", "Choose a valid product."), "error");
  const rows = alp55AdminAssignments(collectionId);
  const payload = { collection_id: Number(collectionId), product_id: productId, orden: rows.length ? Math.max(...rows.map((row) => Number(row.orden || 0))) + 10 : 10, activo: true, destacado: false };
  const result = await supabaseClient.from("collection_products").upsert(payload, { onConflict: "collection_id,product_id" });
  if (result.error) return adminMessage(result.error.message, "error");
  alp55State.adminLoaded = false;
  await alp55LoadAdmin(true);
}

async function alp55AdminRemoveProduct(collectionId, productId) {
  const result = await supabaseClient.from("collection_products").update({ activo: false }).eq("collection_id", Number(collectionId)).eq("product_id", Number(productId));
  if (result.error) return adminMessage(result.error.message, "error");
  alp55State.adminLoaded = false;
  await alp55LoadAdmin(true);
}

async function alp55AdminFeatureProduct(collectionId, productId, featured) {
  const result = await supabaseClient.from("collection_products").update({ destacado: Boolean(featured) }).eq("collection_id", Number(collectionId)).eq("product_id", Number(productId));
  if (result.error) return adminMessage(result.error.message, "error");
  const row = alp55State.adminAssignments.find((item) => Number(item.collection_id) === Number(collectionId) && Number(item.product_id) === Number(productId));
  if (row) row.destacado = Boolean(featured);
}

async function alp55AdminMoveProduct(collectionId, productId, direction) {
  const rows = alp55AdminAssignments(collectionId);
  const index = rows.findIndex((row) => Number(row.product_id) === Number(productId));
  const otherIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || otherIndex < 0 || otherIndex >= rows.length) return;

  const first = rows[index];
  const second = rows[otherIndex];
  const firstOrder = Number(first.orden || index * 10 + 10);
  const secondOrder = Number(second.orden || otherIndex * 10 + 10);

  const [a, b] = await Promise.all([
    supabaseClient.from("collection_products").update({ orden: secondOrder }).eq("collection_id", Number(collectionId)).eq("product_id", Number(first.product_id)),
    supabaseClient.from("collection_products").update({ orden: firstOrder }).eq("collection_id", Number(collectionId)).eq("product_id", Number(second.product_id)),
  ]);
  if (a.error || b.error) return adminMessage((a.error || b.error).message, "error");
  alp55State.adminLoaded = false;
  await alp55LoadAdmin(true);
}

async function alp55AdminRefreshMerchandising() {
  adminMessage(alp55Text("Actualizando rankings y colecciones inteligentes…", "Refreshing rankings and smart collections…"), "info");
  const result = await supabaseClient.rpc("admin_refresh_merchandising");
  if (result.error) return adminMessage(result.error.message, "error");
  alp55State.adminLoaded = false;
  alp55State.rankingsLoaded = false;
  alp55State.publicAssignmentsLoaded = false;
  await alp55LoadAdmin(true);
  adminMessage(alp55Text("Rankings y colecciones inteligentes actualizados.", "Rankings and smart collections refreshed."), "ok");
}

// Acciones propias del Paso 55. Se mantienen fuera del switch gigante de events.js.
document.addEventListener("click", async (event) => {
  const element = event.target.closest("[data-action]");
  if (!element) return;
  const action = element.dataset.action || "";

  if (action === "alp55-open-ranking") {
    event.preventDefault();
    alp55OpenRanking(element.dataset.rankingType || "mas_vendido");
    return;
  }

  if (!action.startsWith("alp55-admin-")) return;
  event.preventDefault();

  try {
    if (action === "alp55-admin-select-collection") {
      alp55State.selectedCollectionId = Number(element.dataset.collectionId);
      refreshAdminTab();
    } else if (action === "alp55-admin-new-collection") {
      await alp55AdminCreateCollection();
    } else if (action === "alp55-admin-confirm-new") {
      await alp55AdminConfirmNew();
    } else if (action === "alp55-admin-save-collection") {
      await alp55AdminSaveCollection(element.dataset.collectionId);
    } else if (action === "alp55-admin-toggle-collection") {
      await alp55AdminToggleCollection(element.dataset.collectionId, element.dataset.active === "true");
    } else if (action === "alp55-admin-save-rule") {
      await alp55AdminSaveRule(element.dataset.collectionId);
    } else if (action === "alp55-admin-add-product") {
      await alp55AdminAddProduct(element.dataset.collectionId);
    } else if (action === "alp55-admin-remove-product") {
      await alp55AdminRemoveProduct(element.dataset.collectionId, element.dataset.productId);
    } else if (action === "alp55-admin-move-product") {
      await alp55AdminMoveProduct(element.dataset.collectionId, element.dataset.productId, element.dataset.direction);
    } else if (action === "alp55-admin-refresh-merchandising") {
      await alp55AdminRefreshMerchandising();
    }
  } catch (error) {
    console.error("Paso 55:", error);
    if (typeof adminMessage === "function") adminMessage(error.message || String(error), "error");
  }
});

document.addEventListener("change", async (event) => {
  const element = event.target.closest('[data-action="alp55-admin-feature-product"]');
  if (!element) return;
  try {
    await alp55AdminFeatureProduct(element.dataset.collectionId, element.dataset.productId, element.checked);
  } catch (error) {
    adminMessage(error.message || String(error), "error");
  }
});
