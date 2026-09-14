"use strict";

// AromaLParfum Frontend V2 — Paso 39
// Catálogo V2: búsqueda inteligente, autocompletado y filtros avanzados.

const CATALOG_STYLE_RULES =
[
  {
    value: "fresco",
    labelEs: "Fresco",
    labelEn: "Fresh",
    terms: ["fresco", "citric", "citrico", "acuatic", "acuatico", "marino", "verde"],
  },
  {
    value: "dulce",
    labelEs: "Dulce",
    labelEn: "Sweet",
    terms: ["dulce", "vainilla", "gourmand", "caramelo", "chocolate", "miel", "praline"],
  },
  {
    value: "elegante",
    labelEs: "Elegante",
    labelEn: "Elegant",
    terms: ["elegante", "formal", "sofistic", "vestir"],
  },
  {
    value: "intenso",
    labelEs: "Intenso",
    labelEn: "Intense",
    terms: ["intenso", "potente", "fuerte", "noche", "nocturno"],
  },
  {
    value: "amaderado",
    labelEs: "Amaderado",
    labelEn: "Woody",
    terms: ["amader", "madera", "oud", "cedro", "sandal"],
  },
  {
    value: "floral",
    labelEs: "Floral",
    labelEn: "Floral",
    terms: ["floral", "flores", "rosa", "jazmin", "peonia", "tuberosa"],
  },
];

let catalogSmartSearchTimer = null;
let catalogAutocompleteTimer = null;
let catalogSmartRequestId = 0;
let catalogAutocompleteRequestId = 0;
let catalogSmartRpcVariant = null;
let catalogAutocompleteRpcVariant = null;

function catalogGetAdvancedFilters()
{
  if (!state.catalogAdvancedFilters || typeof state.catalogAdvancedFilters !== "object")
  {
    state.catalogAdvancedFilters = {};
  }

  const defaults =
  {
    gender: "",
    style: "",
    occasion: "",
    season: "",
    origin: "",
    family: "",
    priceMin: "",
    priceMax: "",
  };

  for (const [key, value] of Object.entries(defaults))
  {
    if (!(key in state.catalogAdvancedFilters))
    {
      state.catalogAdvancedFilters[key] = value;
    }
  }

  return state.catalogAdvancedFilters;
}

function catalogClearAdvancedFilters()
{
  state.catalogAdvancedFilters =
  {
    gender: "",
    style: "",
    occasion: "",
    season: "",
    origin: "",
    family: "",
    priceMin: "",
    priceMax: "",
  };
}

function catalogResetSearchEnhancements()
{
  state.catalogSmartIds = null;
  state.catalogSmartQuery = "";
  state.catalogSmartOrder = [];
  state.catalogSuggestions = [];
  state.catalogSuggestionsQuery = "";
  state.catalogSearchLoading = false;
}

function catalogActiveAdvancedFilterCount()
{
  const filters = catalogGetAdvancedFilters();

  return Object.values(filters)
    .filter(value => String(value ?? "").trim() !== "")
    .length;
}

function catalogUniqueStrings(values, limit = 30)
{
  const map = new Map();

  for (const raw of values || [])
  {
    const valuesToAdd = Array.isArray(raw) ? raw : [raw];

    for (const item of valuesToAdd)
    {
      const label = String(item ?? "").trim();
      const key = normalizeText(label);

      if (!label || !key || key === "consultar")
      {
        continue;
      }

      if (!map.has(key))
      {
        map.set(key, label);
      }
    }
  }

  return Array.from(map.values())
    .sort((a, b) => a.localeCompare(b, currentLanguage()))
    .slice(0, limit);
}

function catalogGetFilterOptions()
{
  const products = state.products || [];

  const genders = catalogUniqueStrings(
    products.map(product => product.genero),
    12
  );

  const occasions = catalogUniqueStrings(
    products.flatMap(product => product.ocasiones || []),
    24
  );

  const seasons = catalogUniqueStrings(
    products.flatMap(product => product.estaciones || []),
    12
  );

  const families = catalogUniqueStrings(
    products.map(product => product.familia),
    28
  );

  const knownOrigins = ["Árabe", "Argentina", "Nicho", "Diseñador"];
  const origins = knownOrigins.filter(origin =>
    products.some(product =>
      normalizeText([
        product.categoria,
        product.subcategoria,
        product.tipo_producto,
        product.tipo_producto_slug,
      ].join(" ")).includes(normalizeText(origin))
    )
  );

  return {
    genders,
    occasions,
    seasons,
    families,
    origins,
  };
}

