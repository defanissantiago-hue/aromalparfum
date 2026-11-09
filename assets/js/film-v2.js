"use strict";

// AromaLParfum — PASO 71 · Nueva visión
// - Inicio: "película" controlada por el scroll con el Le Male Elixir Absolu
//   (inspiración G5): frasco real recortado, pirámide olfativa con líneas,
//   bruma, momentos de uso y el nombre armado con partículas.
// - Sección "Un perfume para cada hora" con conteos reales del catálogo.
// - Tarjetas: vista rápida con cantidad y agregado al carrito.
// - Navegación tipo píldora con la página activa marcada.
// Se instala envolviendo renderHomePage, renderCommercialSegments,
// renderProductCard y renderCurrentRoute, sin tocar los módulos existentes.

// La ruta se resuelve desde este script: así no depende de la URL que muestre
// el navegador (el router la reescribe al navegar).
const ALP70_HERO_IMAGE = (() =>
{
  const file = "../img/le-male-elixir-absolu.webp?v=71";
  try
  {
    return new URL(file, document.currentScript?.src || location.href).href;
  }
  catch (_)
  {
    return "assets/img/le-male-elixir-absolu.webp?v=71";
  }
})();

// Producto protagonista. Se busca por id y, si cambiara, por nombre.
const ALP70_HERO = {
  id: 1862,
  match: "elixir absolu",
  title: "Le Male",
  titleEm: "Elixir Absolu",
  word: "ABSOLU",
  // Valores de la ficha en Supabase: se usan mientras carga el detalle y se
  // reemplazan por lo que diga la base apenas llega.
  fallback: {
    descripcion: "Fragancia masculina intensa, cálida y especiada, con un perfil dulce, sensual y elegante.",
    salida: "ciruela y canela",
    corazon: "lavanda y davana",
    fondo: "haba tonka y benjui",
    duracion: "Media-alta / alta (orientativa)",
    proyeccion: "Media-alta (orientativa)",
  },
};

const ALP70_SCENES = [
  { id: "intro", start: 0, end: 0.17, es: "Elixir Absolu", en: "Elixir Absolu" },
  { id: "anatomy", start: 0.15, end: 0.38, es: "Pirámide olfativa", en: "Fragrance pyramid" },
  { id: "mist", start: 0.36, end: 0.53, es: "Duración y estela", en: "Longevity and trail" },
  { id: "moments", start: 0.51, end: 0.78, es: "Cuándo usarlo", en: "When to wear it" },
  { id: "brand", start: 0.76, end: 1, es: "Comprar", en: "Buy" },
];

// Ocasiones de la base → hora, texto y luz de fondo para la escena de momentos.
const ALP70_OCCASIONS = {
  diario: { order: 1, time: "09:00", mood: "morning", es: ["Todos los días.", "Fácil de llevar."], en: ["Every day.", "Easy to wear."] },
  oficina: { order: 2, time: "14:00", mood: "morning", es: ["En la oficina.", "Prolijo."], en: ["At the office.", "Polished."] },
  eventos: { order: 3, time: "19:00", mood: "dusk", es: ["Eventos.", "A la altura."], en: ["Events.", "Up to it."] },
  citas: { order: 4, time: "20:30", mood: "dusk", es: ["Citas.", "Cerca y cálido."], en: ["Dates.", "Close and warm."] },
  salidas: { order: 5, time: "21:30", mood: "dusk", es: ["Salidas.", "Con presencia."], en: ["Nights out.", "With presence."] },
  noche: { order: 6, time: "23:00", mood: "night", es: ["La noche.", "Intenso."], en: ["The night.", "Intense."] },
  fiesta: { order: 7, time: "01:30", mood: "night", es: ["Fiesta.", "Que se sienta."], en: ["Party.", "Make it felt."] },
};

const ALP70_MOMENT_RANGES = [[0.53, 0.62], [0.61, 0.70], [0.69, 0.78]];

// Sección de la home: momentos del día con conteos reales del catálogo.
const ALP70_DAY_MOMENTS = [
  { time: "09:00", keyword: "diario", mood: "morning", es: ["Para todos los días.", "Liviano y prolijo."], en: ["For every day.", "Light and polished."] },
  { time: "14:00", keyword: "oficina", mood: "noon", es: ["En la oficina.", "Presente sin invadir."], en: ["At the office.", "Present, never loud."] },
  { time: "20:30", keyword: "citas", mood: "dusk", es: ["Para una cita.", "Cálido y cercano."], en: ["For a date.", "Warm and close."] },
  { time: "23:00", keyword: "noche", mood: "night", es: ["La noche es tuya.", "Intenso."], en: ["The night is yours.", "Intense."] },
];

// Puntos del frasco (fracciones del recorte) a los que apuntan las líneas.
const ALP70_ANCHORS = [
  { x: 0.40, y: 0.05 },
  { x: 0.13, y: 0.40 },
  { x: 0.2, y: 0.86 },
];

const ALP70_NOZZLE = { x: 0.47, y: 0.045 };

const alp70 = {
  film: null,
  stage: null,
  bottle: null,
  bottleImg: null,
  canvas: null,
  ctx: null,
  lines: null,
  els: {},
  hero: null,
  progress: 0,
  target: 0,
  applied: -1,
  raf: 0,
  running: false,
  visible: true,
  paused: false,
  staticMode: false,
  mobile: false,
  dpr: 1,
  size: { w: 0, h: 0 },
  time: 0,
  lastTs: 0,
  dust: [],
  mist: [],
  word: [],
  wordReady: false,
  observer: null,
  listeners: [],
  pointer: { x: 0, y: 0, tx: 0, ty: 0 },
};

function alp70L(es, en)
{
  return typeof state !== "undefined" && state?.language === "en" ? en : es;
}

function alp70Clamp(value, min = 0, max = 1)
{
  return Math.min(max, Math.max(min, value));
}

function alp70Range(p, a, b)
{
  return alp70Clamp((p - a) / (b - a));
}

function alp70Smooth(t)
{
  return t * t * (3 - 2 * t);
}

function alp70EaseOut(t)
{
  return 1 - Math.pow(1 - t, 3);
}

function alp70Lerp(a, b, t)
{
  return a + (b - a) * t;
}

// Opacidad de una escena: entra, se mantiene y sale. La primera escena arranca
// visible y la última queda visible al final.
function alp70SceneOpacity(p, start, end, options = {})
{
  const span = end - start;
  const fade = Math.min(0.045, span * 0.3);
  const fadeIn = options.keepStart ? 1 : alp70Range(p, start, start + fade);
  const fadeOut = options.keepEnd ? 1 : 1 - alp70Range(p, end - fade, end);
  return alp70Smooth(Math.min(fadeIn, fadeOut));
}

