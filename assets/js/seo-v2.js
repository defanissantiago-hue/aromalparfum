"use strict";

// =========================================================
// AromaLParfum — PASO 62
// SEO & Deep Links V2
// - Metadata dinámica sin nuevas consultas a Supabase.
// - Deep links para productos, colecciones y vistas públicas.
// - JSON-LD Product / CollectionPage / BreadcrumbList.
// - Rutas privadas marcadas noindex.
// =========================================================

const ALP62_PUBLIC_SITE = "https://defanissantiago-hue.github.io/aromalparfum/";
const ALP62_DEFAULT_TITLE = "AromaLParfum | Perfumería";
const ALP62_DEFAULT_DESCRIPTION = "Perfumes, fragancias, decants y regalos seleccionados por AromaLParfum.";
const ALP62_DEFAULT_SHARE_IMAGE = "assets/seo/aromalparfum-share.png";
const ALP62_ROUTE_KEYS = ["product", "collection", "campaign", "view", "pedido", "club", "wishlist"];
const ALP62_PRIVATE_ROUTES = new Set(["admin", "favorites", "shared-wishlist", "order-tracking", "club"]);
const ALP62_VIEW_TO_ROUTE = {
  catalog: "catalog",
  best: "best",
  collections: "collections",
  decants: "decants",
  gifts: "gifts",
  "gift-sets": "gift-sets",
  discovery: "discovery",
  "personal-care": "personal-care",
  discover: "games",
  advisor: "advisor",
  about: "about",
  contact: "contact",
};
const ALP62_ROUTE_TO_VIEW = Object.fromEntries(
  Object.entries(ALP62_VIEW_TO_ROUTE).map(([view, route]) => [route, view])
);

function seoV2Text(es, en)
{
  return state?.language === "en" ? en : es;
}