function catalogProductText(product)
{
  return normalizeText(
    [
      product.nombre,
      product.marca,
      product.categoria,
      product.subcategoria,
      product.genero,
      product.familia,
      product.salida,
      product.corazon,
      product.fondo,
      product.recomendacion_uso,
      ...(product.estaciones || []),
      ...(product.ocasiones || []),
    ].join(" ")
  );
}

function catalogMatchesValue(raw, wanted)
{
  if (!wanted)
  {
    return true;
  }

  const needle = normalizeText(wanted);

  if (Array.isArray(raw))
  {
    return raw.some(value => normalizeText(value).includes(needle));
  }

  return normalizeText(raw).includes(needle);
}

function catalogMatchesStyle(product, styleValue)
{
  if (!styleValue)
  {
    return true;
  }

  const rule = CATALOG_STYLE_RULES.find(item => item.value === styleValue);

  if (!rule)
  {
    return true;
  }

  const text = catalogProductText(product);
  return rule.terms.some(term => text.includes(normalizeText(term)));
}

function catalogMatchesAdvancedFilters(product)
{
  const filters = catalogGetAdvancedFilters();

  if (!catalogMatchesValue(product.genero, filters.gender))
  {
    return false;
  }

  if (!catalogMatchesStyle(product, filters.style))
  {
    return false;
  }

  if (!catalogMatchesValue(product.ocasiones, filters.occasion))
  {
    return false;
  }

  if (!catalogMatchesValue(product.estaciones, filters.season))
  {
    return false;
  }

  if (filters.origin)
  {
    const originText = normalizeText([
      product.categoria,
      product.subcategoria,
      product.tipo_producto,
      product.tipo_producto_slug,
    ].join(" "));

    if (!originText.includes(normalizeText(filters.origin)))
    {
      return false;
    }
  }

  if (!catalogMatchesValue(product.familia, filters.family))
  {
    return false;
  }

  const price = asNumber(product.precio, 0);
  const priceMin = asNumber(filters.priceMin, 0);
  const priceMax = asNumber(filters.priceMax, 0);

  if (filters.priceMin !== "" && price < priceMin)
  {
    return false;
  }

  if (filters.priceMax !== "" && priceMax > 0 && price > priceMax)
  {
    return false;
  }

  return true;
}

function catalogGetSmartSearchSet()
{
  const query = normalizeText(state.catalogSearch);
  const smartQuery = normalizeText(state.catalogSmartQuery);

  if (!query || !smartQuery || query !== smartQuery || !Array.isArray(state.catalogSmartIds))
  {
    return null;
  }

  return new Set(state.catalogSmartIds.map(Number));
}

function getCatalogProducts()
{
  const filter = state.catalogFilter;
  const searchTerm = normalizeText(state.catalogSearch);
  const smartIds = catalogGetSmartSearchSet();

  let list = state.products.filter(product =>
  {
    if (filter === "Nuevo")
    {
      if (!isNewProduct(product))
      {
        return false;
      }
    }
    else if (filter === "Destacado")
    {
      if (!product.destacado)
      {
        return false;
      }
    }
    else if (filter !== "Todos")
    {
      const matches = [
        product.categoria,
        product.genero,
        product.tipo_producto_slug,
        product.tipo_producto,
      ].some(value => normalizeText(value) === normalizeText(filter));

      if (!matches)
      {
        return false;
      }
    }

    if (!catalogMatchesAdvancedFilters(product))
    {
      return false;
    }

    if (searchTerm)
    {
      const localMatch = catalogProductText(product).includes(searchTerm);
      const smartMatch = smartIds ? smartIds.has(Number(product.id)) : false;

      if (!localMatch && !smartMatch)
      {
        return false;
      }
    }

    return true;
  });

  const smartOrder = new Map(
    (state.catalogSmartOrder || []).map((id, index) => [Number(id), index])
  );

  switch (state.catalogSort)
  {
    case "low":
      list.sort((a, b) => a.precio - b.precio);
      break;

    case "high":
      list.sort((a, b) => b.precio - a.precio);
      break;

    case "name":
      list.sort((a, b) => a.nombre.localeCompare(b.nombre, currentLanguage()));
      break;

    case "stock":
      list.sort((a, b) => b.stock - a.stock);
      break;

    default:
      list.sort((a, b) =>
      {
        if (smartIds)
        {
          const aRank = smartOrder.has(Number(a.id)) ? smartOrder.get(Number(a.id)) : Number.MAX_SAFE_INTEGER;
          const bRank = smartOrder.has(Number(b.id)) ? smartOrder.get(Number(b.id)) : Number.MAX_SAFE_INTEGER;

          if (aRank !== bRank)
          {
            return aRank - bRank;
          }
        }

        const featuredDiff = Number(b.destacado) - Number(a.destacado);

        if (featuredDiff !== 0)
        {
          return featuredDiff;
        }

        return getPopularity(b.id) - getPopularity(a.id);
      });
  }

  return list;
}