function alp70Seed(i)
{
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function alp70Esc(value)
{
  return typeof escapeHtml === "function"
    ? escapeHtml(value)
    : String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function alp70Attr(value)
{
  return typeof escapeAttribute === "function" ? escapeAttribute(value) : alp70Esc(value);
}

function alp70Norm(value)
{
  return typeof normalizeText === "function"
    ? normalizeText(value)
    : String(value || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function alp70StorageGet(key)
{
  try
  {
    return typeof alp66StorageGet === "function" ? alp66StorageGet(key) : window.localStorage.getItem(key);
  }
  catch (_)
  {
    return null;
  }
}

function alp70StorageSet(key, value)
{
  try
  {
    if (typeof alp66StorageSet === "function") alp66StorageSet(key, value);
    else window.localStorage.setItem(key, value);
  }
  catch (_)
  {
    // Sin almacenamiento: la preferencia vale solo para esta visita.
  }
}

function alp70Products()
{
  return Array.isArray(state?.products) ? state.products : [];
}


// ---------------------------------------------------------------------------
// Datos reales del catálogo
// ---------------------------------------------------------------------------

function alp70HeroProduct()
{
  const byId = typeof getProductById === "function" ? getProductById(ALP70_HERO.id) : null;
  if (byId && alp70Norm(byId.nombre).includes(ALP70_HERO.match)) return byId;

  const matches = alp70Products().filter(product => alp70Norm(product?.nombre).includes(ALP70_HERO.match));
  return matches.sort((a, b) => Number(b.ml || 0) - Number(a.ml || 0))[0] || null;
}

function alp70Field(product, field)
{
  const raw = typeof localizedField === "function" ? localizedField(product, field) : product?.[field];
  const text = Array.isArray(raw) ? raw.filter(Boolean).join(", ") : String(raw || "").trim();
  if (text && !/^consultar$/i.test(text)) return text;
  return state?.language === "en" ? "" : ALP70_HERO.fallback[field] || "";
}

function alp70Capitalize(text)
{
  const value = String(text || "").trim();
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}

function alp70FirstSentence(text)
{
  const value = String(text || "").trim();
  const end = value.indexOf(".");
  return end > 40 ? value.slice(0, end + 1) : value;
}

function alp70CleanLevel(text)
{
  return String(text || "").replace(/\s*\(orientativa\)\s*/i, "").trim();
}

function alp70FirstNote(text)
{
  return String(text || "").split(/,|\sy\s|\sand\s/i)[0].trim();
}

function alp70HeroData(product)
{
  const notes = {
    salida: alp70Field(product, "salida"),
    corazon: alp70Field(product, "corazon"),
    fondo: alp70Field(product, "fondo"),
  };
  const occasions = (typeof arrayFromDb === "function" ? arrayFromDb(product.ocasiones) : product.ocasiones || [])
    .map(item => alp70Norm(item))
    .filter(key => ALP70_OCCASIONS[key]);
  const ordered = [...new Set(occasions)]
    .sort((a, b) => ALP70_OCCASIONS[a].order - ALP70_OCCASIONS[b].order)
    .slice(0, 3);
  const seasons = (typeof arrayFromDb === "function" ? arrayFromDb(product.estaciones) : product.estaciones || []).filter(Boolean);

  return {
    product,
    id: Number(product.id),
    price: typeof money === "function" ? money(product.precio) : String(product.precio),
    ml: Number(product.ml || 0),
    stock: Number(product.stock || 0),
    gender: String(product.genero || ""),
    family: alp70Capitalize(alp70Field(product, "familia")),
    description: alp70FirstSentence(alp70Field(product, "descripcion")),
    notes,
    words: [notes.salida, notes.corazon, notes.fondo].map(alp70FirstNote).filter(Boolean),
    longevity: alp70CleanLevel(alp70Field(product, "duracion")),
    projection: alp70CleanLevel(alp70Field(product, "proyeccion")),
    occasions: ordered.length ? ordered : ["citas", "noche", "fiesta"],
    seasons,
  };
}

function alp70ProductText(product)
{
  if (typeof catalogProductText === "function")
  {
    try
    {
      return catalogProductText(product);
    }
    catch (_) {}
  }

  return alp70Norm([
    product?.nombre,
    product?.familia,
    ...(Array.isArray(product?.ocasiones) ? product.ocasiones : []),
    ...(Array.isArray(product?.estaciones) ? product.estaciones : []),
  ].join(" "));
}

function alp70CountKeyword(keyword)
{
  return alp70Products().filter(product => alp70ProductText(product).includes(keyword)).length;
}

// ---------------------------------------------------------------------------
// Ilustraciones de las notas (SVG propio)
// ---------------------------------------------------------------------------

function alp70IngredientsSvg()
{
  return `
    <svg class="alp70-ing alp70-ing-plum" viewBox="0 0 120 120" role="presentation" focusable="false">
      <defs>
        <radialGradient id="alp70Plum" cx=".36" cy=".32" r=".75">
          <stop offset="0" stop-color="#b56aa8"/>
          <stop offset=".35" stop-color="#5c2357"/>
          <stop offset="1" stop-color="#1c0820"/>
        </radialGradient>
      </defs>
      <path d="M60 22c-4-10 2-16 8-18" stroke="#6b4a2a" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M66 14c14-10 32-6 36 4-14 8-28 6-36-4Z" fill="#4f6b2e"/>
      <circle cx="58" cy="68" r="46" fill="url(#alp70Plum)"/>
      <path d="M58 24c-8 16-8 60 0 90" stroke="#140617" stroke-opacity=".45" stroke-width="2" fill="none"/>
      <ellipse cx="40" cy="48" rx="12" ry="7" fill="#fff" opacity=".18" transform="rotate(-30 40 48)"/>
    </svg>
    <svg class="alp70-ing alp70-ing-cinnamon" viewBox="0 0 170 70" role="presentation" focusable="false">
      <defs>
        <linearGradient id="alp70Cinnamon" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#c47a3e"/>
          <stop offset=".55" stop-color="#7a3f17"/>
          <stop offset="1" stop-color="#4a230b"/>
        </linearGradient>
      </defs>
      <g transform="rotate(-8 85 35)">
        <rect x="8" y="14" width="150" height="20" rx="10" fill="url(#alp70Cinnamon)"/>
        <ellipse cx="152" cy="24" rx="7" ry="10" fill="#9a5a2a"/>
        <path d="M152 18c-4 3-4 9 0 12" stroke="#3a1a06" stroke-width="1.6" fill="none"/>
        <rect x="16" y="36" width="140" height="18" rx="9" fill="url(#alp70Cinnamon)"/>
        <ellipse cx="150" cy="45" rx="6" ry="9" fill="#9a5a2a"/>
        <path d="M30 20h110M34 42h100" stroke="#e3a467" stroke-opacity=".35" stroke-width="1.4"/>
      </g>
    </svg>
    <svg class="alp70-ing alp70-ing-lavender" viewBox="0 0 70 180" role="presentation" focusable="false">
      <path d="M36 176C34 120 33 70 35 20" stroke="#5f7d47" stroke-width="3" fill="none" stroke-linecap="round"/>
      <g fill="#9b7fd6">
        <ellipse cx="35" cy="18" rx="5" ry="8"/>
        <ellipse cx="28" cy="30" rx="5" ry="8" transform="rotate(-20 28 30)"/>
        <ellipse cx="42" cy="34" rx="5" ry="8" transform="rotate(20 42 34)"/>
        <ellipse cx="29" cy="46" rx="5.5" ry="8" transform="rotate(-20 29 46)"/>
        <ellipse cx="42" cy="50" rx="5.5" ry="8" transform="rotate(20 42 50)"/>
        <ellipse cx="30" cy="63" rx="5.5" ry="8.5" transform="rotate(-20 30 63)"/>
        <ellipse cx="41" cy="67" rx="5.5" ry="8.5" transform="rotate(20 41 67)"/>
        <ellipse cx="31" cy="80" rx="5" ry="8" transform="rotate(-18 31 80)" fill="#7d60bd"/>
        <ellipse cx="40" cy="84" rx="5" ry="8" transform="rotate(18 40 84)" fill="#7d60bd"/>
      </g>
    </svg>
    <svg class="alp70-ing alp70-ing-tonka" viewBox="0 0 120 70" role="presentation" focusable="false">
      <defs>
        <linearGradient id="alp70Tonka" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#6b4430"/>
          <stop offset="1" stop-color="#1f120b"/>
        </linearGradient>
      </defs>
      <g fill="url(#alp70Tonka)">
        <ellipse cx="38" cy="30" rx="32" ry="12" transform="rotate(-14 38 30)"/>
        <ellipse cx="78" cy="46" rx="30" ry="11" transform="rotate(10 78 46)"/>
      </g>
      <path d="M14 34c10-4 22-8 44-12M52 44c12 2 26 4 46 8" stroke="#a87a5a" stroke-opacity=".35" stroke-width="1.4" fill="none"/>
    </svg>
  `;
}

// ---------------------------------------------------------------------------
// Markup de la película
// ---------------------------------------------------------------------------

function alp70RenderFilm(product)
{
  const hero = alp70HeroData(product);
  alp70.hero = hero;
  const out = hero.stock <= 0;
  const g5 = alp70L("Inspiración G5", "G5 inspiration");
  const sizeLine = hero.ml ? `${hero.ml} ml` : "";
  const legal = alp70L(
    "Inspiración G5 de la fragancia de Jean Paul Gaultier. No es el producto original.",
    "G5 inspiration of the Jean Paul Gaultier fragrance. Not the original product."
  );
  const pyramid = [
    {
      field: "salida",
      title: alp70L("Salida", "Top notes"),
      text: alp70L("Lo primero que sentís al aplicarlo.", "What you notice first."),
    },
    {
      field: "corazon",
      title: alp70L("Corazón", "Heart"),
      text: alp70L("Aparece a los pocos minutos y le da carácter.", "It opens up after a few minutes."),
    },
    {
      field: "fondo",
      title: alp70L("Fondo", "Base"),
      text: alp70L("Lo que queda en la piel al final del día.", "What stays on the skin at the end of the day."),
    },
  ];
  const buyButtons = (secondaryLabel) => `
    <div class="alp70-actions">
      <button class="alp70-btn" type="button" data-action="add-product" data-product-id="${hero.id}" ${out ? "disabled" : ""}>
        ${alp70Esc(out ? alp70L("Sin stock", "Out of stock") : alp70L("Agregar al carrito", "Add to cart"))}
      </button>
      <button class="alp70-btn ghost" type="button" data-route="product" data-product-id="${hero.id}">${alp70Esc(secondaryLabel)}</button>
    </div>
  `;
  const priceBlock = `
    <div class="alp70-price">
      <strong data-alp70-price>${alp70Esc(hero.price)}</strong>
      <span>${alp70Esc([sizeLine, out ? alp70L("Sin stock", "Out of stock") : alp70L("En stock", "In stock")].filter(Boolean).join(" · "))}</span>
    </div>
  `;

  return `
    <section class="alp70-film" id="alp70Film" aria-label="${alp70Attr(`${ALP70_HERO.title} ${ALP70_HERO.titleEm} · ${g5}`)}">
      <div class="alp70-stage" id="alp70Stage">
        <div class="alp70-bg" aria-hidden="true">
          <div class="alp70-glow alp70-glow-base"></div>
          <div class="alp70-glow alp70-glow-morning"></div>
          <div class="alp70-glow alp70-glow-dusk"></div>
          <div class="alp70-glow alp70-glow-night"></div>
          <div class="alp70-beam"></div>
          <div class="alp70-floor"></div>
          <div class="alp70-haze"></div>
        </div>

        <div class="alp70-notes" aria-hidden="true">
          ${hero.words.map((note, index) => `<span class="alp70-note alp70-note-${index}">${alp70Esc(note.toUpperCase())}</span>`).join("")}
        </div>

        <div class="alp70-ingredients" aria-hidden="true">${alp70IngredientsSvg()}</div>

        <div class="alp70-bottle" id="alp70Bottle" aria-hidden="true">
          <div class="alp70-bottle-float">
            <span class="alp70-bottle-halo"></span>
            <img class="alp70-bottle-img" src="${alp70Attr(ALP70_HERO_IMAGE)}" alt="" width="273" height="610" decoding="async" fetchpriority="high">
            <img class="alp70-bottle-reflect" src="${alp70Attr(ALP70_HERO_IMAGE)}" alt="" width="273" height="610" decoding="async">
          </div>
        </div>

        <canvas class="alp70-canvas" id="alp70Canvas" aria-hidden="true"></canvas>
        <svg class="alp70-lines" id="alp70Lines" aria-hidden="true"></svg>

        <div class="alp70-scene alp70-s-intro" data-scene="intro">
          <p class="alp70-eyebrow"><span class="alp70-tag">${alp70Esc(g5)}</span>${hero.gender ? ` · ${alp70Esc(hero.gender)}` : ""}</p>
          <h1 class="alp70-display">
            <span class="alp70-line"><span>${alp70Esc(ALP70_HERO.title)}</span></span>
            <span class="alp70-line"><em>${alp70Esc(ALP70_HERO.titleEm)}</em></span>
          </h1>
          <p class="alp70-lead" data-alp70-field="description">${alp70Esc(hero.description)}</p>
          ${priceBlock}
          ${buyButtons(alp70L("Ver ficha", "View details"))}
          <p class="alp70-legal">${alp70Esc(legal)}</p>
        </div>

        <div class="alp70-scene alp70-s-anatomy" data-scene="anatomy">
          <p class="alp70-eyebrow alp70-corner">${alp70Esc(alp70L("Pirámide olfativa", "Fragrance pyramid"))}${hero.family ? ` · ${alp70Esc(hero.family)}` : ""}</p>
          <ol class="alp70-callouts">
            ${pyramid.map((item, index) => `
              <li class="alp70-callout" data-index="${index}">
                <small>${alp70Esc(item.title)}</small>
                <strong data-alp70-field="${item.field}">${alp70Esc(alp70Capitalize(hero.notes[item.field]))}</strong>
                <span>${alp70Esc(item.text)}</span>
              </li>
            `).join("")}
          </ol>
        </div>

        <div class="alp70-scene alp70-s-mist" data-scene="mist">
          <h2 class="alp70-display alp70-display-sm">
            <span class="alp70-line"><span>${alp70Esc(alp70L("Un disparo.", "One spray."))}</span></span>
            <span class="alp70-line"><em>${alp70Esc(alp70L("Una estela.", "A trail."))}</em></span>
          </h2>
          <div class="alp70-levels">
            <div><span>${alp70Esc(alp70L("Duración", "Longevity"))}</span><strong data-alp70-field="longevity">${alp70Esc(hero.longevity || alp70L("Consultar", "Ask us"))}</strong></div>
            <div><span>${alp70Esc(alp70L("Proyección", "Projection"))}</span><strong data-alp70-field="projection">${alp70Esc(hero.projection || alp70L("Consultar", "Ask us"))}</strong></div>
          </div>
          <p class="alp70-footnote">${alp70Esc(alp70L("Valores orientativos: dependen de la piel y del clima.", "Approximate values: they depend on skin and weather."))}</p>
          <button class="alp70-link" type="button" data-route="decants">${alp70Esc(alp70L("Probalo primero en decant", "Try it first as a decant"))} <span aria-hidden="true">→</span></button>
        </div>

        <div class="alp70-scene alp70-s-moments" data-scene="moments">
          <p class="alp70-eyebrow alp70-corner">${alp70Esc(alp70L("Cuándo usarlo", "When to wear it"))}${hero.seasons.length ? ` · ${alp70Esc(hero.seasons.join(alp70L(" y ", " & ")))}` : ""}</p>
          ${hero.occasions.map((key, index) => {
            const occasion = ALP70_OCCASIONS[key];
            const [title, em] = alp70L(occasion.es, occasion.en);
            return `
              <article class="alp70-moment" data-moment="${index}" data-mood="${occasion.mood}">
                <p class="alp70-time">${alp70Esc(occasion.time)}</p>
                <h2 class="alp70-display alp70-display-sm">
                  <span class="alp70-line"><span>${alp70Esc(title)}</span></span>
                  <span class="alp70-line"><em>${alp70Esc(em)}</em></span>
                </h2>
              </article>
            `;
          }).join("")}
        </div>

        <div class="alp70-scene alp70-s-brand" data-scene="brand">
          <h2 class="alp70-wordmark" id="alp70Wordmark">
            <span class="alp70-wordmark-text">${alp70Esc(ALP70_HERO.word)}</span>
            <small>${alp70Esc(`${ALP70_HERO.title} ${ALP70_HERO.titleEm.split(" ")[0]} · ${g5}`.toUpperCase())}</small>
          </h2>
          ${priceBlock}
          ${buyButtons(alp70L("Ver ficha completa", "Full details"))}
          <button class="alp70-link alp70-continue" type="button" data-alp70="skip">${alp70Esc(alp70L("Seguir a la tienda", "Continue to the store"))} <span aria-hidden="true">↓</span></button>
        </div>

        <nav class="alp70-dots" aria-label="${alp70Attr(alp70L("Escenas", "Scenes"))}">
          ${ALP70_SCENES.map((scene, index) => `
            <button type="button" data-alp70="scene" data-index="${index}" aria-label="${alp70Attr(alp70L(scene.es, scene.en))}"><span></span></button>
          `).join("")}
        </nav>

        <button class="alp70-skip" type="button" data-alp70="skip">
          ${alp70Esc(alp70L("Ir a la tienda", "Go to the store"))} <span aria-hidden="true">↓</span>
        </button>

        <button class="alp70-pause" type="button" data-alp70="pause" aria-pressed="false">
          <span class="alp70-pause-icon" aria-hidden="true"></span>
          <span class="alp70-pause-label">${alp70Esc(alp70L("Pausar animación", "Pause motion"))}</span>
        </button>

        <div class="alp70-hint" aria-hidden="true"><span>${alp70Esc(alp70L("Deslizá", "Scroll"))}</span><i></i></div>
      </div>

      <div class="alp70-static">
        <div class="alp70-static-grid">
          <div>
            <p class="alp70-eyebrow">${alp70Esc(alp70L("Pirámide olfativa", "Fragrance pyramid"))}</p>
            <ol class="alp70-static-list">
              ${pyramid.map(item => `<li><span>${alp70Esc(item.title)}</span><strong data-alp70-field="${item.field}">${alp70Esc(alp70Capitalize(hero.notes[item.field]))}</strong></li>`).join("")}
            </ol>
          </div>
          <div>
            <p class="alp70-eyebrow">${alp70Esc(alp70L("Duración y estela", "Longevity and trail"))}</p>
            <ol class="alp70-static-list">
              <li><span>${alp70Esc(alp70L("Duración", "Longevity"))}</span><strong data-alp70-field="longevity">${alp70Esc(hero.longevity || "—")}</strong></li>
              <li><span>${alp70Esc(alp70L("Proyección", "Projection"))}</span><strong data-alp70-field="projection">${alp70Esc(hero.projection || "—")}</strong></li>
            </ol>
          </div>
        </div>
      </div>
    </section>
  `;
}

// Cuando llega el detalle del producto (notas, descripción, duración) se
// actualizan los textos sin volver a armar la película.
function alp70RefreshHeroFields()
{
  const film = alp70.film;
  const product = alp70.hero?.product;
  if (!film || !product) return;
  const hero = alp70HeroData(product);
  alp70.hero = hero;
  const values = {
    description: hero.description,
    salida: alp70Capitalize(hero.notes.salida),
    corazon: alp70Capitalize(hero.notes.corazon),
    fondo: alp70Capitalize(hero.notes.fondo),
    longevity: hero.longevity,
    projection: hero.projection,
  };
  film.querySelectorAll("[data-alp70-field]").forEach(node =>
  {
    const value = values[node.dataset.alp70Field];
    if (value && node.textContent !== value) node.textContent = value;
  });
  film.querySelectorAll(".alp70-note").forEach((node, index) =>
  {
    const word = hero.words[index];
    if (word) node.textContent = word.toUpperCase();
  });
}

function alp70LoadHeroDetail()
{
  const product = alp70.hero?.product;
  if (!product || product.salida || typeof loadProductDetailFields !== "function") return;
  Promise.resolve(loadProductDetailFields(product.id))
    .then(() => alp70RefreshHeroFields())
    .catch(() => {});
}

// Sección "Un perfume para cada hora" para la home (debajo de la película).
function alp70RenderDayMoments()
{
  const cards = ALP70_DAY_MOMENTS
    .map(moment => ({ ...moment, copy: alp70L(moment.es, moment.en), count: alp70CountKeyword(moment.keyword) }))
    .filter(moment => moment.count > 0);

  if (!cards.length) return "";

  return `
    <section class="section alp70-day">
      <div class="container">
        <div class="section-title-row">
          <div>
            <p class="eyebrow">${alp70Esc(alp70L("Un perfume para cada hora", "A scent for every hour"))}</p>
            <h2 class="section-title">${alp70Esc(alp70L("¿Para cuándo lo buscás?", "When will you wear it?"))}</h2>
          </div>
        </div>
        <div class="alp70-day-grid">
          ${cards.map(moment => `
            <button class="alp70-day-card" type="button" data-alp70="moment" data-keyword="${alp70Attr(moment.keyword)}" data-mood="${moment.mood}">
              <span class="alp70-day-time">${alp70Esc(moment.time)}</span>
              <strong>${alp70Esc(moment.copy[0])}</strong>
              <em>${alp70Esc(moment.copy[1])}</em>
              <span class="alp70-day-link">${alp70Esc(alp70L(`Ver ${moment.count} fragancias`, `See ${moment.count} fragrances`))} <span aria-hidden="true">→</span></span>
            </button>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}

// ---------------------------------------------------------------------------
// Movimiento
// ---------------------------------------------------------------------------

// Posición del frasco a lo largo de la película: x/y en vw/vh.
const ALP70_BOTTLE_PATH = {
  desktop: [
    { p: 0, x: 0, y: 0, s: 1, r: -4 },
    { p: 0.14, x: 0, y: 0, s: 1, r: -1 },
    { p: 0.22, x: 2, y: 1, s: 1.04, r: 0 },
    { p: 0.36, x: 2, y: 1, s: 1.04, r: 0 },
    { p: 0.46, x: 4, y: 0, s: 0.98, r: 0 },
    { p: 0.56, x: 2, y: 0, s: 0.96, r: 0 },
    { p: 0.76, x: 2, y: 0, s: 0.96, r: 0 },
    { p: 0.9, x: 6, y: 1, s: 0.96, r: 0 },
    { p: 1, x: 6, y: 1, s: 0.96, r: 0 },
  ],
  mobile: [
    { p: 0, x: 22, y: 16, s: 0.82, r: -4 },
    { p: 0.14, x: 22, y: 16, s: 0.82, r: -1 },
    { p: 0.22, x: 24, y: -4, s: 1, r: 0 },
    { p: 0.36, x: 24, y: -4, s: 1, r: 0 },
    { p: 0.46, x: 12, y: 18, s: 0.78, r: 0 },
    { p: 0.56, x: 0, y: 10, s: 0.86, r: 0 },
    { p: 0.76, x: 0, y: 10, s: 0.86, r: 0 },
    { p: 0.88, x: 22, y: 16, s: 0.78, r: 0 },
    { p: 1, x: 22, y: 16, s: 0.78, r: 0 },
  ],
};

function alp70BottleAt(p)
{
  const path = ALP70_BOTTLE_PATH[alp70.mobile ? "mobile" : "desktop"];
  let index = 0;
  while (index < path.length - 2 && p > path[index + 1].p) index += 1;
  const a = path[index];
  const b = path[index + 1];
  const t = alp70Smooth(alp70Range(p, a.p, b.p));
  return {
    x: alp70Lerp(a.x, b.x, t),
    y: alp70Lerp(a.y, b.y, t),
    s: alp70Lerp(a.s, b.s, t),
    r: alp70Lerp(a.r, b.r, t),
  };
}

function alp70ReadProgress()
{
  const film = alp70.film;
  if (!film) return 0;
  const rect = film.getBoundingClientRect();
  const stageHeight = alp70.stage?.offsetHeight || window.innerHeight;
  const travel = Math.max(1, film.offsetHeight - stageHeight);
  const top = alp70HeaderOffset();
  return alp70Clamp((top - rect.top) / travel);
}

function alp70HeaderOffset()
{
  const header = document.querySelector(".site-header");
  return header ? Math.round(header.getBoundingClientRect().height) : 0;
}

function alp70Resize()
{
  if (!alp70.stage || !alp70.canvas) return;
  alp70.mobile = window.matchMedia("(max-width: 760px)").matches;
  alp70.film.style.setProperty("--alp70-top", `${alp70HeaderOffset()}px`);

  const rect = alp70.stage.getBoundingClientRect();
  alp70.size = { w: rect.width, h: rect.height };
  alp70.dpr = Math.min(window.devicePixelRatio || 1, alp70.mobile ? 1.5 : 2);
  alp70.canvas.width = Math.round(rect.width * alp70.dpr);
  alp70.canvas.height = Math.round(rect.height * alp70.dpr);
  alp70.lines?.setAttribute("viewBox", `0 0 ${Math.round(rect.width)} ${Math.round(rect.height)}`);

  alp70BuildParticles();
  alp70.wordReady = false;
  alp70BuildWordmark();
  alp70Tick(performance.now(), true);
}

function alp70BuildParticles()
{
  const dustCount = alp70.mobile ? 34 : 70;
  alp70.dust = Array.from({ length: dustCount }, (_, i) => ({
    x: alp70Seed(i + 1),
    y: alp70Seed(i + 101),
    r: 0.6 + alp70Seed(i + 201) * 1.6,
    speed: 0.006 + alp70Seed(i + 301) * 0.018,
    phase: alp70Seed(i + 401) * Math.PI * 2,
  }));

  const mistCount = alp70.mobile ? 360 : 760;
  alp70.mist = Array.from({ length: mistCount }, (_, i) => ({
    angle: -2.62 + (alp70Seed(i + 501) - 0.5) * 0.95,
    speed: 0.35 + alp70Seed(i + 601) * 0.65,
    birth: alp70Seed(i + 701) * 0.42,
    life: 0.35 + alp70Seed(i + 801) * 0.4,
    size: 0.35 + alp70Seed(i + 901) * 1.25,
    wobble: alp70Seed(i + 1001) * Math.PI * 2,
  }));
}

// Muestrea la palabra AROMA con la tipografía de la película y guarda los
// puntos destino de cada partícula.
function alp70BuildWordmark()
{
  const target = document.querySelector("#alp70Wordmark .alp70-wordmark-text");
  if (!target || !alp70.stage) return;

  const stageRect = alp70.stage.getBoundingClientRect();
  const rect = target.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const style = window.getComputedStyle(target);
  const w = Math.ceil(rect.width);
  const h = Math.ceil(rect.height);
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const octx = off.getContext("2d", { willReadFrequently: true });
  if (!octx) return;

  octx.fillStyle = "#fff";
  octx.textBaseline = "middle";
  octx.textAlign = "left";
  octx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  if ("letterSpacing" in octx) octx.letterSpacing = style.letterSpacing;
  octx.fillText(target.textContent || "AROMA", 0, h / 2);

  const pixels = octx.getImageData(0, 0, w, h).data;
  const step = alp70.mobile ? 2 : Math.max(2, Math.round(w / 300));
  const points = [];

  for (let y = 0; y < h; y += step)
  {
    for (let x = 0; x < w; x += step)
    {
      if (pixels[(y * w + x) * 4 + 3] > 140)
      {
        points.push({ x: rect.left - stageRect.left + x, y: rect.top - stageRect.top + y });
      }
    }
  }

  const max = alp70.mobile ? 1100 : 2600;
  const stride = Math.max(1, Math.ceil(points.length / max));
  alp70.word = points
    .filter((_, i) => i % stride === 0)
    .map((point, i) => ({
      tx: point.x,
      ty: point.y,
      sx: alp70Seed(i + 1201),
      sy: alp70Seed(i + 1301),
      delay: alp70Seed(i + 1401) * 0.35,
      size: 0.9 + alp70Seed(i + 1501) * 1.2,
      tw: alp70Seed(i + 1601) * Math.PI * 2,
    }));
  alp70.wordReady = alp70.word.length > 0;
}

function alp70ImagePoint(fx, fy)
{
  const img = alp70.bottleImg;
  const stage = alp70.stage;
  if (!img || !stage) return { x: 0, y: 0 };
  const rect = img.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  return {
    x: rect.left - stageRect.left + rect.width * fx,
    y: rect.top - stageRect.top + rect.height * fy,
  };
}

function alp70Nozzle()
{
  return alp70ImagePoint(ALP70_NOZZLE.x, ALP70_NOZZLE.y);
}

function alp70Anchors()
{
  return ALP70_ANCHORS.map(anchor => alp70ImagePoint(anchor.x, anchor.y));
}

function alp70DrawLines(p)
{
  const svg = alp70.lines;
  if (!svg) return;
  const local = alp70Range(p, 0.2, 0.34);
  const visible = alp70SceneOpacity(p, 0.15, 0.38);

  svg.style.opacity = visible.toFixed(3);
  if (visible <= 0.001) return;

  const anchors = alp70Anchors();
  const callouts = alp70.els.callouts || [];
  const list = callouts[0]?.parentElement;
  if (!list || anchors.length < callouts.length) return;

  // Cada texto se alinea a la altura de su punto en el frasco, sin pisarse.
  const heights = callouts.map(callout => callout.offsetHeight);
  const titles = callouts.map(callout => callout.querySelector("strong"));
  const centers = titles.map(title => (title ? title.offsetTop + title.offsetHeight / 2 : 12));
  const gap = alp70.mobile ? 12 : 20;
  const tops = anchors.slice(0, callouts.length).map((anchor, index) => anchor.y - centers[index]);

  for (let i = 1; i < tops.length; i += 1)
  {
    tops[i] = Math.max(tops[i], tops[i - 1] + heights[i - 1] + gap);
  }

  const last = tops.length - 1;
  const limit = alp70.size.h - (alp70.mobile ? 72 : 100);
  const overflow = tops[last] + heights[last] - limit;
  if (overflow > 0) tops.forEach((_, i) => { tops[i] -= overflow; });
  const underflow = (alp70.mobile ? 14 : 24) - tops[0];
  if (underflow > 0) tops.forEach((_, i) => { tops[i] += underflow; });

  const baseX = list.offsetLeft;

  // Los trazos se crean una sola vez y después solo cambian sus atributos:
  // reescribir el SVG en cada cuadro dispararía los observadores del DOM.
  if (svg.childElementCount !== callouts.length * 2)
  {
    svg.innerHTML = callouts.map(() => '<path pathLength="1"/><circle r="0"/>').join("");
  }
  const shapes = svg.children;

  callouts.forEach((callout, index) =>
  {
    const anchor = anchors[index];
    const reveal = alp70Smooth(alp70Range(local, index * 0.18, index * 0.18 + 0.4));
    const lift = (1 - reveal) * 10;
    callout.style.top = `${tops[index].toFixed(1)}px`;
    callout.style.opacity = String(reveal);
    callout.style.transform = `translateY(${lift.toFixed(1)}px)`;

    const sx = baseX + (titles[index]?.offsetWidth || 0) + 14;
    const sy = tops[index] + centers[index] + lift;
    const elbow = Math.max(sx + 16, Math.min(anchor.x - 30, sx + (anchor.x - sx) * 0.45));
    const d = `M${sx.toFixed(1)} ${sy.toFixed(1)} H${elbow.toFixed(1)} L${(anchor.x - 16).toFixed(1)} ${anchor.y.toFixed(1)} H${anchor.x.toFixed(1)}`;
    const path = shapes[index * 2];
    const dot = shapes[index * 2 + 1];
    path.setAttribute("d", d);
    path.style.strokeDashoffset = (1 - reveal).toFixed(3);
    dot.setAttribute("cx", anchor.x.toFixed(1));
    dot.setAttribute("cy", anchor.y.toFixed(1));
    dot.setAttribute("r", (3.4 * reveal).toFixed(2));
  });

}

function alp70DrawCanvas(p)
{
  const ctx = alp70.ctx;
  if (!ctx) return;
  const { w, h } = alp70.size;
  const dpr = alp70.dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.globalCompositeOperation = "lighter";

  // Polvo dorado de ambiente (se congela con "Pausar animación").
  const dustAlpha = 0.35 + 0.65 * (1 - alp70Range(p, 0.7, 0.85));
  ctx.fillStyle = "#ffd89a";
  alp70.dust.forEach(dot =>
  {
    const y = ((dot.y - alp70.time * dot.speed) % 1 + 1) % 1;
    const x = dot.x + Math.sin(alp70.time * 0.5 + dot.phase) * 0.01;
    const twinkle = 0.25 + 0.75 * Math.abs(Math.sin(alp70.time * 0.9 + dot.phase));
    ctx.globalAlpha = 0.5 * twinkle * dustAlpha;
    ctx.beginPath();
    ctx.arc(x * w, y * h, dot.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Bruma del atomizador: depende solo del scroll, así se puede ir y volver.
  const m = alp70Range(p, 0.37, 0.5);
  const mistFade = 1 - alp70Range(p, 0.5, 0.56);
  if (m > 0 && mistFade > 0)
  {
    const nozzle = alp70Nozzle();
    const reach = Math.max(w, h) * (alp70.mobile ? 0.12 : 0.48);
    // En el celular el texto va arriba: la bruma sube en vez de ir a la izquierda.
    const turn = alp70.mobile ? 1.0 : 0;
    alp70.mist.forEach(dot =>
    {
      const age = (m - dot.birth) / dot.life;
      if (age <= 0 || age >= 1) return;
      const angle = dot.angle + turn;
      const dist = alp70EaseOut(age) * dot.speed * reach;
      const spread = Math.sin(dot.wobble + age * 4) * 18 * age;
      const x = nozzle.x + Math.cos(angle) * dist + Math.sin(angle) * spread;
      const y = nozzle.y + Math.sin(angle) * dist - age * 26;
      ctx.globalAlpha = Math.sin(Math.PI * age) * (0.75 - age * 0.4) * mistFade;
      ctx.fillStyle = dot.size > 1.25 ? "#e9dcff" : "#fff3dd";
      ctx.beginPath();
      ctx.arc(x, y, dot.size * (1 + age * 2.2), 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // La marca se arma con partículas que salen del frasco.
  const wf = alp70Range(p, 0.78, 0.94);
  if (wf > 0 && alp70.wordReady)
  {
    const nozzle = alp70Nozzle();
    alp70.word.forEach(dot =>
    {
      const t = alp70EaseOut(alp70Range(wf, dot.delay, dot.delay + 0.65));
      if (t <= 0) return;
      const startX = nozzle.x + (dot.sx - 0.5) * w * 0.5;
      const startY = nozzle.y + (dot.sy - 0.5) * h * 0.6;
      const x = alp70Lerp(startX, dot.tx, t);
      const y = alp70Lerp(startY, dot.ty, t);
      const twinkle = alp70.paused ? 1 : 0.7 + 0.3 * Math.sin(alp70.time * 3 + dot.tw);
      ctx.globalAlpha = (0.35 + 0.65 * t) * twinkle;
      ctx.fillStyle = dot.sx > 0.82 ? "#ffffff" : "#f4d9a0";
      ctx.fillRect(x, y, dot.size, dot.size);
    });
  }

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

function alp70Apply(p)
{
  const els = alp70.els;
  const film = alp70.film;
  if (!film) return;

  // Escenas
  els.scenes.forEach((scene, index) =>
  {
    const def = ALP70_SCENES[index];
    const opacity = alp70SceneOpacity(p, def.start, def.end, { keepStart: index === 0, keepEnd: index === ALP70_SCENES.length - 1 });
    scene.style.opacity = opacity.toFixed(3);
    scene.style.visibility = opacity < 0.02 ? "hidden" : "visible";
    // La anatomía no se desplaza: sus líneas tienen que coincidir con el texto.
    const shift = index === 0 ? alp70Range(p, 0.08, 0.17) * -40 : index === 1 ? 0 : (1 - opacity) * 24;
    scene.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0)`;
  });

  // Momentos del día
  const moods = { morning: 0, dusk: 0, night: 0 };
  els.moments.forEach((moment, index) =>
  {
    const [start, end] = ALP70_MOMENT_RANGES[index] || ALP70_MOMENT_RANGES[ALP70_MOMENT_RANGES.length - 1];
    const opacity = alp70SceneOpacity(p, start, end);
    moment.style.opacity = opacity.toFixed(3);
    moment.style.visibility = opacity < 0.02 ? "hidden" : "visible";
    moment.style.transform = `translate3d(0, ${((1 - opacity) * 18).toFixed(1)}px, 0)`;
    const mood = moment.dataset.mood;
    if (mood in moods) moods[mood] = Math.max(moods[mood], opacity);
  });

  // Luz de fondo según el momento
  els.glowMorning.style.opacity = moods.morning.toFixed(3);
  els.glowDusk.style.opacity = moods.dusk.toFixed(3);
  els.glowNight.style.opacity = moods.night.toFixed(3);
  els.haze.style.opacity = (alp70Range(p, 0.38, 0.47) * (1 - alp70Range(p, 0.5, 0.58)) * 0.9).toFixed(3);

  // Notas gigantes detrás del frasco
  const notesFade = 1 - alp70Range(p, 0.1, 0.19);
  els.notes.style.opacity = notesFade.toFixed(3);
  els.noteItems.forEach((note, index) =>
  {
    const dir = index % 2 === 0 ? -1 : 1;
    note.style.transform = `translate3d(${(dir * p * 260).toFixed(1)}px, 0, 0)`;
  });

  // Ingredientes que vuelan hacia afuera
  const fly = alp70Range(p, 0, 0.2);
  els.ingredients.style.setProperty("--fly", fly.toFixed(3));
  els.ingredients.style.opacity = (1 - alp70Range(p, 0.14, 0.22)).toFixed(3);

  // Frasco
  const pose = alp70BottleAt(p);
  const px = alp70.mobile ? 0 : alp70.pointer.x * 10;
  const py = alp70.mobile ? 0 : alp70.pointer.y * 8;
  alp70.bottle.style.transform = `translate3d(calc(-50% + ${pose.x}vw + ${px.toFixed(1)}px), calc(-50% + ${pose.y}vh + ${py.toFixed(1)}px), 0) scale(${pose.s.toFixed(3)}) rotate(${(pose.r + alp70.pointer.x * 1.5).toFixed(2)}deg)`;
  els.halo.style.opacity = (0.55 + 0.45 * alp70Range(p, 0.36, 0.45) * (1 - alp70Range(p, 0.5, 0.58))).toFixed(3);

  // Puntos de progreso y header
  const active = ALP70_SCENES.reduce((acc, scene, index) => (p >= scene.start - 0.001 ? index : acc), 0);
  if (els.activeDot !== active)
  {
    els.dots.forEach((dot, index) => dot.classList.toggle("is-active", index === active));
    els.dots.forEach((dot, index) => dot.setAttribute("aria-current", index === active ? "step" : "false"));
    els.activeDot = active;
  }
  els.hint.style.opacity = (1 - alp70Range(p, 0, 0.04)).toFixed(3);

  alp70DrawLines(p);
  alp70DrawCanvas(p);
}

function alp70Tick(ts, force = false)
{
  alp70.raf = 0;
  if (!alp70.film || !document.body.contains(alp70.film)) return;

  const dt = alp70.lastTs ? Math.min(64, ts - alp70.lastTs) : 16;
  alp70.lastTs = ts;
  if (!alp70.paused) alp70.time += dt / 1000;

  alp70.target = alp70ReadProgress();
  const smoothing = alp70.paused ? 1 : 0.16;
  const before = alp70.progress;
  alp70.progress += (alp70.target - alp70.progress) * smoothing;
  if (Math.abs(alp70.target - alp70.progress) < 0.0004) alp70.progress = alp70.target;

  alp70.pointer.x += (alp70.pointer.tx - alp70.pointer.x) * 0.08;
  alp70.pointer.y += (alp70.pointer.ty - alp70.pointer.y) * 0.08;

  alp70UpdateHeader();

  const pointerMoving = Math.abs(alp70.pointer.tx - alp70.pointer.x) > 0.001 || Math.abs(alp70.pointer.ty - alp70.pointer.y) > 0.001;
  const moved = force || pointerMoving || Math.abs(alp70.progress - alp70.applied) > 0.00001;

  if (alp70.visible || force)
  {
    // Si el scroll no cambió solo se redibuja el polvo dorado del canvas.
    if (moved)
    {
      alp70Apply(alp70.progress);
      alp70.applied = alp70.progress;
    }
    else if (!alp70.paused)
    {
      alp70DrawCanvas(alp70.progress);
    }
  }

  const settling = Math.abs(alp70.progress - before) > 0.00001 || pointerMoving;
  if (alp70.visible && (!alp70.paused || settling))
  {
    alp70.raf = window.requestAnimationFrame(alp70Tick);
  }
}

function alp70Kick()
{
  if (!alp70.raf && alp70.film)
  {
    alp70.raf = window.requestAnimationFrame(alp70Tick);
  }
}

function alp70UpdateHeader()
{
  const film = alp70.film;
  if (!film) return;
  const rect = film.getBoundingClientRect();
  const over = rect.bottom > alp70HeaderOffset() + 24 && rect.top < window.innerHeight;
  document.body.classList.toggle("alp70-over-film", over);
}

function alp70SetPaused(paused, persist = true)
{
  alp70.paused = Boolean(paused);
  alp70.film?.classList.toggle("alp70-paused", alp70.paused);
  const button = alp70.film?.querySelector('[data-alp70="pause"]');
  if (button)
  {
    button.setAttribute("aria-pressed", alp70.paused ? "true" : "false");
    const label = button.querySelector(".alp70-pause-label");
    if (label) label.textContent = alp70.paused ? alp70L("Reanudar animación", "Resume motion") : alp70L("Pausar animación", "Pause motion");
  }
  if (persist) alp70StorageSet("alp70_motion_paused", alp70.paused ? "1" : "0");
  alp70Kick();
}

function alp70On(target, type, handler, options)
{
  target.addEventListener(type, handler, options);
  alp70.listeners.push(() => target.removeEventListener(type, handler, options));
}

function alp70Teardown()
{
  if (alp70.raf) window.cancelAnimationFrame(alp70.raf);
  alp70.raf = 0;
  alp70.listeners.forEach(off => off());
  alp70.listeners = [];
  alp70.observer?.disconnect();
  alp70.observer = null;
  alp70.film = null;
  alp70.stage = null;
  alp70.ctx = null;
  document.body.classList.remove("alp70-home", "alp70-over-film");
}

function alp70Mount()
{
  const film = document.getElementById("alp70Film");
  if (!film) return;

  alp70.film = film;
  alp70.stage = document.getElementById("alp70Stage");
  alp70.bottle = document.getElementById("alp70Bottle");
  alp70.bottleImg = film.querySelector(".alp70-bottle-img");
  alp70.canvas = document.getElementById("alp70Canvas");
  alp70.lines = document.getElementById("alp70Lines");
  alp70.ctx = alp70.canvas?.getContext("2d") || null;
  alp70.els = {
    scenes: ALP70_SCENES.map(scene => film.querySelector(`.alp70-scene[data-scene="${scene.id}"]`)),
    moments: [...film.querySelectorAll(".alp70-moment")],
    callouts: [...film.querySelectorAll(".alp70-callout")],
    dots: [...film.querySelectorAll(".alp70-dots button")],
    notes: film.querySelector(".alp70-notes"),
    noteItems: [...film.querySelectorAll(".alp70-note")],
    ingredients: film.querySelector(".alp70-ingredients"),
    glowMorning: film.querySelector(".alp70-glow-morning"),
    glowDusk: film.querySelector(".alp70-glow-dusk"),
    glowNight: film.querySelector(".alp70-glow-night"),
    haze: film.querySelector(".alp70-haze"),
    halo: film.querySelector(".alp70-bottle-halo"),
    hint: film.querySelector(".alp70-hint"),
    activeDot: -1,
  };

  document.body.classList.add("alp70-home");
  alp70LoadHeroDetail();

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  alp70.staticMode = reduced || !alp70.ctx;
  film.classList.toggle("alp70-static-mode", alp70.staticMode);

  if (alp70.staticMode)
  {
    alp70UpdateHeader();
    alp70On(window, "scroll", alp70UpdateHeader, { passive: true });
    return;
  }

  alp70SetPaused(alp70StorageGet("alp70_motion_paused") === "1", false);
  alp70.progress = alp70ReadProgress();
  alp70.applied = -1;
  alp70.lastTs = 0;

  alp70On(window, "scroll", alp70Kick, { passive: true });
  alp70On(window, "resize", () => alp70Resize(), { passive: true });
  alp70On(film, "pointermove", event =>
  {
    if (event.pointerType !== "mouse") return;
    alp70.pointer.tx = (event.clientX / window.innerWidth - 0.5) * 2;
    alp70.pointer.ty = (event.clientY / window.innerHeight - 0.5) * 2;
    alp70Kick();
  }, { passive: true });

  if ("IntersectionObserver" in window)
  {
    alp70.observer = new IntersectionObserver(entries =>
    {
      alp70.visible = entries.some(entry => entry.isIntersecting);
      if (alp70.visible) alp70Kick();
      else document.body.classList.remove("alp70-over-film");
    });
    alp70.observer.observe(film);
  }

  alp70Resize();
  alp70Kick();

  // La foto del frasco define dónde nacen la bruma y las líneas.
  if (alp70.bottleImg && !alp70.bottleImg.complete)
  {
    alp70.bottleImg.addEventListener("load", () => { alp70.applied = -1; alp70Kick(); }, { once: true });
  }

  // La tipografía puede llegar después del primer render: re-muestrear la marca.
  if (document.fonts?.ready)
  {
    document.fonts.ready.then(() =>
    {
      if (alp70.film === film)
      {
        alp70BuildWordmark();
        alp70Kick();
      }
    }).catch(() => {});
  }
}

function alp70ScrollToScene(index)
{
  const film = alp70.film;
  const scene = ALP70_SCENES[index];
  if (!film || !scene) return;
  const stageHeight = alp70.stage?.offsetHeight || window.innerHeight;
  const travel = Math.max(1, film.offsetHeight - stageHeight);
  const filmTop = film.getBoundingClientRect().top + window.scrollY - alp70HeaderOffset();
  const offset = index === 0 ? 0 : (scene.start + 0.05) * travel;
  window.scrollTo({ top: filmTop + offset, behavior: "smooth" });
}

function alp70ScrollPastFilm()
{
  const after = document.getElementById("alp70After");
  if (!after) return;
  const top = after.getBoundingClientRect().top + window.scrollY - alp70HeaderOffset();
  window.scrollTo({ top, behavior: "smooth" });
}

function alp70OpenMoment(keyword)
{
  if (!keyword) return;
  state.catalogFilter = "Todos";
  state.catalogSearch = keyword;
  state.catalogPage = 1;
  if (typeof catalogScheduleSmartSearch === "function")
  {
    try { catalogScheduleSmartSearch(keyword, 0); } catch (_) {}
  }
  setRoute("catalog");
}

// ---------------------------------------------------------------------------
// Vista rápida (tarjetas de producto)
// ---------------------------------------------------------------------------

function alp70QuickViewButton(product)
{
  const name = String(product?.nombre || "");
  return `
    <button
      class="alp70-qv-btn"
      type="button"
      data-alp70="quick-view"
      data-product-id="${Number(product.id)}"
      aria-label="${alp70Attr(alp70L(`Vista rápida de ${name}`, `Quick view of ${name}`))}">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
      <span>${alp70Esc(alp70L("Vista rápida", "Quick view"))}</span>
    </button>
  `;
}

function alp70NotesList(product)
{
  const rows = [
    ["salida", alp70L("Salida", "Top")],
    ["corazon", alp70L("Corazón", "Heart")],
    ["fondo", alp70L("Fondo", "Base")],
  ]
    .map(([field, label]) =>
    {
      const raw = typeof localizedField === "function" ? localizedField(product, field) : product?.[field];
      const value = Array.isArray(raw) ? raw.filter(Boolean).join(", ") : String(raw || "").trim();
      return value ? `<div><dt>${alp70Esc(label)}</dt><dd>${alp70Esc(value)}</dd></div>` : "";
    })
    .join("");

  return rows ? `<dl class="alp70-qv-notes">${rows}</dl>` : "";
}

function alp70OpenQuickView(productId)
{
  const product = typeof getProductById === "function" ? getProductById(productId) : null;
  if (!product || typeof openModal !== "function") return;

  const image = typeof getProductMainImage === "function" ? getProductMainImage(product) : "";
  const stock = Number(product.stock || 0);
  const maxQty = Math.max(1, Math.min(stock, 10));
  const description = (() =>
  {
    const raw = typeof localizedField === "function" ? localizedField(product, "descripcion") : product.descripcion;
    const text = String(raw || "").trim();
    return text.length > 260 ? `${text.slice(0, 257).trim()}…` : text;
  })();
  const kicker = [product.marca || product.categoria, product.genero].filter(Boolean).join(" · ");
  const family = typeof localizedField === "function" ? localizedField(product, "familia") : product.familia;
  const tags = typeof renderProductClassificationTags === "function" ? renderProductClassificationTags(product) : "";
  const stockLabel = stock <= 0
    ? alp70L("Sin stock", "Out of stock")
    : stock <= 3
      ? alp70L(`Últimas ${stock} unidades`, `Only ${stock} left`)
      : alp70L("En stock", "In stock");

  openModal(alp70L("Vista rápida", "Quick view"), `
    <div class="alp70-qv" data-product-id="${Number(product.id)}" data-max="${maxQty}">
      <div class="alp70-qv-media">
        ${image
          ? `<img src="${alp70Attr(image)}" alt="${alp70Attr(product.nombre)}" decoding="async">`
          : `<div class="alp70-qv-placeholder">${alp70Esc(product.nombre)}</div>`}
      </div>
      <div class="alp70-qv-info">
        ${kicker ? `<p class="alp70-qv-kicker">${alp70Esc(kicker)}</p>` : ""}
        <h3>${alp70Esc(product.nombre)}</h3>
        ${tags}
        ${family ? `<p class="alp70-qv-family">${alp70Esc(Array.isArray(family) ? family.join(", ") : family)}</p>` : ""}
        ${description ? `<p class="alp70-qv-desc">${alp70Esc(description)}</p>` : ""}
        ${alp70NotesList(product)}
        <div class="alp70-qv-price">
          <strong>${typeof money === "function" ? money(product.precio) : alp70Esc(product.precio)}</strong>
          <span class="${stock <= 0 ? "is-out" : ""}">${alp70Esc(stockLabel)}</span>
        </div>
        <div class="alp70-qv-buy">
          <div class="alp70-qty" role="group" aria-label="${alp70Attr(alp70L("Cantidad", "Quantity"))}">
            <button type="button" data-alp70="qty" data-delta="-1" aria-label="${alp70Attr(alp70L("Restar uno", "One less"))}" ${stock <= 0 ? "disabled" : ""}>−</button>
            <output aria-live="polite">1</output>
            <button type="button" data-alp70="qty" data-delta="1" aria-label="${alp70Attr(alp70L("Sumar uno", "One more"))}" ${stock <= 1 ? "disabled" : ""}>+</button>
          </div>
          <button class="btn alp70-qv-add" type="button" data-alp70="qv-add" data-product-id="${Number(product.id)}" ${stock <= 0 ? "disabled" : ""}>
            ${alp70Esc(alp70L("Agregar al carrito", "Add to cart"))}
          </button>
        </div>
        <button class="alp70-qv-more" type="button" data-route="product" data-product-id="${Number(product.id)}">
          ${alp70Esc(alp70L("Ver detalle completo", "See full details"))} <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  `);

  document.getElementById("modal")?.classList.add("alp70-qv-modal");
}

function alp70ChangeQty(button)
{
  const root = button.closest(".alp70-qv");
  const output = root?.querySelector(".alp70-qty output");
  if (!root || !output) return;
  const max = Number(root.dataset.max || 1);
  const next = alp70Clamp(Number(output.textContent || 1) + Number(button.dataset.delta || 0), 1, max);
  output.textContent = String(next);
  root.querySelector('[data-delta="-1"]')?.toggleAttribute("disabled", next <= 1);
  root.querySelector('[data-delta="1"]')?.toggleAttribute("disabled", next >= max);
}

function alp70AddFromQuickView(button)
{
  const root = button.closest(".alp70-qv");
  const qty = Number(root?.querySelector(".alp70-qty output")?.textContent || 1);
  const product = getProductById(button.dataset.productId);
  if (!product) return;

  const key = typeof productCartKey === "function" ? productCartKey(product.id) : `product:${Number(product.id)}`;
  const before = state.cart.find(line => line.key === key)?.qty || 0;

  closeModal();
  addProductToCart(product.id);

  const line = state.cart.find(item => item.key === key);
  if (qty > 1 && line && line.qty === before + 1)
  {
    line.qty = Math.min(Number(product.stock || 0), line.qty + qty - 1);
    if (typeof saveLocalState === "function") saveLocalState();
    if (typeof renderCart === "function") renderCart();
    if (typeof updateHeaderCounts === "function") updateHeaderCounts();
  }
}

// ---------------------------------------------------------------------------
// Instalación
// ---------------------------------------------------------------------------

function alp70DemoteHeading(html)
{
  // La película ya tiene el <h1> principal: para lectores de pantalla el título
  // del hero de colección pasa a nivel 2, sin cambiar la etiqueta ni su estilo.
  return String(html || "").replace(/<h1(\s|>)/, '<h1 aria-level="2"$1');
}

function alp70MarkActiveNav()
{
  document.querySelectorAll(".desktop-nav button[data-route]").forEach(button =>
  {
    const active = button.dataset.route === state.route ||
      (state.route === "product" && button.dataset.route === "catalog");
    button.classList.toggle("alp70-active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
}

function alp70Install()
{
  if (window.__alp70Installed) return;
  window.__alp70Installed = true;

  if (typeof renderHomePage === "function")
  {
    const originalHome = renderHomePage;
    renderHomePage = function alp70RenderHomePage()
    {
      const product = alp70HeroProduct();
      let rest = "";
      try
      {
        rest = originalHome();
      }
      catch (error)
      {
        console.error("Home original falló:", error);
      }

      // Si el producto protagonista no está en el catálogo, la home queda como antes.
      if (!product) return rest;

      try
      {
        // El resto de la home sube como una hoja sobre el final de la película.
        return `${alp70RenderFilm(product)}<div class="alp70-after" id="alp70After">${alp70DemoteHeading(rest)}</div>`;
      }
      catch (error)
      {
        console.error("Película de inicio falló:", error);
        return rest;
      }
    };
  }

  if (typeof renderCommercialSegments === "function")
  {
    const originalSegments = renderCommercialSegments;
    renderCommercialSegments = function alp70RenderCommercialSegments()
    {
      let extra = "";
      try { extra = alp70RenderDayMoments(); } catch (error) { console.error("Momentos del día:", error); }
      return originalSegments() + extra;
    };
  }

  if (typeof renderProductCard === "function")
  {
    const originalCard = renderProductCard;
    renderProductCard = function alp70RenderProductCard(product, options = {})
    {
      const html = originalCard(product, options);
      if (!product || product.id == null) return html;
      return html.replace('<div class="product-media">', `<div class="product-media">${alp70QuickViewButton(product)}`);
    };
  }

  if (typeof renderCurrentRoute === "function")
  {
    const originalRoute = renderCurrentRoute;
    renderCurrentRoute = function alp70RenderCurrentRoute()
    {
      alp70Teardown();
      const result = originalRoute.apply(this, arguments);
      try
      {
        alp70MarkActiveNav();
        if (document.getElementById("alp70Film")) alp70Mount();
      }
      catch (error)
      {
        console.error("Película de inicio: error al montar", error);
      }
      return result;
    };
  }

  document.addEventListener("click", event =>
  {
    const element = event.target.closest("[data-alp70]");
    if (!element) return;
    const action = element.dataset.alp70;

    switch (action)
    {
      case "quick-view":
        event.preventDefault();
        alp70OpenQuickView(element.dataset.productId);
        break;
      case "qty":
        alp70ChangeQty(element);
        break;
      case "qv-add":
        alp70AddFromQuickView(element);
        break;
      case "pause":
        alp70SetPaused(!alp70.paused);
        break;
      case "scene":
        alp70ScrollToScene(Number(element.dataset.index || 0));
        break;
      case "skip":
        alp70ScrollPastFilm();
        break;
      case "moment":
        alp70OpenMoment(element.dataset.keyword);
        break;
      default:
        break;
    }
  });

  // El modal es compartido: se quita el estilo de vista rápida al cerrarlo.
  const modal = document.getElementById("modal");
  if (modal && "MutationObserver" in window)
  {
    new MutationObserver(() =>
    {
      // Solo se toca la clase si está puesta: classList.remove siempre genera
      // una mutación y dispararía este mismo observador en bucle.
      if (!modal.classList.contains("open") && modal.classList.contains("alp70-qv-modal"))
      {
        modal.classList.remove("alp70-qv-modal");
      }
    }).observe(modal, { attributes: true, attributeFilter: ["class"] });
  }
}

alp70Install();
