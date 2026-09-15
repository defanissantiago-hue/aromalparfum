"use strict";

// AromaLParfum Frontend V2 — Paso 63
// Módulo: productos, carga liviana, detalle diferido, imágenes y galería

const PRODUCT_COLUMNS_CACHE_KEY = "alp_product_columns_v4";

const PRODUCT_COLUMNS_PREFERRED = [
  "id",
  "nombre",
  "marca",
  "precio",
  "ml",
  "stock",
  "categoria",
  "genero",
  "descripcion",
  "salida",
  "corazon",
  "fondo",
  "familia",
  "duracion",
  "proyeccion",
  "recomendacion_uso",
  "estaciones",
  "ocasiones",
  "destacado",
  "nuevo",
  "vendido",
  "tipo_producto",
  "tipo_producto_slug",
  "subcategoria",
  "imagen_url",
  "created_by_ai",
  "descripcion_en",
  "salida_en",
  "corazon_en",
  "fondo_en",
  "familia_en",
  "created_at",
  "new_until",
];

// Paso 63: la tienda pública ya no descarga las fichas largas de TODOS los
// perfumes en cada visita. Este resumen conserva todo lo necesario para cards,
// stock, filtros estructurados, colecciones y builders. La descripción/notas se
// cargan únicamente al entrar a una ficha o a una experiencia que realmente
// necesita búsqueda olfativa profunda.
const PRODUCT_COLUMNS_PUBLIC_SUMMARY = [
  "id",
  "nombre",
  "marca",
  "precio",
  "ml",
  "stock",
  "categoria",
  "genero",
  "familia",
  "estaciones",
  "ocasiones",
  "destacado",
  "nuevo",
  "vendido",
  "tipo_producto",
  "tipo_producto_slug",
  "subcategoria",
  "imagen_url",
  "created_at",
  "new_until",
];

const PRODUCT_COLUMNS_LAZY_DETAIL = [
  "id",
  "descripcion",
  "salida",
  "corazon",
  "fondo",
  "duracion",
  "proyeccion",
  "recomendacion_uso",
  "descripcion_en",
  "salida_en",
  "corazon_en",
  "fondo_en",
  "familia_en",
];

const PRODUCT_COLUMNS_CATALOG_METADATA = [
  "id",
  "descripcion",
  "salida",
  "corazon",
  "fondo",
  "duracion",
  "proyeccion",
  "recomendacion_uso",
];

const PRODUCT_COLUMNS_CORE = new Set([
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
]);

function getCachedProductColumns()
{
  try
  {
    const parsed = JSON.parse(
      alp66StorageGet(PRODUCT_COLUMNS_CACHE_KEY) || "null"
    );

    if (
      Array.isArray(parsed) &&
      parsed.includes("id") &&
      parsed.includes("nombre") &&
      parsed.includes("precio")
    )
    {
      return parsed.filter(Boolean);
    }
  }
  catch (error)
  {
    console.warn("No se pudo leer la caché de columnas:", error);
  }

  return null;
}

function cacheProductColumns(columns)
{
  try
  {
    if (Array.isArray(columns) && columns.length)
    {
      alp66StorageSet(
        PRODUCT_COLUMNS_CACHE_KEY,
        JSON.stringify(columns)
      );
    }
  }
  catch (error)
  {
    console.warn("No se pudo guardar la caché de columnas:", error);
  }
}

function getProductSelectColumns()
{
  const current = Array.from(state.productColumns || []);

  if (current.length)
  {
    return current.join(",");
  }

  const cached = getCachedProductColumns();

  return (cached || PRODUCT_COLUMNS_PREFERRED).join(",");
}

function alp63ColumnsAvailable(preferred)
{
  const cached = getCachedProductColumns();

  if (!Array.isArray(cached) || !cached.length)
  {
    return preferred.slice();
  }

  const available = new Set(cached);
  const filtered = preferred.filter(column => available.has(column));

  // Estos campos son indispensables para que la tienda pueda funcionar.
  for (const required of ["id", "nombre", "precio", "stock"])
  {
    if (!filtered.includes(required) && available.has(required))
    {
      filtered.push(required);
    }
  }

  return filtered.length ? filtered : preferred.slice();
}