async function catalogRpcWithVariants(functionName, variants, preferredIndex)
{
  const ordered = [];

  if (Number.isInteger(preferredIndex) && variants[preferredIndex])
  {
    ordered.push([preferredIndex, variants[preferredIndex]]);
  }

  variants.forEach((params, index) =>
  {
    if (!ordered.some(([existing]) => existing === index))
    {
      ordered.push([index, params]);
    }
  });

  let lastError = null;

  for (const [index, params] of ordered)
  {
    const result = await supabaseClient.rpc(functionName, params);

    if (!result.error)
    {
      return {
        data: result.data || [],
        variant: index,
        error: null,
      };
    }

    lastError = result.error;
  }

  return {
    data: [],
    variant: null,
    error: lastError,
  };
}

function catalogResolveProductId(row)
{
  const direct = Number(
    row?.id ??
    row?.product_id ??
    row?.productid ??
    row?.recommended_product_id ??
    0
  );

  if (direct > 0)
  {
    return direct;
  }

  const rowName = normalizeText(row?.nombre ?? row?.name ?? row?.product_name ?? "");
  const rowBrand = normalizeText(row?.marca ?? row?.brand ?? "");

  if (!rowName)
  {
    return 0;
  }

  const product = state.products.find(item =>
  {
    const sameName = normalizeText(item.nombre) === rowName;
    const sameBrand = !rowBrand || normalizeText(item.marca) === rowBrand;
    return sameName && sameBrand;
  });

  return Number(product?.id || 0);
}

function catalogExtractSuggestion(row)
{
  const direct = [
    row?.suggestion,
    row?.label,
    row?.text,
    row?.value,
    row?.nombre,
    row?.name,
    row?.product_name,
  ].find(value => String(value ?? "").trim());

  if (!direct)
  {
    return "";
  }

  const label = String(direct).trim();
  const brand = String(row?.marca ?? row?.brand ?? "").trim();

  if (brand && !normalizeText(label).includes(normalizeText(brand)))
  {
    return `${label} — ${brand}`;
  }

  return label;
}

async function catalogRunSmartSearch(query)
{
  const cleanQuery = String(query || "").trim();
  const normalizedQuery = normalizeText(cleanQuery);
  const requestId = ++catalogSmartRequestId;

  if (normalizedQuery.length < 2)
  {
    state.catalogSmartIds = null;
    state.catalogSmartOrder = [];
    state.catalogSmartQuery = "";
    state.catalogSearchLoading = false;
    catalogRenderPreservingSearchFocus();
    return;
  }

  state.catalogSearchLoading = true;
  catalogRenderPreservingSearchFocus();

  const variants = [
    { p_query: cleanQuery, p_limit: 120 },
    { query: cleanQuery, limit: 120 },
    { p_search: cleanQuery, p_limit: 120 },
  ];

  const result = await catalogRpcWithVariants(
    "search_products_smart",
    variants,
    catalogSmartRpcVariant
  );

  if (requestId !== catalogSmartRequestId)
  {
    return;
  }

  state.catalogSearchLoading = false;

  if (result.error)
  {
    console.warn("search_products_smart:", result.error.message || result.error);
    state.catalogSmartIds = null;
    state.catalogSmartOrder = [];
    state.catalogSmartQuery = "";
    catalogRenderPreservingSearchFocus();
    return;
  }

  catalogSmartRpcVariant = result.variant;

  const ids = [];

  for (const row of result.data || [])
  {
    const id = catalogResolveProductId(row);

    if (id > 0 && !ids.includes(id))
    {
      ids.push(id);
    }
  }

  state.catalogSmartIds = ids;
  state.catalogSmartOrder = ids;
  state.catalogSmartQuery = cleanQuery;
  state.catalogPage = 1;

  catalogRenderPreservingSearchFocus();
}