function seoV2Trim(value, max = 160)
{
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, Math.max(1, max - 1)).trim()}…`;
}

function seoV2BaseUrl()
{
  try
  {
    const url = new URL(location.href);
    url.search = "";
    url.hash = "";
    url.pathname = url.pathname.replace(/index\.html$/i, "");
    if (!url.pathname.endsWith("/")) url.pathname += "/";
    return url;
  }
  catch (_error)
  {
    return new URL(ALP62_PUBLIC_SITE);
  }
}

function seoV2CanonicalUrl(route = state?.route, payload = state?.routePayload || {})
{
  const url = seoV2BaseUrl();

  if (route === "product" && Number(payload?.id) > 0)
  {
    url.searchParams.set("product", String(Number(payload.id)));
  }
  else if (route === "collection" && String(payload?.slug || "").trim())
  {
    url.searchParams.set("collection", String(payload.slug).trim());
  }
  else if (route === "campaign" && String(payload?.slug || payload?.campaign_slug || "").trim())
  {
    url.searchParams.set("campaign", String(payload.slug || payload.campaign_slug).trim());
  }
  else if (ALP62_ROUTE_TO_VIEW[route])
  {
    url.searchParams.set("view", ALP62_ROUTE_TO_VIEW[route]);
  }

  return url.toString();
}

function seoV2ShareUrl(route = state?.route, payload = state?.routePayload || {})
{
  return seoV2CanonicalUrl(route, payload);
}

function seoV2PreservedAcquisitionParams(source)
{
  const result = new URLSearchParams();
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(key =>
  {
    const value = source.get(key);
    if (value) result.set(key, value);
  });
  return result;
}

function seoV2SyncBrowserUrl()
{
  if (document.body?.dataset.entry === "admin" || ALP62_PRIVATE_ROUTES.has(state?.route)) return;

  try
  {
    const current = new URL(location.href);
    const acquisition = seoV2PreservedAcquisitionParams(current.searchParams);
    const target = new URL(seoV2CanonicalUrl());

    for (const [key, value] of acquisition.entries()) target.searchParams.set(key, value);

    const next = `${target.pathname}${target.search}${target.hash}`;
    const now = `${current.pathname}${current.search}${current.hash}`;
    if (next !== now) history.replaceState({ alp62: true }, "", next);
  }
  catch (_error)
  {
    // El SEO nunca debe interrumpir la tienda.
  }
}

function seoV2EnsureMeta(selector, attributes)
{
  let node = document.head.querySelector(selector);
  if (!node)
  {
    node = document.createElement("meta");
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    document.head.appendChild(node);
  }
  return node;
}

function seoV2SetMeta({ name = "", property = "", content = "" })
{
  const selector = property ? `meta[property="${property}"]` : `meta[name="${name}"]`;
  const node = seoV2EnsureMeta(selector, property ? { property } : { name });
  node.setAttribute("content", String(content || ""));
}

function seoV2SetCanonical(url)
{
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link)
  {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = url;
}

function seoV2AbsoluteImage(value)
{
  const raw = String(value || "").trim();
  if (!raw) return new URL(ALP62_DEFAULT_SHARE_IMAGE, seoV2BaseUrl()).toString();
  try { return new URL(raw, location.href).toString(); }
  catch (_error) { return new URL(ALP62_DEFAULT_SHARE_IMAGE, seoV2BaseUrl()).toString(); }
}

function seoV2CollectionBySlug(slug)
{
  const safe = String(slug || "").trim();
  if (!safe) return null;
  try
  {
    return (typeof getHeroCollections === "function" ? getHeroCollections() : (state?.collections || []))
      .find(item => String(item?.slug || "") === safe) || null;
  }
  catch (_error)
  {
    return null;
  }
}

function seoV2CampaignBySlug(slug)
{
  const safe = String(slug || "").trim().toLowerCase();
  if (!safe) return null;

  try
  {
    if (typeof alp56CampaignCache !== "undefined" && alp56CampaignCache?.has?.(safe))
    {
      return alp56CampaignCache.get(safe) || null;
    }
  }
  catch (_error) {}

  const rows = Array.isArray(state?.homeMerchandising?.campaigns)
    ? state.homeMerchandising.campaigns
    : [];
  return rows.find(row => String(row?.slug || "").trim().toLowerCase() === safe) || null;
}

function seoV2RouteMeta()
{
  const route = state?.route || "home";
  const payload = state?.routePayload || {};
  const defaults = {
    title: ALP62_DEFAULT_TITLE,
    description: ALP62_DEFAULT_DESCRIPTION,
    image: typeof getSiteCoverUrl === "function" ? getSiteCoverUrl("hero") : "",
    type: "website",
    robots: ALP62_PRIVATE_ROUTES.has(route) ? "noindex,nofollow,noarchive" : "index,follow,max-image-preview:large",
  };

  if (route === "product")
  {
    const product = typeof getProductById === "function" ? getProductById(payload.id) : null;
    if (!product) return { ...defaults, robots: "noindex,follow" };
    const brand = String(product.marca || "").trim();
    const size = Number(product.ml) > 0 ? `${Number(product.ml)} ml` : "";
    const descriptor = [brand, size].filter(Boolean).join(" · ");
    return {
      ...defaults,
      title: `${product.nombre}${descriptor ? ` | ${descriptor}` : ""} | AromaLParfum`,
      description: seoV2Trim(
        (typeof localizedField === "function" ? localizedField(product, "descripcion") : product.descripcion) ||
        `${product.nombre}${brand ? ` de ${brand}` : ""}. Consultá precio, stock, notas y opciones de compra en AromaLParfum.`
      ),
      image: typeof getProductMainImage === "function" ? getProductMainImage(product) : product.imagen_url,
      type: "product",
    };
  }

  if (route === "collection")
  {
    const collection = seoV2CollectionBySlug(payload.slug);
    if (!collection) return { ...defaults, robots: "noindex,follow" };
    const name = typeof localizedCollectionName === "function" ? localizedCollectionName(collection) : (collection.nombre_es || collection.nombre_en || "Colección");
    const description = typeof localizedCollectionDescription === "function" ? localizedCollectionDescription(collection) : (collection.descripcion_es || collection.descripcion_en || "");
    return {
      ...defaults,
      title: `${name} | AromaLParfum`,
      description: seoV2Trim(description || `Explorá ${name} en AromaLParfum.`),
      image: typeof getCollectionCoverUrl === "function" ? getCollectionCoverUrl(collection.slug) : "",
    };
  }

  if (route === "campaign")
  {
    const slug = payload.slug || payload.campaign_slug || "";
    const campaign = seoV2CampaignBySlug(slug);
    const title = campaign?.titulo || campaign?.nombre || campaign?.title || campaign?.name || "Campaña AromaLParfum";
    const description = campaign?.descripcion || campaign?.subtitulo || campaign?.description || campaign?.subtitle || "Descubrí esta selección especial de AromaLParfum.";
    const image = campaign?.image_url || campaign?.image_path || campaign?.mobile_image_url || campaign?.mobile_image_path || "";
    return { ...defaults, title: `${title} | AromaLParfum`, description: seoV2Trim(description), image };
  }

  const staticMeta = {
    catalog: ["Perfumes y fragancias | AromaLParfum", "Explorá el catálogo de perfumes, fragancias y propuestas seleccionadas por AromaLParfum."],
    best: ["Más vendidos | AromaLParfum", "Descubrí las fragancias que más eligen los clientes de AromaLParfum."],
    collections: ["Colecciones de perfumes | AromaLParfum", "Colecciones curadas por estación, ocasión y estilo para encontrar tu próxima fragancia."],
    decants: ["Decants de perfumes | AromaLParfum", "Probá distintas fragancias en decants y armá una selección a tu medida."],
    gifts: ["Regalos personalizados | AromaLParfum", "Armá un regalo de perfumería personalizado con fragancias y presentaciones especiales."],
    "gift-sets": ["Gift Sets | AromaLParfum", "Sets de regalo de perfumería seleccionados por AromaLParfum."],
    discovery: ["Discovery Boxes | AromaLParfum", "Descubrí fragancias con cajas de selección y experiencias de perfumería."],
    "personal-care": ["Cuidado personal | AromaLParfum", "Productos de cuidado personal seleccionados por AromaLParfum."],
    games: ["Descubrí tu Aroma | AromaLParfum", "Explorá tu perfil olfativo y encontrá fragancias que encajen con tu estilo."],
    advisor: ["Asesor de fragancias | AromaLParfum", "Encontrá perfumes según tus gustos, ocasión y presupuesto."],
    about: ["Acerca de AromaLParfum", "Conocé AromaLParfum y nuestra propuesta de selección, asesoramiento y experiencias de perfumería."],
    contact: ["Contacto | AromaLParfum", "Contactá a AromaLParfum para consultar por perfumes, pedidos, regalos y asesoramiento."],
    home: [ALP62_DEFAULT_TITLE, ALP62_DEFAULT_DESCRIPTION],
  };

  const pair = staticMeta[route] || staticMeta.home;
  return { ...defaults, title: pair[0], description: pair[1] };
}

function seoV2OrganizationJsonLd()
{
  const base = seoV2BaseUrl().toString();
  return {
    "@type": "Organization",
    "@id": `${base}#organization`,
    name: "AromaLParfum",
    url: base,
    logo: new URL(ALP62_DEFAULT_SHARE_IMAGE, seoV2BaseUrl()).toString(),
  };
}

