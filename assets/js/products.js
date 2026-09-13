"use strict";

// AromaLParfum Frontend V2 — Paso 37
// Módulo: productos, columnas, imágenes y galería

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
      localStorage.getItem(PRODUCT_COLUMNS_CACHE_KEY) || "null"
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
      localStorage.setItem(
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

async function loadProducts()
{
  let columns =
    getCachedProductColumns() ||
    PRODUCT_COLUMNS_PREFERRED.slice();

  let result =
    await supabaseClient
      .from("products")
      .select(columns.join(","))
      .order("id", { ascending: true });

  // Si el esquema real no coincide con la lista optimizada, hacemos UNA
  // detección automática con select('*'), guardamos las columnas reales y
  // desde la siguiente carga volvemos a una selección explícita.
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

  state.products = rows.map(row => normalizeProduct(row));
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

