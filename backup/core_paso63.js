"use strict";

// AromaLParfum Frontend V2 — Paso 37
// Módulo: utilidades, UI base e imágenes de Storage

function t(
  key,
  fallback = ""
)
{
  const lang =
  I18N[
    state.language
  ]
  ||
  I18N.es;

  return (
    lang[
      key
    ]
    ??
    I18N.es[
      key
    ]
    ??
    fallback
    ??
    key
  );
}

function currentLanguage()
{
  return (
    state.language === "en"
    ?
    "en"
    :
    "es"
  );
}

function localizedField(
  object,
  baseField
)
{
  if (
    !object
  )
  {
    return "";
  }

  if (
    state.language === "en"
  )
  {
    const english =
    object[
      baseField +
      "_en"
    ];

    if (
      english !== null &&
      english !== undefined &&
      String(
        english
      ).trim() !== ""
    )
    {
      return String(
        english
      );
    }
  }

  const spanish =
  object[
    baseField
  ];

  if (
    spanish !== null &&
    spanish !== undefined
  )
  {
    return String(
      spanish
    );
  }

  return "";
}

function localizedCollectionName(
  collection
)
{
  if (
    !collection
  )
  {
    return "";
  }

  return (
    state.language === "en"
    ?
    collection.nombre_en
    :
    collection.nombre_es
  )
  ||
  collection.nombre_es
  ||
  collection.nombre_en
  ||
  collection.slug
  ||
  "";
}

function localizedCollectionDescription(
  collection
)
{
  if (
    !collection
  )
  {
    return "";
  }

  return (
    state.language === "en"
    ?
    collection.descripcion_en
    :
    collection.descripcion_es
  )
  ||
  collection.descripcion_es
  ||
  collection.descripcion_en
  ||
  "";
}

function escapeHtml(
  value
)
{
  return String(
    value ??
    ""
  )
  .replace(
    /&/g,
    "&amp;"
  )
  .replace(
    /</g,
    "&lt;"
  )
  .replace(
    />/g,
    "&gt;"
  )
  .replace(
    /"/g,
    "&quot;"
  )
  .replace(
    /'/g,
    "&#039;"
  );
}