function seoV2BreadcrumbJsonLd(items)
{
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

function seoV2StructuredData(meta, canonical)
{
  const base = seoV2BaseUrl().toString();
  const graph = [
    seoV2OrganizationJsonLd(),
    {
      "@type": "WebSite",
      "@id": `${base}#website`,
      url: base,
      name: "AromaLParfum",
      inLanguage: state?.language === "en" ? "en" : "es-AR",
      publisher: { "@id": `${base}#organization` },
    },
  ];

  if (state?.route === "product")
  {
    const product = typeof getProductById === "function" ? getProductById(state.routePayload?.id) : null;
    if (product)
    {
      const images = typeof getProductImages === "function" ? getProductImages(product).filter(Boolean).slice(0, 5) : [];
      graph.push({
        "@type": "Product",
        "@id": `${canonical}#product`,
        name: product.nombre,
        description: meta.description,
        image: images.length ? images.map(seoV2AbsoluteImage) : [seoV2AbsoluteImage(meta.image)],
        sku: `ALP-${Number(product.id)}`,
        brand: product.marca ? { "@type": "Brand", name: product.marca } : undefined,
        category: product.categoria || product.tipo_producto || "Perfume",
        offers: {
          "@type": "Offer",
          url: canonical,
          priceCurrency: "ARS",
          price: Number(product.precio || 0),
          availability: Number(product.stock || 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          itemCondition: "https://schema.org/NewCondition",
        },
      });
      graph.push(seoV2BreadcrumbJsonLd([
        { name: seoV2Text("Inicio", "Home"), url: base },
        { name: seoV2Text("Perfumes", "Fragrances"), url: seoV2CanonicalUrl("catalog", {}) },
        { name: product.nombre, url: canonical },
      ]));
    }
  }
  else if (state?.route === "collection")
  {
    const collection = seoV2CollectionBySlug(state.routePayload?.slug);
    if (collection)
    {
      const name = typeof localizedCollectionName === "function" ? localizedCollectionName(collection) : (collection.nombre_es || collection.slug);
      graph.push({
        "@type": "CollectionPage",
        "@id": `${canonical}#collection`,
        name,
        description: meta.description,
        url: canonical,
        image: seoV2AbsoluteImage(meta.image),
        isPartOf: { "@id": `${base}#website` },
      });
      graph.push(seoV2BreadcrumbJsonLd([
        { name: seoV2Text("Inicio", "Home"), url: base },
        { name: seoV2Text("Colecciones", "Collections"), url: seoV2CanonicalUrl("collections", {}) },
        { name, url: canonical },
      ]));
    }
  }
  else if (state?.route === "campaign")
  {
    graph.push({
      "@type": "CollectionPage",
      "@id": `${canonical}#campaign`,
      name: meta.title.replace(/\s*\|\s*AromaLParfum\s*$/i, ""),
      description: meta.description,
      url: canonical,
      image: seoV2AbsoluteImage(meta.image),
      isPartOf: { "@id": `${base}#website` },
    });
  }

  // JSON.stringify omite propiedades undefined, útil para brand opcional.
  return { "@context": "https://schema.org", "@graph": graph };
}

function seoV2SetJsonLd(data)
{
  let script = document.getElementById("alp62StructuredData");
  if (!script)
  {
    script = document.createElement("script");
    script.id = "alp62StructuredData";
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

function seoV2AfterRouteRender()
{
  if (document.body?.dataset.entry === "admin") return;

  const meta = seoV2RouteMeta();
  const canonical = seoV2CanonicalUrl();
  const image = seoV2AbsoluteImage(meta.image);

  document.title = meta.title;
  seoV2SetCanonical(canonical);
  seoV2SetMeta({ name: "description", content: meta.description });
  seoV2SetMeta({ name: "robots", content: meta.robots });
  seoV2SetMeta({ property: "og:site_name", content: "AromaLParfum" });
  seoV2SetMeta({ property: "og:locale", content: state?.language === "en" ? "en_US" : "es_AR" });
  seoV2SetMeta({ property: "og:type", content: meta.type });
  seoV2SetMeta({ property: "og:title", content: meta.title });
  seoV2SetMeta({ property: "og:description", content: meta.description });
  seoV2SetMeta({ property: "og:url", content: canonical });
  seoV2SetMeta({ property: "og:image", content: image });
  seoV2SetMeta({ property: "og:image:width", content: "1200" });
  seoV2SetMeta({ property: "og:image:height", content: "630" });
  seoV2SetMeta({ name: "twitter:card", content: "summary_large_image" });
  seoV2SetMeta({ name: "twitter:title", content: meta.title });
  seoV2SetMeta({ name: "twitter:description", content: meta.description });
  seoV2SetMeta({ name: "twitter:image", content: image });
  seoV2SetJsonLd(seoV2StructuredData(meta, canonical));
  seoV2SyncBrowserUrl();
}

function seoV2ApplyInitialRoute()
{
  if (document.body?.dataset.entry === "admin") return false;

  const params = new URLSearchParams(location.search);
  const productId = Number(params.get("product") || 0);
  if (productId > 0 && typeof getProductById === "function" && getProductById(productId))
  {
    state.route = "product";
    state.routePayload = { id: productId };
    return true;
  }

  const collection = String(params.get("collection") || "").trim();
  if (collection)
  {
    state.route = "collection";
    state.routePayload = { slug: collection };
    return true;
  }

  const view = String(params.get("view") || "").trim().toLowerCase();
  const route = ALP62_VIEW_TO_ROUTE[view];
  if (route)
  {
    state.route = route;
    state.routePayload = {};
    return true;
  }

  return false;
}

async function seoV2CopyText(text)
{
  try
  {
    await navigator.clipboard.writeText(text);
    return true;
  }
  catch (_error)
  {
    try
    {
      const input = document.createElement("textarea");
      input.value = text;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      const ok = document.execCommand("copy");
      input.remove();
      return ok;
    }
    catch (_fallbackError)
    {
      return false;
    }
  }
}

async function seoV2ShareCurrent()
{
  const meta = seoV2RouteMeta();
  const url = seoV2ShareUrl();
  const shareData = { title: meta.title, text: meta.description, url };

  if (navigator.share)
  {
    try
    {
      await navigator.share(shareData);
      return;
    }
    catch (error)
    {
      if (error?.name === "AbortError") return;
    }
  }

  const copied = await seoV2CopyText(url);
  if (typeof toast === "function")
  {
    toast(
      copied ? seoV2Text("Link copiado.", "Link copied.") : seoV2Text("No pudimos copiar el link.", "We couldn't copy the link."),
      copied ? "success" : "error"
    );
  }
}

document.addEventListener("click", event =>
{
  const button = event.target.closest("[data-seo62-action]");
  if (!button) return;

  if (button.dataset.seo62Action === "share-current")
  {
    event.preventDefault();
    seoV2ShareCurrent();
  }
});
