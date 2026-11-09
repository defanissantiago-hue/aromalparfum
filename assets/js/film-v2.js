"use strict";

// AromaLParfum — PASO 70 · Experiencia cinematográfica
// - Home: "película" controlada por el scroll (escena fija con frasco, notas,
//   anatomía de un perfume, bruma, momentos del día y la marca en partículas).
// - Tarjetas: botón de vista rápida con cantidad y agregado al carrito.
// - Navegación tipo píldora y header de vidrio sobre la película.
// Se instala envolviendo renderHomePage, renderProductCard y renderCurrentRoute,
// sin tocar los módulos existentes. Para desactivarlo alcanza con quitar
// film-v2.js y film-v2.css del index.html.

const ALP70_SCENES = [
  { id: "intro", start: 0, end: 0.17, es: "Inicio", en: "Intro" },
  { id: "anatomy", start: 0.15, end: 0.38, es: "Cómo se lee un perfume", en: "How to read a perfume" },
  { id: "mist", start: 0.36, end: 0.53, es: "Un disparo", en: "One spray" },
  { id: "moments", start: 0.51, end: 0.78, es: "Momentos", en: "Moments" },
  { id: "brand", start: 0.76, end: 1, es: "AromaLParfum", en: "AromaLParfum" },
];

const ALP70_MOMENTS = [
  {
    time: "09:00",
    range: [0.53, 0.62],
    es: { title: "Para arrancar.", em: "Fresco y luminoso.", text: "Cítricos, notas verdes y acuáticas que acompañan el día." },
    en: { title: "To start the day.", em: "Fresh and bright.", text: "Citrus, green and aquatic notes that carry you through the day." },
    keywords: ["citric", "bergamot", "limon", "mandarin", "acuatic", "marin", "verde", "fresc"],
    mood: "morning",
  },
  {
    time: "18:00",
    range: [0.61, 0.70],
    es: { title: "Después de todo.", em: "Cálido y cercano.", text: "Aromáticos y amaderados que se sienten sin invadir." },
    en: { title: "After it all.", em: "Warm and close.", text: "Aromatic and woody scents you feel without them taking over." },
    keywords: ["amader", "lavanda", "aromatic", "cedro", "vetiver", "fougere", "sandal"],
    mood: "dusk",
  },
  {
    time: "23:00",
    range: [0.69, 0.78],
    es: { title: "La noche es tuya.", em: "Intenso.", text: "Ámbar, vainilla y oud para dejar huella." },
    en: { title: "The night is yours.", em: "Intense.", text: "Amber, vanilla and oud to leave a trace." },
    keywords: ["vainilla", "ambar", "oud", "oriental", "gourmand", "tabaco", "cuero"],
    mood: "night",
  },
];

// Puntos del frasco (coordenadas del SVG, viewBox 0 0 400 640) a los que apuntan
// las líneas de la anatomía.
const ALP70_ANCHORS = [
  { x: 186, y: 117 },
  { x: 96, y: 290 },
  { x: 146, y: 400 },
  { x: 100, y: 560 },
];