function alp63MergeProductRows(rows)
{
  const byId = new Map(
    state.products.map(product => [Number(product.id), product])
  );

  for (const row of rows || [])
  {
    const id = Number(row?.id || 0);
    const current = byId.get(id);
    if (!id || !current) continue;

    Object.assign(current, row);

    // Normalizamos los campos que pueden llegar en la carga diferida.
    if ("descripcion" in row) current.descripcion = String(row.descripcion || "");
    if ("salida" in row) current.salida = String(row.salida || "");
    if ("corazon" in row) current.corazon = String(row.corazon || "");
    if ("fondo" in row) current.fondo = String(row.fondo || "");
    if ("duracion" in row) current.duracion = String(row.duracion || "Consultar");
    if ("proyeccion" in row) current.proyeccion = String(row.proyeccion || "Consultar");
    if ("recomendacion_uso" in row) current.recomendacion_uso = String(row.recomendacion_uso || "");
  }
}

async function loadProducts(options = {})
{
  const publicSummary = Boolean(options.publicSummary);
  let columns = publicSummary
    ? alp63ColumnsAvailable(PRODUCT_COLUMNS_PUBLIC_SUMMARY)
    : (getCachedProductColumns() || PRODUCT_COLUMNS_PREFERRED.slice());

  let result =
    await supabaseClient
      .from("products")
      .select(columns.join(","))
      .order("id", { ascending: true });

  // Si el esquema real no coincide, hacemos UNA detección automática. En la
  // carga pública intentamos primero una lista mínima de columnas estables para
  // no convertir un campo opcional ausente en un select('*') innecesario.
  if (result.error && publicSummary)
  {
    const minimal = [
      "id", "nombre", "marca", "precio", "ml", "stock", "categoria",
      "genero", "familia", "destacado", "nuevo", "vendido", "imagen_url"
    ];

    const minimalResult =
      await supabaseClient
        .from("products")
        .select(minimal.join(","))
        .order("id", { ascending: true });

    if (!minimalResult.error)
    {
      result = minimalResult;
      columns = minimal;
    }
  }

  if (result.error)
  {
    console.warn(
      "La lista optimizada de columnas no coincide con products. Detectando esquema real una vez:",
      result.error.message
    );

    const fallback =
      await supabaseClient
        .from("products")
        .select("*")
        .order("id", { ascending: true });

    if (fallback.error)
    {
      throw fallback.error;
    }

    result = fallback;

    const firstRow = (fallback.data || [])[0];

    if (firstRow)
    {
      columns = Object.keys(firstRow);
      cacheProductColumns(columns);
    }
  }

  const rows = result.data || [];

  // Solo una carga completa puede afirmar cuáles son todas las columnas reales.
  // La carga pública resumida NO pisa esa caché con un subconjunto.
  if (!publicSummary)
  {
    if (rows.length)
    {
      const realColumns = Object.keys(rows[0]);
      state.productColumns = new Set(realColumns);
      cacheProductColumns(realColumns);
    }
    else
    {
      state.productColumns = new Set(columns);
    }
  }
  else
  {
    state.productColumns = new Set(columns);
  }

  state.products = rows.map(row => normalizeProduct(row));
}

async function loadProductDetailFields(productId)
{
  const id = Number(productId || 0);
  if (!id) return null;

  const current = getProductById(id);
  if (!current) return null;

  const columns = alp63ColumnsAvailable(PRODUCT_COLUMNS_LAZY_DETAIL);
  let result = await supabaseClient
    .from("products")
    .select(columns.join(","))
    .eq("id", id)
    .maybeSingle();

  // Si alguna columna opcional (por ejemplo una traducción) no existe en una
  // instalación vieja, el fallback afecta SOLO a esta ficha, nunca a todo el
  // catálogo. Así mantenemos compatibilidad sin volver al egress masivo.
  if (result.error)
  {
    result = await supabaseClient
      .from("products")
      .select("*")
      .eq("id", id)
      .maybeSingle();
  }

  if (result.error)
  {
    console.warn("Detalle diferido de producto:", result.error.message);
    return current;
  }

  if (result.data)
  {
    alp63MergeProductRows([result.data]);
  }

  return getProductById(id);
}