async function catalogRunAutocomplete(query)
{
  const cleanQuery = String(query || "").trim();
  const normalizedQuery = normalizeText(cleanQuery);
  const requestId = ++catalogAutocompleteRequestId;

  if (normalizedQuery.length < 2)
  {
    state.catalogSuggestions = [];
    state.catalogSuggestionsQuery = "";
    catalogRenderPreservingSearchFocus();
    return;
  }

  const variants = [
    { p_query: cleanQuery, p_limit: 7 },
    { query: cleanQuery, limit: 7 },
    { p_search: cleanQuery, p_limit: 7 },
  ];

  const result = await catalogRpcWithVariants(
    "search_products_autocomplete",
    variants,
    catalogAutocompleteRpcVariant
  );

  if (requestId !== catalogAutocompleteRequestId)
  {
    return;
  }

  if (result.error)
  {
    // Fallback local: mantiene el buscador útil incluso si cambia la firma del RPC.
    const local = state.products
      .filter(product => catalogProductText(product).includes(normalizedQuery))
      .slice(0, 7)
      .map(product => `${product.nombre}${product.marca ? ` — ${product.marca}` : ""}`);

    state.catalogSuggestions = local;
    state.catalogSuggestionsQuery = cleanQuery;
    catalogRenderPreservingSearchFocus();
    return;
  }

  catalogAutocompleteRpcVariant = result.variant;

  const suggestions = [];

  for (const row of result.data || [])
  {
    const text = catalogExtractSuggestion(row);

    if (text && !suggestions.some(item => normalizeText(item) === normalizeText(text)))
    {
      suggestions.push(text);
    }
  }

  state.catalogSuggestions = suggestions.slice(0, 7);
  state.catalogSuggestionsQuery = cleanQuery;

  catalogRenderPreservingSearchFocus();
}

function catalogScheduleSmartSearch(query, delay = 340)
{
  window.clearTimeout(catalogSmartSearchTimer);

  catalogSmartSearchTimer = window.setTimeout(
    () => catalogRunSmartSearch(query),
    delay
  );
}

function catalogScheduleAutocomplete(query, delay = 180)
{
  window.clearTimeout(catalogAutocompleteTimer);

  catalogAutocompleteTimer = window.setTimeout(
    () => catalogRunAutocomplete(query),
    delay
  );
}

function catalogRenderPreservingSearchFocus()
{
  if (state.route !== "catalog")
  {
    return;
  }

  const current = document.getElementById("catalogSearch");
  const selectionStart = current?.selectionStart ?? null;
  const selectionEnd = current?.selectionEnd ?? null;
  const hadFocus = document.activeElement === current;
  const app = document.getElementById("app");

  if (!app)
  {
    return;
  }

  app.innerHTML = renderCatalogPage();

  if (hadFocus)
  {
    const fresh = document.getElementById("catalogSearch");

    if (fresh)
    {
      fresh.focus();

      if (selectionStart !== null && selectionEnd !== null)
      {
        try
        {
          fresh.setSelectionRange(selectionStart, selectionEnd);
        }
        catch (_) {}
      }
    }
  }
}

function catalogV2OnSearchInput(target)
{
  state.catalogSearch = target.value;
  state.catalogPage = 1;

  if (normalizeText(state.catalogSmartQuery) !== normalizeText(state.catalogSearch))
  {
    state.catalogSmartIds = null;
    state.catalogSmartOrder = [];
  }

  catalogScheduleAutocomplete(state.catalogSearch);
  catalogScheduleSmartSearch(state.catalogSearch);
  catalogRenderPreservingSearchFocus();
}

function catalogV2SetFilter(key, value)
{
  const allowed = new Set([
    "gender",
    "style",
    "occasion",
    "season",
    "origin",
    "family",
    "priceMin",
    "priceMax",
  ]);

  if (!allowed.has(key))
  {
    return;
  }

  catalogGetAdvancedFilters()[key] = String(value ?? "");
  state.catalogPage = 1;
  renderCurrentRoute();
}