const alp70 = {
  film: null,
  stage: null,
  bottle: null,
  bottleSvg: null,
  cap: null,
  canvas: null,
  ctx: null,
  lines: null,
  els: {},
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
// Datos reales del catálogo para la película
// ---------------------------------------------------------------------------

function alp70SplitNotes(value)
{
  const list = typeof arrayFromDb === "function" && Array.isArray(value)
    ? arrayFromDb(value)
    : Array.isArray(value) ? value : String(value || "").split(/[,;·/]|\sy\s|\sand\s/i);

  return list
    .map(item => String(item || "").trim())
    .filter(item => item.length > 1 && item.length < 13);
}

// Las notas más repetidas del catálogo (una de salida, una de corazón y una de
// fondo). Si el catálogo no tiene notas cargadas usa un trío clásico.
function alp70TopNotes()
{
  const layers = ["salida", "corazon", "fondo"];
  const picked = [];

  layers.forEach(layer =>
  {
    const counts = new Map();

    alp70Products().forEach(product =>
    {
      const raw = typeof localizedField === "function" ? localizedField(product, layer) : product?.[layer];
      alp70SplitNotes(raw).forEach(note =>
      {
        const key = alp70Norm(note);
        const entry = counts.get(key) || { label: note, count: 0 };
        entry.count += 1;
        counts.set(key, entry);
      });
    });

    const best = [...counts.values()]
      .sort((a, b) => b.count - a.count)
      .find(entry => !picked.some(item => alp70Norm(item) === alp70Norm(entry.label)));

    if (best && best.count >= 2)
    {
      picked.push(best.label);
    }
  });

  const fallback = alp70L(["Bergamota", "Jazmín", "Vainilla"], ["Bergamot", "Jasmine", "Vanilla"]);

  return picked.length === 3 ? picked : fallback;
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

  return alp70Norm([product?.nombre, product?.familia, product?.salida, product?.corazon, product?.fondo].join(" "));
}

// Busca la palabra con más resultados del catálogo para cada momento del día.
// Si ninguna coincide, el momento se muestra sin botón (nunca lleva a un
// catálogo vacío).
function alp70MomentSearch(moment)
{
  const texts = alp70Products().map(alp70ProductText);
  let best = { keyword: "", count: 0 };

  moment.keywords.forEach(keyword =>
  {
    const count = texts.filter(text => text.includes(keyword)).length;
    if (count > best.count) best = { keyword, count };
  });

  return best;
}

function alp70Stats()
{
  const total = alp70Products().length;
  const shown = total >= 20 ? `${Math.floor(total / 10) * 10}+` : String(total || "");
  const sizes = (Array.isArray(state?.decantSizes) ? state.decantSizes : [])
    .map(item => Number(item?.ml))
    .filter(ml => ml > 0);
  const minDecant = sizes.length ? Math.min(...sizes) : 0;
  const stats = [];

  if (total)
  {
    stats.push({ value: shown, label: alp70L("productos en catálogo", "products in the catalog") });
  }

  stats.push({ value: "4", label: alp70L("líneas: Originales, G5, 30 ml y Kits", "lines: Originals, G5, 30 ml and Kits") });

  stats.push(minDecant
    ? { value: `${minDecant} ml`, label: alp70L("decants para probar antes de elegir", "decants to try before you choose") }
    : { value: "1:1", label: alp70L("atención personalizada por WhatsApp", "personal service on WhatsApp") });

  return stats;
}

// ---------------------------------------------------------------------------
// Ilustraciones (SVG propio, sin imágenes externas)
// ---------------------------------------------------------------------------

function alp70BottleSvg()
{
  return `
    <svg class="alp70-bottle-svg" viewBox="0 0 400 640" role="presentation" focusable="false">
      <defs>
        <linearGradient id="alp70Liquid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffd98c"/>
          <stop offset=".35" stop-color="#eba23a"/>
          <stop offset=".78" stop-color="#b5661a"/>
          <stop offset="1" stop-color="#6a3409"/>
        </linearGradient>
        <linearGradient id="alp70LiquidSide" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#5a2a06" stop-opacity=".55"/>
          <stop offset=".18" stop-color="#5a2a06" stop-opacity="0"/>
          <stop offset=".82" stop-color="#5a2a06" stop-opacity="0"/>
          <stop offset="1" stop-color="#5a2a06" stop-opacity=".6"/>
        </linearGradient>
        <radialGradient id="alp70Glow" cx=".5" cy=".55" r=".5">
          <stop offset="0" stop-color="#fff2c6" stop-opacity=".9"/>
          <stop offset=".55" stop-color="#ffcf73" stop-opacity=".25"/>
          <stop offset="1" stop-color="#ffcf73" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="alp70Glass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#fff" stop-opacity=".55"/>
          <stop offset=".07" stop-color="#fff" stop-opacity=".12"/>
          <stop offset=".5" stop-color="#fff" stop-opacity=".03"/>
          <stop offset=".93" stop-color="#fff" stop-opacity=".14"/>
          <stop offset="1" stop-color="#fff" stop-opacity=".5"/>
        </linearGradient>
        <linearGradient id="alp70Gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#6b4a17"/>
          <stop offset=".22" stop-color="#f3d68f"/>
          <stop offset=".45" stop-color="#a9772b"/>
          <stop offset=".68" stop-color="#fff0c4"/>
          <stop offset="1" stop-color="#7d5820"/>
        </linearGradient>
        <radialGradient id="alp70CapFill" cx=".36" cy=".3" r=".75">
          <stop offset="0" stop-color="#7d6f82"/>
          <stop offset=".18" stop-color="#2b2430"/>
          <stop offset=".6" stop-color="#0c0a0e"/>
          <stop offset="1" stop-color="#030203"/>
        </radialGradient>
        <linearGradient id="alp70Label" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fbf6ec"/>
          <stop offset="1" stop-color="#e6dccb"/>
        </linearGradient>
        <linearGradient id="alp70Fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fff" stop-opacity="0"/>
          <stop offset=".55" stop-color="#fff" stop-opacity="0"/>
          <stop offset="1" stop-color="#fff" stop-opacity=".6"/>
        </linearGradient>
        <mask id="alp70ReflectMask">
          <rect x="0" y="0" width="400" height="640" fill="url(#alp70Fade)"/>
        </mask>
        <filter id="alp70Blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6"/>
        </filter>
      </defs>

      <ellipse cx="200" cy="598" rx="190" ry="26" fill="#ffb54a" opacity=".18" filter="url(#alp70Blur)"/>

      <g id="alp70BottleCore">
        <g class="alp70-atomizer">
          <rect x="193" y="120" width="14" height="36" fill="url(#alp70Gold)"/>
          <rect x="183" y="106" width="34" height="18" rx="4" fill="url(#alp70Gold)"/>
          <circle cx="186" cy="115" r="2.6" fill="#2a1a08"/>
        </g>

        <g class="alp70-collar">
          <rect x="164" y="150" width="72" height="40" rx="4" fill="url(#alp70Gold)"/>
          <path d="M164 160h72M164 169h72M164 178h72" stroke="#4a3210" stroke-opacity=".35" stroke-width="1"/>
        </g>

        <rect x="62" y="188" width="276" height="402" rx="34" fill="#ffe7c2" fill-opacity=".07" stroke="#ffe9c9" stroke-opacity=".6" stroke-width="1.6"/>
        <rect x="86" y="228" width="228" height="340" rx="20" fill="url(#alp70Liquid)"/>
        <rect x="86" y="228" width="228" height="340" rx="20" fill="url(#alp70LiquidSide)"/>
        <ellipse cx="200" cy="420" rx="118" ry="150" fill="url(#alp70Glow)" opacity=".7"/>
        <path d="M92 236 Q200 222 308 236" stroke="#fff4d2" stroke-opacity=".75" stroke-width="2" fill="none"/>
        <rect x="86" y="560" width="228" height="22" rx="10" fill="#ffd27a" fill-opacity=".28"/>
        <rect x="62" y="188" width="276" height="402" rx="34" fill="url(#alp70Glass)"/>
        <rect x="72" y="204" width="14" height="368" rx="7" fill="#fff" fill-opacity=".2"/>
        <rect x="316" y="214" width="10" height="350" rx="5" fill="#fff" fill-opacity=".12"/>
        <path d="M96 200 H304" stroke="#fff" stroke-opacity=".55" stroke-width="2" stroke-linecap="round"/>

        <g class="alp70-label">
          <rect x="146" y="338" width="108" height="124" rx="3" fill="url(#alp70Label)" stroke="#c9b48f" stroke-opacity=".7"/>
          <text x="200" y="388" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-size="17" letter-spacing="3.5" fill="#2a2018">AROMA</text>
          <path d="M178 400 H222" stroke="#b08a4a" stroke-width="1"/>
          <text x="200" y="415" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="7" letter-spacing="3.2" fill="#6d5c48">LPARFUM</text>
          <text x="200" y="446" text-anchor="middle" font-family="Georgia, serif" font-size="9" fill="#b08a4a">✦</text>
        </g>
      </g>

      <g class="alp70-cap" id="alp70Cap">
        <rect x="168" y="146" width="64" height="9" rx="3" fill="url(#alp70Gold)"/>
        <circle cx="200" cy="94" r="64" fill="url(#alp70CapFill)"/>
        <ellipse cx="176" cy="66" rx="24" ry="14" fill="#fff" opacity=".2" filter="url(#alp70Blur)"/>
        <path d="M150 120 Q200 152 250 120" stroke="#ffcf87" stroke-opacity=".35" stroke-width="2" fill="none"/>
      </g>

      <g class="alp70-reflection" mask="url(#alp70ReflectMask)" opacity=".32" transform="translate(0 1180) scale(1 -1)">
        <use href="#alp70BottleCore"/>
      </g>
    </svg>
  `;
}

function alp70IngredientsSvg()
{
  return `
    <svg class="alp70-ing alp70-ing-petal" viewBox="0 0 170 90" role="presentation" focusable="false">
      <defs>
        <linearGradient id="alp70Petal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#f4e9ff"/>
          <stop offset=".45" stop-color="#a98be6"/>
          <stop offset="1" stop-color="#5b3aa6"/>
        </linearGradient>
      </defs>
      <path d="M6 58 C38 4 118 0 164 30 C128 68 52 86 6 58Z" fill="url(#alp70Petal)"/>
      <path d="M12 58 C60 44 104 34 156 31" stroke="#fff6c9" stroke-opacity=".75" stroke-width="2" fill="none"/>
    </svg>
    <svg class="alp70-ing alp70-ing-citrus" viewBox="0 0 100 100" role="presentation" focusable="false">
      <defs>
        <radialGradient id="alp70Citrus" cx=".5" cy=".5" r=".5">
          <stop offset="0" stop-color="#fff2b8"/>
          <stop offset=".75" stop-color="#ffb43a"/>
          <stop offset="1" stop-color="#e3790f"/>
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="#f08a19"/>
      <circle cx="50" cy="50" r="39" fill="url(#alp70Citrus)"/>
      <g stroke="#fff6dc" stroke-width="2.4" stroke-linecap="round">
        <path d="M50 14V86M14 50H86M25 25L75 75M75 25L25 75"/>
      </g>
      <circle cx="50" cy="50" r="5" fill="#fff6dc"/>
    </svg>
    <svg class="alp70-ing alp70-ing-wood" viewBox="0 0 140 70" role="presentation" focusable="false">
      <defs>
        <linearGradient id="alp70Wood" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#d79a5a"/>
          <stop offset=".5" stop-color="#8a5226"/>
          <stop offset="1" stop-color="#4b2a12"/>
        </linearGradient>
      </defs>
      <path d="M4 22 L120 4 L136 40 L18 66Z" fill="url(#alp70Wood)"/>
      <path d="M14 30 L124 14 M18 42 L128 26 M22 54 L132 38" stroke="#3a1f0c" stroke-opacity=".45" stroke-width="1.6"/>
    </svg>
    <svg class="alp70-ing alp70-ing-petal2" viewBox="0 0 170 90" role="presentation" focusable="false">
      <path d="M6 58 C38 4 118 0 164 30 C128 68 52 86 6 58Z" fill="url(#alp70Petal)" opacity=".9"/>
    </svg>
  `;
}

// ---------------------------------------------------------------------------
// Markup de la película
// ---------------------------------------------------------------------------

function alp70RenderFilm()
{
  const notes = alp70TopNotes();
  const stats = alp70Stats();
  const moments = ALP70_MOMENTS.map(moment =>
  {
    const copy = alp70L(moment.es, moment.en);
    const search = alp70MomentSearch(moment);
    return { ...moment, copy, search };
  });
  const anatomy = [
    {
      title: alp70L("Salida", "Top notes"),
      text: alp70L("Lo primero que sentís. Cítricos y notas frescas de los primeros minutos.", "What you notice first. Citrus and fresh notes in the first minutes."),
    },
    {
      title: alp70L("Corazón", "Heart"),
      text: alp70L("La personalidad de la fragancia. Aparece después y te acompaña varias horas.", "The character of the scent. It opens up next and stays for hours."),
    },
    {
      title: alp70L("Concentración", "Concentration"),
      text: alp70L("EDT, EDP o Extrait: a mayor concentración, más duración en la piel.", "EDT, EDP or Extrait: the higher the concentration, the longer it lasts."),
    },
    {
      title: alp70L("Fondo", "Base"),
      text: alp70L("Maderas, ámbar y vainilla. Es lo que queda al final del día.", "Woods, amber and vanilla. What remains at the end of the day."),
    },
  ];

  const momentButton = moment => moment.search.count
    ? `<button class="alp70-link" type="button" data-alp70="moment" data-keyword="${alp70Attr(moment.search.keyword)}">${alp70Esc(alp70L(`Ver ${moment.search.count} fragancias`, `See ${moment.search.count} fragrances`))} <span aria-hidden="true">→</span></button>`
    : "";

  const statsHtml = stats.map(item => `
    <div class="alp70-stat">
      <strong>${alp70Esc(item.value)}</strong>
      <span>${alp70Esc(item.label)}</span>
    </div>
  `).join("");

  return `
    <section class="alp70-film" id="alp70Film" aria-label="${alp70Attr(alp70L("Presentación de AromaLParfum", "AromaLParfum introduction"))}">
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
          ${notes.map((note, index) => `<span class="alp70-note alp70-note-${index}">${alp70Esc(String(note).toUpperCase())}</span>`).join("")}
        </div>

        <div class="alp70-ingredients" aria-hidden="true">${alp70IngredientsSvg()}</div>

        <div class="alp70-bottle" id="alp70Bottle" aria-hidden="true">
          <div class="alp70-bottle-float">${alp70BottleSvg()}</div>
        </div>

        <canvas class="alp70-canvas" id="alp70Canvas" aria-hidden="true"></canvas>
        <svg class="alp70-lines" id="alp70Lines" aria-hidden="true"></svg>

        <div class="alp70-scene alp70-s-intro" data-scene="intro">
          <p class="alp70-eyebrow">AromaLParfum · ${alp70Esc(alp70L("Perfumería", "Perfumery"))}</p>
          <h1 class="alp70-display">
            <span class="alp70-line"><span>${alp70Esc(alp70L("Para lo que", "For what"))}</span></span>
            <span class="alp70-line"><em>${alp70Esc(alp70L("no se ve.", "can't be seen."))}</em></span>
          </h1>
          <p class="alp70-lead">${alp70Esc(alp70L(
            "Una fragancia llega antes que vos y se queda cuando te vas. Originales, inspiraciones G5, decants y regalos.",
            "A fragrance arrives before you and stays after you leave. Originals, G5 inspirations, decants and gifts."
          ))}</p>
          <div class="alp70-actions">
            <button class="alp70-btn" type="button" data-route="catalog" data-filter="Todos">${alp70Esc(alp70L("Explorar perfumes", "Explore perfumes"))} <span aria-hidden="true">→</span></button>
            <button class="alp70-btn ghost" type="button" data-route="games">${alp70Esc(alp70L("Descubrí tu aroma", "Find your scent"))}</button>
          </div>
        </div>

        <div class="alp70-scene alp70-s-anatomy" data-scene="anatomy">
          <p class="alp70-eyebrow alp70-corner">${alp70Esc(alp70L("Cómo se lee un perfume", "How to read a perfume"))}</p>
          <ol class="alp70-callouts">
            ${anatomy.map((item, index) => `
              <li class="alp70-callout" data-index="${index}">
                <strong>${alp70Esc(item.title)}</strong>
                <span>${alp70Esc(item.text)}</span>
              </li>
            `).join("")}
          </ol>
        </div>

        <div class="alp70-scene alp70-s-mist" data-scene="mist">
          <h2 class="alp70-display alp70-display-sm">
            <span class="alp70-line"><span>${alp70Esc(alp70L("Un disparo.", "One spray."))}</span></span>
            <span class="alp70-line"><em>${alp70Esc(alp70L("Una sensación.", "One feeling."))}</em></span>
          </h2>
          <p class="alp70-lead">${alp70Esc(alp70L(
            "Probala en decants de pocos mililitros antes de elegir tu frasco.",
            "Try it as a small decant before choosing your bottle."
          ))}</p>
          <button class="alp70-link" type="button" data-route="decants">${alp70Esc(alp70L("Armá tu combo de decants", "Build your decant set"))} <span aria-hidden="true">→</span></button>
        </div>

        <div class="alp70-scene alp70-s-moments" data-scene="moments">
          <p class="alp70-eyebrow alp70-corner">${alp70Esc(alp70L("Un perfume para cada hora", "A scent for every hour"))}</p>
          ${moments.map((moment, index) => `
            <article class="alp70-moment" data-moment="${index}">
              <p class="alp70-time">${alp70Esc(moment.time)}</p>
              <h2 class="alp70-display alp70-display-sm">
                <span class="alp70-line"><span>${alp70Esc(moment.copy.title)}</span></span>
                <span class="alp70-line"><em>${alp70Esc(moment.copy.em)}</em></span>
              </h2>
              <p class="alp70-lead">${alp70Esc(moment.copy.text)}</p>
              ${momentButton(moment)}
            </article>
          `).join("")}
        </div>

        <div class="alp70-scene alp70-s-brand" data-scene="brand">
          <h2 class="alp70-wordmark" id="alp70Wordmark">
            <span class="alp70-wordmark-text">AROMA</span>
            <small>LPARFUM</small>
          </h2>
          <div class="alp70-stats">${statsHtml}</div>
          <div class="alp70-actions">
            <button class="alp70-btn" type="button" data-alp70="skip">${alp70Esc(alp70L("Ver la colección", "See the collection"))} <span aria-hidden="true">↓</span></button>
            <button class="alp70-btn ghost" type="button" data-route="catalog" data-filter="Todos">${alp70Esc(alp70L("Catálogo completo", "Full catalog"))}</button>
          </div>
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
            <p class="alp70-eyebrow">${alp70Esc(alp70L("Cómo se lee un perfume", "How to read a perfume"))}</p>
            <ol class="alp70-static-list">
              ${anatomy.map(item => `<li><strong>${alp70Esc(item.title)}</strong><span>${alp70Esc(item.text)}</span></li>`).join("")}
            </ol>
          </div>
          <div>
            <p class="alp70-eyebrow">${alp70Esc(alp70L("Un perfume para cada hora", "A scent for every hour"))}</p>
            <div class="alp70-static-moments">
              ${moments.map(moment => `
                <article>
                  <span class="alp70-time">${alp70Esc(moment.time)}</span>
                  <strong>${alp70Esc(moment.copy.title)} <em>${alp70Esc(moment.copy.em)}</em></strong>
                  <p>${alp70Esc(moment.copy.text)}</p>
                  ${momentButton(moment)}
                </article>
              `).join("")}
            </div>
          </div>
        </div>
        <div class="alp70-stats alp70-static-stats">${statsHtml}</div>
      </div>
    </section>
  `;
}

// ---------------------------------------------------------------------------
// Movimiento
// ---------------------------------------------------------------------------

// Posición del frasco a lo largo de la película: x/y en % del escenario.
const ALP70_BOTTLE_PATH = {
  desktop: [
    { p: 0, x: 0, y: 0, s: 1, r: -5 },
    { p: 0.14, x: 0, y: 0, s: 1, r: -2 },
    { p: 0.22, x: 2, y: 2, s: 1.06, r: 0 },
    { p: 0.36, x: 2, y: 2, s: 1.06, r: 0 },
    { p: 0.46, x: 4, y: 0, s: 0.98, r: 0 },
    { p: 0.56, x: 2, y: 0, s: 0.96, r: 0 },
    { p: 0.76, x: 2, y: 0, s: 0.96, r: 0 },
    { p: 0.9, x: 6, y: 1, s: 0.94, r: 0 },
    { p: 1, x: 6, y: 1, s: 0.94, r: 0 },
  ],
  mobile: [
    { p: 0, x: 20, y: 9, s: 0.9, r: -6 },
    { p: 0.14, x: 20, y: 9, s: 0.9, r: -2 },
    { p: 0.22, x: 24, y: -5, s: 1, r: 0 },
    { p: 0.36, x: 24, y: -5, s: 1, r: 0 },
    { p: 0.46, x: 16, y: 14, s: 0.86, r: 0 },
    { p: 0.56, x: 0, y: 10, s: 0.86, r: 0 },
    { p: 0.76, x: 0, y: 10, s: 0.86, r: 0 },
    { p: 0.88, x: 0, y: 12, s: 0.82, r: 0 },
    { p: 1, x: 0, y: 12, s: 0.82, r: 0 },
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

function alp70CapLift(p)
{
  const up = alp70EaseOut(alp70Range(p, 0.17, 0.27));
  const down = alp70Smooth(alp70Range(p, 0.8, 0.9));
  return up * (1 - down);
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

function alp70Nozzle()
{
  const svg = alp70.bottleSvg;
  const stage = alp70.stage;
  if (!svg || !stage) return { x: 0, y: 0 };
  const matrix = svg.getScreenCTM();
  const stageRect = stage.getBoundingClientRect();
  if (!matrix) return { x: 0, y: 0 };
  const point = svg.createSVGPoint();
  point.x = 186;
  point.y = 115;
  const screen = point.matrixTransform(matrix);
  return { x: screen.x - stageRect.left, y: screen.y - stageRect.top };
}

function alp70Anchors()
{
  const svg = alp70.bottleSvg;
  const stage = alp70.stage;
  const matrix = svg?.getScreenCTM();
  if (!matrix || !stage) return [];
  const stageRect = stage.getBoundingClientRect();
  const point = svg.createSVGPoint();
  return ALP70_ANCHORS.map(anchor =>
  {
    point.x = anchor.x;
    point.y = anchor.y;
    const screen = point.matrixTransform(matrix);
    return { x: screen.x - stageRect.left, y: screen.y - stageRect.top };
  });
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
    const reach = Math.max(w, h) * (alp70.mobile ? 0.17 : 0.48);
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
  els.moments.forEach((moment, index) =>
  {
    const [start, end] = ALP70_MOMENTS[index].range;
    const opacity = alp70SceneOpacity(p, start, end);
    moment.style.opacity = opacity.toFixed(3);
    moment.style.visibility = opacity < 0.02 ? "hidden" : "visible";
    moment.style.transform = `translate3d(0, ${((1 - opacity) * 18).toFixed(1)}px, 0)`;
  });

  // Luz de fondo según el momento
  const morning = alp70SceneOpacity(p, 0.53, 0.62);
  const dusk = alp70SceneOpacity(p, 0.61, 0.70);
  const night = alp70SceneOpacity(p, 0.69, 0.8, { keepEnd: false });
  els.glowMorning.style.opacity = morning.toFixed(3);
  els.glowDusk.style.opacity = dusk.toFixed(3);
  els.glowNight.style.opacity = night.toFixed(3);
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

  // Frasco y tapa
  const pose = alp70BottleAt(p);
  const px = alp70.mobile ? 0 : alp70.pointer.x * 10;
  const py = alp70.mobile ? 0 : alp70.pointer.y * 8;
  alp70.bottle.style.transform = `translate3d(calc(-50% + ${pose.x}vw + ${px.toFixed(1)}px), calc(-50% + ${pose.y}vh + ${py.toFixed(1)}px), 0) scale(${pose.s.toFixed(3)}) rotate(${(pose.r + alp70.pointer.x * 1.5).toFixed(2)}deg)`;
  const lift = alp70CapLift(p);
  alp70.cap?.setAttribute("transform", `translate(${(-26 * lift).toFixed(1)} ${(-200 * lift).toFixed(1)}) rotate(${(-10 * lift).toFixed(2)} 200 94)`);
  alp70.cap?.setAttribute("opacity", (1 - alp70Range(lift, 0.35, 0.85)).toFixed(3));

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
  alp70.bottleSvg = film.querySelector(".alp70-bottle-svg");
  alp70.cap = document.getElementById("alp70Cap");
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
    hint: film.querySelector(".alp70-hint"),
    activeDot: -1,
  };

  document.body.classList.add("alp70-home");

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
      let rest = "";
      try
      {
        rest = alp70DemoteHeading(originalHome());
      }
      catch (error)
      {
        console.error("Home original falló:", error);
      }

      try
      {
        // El resto de la home sube como una hoja sobre el final de la película.
        return `${alp70RenderFilm()}<div class="alp70-after" id="alp70After">${rest}</div>`;
      }
      catch (error)
      {
        console.error("Película de inicio falló:", error);
        return rest;
      }
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