async function loadCatalogProductMetadata()
{
  const columns = alp63ColumnsAvailable(PRODUCT_COLUMNS_CATALOG_METADATA);
  const result = await supabaseClient
    .from("products")
    .select(columns.join(","));

  if (result.error)
  {
    console.warn("Metadatos diferidos del catálogo:", result.error.message);
    return;
  }

  alp63MergeProductRows(result.data || []);
}

function normalizeProduct(
  row
)
{
  return {
    ...row,

    id:
    asNumber(
      row.id,
      0
    ),

    nombre:
    String(
      row.nombre
      ||
      ""
    ),

    marca:
    String(
      row.marca
      ||
      ""
    ),

    precio:
    asNumber(
      row.precio,
      0
    ),

    ml:
    asNumber(
      row.ml,
      0
    ),

    stock:
    asNumber(
      row.stock,
      0
    ),

    categoria:
    String(
      row.categoria
      ||
      "Otros"
    ),

    genero:
    String(
      row.genero
      ||
      "Unisex"
    ),

    descripcion:
    String(
      row.descripcion
      ||
      ""
    ),

    salida:
    String(
      row.salida
      ||
      ""
    ),

    corazon:
    String(
      row.corazon
      ||
      ""
    ),

    fondo:
    String(
      row.fondo
      ||
      ""
    ),

    familia:
    String(
      row.familia
      ||
      ""
    ),

    duracion:
    String(
      row.duracion
      ||
      "Consultar"
    ),

    proyeccion:
    String(
      row.proyeccion
      ||
      "Consultar"
    ),

    recomendacion_uso:
    String(
      row.recomendacion_uso
      ||
      "Consultar"
    ),

    estaciones:
    arrayFromDb(
      row.estaciones
    ),

    ocasiones:
    arrayFromDb(
      row.ocasiones
    ),

    destacado:
    Boolean(
      row.destacado
    ),

    nuevo:
    Boolean(
      row.nuevo
    ),

    vendido:
    Boolean(
      row.vendido
    ),

    tipo_producto:
    String(
      row.tipo_producto
      ||
      "Perfume"
    ),

    tipo_producto_slug:
    String(
      row.tipo_producto_slug
      ||
      "perfume"
    ),

    subcategoria:
    String(
      row.subcategoria
      ||
      ""
    ),

    imagen_url:
    String(
      row.imagen_url
      ||
      ""
    ),
  };
}


async function mapWithConcurrency(
  items,
  limit,
  worker
)
{
  const list =
  Array.from(
    items
    ||
    []
  );

  const concurrency =
  Math.max(
    1,
    Math.min(
      Number(
        limit
      )
      ||
      1,
      list.length
      ||
      1
    )
  );

  let cursor =
  0;

  const runners =
  Array.from(
    {
      length:
      concurrency,
    },
    async () =>
    {
      while (
        true
      )
      {
        const index =
        cursor;

        cursor +=
        1;

        if (
          index >=
          list.length
        )
        {
          return;
        }

        await worker(
          list[
            index
          ],
          index
        );
      }
    }
  );

  await Promise.all(
    runners
  );
}