function catalogV2SelectSuggestion(value)
{
  const clean = String(value || "").trim();

  if (!clean)
  {
    return;
  }

  // Si la sugerencia vino como "Nombre — Marca", buscamos por el nombre para no exigir el guion.
  state.catalogSearch = clean.split(" — ")[0].trim();
  state.catalogSuggestions = [];
  state.catalogSuggestionsQuery = "";
  state.catalogPage = 1;
  catalogScheduleSmartSearch(state.catalogSearch, 0);
  renderCurrentRoute();
}

function catalogRenderSelect(key, label, options, value)
{
  return `
    <label class="catalog-filter-field">
      <span>${escapeHtml(label)}</span>
      <select
        class="select-input"
        data-catalog-filter-key="${escapeAttribute(key)}">
        <option value="">${state.language === "en" ? "All" : "Todos"}</option>
        ${(options || []).map(option => `
          <option
            value="${escapeAttribute(option)}"
            ${normalizeText(option) === normalizeText(value) ? "selected" : ""}>
            ${escapeHtml(option)}
          </option>
        `).join("")}
      </select>
    </label>
  `;
}

function catalogRenderStyleSelect(value)
{
  return `
    <label class="catalog-filter-field">
      <span>${state.language === "en" ? "Style" : "Estilo"}</span>
      <select
        class="select-input"
        data-catalog-filter-key="style">
        <option value="">${state.language === "en" ? "All" : "Todos"}</option>
        ${CATALOG_STYLE_RULES.map(rule => `
          <option
            value="${escapeAttribute(rule.value)}"
            ${rule.value === value ? "selected" : ""}>
            ${escapeHtml(state.language === "en" ? rule.labelEn : rule.labelEs)}
          </option>
        `).join("")}
      </select>
    </label>
  `;
}

function catalogRenderAdvancedFilters()
{
  const filters = catalogGetAdvancedFilters();
  const options = catalogGetFilterOptions();
  const count = catalogActiveAdvancedFilterCount();

  return `
    <details class="catalog-filter-panel" ${count > 0 ? "open" : ""}>
      <summary>
        <span>${state.language === "en" ? "Advanced filters" : "Filtros avanzados"}</span>
        <span class="catalog-filter-count">${count > 0 ? count : (state.language === "en" ? "Optional" : "Opcional")}</span>
      </summary>

      <div class="catalog-filter-grid">
        ${catalogRenderSelect("gender", state.language === "en" ? "Gender" : "Género", options.genders, filters.gender)}
        ${catalogRenderStyleSelect(filters.style)}
        ${catalogRenderSelect("occasion", state.language === "en" ? "Occasion" : "Ocasión", options.occasions, filters.occasion)}
        ${catalogRenderSelect("season", state.language === "en" ? "Season" : "Temporada", options.seasons, filters.season)}
        ${catalogRenderSelect("origin", state.language === "en" ? "Origin / segment" : "Origen / segmento", options.origins, filters.origin)}
        ${catalogRenderSelect("family", state.language === "en" ? "Olfactory family" : "Familia olfativa", options.families, filters.family)}

        <label class="catalog-filter-field">
          <span>${state.language === "en" ? "Minimum price" : "Precio mínimo"}</span>
          <input
            class="number-input"
            type="number"
            min="0"
            step="100"
            inputmode="numeric"
            data-catalog-filter-key="priceMin"
            value="${escapeAttribute(filters.priceMin)}"
            placeholder="$0">
        </label>

        <label class="catalog-filter-field">
          <span>${state.language === "en" ? "Maximum price" : "Precio máximo"}</span>
          <input
            class="number-input"
            type="number"
            min="0"
            step="100"
            inputmode="numeric"
            data-catalog-filter-key="priceMax"
            value="${escapeAttribute(filters.priceMax)}"
            placeholder="${state.language === "en" ? "No limit" : "Sin límite"}">
        </label>
      </div>

      <div class="catalog-filter-footer">
        <span>
          ${state.language === "en"
            ? "Combine filters to narrow the catalog without extra database calls."
            : "Combiná filtros para afinar el catálogo sin hacer consultas extra a la base."}
        </span>

        ${count > 0 ? `
          <button
            class="btn outline small"
            type="button"
            data-action="clear-advanced-catalog">
            ${state.language === "en" ? "Clear filters" : "Limpiar filtros"}
          </button>
        ` : ""}
      </div>
    </details>
  `;
}

