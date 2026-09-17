-- AromaLParfum V2.69 — PASO 2/2
-- Ejecutar DESPUÉS de importar el CSV en public.product_updates_import.
--
-- Conserva IDs existentes y NO toca:
--   products.imagen_url
--   product_images
--   descripciones/notas existentes
--   stock existente de productos ya creados

begin;

-- Actualiza productos existentes por NOMBRE + ML.
update public.products p
set
  precio = coalesce(u.precio, p.precio),
  tipo_producto_slug = coalesce(nullif(trim(u.tipo_producto_slug), ''), p.tipo_producto_slug),
  calidad_comercial = coalesce(nullif(trim(u.calidad_comercial), ''), p.calidad_comercial),
  presentacion_tipo = coalesce(nullif(trim(u.presentacion_tipo), ''), p.presentacion_tipo)
from public.product_updates_import u
where lower(trim(p.nombre)) = lower(trim(u.nombre))
  and coalesce(p.ml, 0) = coalesce(u.ml, 0);

-- Inserta solo productos que todavía no existen y tienen precio.
-- Stock 0 evita publicar disponibilidad inventada.
insert into public.products (
  nombre,
  ml,
  precio,
  categoria,
  genero,
  stock,
  tipo_producto_slug,
  calidad_comercial,
  presentacion_tipo
)
select
  trim(u.nombre),
  u.ml,
  u.precio,
  'Otros',
  'Unisex',
  0,
  coalesce(nullif(trim(u.tipo_producto_slug), ''), 'perfume'),
  coalesce(nullif(trim(u.calidad_comercial), ''), 'sin_clasificar'),
  coalesce(nullif(trim(u.presentacion_tipo), ''), case when coalesce(u.ml,0)=30 then '30ml' else 'regular' end)
from public.product_updates_import u
where u.precio is not null
  and not exists (
    select 1
    from public.products p
    where lower(trim(p.nombre)) = lower(trim(u.nombre))
      and coalesce(p.ml, 0) = coalesce(u.ml, 0)
  );

commit;

notify pgrst, 'reload schema';

-- CONTROL: confirma clasificación y que los productos conservan sus IDs/fotos.
select
  u.nombre,
  u.ml,
  u.precio as precio_csv,
  p.id as product_id,
  p.precio as precio_products,
  p.calidad_comercial,
  p.presentacion_tipo,
  p.imagen_url,
  case when p.id is null then 'NO_ENCONTRADO' else 'OK' end as estado
from public.product_updates_import u
left join public.products p
  on lower(trim(p.nombre)) = lower(trim(u.nombre))
 and coalesce(p.ml, 0) = coalesce(u.ml, 0)
order by u.nombre, u.ml;

select
  calidad_comercial,
  count(*) as productos
from public.products
group by calidad_comercial
order by calidad_comercial;

select
  presentacion_tipo,
  count(*) as productos
from public.products
group by presentacion_tipo
order by presentacion_tipo;

-- Opcional cuando ya verificaste todo:
-- truncate table public.product_updates_import;