function escapeAttribute(
  value
)
{
  return escapeHtml(
    value
  )
  .replace(
    /`/g,
    "&#096;"
  );
}

function normalizeText(
  value
)
{
  return String(
    value ??
    ""
  )
  .normalize(
    "NFD"
  )
  .replace(
    /[\u0300-\u036f]/g,
    ""
  )
  .toLowerCase()
  .trim();
}

function asNumber(
  value,
  fallback = 0
)
{
  const number =
  Number(
    value
  );

  if (
    Number.isFinite(
      number
    )
  )
  {
    return number;
  }

  return fallback;
}

function clamp(
  value,
  min,
  max
)
{
  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  );
}

function money(
  value
)
{
  const amount =
  asNumber(
    value,
    0
  );

  return new Intl.NumberFormat(
    state.language === "en"
    ?
    "en-US"
    :
    "es-AR",
    {
      style:
      "currency",

      currency:
      "ARS",

      maximumFractionDigits:
      0,
    }
  )
  .format(
    amount
  );
}

function formatInteger(
  value
)
{
  return new Intl.NumberFormat(
    state.language === "en"
    ?
    "en-US"
    :
    "es-AR",
    {
      maximumFractionDigits:
      0,
    }
  )
  .format(
    asNumber(
      value,
      0
    )
  );
}

function formatDate(
  value
)
{
  if (
    !value
  )
  {
    return "";
  }

  const date =
  new Date(
    value
  );

  if (
    Number.isNaN(
      date.getTime()
    )
  )
  {
    return "";
  }

  return new Intl.DateTimeFormat(
    state.language === "en"
    ?
    "en-US"
    :
    "es-AR",
    {
      year:
      "numeric",

      month:
      "short",

      day:
      "2-digit",
    }
  )
  .format(
    date
  );
}

function isNewProduct(
  product
)
{
  if (
    !product
  )
  {
    return false;
  }

  if (
    !product.nuevo
  )
  {
    return false;
  }

  if (
    product.new_until
  )
  {
    const until =
    new Date(
      product.new_until
    );

    return (
      !Number.isNaN(
        until.getTime()
      )
      &&
      until.getTime() >
      Date.now()
    );
  }

  if (
    product.created_at
  )
  {
    const created =
    new Date(
      product.created_at
    );

    if (
      !Number.isNaN(
        created.getTime()
      )
    )
    {
      const diff =
      Date.now() -
      created.getTime();

      return (
        diff >= 0 &&
        diff <=
        (
          CONFIG.newDays *
          24 *
          60 *
          60 *
          1000
        )
      );
    }
  }

  return Boolean(
    product.nuevo
  );
}

function arrayFromDb(
  value
)
{
  if (
    Array.isArray(
      value
    )
  )
  {
    return value
      .map(
        item =>
        String(
          item
        ).trim()
      )
      .filter(
        Boolean
      );
  }

  if (
    typeof value === "string"
  )
  {
    const trimmed =
    value.trim();

    if (
      trimmed === ""
    )
    {
      return [];
    }

    if (
      trimmed.startsWith(
        "["
      )
    )
    {
      const parsed =
      safeJsonParse(
        trimmed,
        null
      );

      if (
        Array.isArray(
          parsed
        )
      )
      {
        return parsed
          .map(
            item =>
            String(
              item
            ).trim()
          )
          .filter(
            Boolean
          );
      }
    }

    return trimmed
      .split(
        ","
      )
      .map(
        item =>
        item.trim()
      )
      .filter(
        Boolean
      );
  }

  return [];
}

function arrayToInput(
  value
)
{
  return arrayFromDb(
    value
  )
  .join(
    ", "
  );
}

function uniqueStrings(
  values
)
{
  return [
    ...new Set(
      (
        values ||
        []
      )
      .map(
        value =>
        String(
          value
        ).trim()
      )
      .filter(
        Boolean
      )
    ),
  ];
}

function slugify(
  value
)
{
  return normalizeText(
    value
  )
  .replace(
    /[^a-z0-9]+/g,
    "-"
  )
  .replace(
    /^-+|-+$/g,
    ""
  );
}

function makeId(
  prefix = "alp"
)
{
  if (
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === "function"
  )
  {
    return (
      prefix +
      "-" +
      globalThis.crypto.randomUUID()
    );
  }

  return (
    prefix +
    "-" +
    Date.now() +
    "-" +
    Math.random()
    .toString(
      36
    )
    .slice(
      2
    )
  );
}

function getProductById(
  id
)
{
  const numericId =
  Number(
    id
  );

  return state.products.find(
    product =>
    Number(
      product.id
    ) ===
    numericId
  )
  ||
  null;
}

function getPopularity(
  productId
)
{
  return asNumber(
    state.popularity.get(
      Number(
        productId
      )
    ),
    0
  );
}

function isFavorite(
  productId
)
{
  return state.favorites.includes(
    Number(
      productId
    )
  );
}

function saveLocalState()
{
  localStorage.setItem(
    "alp_cart",
    JSON.stringify(
      state.cart
    )
  );

  localStorage.setItem(
    "alp_fav",
    JSON.stringify(
      state.favorites
    )
  );

  localStorage.setItem(
    "alp_language",
    state.language
  );

  updateHeaderCounts();
}

function updateHeaderCounts()
{
  const cartCount =
  document.getElementById(
    "cartCount"
  );

  const favCount =
  document.getElementById(
    "favCount"
  );

  if (
    cartCount
  )
  {
    cartCount.textContent =
    String(
      state.cart.reduce(
        (
          total,
          line
        ) =>
        total +
        Math.max(
          1,
          asNumber(
            line.qty,
            1
          )
        ),
        0
      )
    );
  }

  if (
    favCount
  )
  {
    favCount.textContent =
    String(
      state.favorites.length
    );
  }

  if (
    typeof cart45UpdateFloatingBar === "function"
  )
  {
    cart45UpdateFloatingBar();
  }
}

function toast(
  message,
  type = "success",
  timeout = 3400
)
{
  const stack =
  document.getElementById(
    "toastStack"
  );

  if (
    !stack
  )
  {
    return;
  }

  const node =
  document.createElement(
    "div"
  );

  node.className =
  "toast " +
  type;

  node.textContent =
  String(
    message
  );

  stack.appendChild(
    node
  );

  window.setTimeout(
    () =>
    {
      node.remove();
    },
    timeout
  );
}

function setAppLoading(
  label =
  t(
    "common.loading"
  )
)
{
  const app =
  document.getElementById(
    "app"
  );

  if (
    !app
  )
  {
    return;
  }

  app.innerHTML =
  `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>
        ${escapeHtml(label)}
      </p>
    </div>
  `;
}

function openModal(
  title,
  bodyHtml
)
{
  const modal =
  document.getElementById(
    "modal"
  );

  const modalTitle =
  document.getElementById(
    "modalTitle"
  );

  const modalBody =
  document.getElementById(
    "modalBody"
  );

  if (
    !modal ||
    !modalTitle ||
    !modalBody
  )
  {
    return;
  }

  modalTitle.textContent =
  String(
    title ||
    "AromaLParfum"
  );

  modalBody.innerHTML =
  bodyHtml ||
  "";

  modal.classList.add(
    "open"
  );

  modal.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.classList.add(
    "no-scroll"
  );
}

function closeModal()
{
  const modal =
  document.getElementById(
    "modal"
  );

  if (
    !modal
  )
  {
    return;
  }

  modal.classList.remove(
    "open"
  );

  modal.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.classList.remove(
    "no-scroll"
  );
}

function openMenu()
{
  const drawer =
  document.getElementById(
    "menuDrawer"
  );

  if (
    !drawer
  )
  {
    return;
  }

  drawer.classList.add(
    "open"
  );

  drawer.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.classList.add(
    "no-scroll"
  );
}

function closeMenu()
{
  const drawer =
  document.getElementById(
    "menuDrawer"
  );

  if (
    !drawer
  )
  {
    return;
  }

  drawer.classList.remove(
    "open"
  );

  drawer.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.classList.remove(
    "no-scroll"
  );
}

function openCart()
{
  renderCart();

  const drawer =
  document.getElementById(
    "cartDrawer"
  );

  if (
    !drawer
  )
  {
    return;
  }

  drawer.classList.add(
    "open"
  );

  drawer.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.classList.add(
    "no-scroll"
  );
}

function closeCart()
{
  const drawer =
  document.getElementById(
    "cartDrawer"
  );

  if (
    !drawer
  )
  {
    return;
  }

  drawer.classList.remove(
    "open"
  );

  drawer.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.classList.remove(
    "no-scroll"
  );
}

function applyLanguageToChrome()
{
  document.documentElement.lang =
  state.language;

  const selector =
  document.getElementById(
    "languageSelect"
  );

  if (
    selector
  )
  {
    selector.value =
    state.language;
  }

  const primary =
  document.getElementById(
    "topbarPrimary"
  );

  const secondary =
  document.getElementById(
    "topbarSecondary"
  );

  if (
    primary
  )
  {
    primary.textContent =
    getSiteSetting(
      "shipping",
      "text_" +
      state.language,
      t(
        "top.shipping"
      )
    );
  }

  if (
    secondary
  )
  {
    secondary.textContent =
    t(
      "top.secondary"
    );
  }

  document.querySelectorAll(
    "[data-i18n]"
  )
  .forEach(
    node =>
    {
      const key =
      node.getAttribute(
        "data-i18n"
      );

      if (
        key
      )
      {
        node.textContent =
        t(
          key
        );
      }
    }
  );

  renderMobileMenu();
  renderFooter();
}

function getSiteSettingObject(
  key
)
{
  const value =
  state.siteSettings[
    key
  ];

  if (
    value &&
    typeof value === "object"
  )
  {
    return value;
  }

  return {};
}

function getSiteSetting(
  key,
  property,
  fallback = ""
)
{
  const object =
  getSiteSettingObject(
    key
  );

  const value =
  object[
    property
  ];

  return (
    value !== null &&
    value !== undefined &&
    value !== ""
  )
  ?
  value
  :
  fallback;
}

function isAiEnabled(
  subFeature
)
{
  const ai =
  getSiteSettingObject(
    "ai"
  );

  if (
    ai.enabled !== true
  )
  {
    return false;
  }

  if (
    subFeature
  )
  {
    return (
      ai[
        subFeature
      ] === true
    );
  }

  return true;
}

function getAiEndpoint()
{
  return getSiteSetting(
    "ai",
    "endpoint",
    CONFIG.defaultAiEndpoint
  );
}

function normalizeStoragePath(
  raw
)
{
  const value =
  String(
    raw ??
    ""
  ).trim();

  if (
    value === ""
  )
  {
    return {
      kind:
      "empty",

      value:
      "",
    };
  }

  if (
    !/^https?:\/\//i.test(
      value
    )
  )
  {
    return {
      kind:
      "storage",

      value:
      value.replace(
        new RegExp(
          "^" +
          CONFIG.storageBucket +
          "/"
        ),
        ""
      ),
    };
  }

  try
  {
    const url =
    new URL(
      value
    );

    const publicMarker =
    "/storage/v1/object/public/" +
    CONFIG.storageBucket +
    "/";

    const signMarker =
    "/storage/v1/object/sign/" +
    CONFIG.storageBucket +
    "/";

    const authenticatedMarker =
    "/storage/v1/object/authenticated/" +
    CONFIG.storageBucket +
    "/";

    if (
      url.pathname.includes(
        publicMarker
      )
    )
    {
      return {
        kind:
        "storage",

        value:
        decodeURIComponent(
          url.pathname.split(
            publicMarker
          )[1]
          ||
          ""
        ),
      };
    }

    if (
      url.pathname.includes(
        signMarker
      )
    )
    {
      return {
        kind:
        "storage",

        value:
        decodeURIComponent(
          url.pathname.split(
            signMarker
          )[1]
          ||
          ""
        ),
      };
    }

    if (
      url.pathname.includes(
        authenticatedMarker
      )
    )
    {
      return {
        kind:
        "storage",

        value:
        decodeURIComponent(
          url.pathname.split(
            authenticatedMarker
          )[1]
          ||
          ""
        ),
      };
    }

    return {
      kind:
      "external",

      value:
      value,
    };
  }
  catch (
    error
  )
  {
    return {
      kind:
      "external",

      value:
      value,
    };
  }
}

const STORAGE_MODE_CACHE_KEY = "alp_storage_mode_v2";
const SIGNED_IMAGE_CACHE_KEY = "alp_signed_images_v2";
let runtimeStorageMode = null;

function publicStorageUrl(path)
{
  const result =
  supabaseClient
    .storage
    .from(CONFIG.storageBucket)
    .getPublicUrl(path);

  return result.data?.publicUrl || "";
}

function readStorageModeCache()
{
  try
  {
    const parsed = JSON.parse(
      localStorage.getItem(STORAGE_MODE_CACHE_KEY) || "null"
    );

    if (
      parsed &&
      (parsed.mode === "public" || parsed.mode === "private") &&
      Number(parsed.expiresAt || 0) > Date.now()
    )
    {
      return parsed.mode;
    }
  }
  catch (_) {}

  return null;
}

function writeStorageModeCache(mode)
{
  try
  {
    localStorage.setItem(
      STORAGE_MODE_CACHE_KEY,
      JSON.stringify({
        mode,
        expiresAt: Date.now() + 6 * 60 * 60 * 1000,
      })
    );
  }
  catch (_) {}
}

function readSignedImageCache()
{
  try
  {
    const parsed = JSON.parse(
      localStorage.getItem(SIGNED_IMAGE_CACHE_KEY) || "{}"
    );

    return parsed && typeof parsed === "object" ? parsed : {};
  }
  catch (_)
  {
    return {};
  }
}

function getCachedSignedUrl(path)
{
  const cache = readSignedImageCache();
  const item = cache[path];

  if (
    item &&
    item.url &&
    Number(item.expiresAt || 0) > Date.now() + 5 * 60 * 1000
  )
  {
    return item.url;
  }

  if (item)
  {
    delete cache[path];
    try
    {
      localStorage.setItem(SIGNED_IMAGE_CACHE_KEY, JSON.stringify(cache));
    }
    catch (_) {}
  }

  return "";
}

function cacheSignedUrl(path, url)
{
  if (!path || !url)
  {
    return;
  }

  const cache = readSignedImageCache();

  cache[path] = {
    url,
    expiresAt:
      Date.now() +
      Math.max(60, Number(CONFIG.signedUrlSeconds || 604800) - 600) * 1000,
  };

  // Evita que localStorage crezca indefinidamente.
  const entries = Object.entries(cache);

  if (entries.length > 1000)
  {
    entries
      .sort((a, b) => Number(b[1]?.expiresAt || 0) - Number(a[1]?.expiresAt || 0))
      .slice(1000)
      .forEach(([key]) => delete cache[key]);
  }

  try
  {
    localStorage.setItem(SIGNED_IMAGE_CACHE_KEY, JSON.stringify(cache));
  }
  catch (_) {}
}

async function detectStorageMode(samplePath)
{
  if (runtimeStorageMode)
  {
    return runtimeStorageMode;
  }

  if (CONFIG.storagePublic === true)
  {
    runtimeStorageMode = "public";
    return runtimeStorageMode;
  }

  if (CONFIG.storagePublic === false)
  {
    runtimeStorageMode = "private";
    return runtimeStorageMode;
  }

  const cached = readStorageModeCache();

  if (cached)
  {
    runtimeStorageMode = cached;
    return runtimeStorageMode;
  }

  if (!samplePath)
  {
    runtimeStorageMode = "private";
    return runtimeStorageMode;
  }

  const url = publicStorageUrl(samplePath);

  try
  {
    // Solo una comprobación pequeña por algunas horas; no descarga la imagen completa.
    const response = await fetch(url, {
      method: "HEAD",
      cache: "no-store",
    });

    runtimeStorageMode = response.ok ? "public" : "private";
  }
  catch (_)
  {
    runtimeStorageMode = "private";
  }

  writeStorageModeCache(runtimeStorageMode);
  return runtimeStorageMode;
}

async function createCachedSignedUrl(path)
{
  const cached = getCachedSignedUrl(path);

  if (cached)
  {
    return cached;
  }

  const result =
  await supabaseClient
    .storage
    .from(CONFIG.storageBucket)
    .createSignedUrl(path, CONFIG.signedUrlSeconds);

  if (result.error)
  {
    console.warn(
      "No se pudo firmar imagen:",
      path,
      result.error.message
    );

    return "";
  }

  const url = result.data?.signedUrl || "";

  if (url)
  {
    cacheSignedUrl(path, url);
  }

  return url;
}

async function resolveImageValue(raw)
{
  const normalized = normalizeStoragePath(raw);

  if (normalized.kind === "empty")
  {
    return { path: "", url: "" };
  }

  if (normalized.kind === "external")
  {
    return { path: "", url: normalized.value };
  }

  const path = normalized.value;
  const cachedSigned = getCachedSignedUrl(path);

  // Si ya tuvimos que firmar esta imagen, reutilizamos esa URL directamente.
  if (cachedSigned)
  {
    return { path, url: cachedSigned };
  }

  const mode = await detectStorageMode(path);

  if (mode === "public")
  {
    return {
      path,
      url: publicStorageUrl(path),
    };
  }

  return {
    path,
    url: await createCachedSignedUrl(path),
  };
}