async function loadMainProductImages()
{
  state.productImages = {};
  state.productImageMeta = {};
  state.allProductImagesLoaded = false;
  state.productGalleryLoaded = new Set();
  state.productGalleryLoading = new Map();

  const storageItems = [];

  for (const product of state.products)
  {
    if (!product.imagen_url)
    {
      continue;
    }

    const normalized = normalizeStoragePath(product.imagen_url);
    const id = Number(product.id);

    if (normalized.kind === "external")
    {
      state.productImages[id] = [normalized.value];
      state.productImageMeta[id] = [{
        id: null,
        product_id: id,
        path: "",
        raw: product.imagen_url,
        url: normalized.value,
        orden: 0,
        legacy: true,
        mainOnly: true,
      }];
      continue;
    }

    if (normalized.kind !== "storage" || !normalized.value)
    {
      continue;
    }

    const cached = getCachedSignedUrl(normalized.value);

    if (cached)
    {
      state.productImages[id] = [cached];
      state.productImageMeta[id] = [{
        id: null,
        product_id: id,
        path: normalized.value,
        raw: product.imagen_url,
        url: cached,
        orden: 0,
        legacy: true,
        mainOnly: true,
      }];
      continue;
    }

    storageItems.push({
      id,
      path: normalized.value,
      raw: product.imagen_url,
    });
  }

  if (!storageItems.length)
  {
    return;
  }

  const mode = await detectStorageMode(storageItems[0].path);

  if (mode === "public")
  {
    for (const item of storageItems)
    {
      const url = publicStorageUrl(item.path);

      if (!url)
      {
        continue;
      }

      state.productImages[item.id] = [url];
      state.productImageMeta[item.id] = [{
        id: null,
        product_id: item.id,
        path: item.path,
        raw: item.raw,
        url,
        orden: 0,
        legacy: true,
        mainOnly: true,
      }];
    }

    return;
  }

  // Bucket privado: firmamos en LOTES, no una petición por cada producto.
  const chunkSize = 100;

  for (let start = 0; start < storageItems.length; start += chunkSize)
  {
    const chunk = storageItems.slice(start, start + chunkSize);
    const paths = chunk.map(item => item.path);

    const batch =
    await supabaseClient
      .storage
      .from(CONFIG.storageBucket)
      .createSignedUrls(paths, CONFIG.signedUrlSeconds);

    if (batch.error)
    {
      console.warn("Firma múltiple de imágenes:", batch.error.message);

      // Fallback controlado solo para este lote.
      await mapWithConcurrency(chunk, 6, async item =>
      {
        const url = await createCachedSignedUrl(item.path);

        if (!url)
        {
          return;
        }

        state.productImages[item.id] = [url];
        state.productImageMeta[item.id] = [{
          id: null,
          product_id: item.id,
          path: item.path,
          raw: item.raw,
          url,
          orden: 0,
          legacy: true,
          mainOnly: true,
        }];
      });

      continue;
    }

    const rows = batch.data || [];

    rows.forEach((signed, index) =>
    {
      const item = chunk[index];
      const url = signed?.signedUrl || signed?.url || "";

      if (!item || !url)
      {
        return;
      }

      cacheSignedUrl(item.path, url);

      state.productImages[item.id] = [url];
      state.productImageMeta[item.id] = [{
        id: null,
        product_id: item.id,
        path: item.path,
        raw: item.raw,
        url,
        orden: 0,
        legacy: true,
        mainOnly: true,
      }];
    });
  }
}

async function ensureProductGallery(
  productId
)
{
  const id =
  Number(
    productId
  );

  if (
    !id ||
    state.productGalleryLoaded.has(
      id
    )
  )
  {
    return;
  }

  if (
    state.productGalleryLoading.has(
      id
    )
  )
  {
    return state.productGalleryLoading.get(
      id
    );
  }

  const promise =
  (
    async () =>
    {
      const result =
      await supabaseClient
        .from(
          CONFIG.productImagesTable
        )
        .select(
          "id,product_id,image_url,orden"
        )
        .eq(
          "product_id",
          id
        )
        .order(
          "orden",
          {
            ascending:
            true,
          }
        )
        .order(
          "id",
          {
            ascending:
            true,
          }
        );

      if (
        result.error
      )
      {
        console.warn(
          "product_images detalle:",
          result.error.message
        );

        state.productGalleryLoaded.add(
          id
        );

        return;
      }

      const rows =
      result.data
      ||
      [];

      if (
        rows.length === 0
      )
      {
        state.productGalleryLoaded.add(
          id
        );

        return;
      }

      const resolvedRows =
      [];

      await mapWithConcurrency(
        rows,
        8,
        async row =>
        {
          const resolved =
          await resolveImageValue(
            row.image_url
          );

          resolvedRows.push(
            {
              row:
              row,

              resolved:
              resolved,
            }
          );
        }
      );

      resolvedRows.sort(
        (
          a,
          b
        ) =>
        {
          const orderDiff =
          asNumber(
            a.row.orden,
            0
          )
          -
          asNumber(
            b.row.orden,
            0
          );

          if (
            orderDiff !== 0
          )
          {
            return orderDiff;
          }

          return (
            asNumber(
              a.row.id,
              0
            )
            -
            asNumber(
              b.row.id,
              0
            )
          );
        }
      );

      const urls =
      [];

      const meta =
      [];

      for (
        const item of
        resolvedRows
      )
      {
        const row =
        item.row;

        const resolved =
        item.resolved;

        if (
          resolved.url &&
          !urls.includes(
            resolved.url
          )
        )
        {
          urls.push(
            resolved.url
          );
        }

        meta.push(
          {
            id:
            row.id,

            product_id:
            id,

            path:
            resolved.path
            ||
            normalizeStoragePath(
              row.image_url
            ).value,

            raw:
            row.image_url,

            url:
            resolved.url,

            orden:
            asNumber(
              row.orden,
              0
            ),
          }
        );
      }

      if (
        urls.length
      )
      {
        state.productImages[
          id
        ] =
        urls;
      }

      state.productImageMeta[
        id
      ] =
      meta;

      state.productGalleryLoaded.add(
        id
      );
    }
  )();

  state.productGalleryLoading.set(
    id,
    promise
  );

  try
  {
    await promise;
  }
  finally
  {
    state.productGalleryLoading.delete(
      id
    );
  }

  if (
    state.route ===
    "product" &&
    Number(
      state.routePayload?.id
    ) ===
    id
  )
  {
    renderCurrentRoute();
  }
}