function catalogRenderAutocomplete()
{
  const query = normalizeText(state.catalogSearch);
  const suggestionsQuery = normalizeText(state.catalogSuggestionsQuery);

  if (!query || query.length < 2 || suggestionsQuery !== query || !(state.catalogSuggestions || []).length)
  {
    return "";
  }

  return `
    <div class="catalog-autocomplete" role="listbox">
      ${(state.catalogSuggestions || []).map(value => `
        <button
          type="button"
          role="option"
          class="catalog-autocomplete-item"
          data-action="catalog-suggestion"
          data-value="${escapeAttribute(value)}">
          <span aria-hidden="true">⌕</span>
          <span>${escapeHtml(value)}</span>
        </button>
      `).join("")}
    </div>
  `;
}

function renderCatalogPage()
{
  const list = getCatalogProducts();
  const pageSize = Math.max(1, asNumber(state.catalogPageSize, 24));
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));

  state.catalogPage = Math.min(
    totalPages,
    Math.max(1, asNumber(state.catalogPage, 1))
  );

  const pageStart = (state.catalogPage - 1) * pageSize;
  const pageItems = list.slice(pageStart, pageStart + pageSize);

  const chips = [
    "Todos",
    "Nuevo",
    "Destacado",
    "Hombre",
    "Mujer",
    "Unisex",
    "Árabe",
    "Argentina",
    "Nicho",
    "Diseñador",
  ];

  const visiblePages = [];

  if (totalPages <= 7)
  {
    for (let page = 1; page <= totalPages; page += 1)
    {
      visiblePages.push(page);
    }
  }
  else
  {
    const candidates = new Set([
      1,
      totalPages,
      state.catalogPage - 2,
      state.catalogPage - 1,
      state.catalogPage,
      state.catalogPage + 1,
      state.catalogPage + 2,
    ].filter(page => page >= 1 && page <= totalPages));

    visiblePages.push(...Array.from(candidates).sort((a, b) => a - b));
  }

  const pageButtons = [];
  let previousPage = null;

  for (const page of visiblePages)
  {
    if (previousPage !== null && page - previousPage > 1)
    {
      pageButtons.push(`
        <span class="catalog-page-info" style="width:auto;margin:0 2px">…</span>
      `);
    }

    pageButtons.push(`
      <button
        class="catalog-page-btn ${page === state.catalogPage ? "active" : ""}"
        type="button"
        data-action="catalog-page"
        data-page="${page}">
        ${page}
      </button>
    `);

    previousPage = page;
  }

  const activeAdvanced = catalogActiveAdvancedFilterCount();
  const smartActive = Boolean(catalogGetSmartSearchSet());

  return `
    <section class="section catalog-v2-section">
      <div class="container">
        <div class="section-title-row">
          <div>
            <p class="eyebrow">${escapeHtml(t("catalog.eyebrow"))}</p>

            <h1 class="section-title">${escapeHtml(t("catalog.title"))}</h1>

            <p class="section-subtitle">
              ${formatInteger(list.length)} ${state.language === "en" ? "products" : "productos"}
              ${list.length ? ` · ${state.language === "en" ? "Page" : "Página"} ${state.catalogPage} ${state.language === "en" ? "of" : "de"} ${totalPages}` : ""}
            </p>
          </div>

          <div class="catalog-v2-status">
            ${state.catalogSearchLoading ? `
              <span class="catalog-search-status loading">
                <span class="catalog-search-dot"></span>
                ${state.language === "en" ? "Improving results…" : "Mejorando resultados…"}
              </span>
            ` : smartActive ? `
              <span class="catalog-search-status">
                ✦ ${state.language === "en" ? "Smart search active" : "Búsqueda inteligente activa"}
              </span>
            ` : ""}

            ${activeAdvanced > 0 ? `
              <span class="catalog-search-status">
                ${activeAdvanced} ${state.language === "en" ? "filters" : "filtros"}
              </span>
            ` : ""}
          </div>
        </div>

        <div class="catalog-smart-search-wrap">
          <div class="catalog-search-box">
            <span class="catalog-search-icon" aria-hidden="true">⌕</span>
            <input
              id="catalogSearch"
              class="search-input catalog-smart-search"
              type="search"
              autocomplete="off"
              value="${escapeAttribute(state.catalogSearch)}"
              placeholder="${escapeAttribute(state.language === "en" ? "Try: vanilla and coconut, for summer, for a date…" : "Probá: vainilla y coco, para verano, perfume para cita…")}">
            ${state.catalogSearch ? `
              <button
                class="catalog-search-clear"
                type="button"
                aria-label="${state.language === "en" ? "Clear search" : "Limpiar búsqueda"}"
                data-action="clear-catalog-search">×</button>
            ` : ""}
          </div>

          ${catalogRenderAutocomplete()}

          <p class="catalog-smart-hint">
            ${state.language === "en"
              ? "You can search naturally: notes, season, occasion, style, brand or budget."
              : "Podés buscar de forma natural: notas, temporada, ocasión, estilo, marca o presupuesto."}
          </p>
        </div>

        <div class="chips">
          ${chips.map(chip => `
            <button
              class="chip ${state.catalogFilter === chip ? "active" : ""}"
              type="button"
              data-action="catalog-filter"
              data-filter="${escapeAttribute(chip)}">
              ${escapeHtml(
                chip === "Todos" ? t("common.all") :
                chip === "Nuevo" ? t("product.new") :
                chip === "Destacado" ? t("product.featured") :
                chip
              )}
            </button>
          `).join("")}
        </div>

        ${catalogRenderAdvancedFilters()}

        <div class="catalog-toolbar catalog-toolbar-v2">
          <div class="catalog-result-label">
            ${state.catalogSearch
              ? `${state.language === "en" ? "Results for" : "Resultados para"} “${escapeHtml(state.catalogSearch)}”`
              : (state.language === "en" ? "Explore the catalog" : "Explorá el catálogo")}
          </div>

          <select id="catalogSort" class="select-input">
            <option value="default" ${state.catalogSort === "default" ? "selected" : ""}>${escapeHtml(t("catalog.sort.default"))}</option>
            <option value="low" ${state.catalogSort === "low" ? "selected" : ""}>${escapeHtml(t("catalog.sort.low"))}</option>
            <option value="high" ${state.catalogSort === "high" ? "selected" : ""}>${escapeHtml(t("catalog.sort.high"))}</option>
            <option value="name" ${state.catalogSort === "name" ? "selected" : ""}>${escapeHtml(t("catalog.sort.name"))}</option>
            <option value="stock" ${state.catalogSort === "stock" ? "selected" : ""}>${escapeHtml(t("catalog.sort.stock"))}</option>
          </select>

          <button class="btn outline" type="button" data-action="clear-catalog">
            ${state.language === "en" ? "Reset" : "Restablecer"}
          </button>
        </div>

        ${list.length ? `
          <div class="catalog-grid">
            ${pageItems.map(product => renderProductCard(product)).join("")}
          </div>

          ${totalPages > 1 ? `
            <nav class="catalog-pagination" aria-label="${escapeAttribute(state.language === "en" ? "Catalog pages" : "Páginas del catálogo")}">
              <button
                class="catalog-page-btn"
                type="button"
                data-action="catalog-page"
                data-page="${Math.max(1, state.catalogPage - 1)}"
                ${state.catalogPage <= 1 ? "disabled" : ""}>←</button>

              ${pageButtons.join("")}

              <button
                class="catalog-page-btn"
                type="button"
                data-action="catalog-page"
                data-page="${Math.min(totalPages, state.catalogPage + 1)}"
                ${state.catalogPage >= totalPages ? "disabled" : ""}>→</button>

              <div class="catalog-page-info">
                ${state.language === "en"
                  ? `Showing ${pageStart + 1}–${Math.min(pageStart + pageSize, list.length)} of ${list.length}`
                  : `Mostrando ${pageStart + 1}–${Math.min(pageStart + pageSize, list.length)} de ${list.length}`}
              </div>
            </nav>
          ` : ""}
        ` : `
          <div class="empty-state catalog-empty-v2">
            <h3>${escapeHtml(t("catalog.empty"))}</h3>
            <p>
              ${state.language === "en"
                ? "Try removing a filter or searching with another phrase."
                : "Probá sacando algún filtro o buscando con otra frase."}
            </p>
            <button class="btn outline" type="button" data-action="clear-catalog">
              ${state.language === "en" ? "Show all products" : "Ver todos los productos"}
            </button>
          </div>
        `}
      </div>
    </section>
  `;
}
