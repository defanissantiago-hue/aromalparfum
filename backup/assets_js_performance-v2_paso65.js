"use strict";

// AromaLParfum Frontend V2 — Paso 63
// Performance V2: carga por ruta, deduplicación de consultas y menor egress.

const alp63LoadedData = new Set();
const alp63InflightData = new Map();

function alp63MarkLoaded(key)
{
  if (key) alp63LoadedData.add(String(key));
}

function alp63IsLoaded(key)
{
  return alp63LoadedData.has(String(key));
}

function alp63LoadOnce(key, loader)
{
  const safeKey = String(key || "");
  if (!safeKey || typeof loader !== "function") return Promise.resolve();
  if (alp63LoadedData.has(safeKey)) return Promise.resolve();
  if (alp63InflightData.has(safeKey)) return alp63InflightData.get(safeKey);

  const promise = Promise.resolve()
    .then(loader)
    .then(result =>
    {
      alp63LoadedData.add(safeKey);
      return result;
    })
    .finally(() =>
    {
      alp63InflightData.delete(safeKey);
    });

  alp63InflightData.set(safeKey, promise);
  return promise;
}

function alp63InitialRouteHint()
{
  if (document.body?.dataset.entry === "admin") return "admin";

  const params = new URLSearchParams(window.location.search);
  if (params.get("wishlist")) return "shared-wishlist";
  if (params.get("pedido") || params.get("order")) return "order-tracking";
  if (params.get("club")) return "club";
  if (params.get("campaign")) return "campaign";
  if (Number(params.get("product") || 0) > 0) return "product";
  if (params.get("collection")) return "collection";

  const view = String(params.get("view") || "").trim().toLowerCase();
  const map = {
    home: "home",
    catalog: "catalog",
    best: "best",
    collections: "collections",
    decants: "decants",
    gifts: "gifts",
    games: "games",
    advisor: "advisor",
    discovery: "discovery",
    "gift-sets": "gift-sets",
    "personal-care": "personal-care",
    about: "about",
    contact: "contact",
  };

  return map[view] || "home";
}

function alp63InitialPayloadHint(route)
{
  const params = new URLSearchParams(window.location.search);
  if (route === "product") return { id: Number(params.get("product") || 0) };
  if (route === "collection") return { slug: String(params.get("collection") || "") };
  if (route === "campaign") return { slug: String(params.get("campaign") || "") };
  return {};
}

function alp63RouteKeys(route, payload = {})
{
  const keys = [];

  switch (String(route || "home"))
  {
    case "home":
      keys.push("popularity", "collections", "home-merchandising", "seasonal-video");
      break;

    case "catalog":
      keys.push("popularity", "product-types", "catalog-metadata");
      break;

    case "best":
      keys.push("popularity");
      break;

    case "collections":
    case "collection":
      keys.push("collections");
      break;

    case "campaign":
      keys.push("home-merchandising");
      break;

    case "decants":
      keys.push("combo-templates", "combo-products", "decant-sizes");
      break;

    case "gifts":
      keys.push("gift-options");
      break;

    case "games":
    case "advisor":
      keys.push("catalog-metadata");
      break;

    case "game":
      keys.push("game-configs", "daily-leaderboard");
      break;

    case "personal-care":
      keys.push("product-types");
      break;

    case "product":
    {
      const id = Number(payload?.id || state.routePayload?.id || new URLSearchParams(location.search).get("product") || 0);
      if (id) keys.push(`product-detail:${id}`);
      break;
    }

    default:
      break;
  }

  return keys;
}

function alp63RouteNeedsHydration(route, payload = {})
{
  return alp63RouteKeys(route, payload).some(key => !alp63IsLoaded(key));
}

async function alp63LoadKey(key)
{
  if (key.startsWith("product-detail:"))
  {
    const id = Number(key.split(":")[1] || 0);
    return alp63LoadOnce(key, () => loadProductDetailFields(id));
  }

  const loaders = {
    "popularity": () => loadPopularity(),
    "collections": () => loadCollections(),
    "home-merchandising": () => loadHomeMerchandising(),
    "seasonal-video": () => loadSeasonalVideoUrl(),
    "product-types": () => loadProductTypes(),
    "catalog-metadata": () => loadCatalogProductMetadata(),
    "combo-templates": () => loadComboTemplates(),
    "combo-products": () => loadComboProducts(),
    "decant-sizes": () => loadDecantSizes(),
    "gift-options": () => loadGiftOptions(),
    "game-configs": () => loadGameConfigs(),
    "daily-leaderboard": () => loadDailyLeaderboard(),
  };

  const loader = loaders[key];
  return loader ? alp63LoadOnce(key, loader) : Promise.resolve();
}

async function alp63EnsureRouteData(route, payload = {}, options = {})
{
  const keys = alp63RouteKeys(route, payload)
    .filter(key => !(options.skipSeasonal && key === "seasonal-video"));

  await Promise.all(keys.map(alp63LoadKey));
}

async function alp63LoadAdminBootstrap()
{
  await Promise.all([
    alp63LoadOnce("products-full", () => loadProducts({ publicSummary: false })),
    alp63LoadOnce("site-settings", () => loadSiteSettings()),
    alp63LoadKey("popularity"),
    alp63LoadKey("collections"),
    alp63LoadKey("game-configs"),
    alp63LoadKey("daily-leaderboard"),
    alp63LoadKey("product-types"),
    alp63LoadKey("combo-templates"),
    alp63LoadKey("combo-products"),
    alp63LoadKey("decant-sizes"),
    alp63LoadKey("gift-options"),
  ]);

  await Promise.all([
    alp63LoadOnce("main-product-images", () => loadMainProductImages()),
    alp63LoadOnce("site-cover-urls", () => loadSiteCoverUrls()),
    alp63LoadKey("seasonal-video"),
  ]);
}

async function alp63LoadPublicBootstrap()
{
  const route = alp63InitialRouteHint();
  const payload = alp63InitialPayloadHint(route);

  const productsPromise = alp63LoadOnce(
    "products-summary",
    () => loadProducts({ publicSummary: true })
  );

  const settingsPromise = alp63LoadOnce(
    "site-settings",
    () => loadSiteSettings()
  );

  // Todas las rutas salvo Product pueden arrancar sus datos secundarios en
  // paralelo con products/settings. Product espera a que exista su fila base.
  const routePromise = route === "product"
    ? productsPromise.then(() => alp63EnsureRouteData(route, payload, { skipSeasonal: true }))
    : alp63EnsureRouteData(route, payload, { skipSeasonal: true });

  await Promise.all([productsPromise, settingsPromise, routePromise]);

  const mediaPromises = [
    alp63LoadOnce("main-product-images", () => loadMainProductImages()),
    alp63LoadOnce("site-cover-urls", () => loadSiteCoverUrls()),
  ];

  if (route === "home")
  {
    mediaPromises.push(alp63LoadKey("seasonal-video"));
  }

  await Promise.all(mediaPromises);
}

async function alp63LoadBootstrapData()
{
  if (document.body?.dataset.entry === "admin")
  {
    return alp63LoadAdminBootstrap();
  }

  return alp63LoadPublicBootstrap();
}

function alp63ResetLazyState()
{
  alp63LoadedData.clear();
  alp63InflightData.clear();
}