async function loadProductImages()
{
  state.productImages =
  {};

  state.productImageMeta =
  {};

  const result =
  await supabaseClient
    .from(
      CONFIG.productImagesTable
    )
    .select(
      "id,product_id,image_url,orden"
    )
    .order(
      "orden",
      {
        ascending:
        true,
      }
    )
    .order(
      "id",
      {
        ascending:
        true,
      }
    );

  if (
    result.error
  )
  {
    console.warn(
      "product_images:",
      result.error.message
    );

    await loadLegacyProductImages();

    return;
  }

  const rows =
  result.data
  ||
  [];

  const resolvedRows =
  new Array(
    rows.length
  );

  await mapWithConcurrency(
    rows,
    12,
    async (
      row,
      index
    ) =>
    {
      resolvedRows[
        index
      ] =
      {
        row:
        row,

        resolved:
        await resolveImageValue(
          row.image_url
        ),
      };
    }
  );

  for (
    const item of
    resolvedRows
  )
  {
    if (
      !item
    )
    {
      continue;
    }

    const row =
    item.row;

    const resolved =
    item.resolved;

    const productId =
    asNumber(
      row.product_id,
      0
    );

    if (
      !state.productImages[
        productId
      ]
    )
    {
      state.productImages[
        productId
      ] =
      [];
    }

    if (
      !state.productImageMeta[
        productId
      ]
    )
    {
      state.productImageMeta[
        productId
      ] =
      [];
    }

    if (
      resolved.url
    )
    {
      state.productImages[
        productId
      ].push(
        resolved.url
      );
    }

    state.productImageMeta[
      productId
    ].push(
      {
        id:
        row.id,

        product_id:
        productId,

        path:
        resolved.path
        ||
        normalizeStoragePath(
          row.image_url
        ).value,

        raw:
        row.image_url,

        url:
        resolved.url,

        orden:
        asNumber(
          row.orden,
          0
        ),
      }
    );
  }

  await loadLegacyProductImages();

  state.allProductImagesLoaded =
  true;
}

async function loadLegacyProductImages()
{
  const missing =
  state.products.filter(
    product =>
    {
      const id =
      Number(
        product.id
      );

      const current =
      state.productImages[
        id
      ]
      ||
      [];

      return (
        current.length === 0 &&
        Boolean(
          product.imagen_url
        )
      );
    }
  );

  await mapWithConcurrency(
    missing,
    12,
    async product =>
    {
      const id =
      Number(
        product.id
      );

      const resolved =
      await resolveImageValue(
        product.imagen_url
      );

      if (
        resolved.url
      )
      {
        state.productImages[
          id
        ] =
        [
          resolved.url,
        ];

        state.productImageMeta[
          id
        ] =
        [
          {
            id:
            null,

            product_id:
            id,

            path:
            resolved.path,

            raw:
            product.imagen_url,

            url:
            resolved.url,

            orden:
            0,

            legacy:
            true,
          },
        ];
      }
    }
  );
}

function getProductImages(
  product
)
{
  if (
    !product
  )
  {
    return [];
  }

  return (
    state.productImages[
      Number(
        product.id
      )
    ]
    ||
    []
  )
  .filter(
    Boolean
  );
}

function getProductMainImage(
  product
)
{
  return (
    getProductImages(
      product
    )[0]
    ||
    ""
  );
}

