-- AromaLParfum V2.69 — PASO 1/2
-- PREPARAR SUPABASE PARA DIFERENCIAR ORIGINAL / G5 / 30 ML / KITS
--
-- Ejecutar TODO este archivo primero en Supabase > SQL Editor.
-- No borra productos, IDs, fotos ni product_images.

begin;

alter table public.products
  add column if not exists calidad_comercial text not null default 'sin_clasificar';

alter table public.products
  add column if not exists presentacion_tipo text not null default 'regular';

-- Normalización segura de valores existentes.
update public.products
set calidad_comercial = 'sin_clasificar'
where calidad_comercial is null
   or trim(calidad_comercial) = ''
   or calidad_comercial not in ('sin_clasificar','original','g5_imitacion');

update public.products
set presentacion_tipo = case
  when lower(coalesce(nombre,'')) ~ '(kit|combo|set x)' then 'kit'
  when coalesce(ml,0) = 30 then '30ml'
  else 'regular'
end
where presentacion_tipo is null
   or trim(presentacion_tipo) = ''
   or presentacion_tipo not in ('regular','30ml','kit');

-- Solo marcamos Original automáticamente cuando el propio nombre lo afirma.
-- El resto queda sin clasificar para evitar etiquetar mal un producto.
update public.products
set calidad_comercial = 'original'
where lower(coalesce(nombre,'')) like '%original%'
  and calidad_comercial = 'sin_clasificar';

-- Señales explícitas en el nombre.
update public.products
set calidad_comercial = 'g5_imitacion'
where (
      lower(coalesce(nombre,'')) like '%g5%'
   or lower(coalesce(nombre,'')) like '%imitacion%'
   or lower(coalesce(nombre,'')) like '%imitación%'
   or lower(coalesce(nombre,'')) like '%inspiracion%'
   or lower(coalesce(nombre,'')) like '%inspiración%'
   or lower(coalesce(nombre,'')) like '%replica%'
   or lower(coalesce(nombre,'')) like '%réplica%'
)
  and calidad_comercial = 'sin_clasificar';

-- Constraints idempotentes.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_calidad_comercial_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_calidad_comercial_check
      check (calidad_comercial in ('sin_clasificar','original','g5_imitacion'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'products_presentacion_tipo_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_presentacion_tipo_check
      check (presentacion_tipo in ('regular','30ml','kit'));
  end if;
end $$;

-- Tabla temporal de importación. No reemplaza products.
create table if not exists public.product_updates_import (
  nombre text not null,
  ml numeric,
  precio numeric,
  tipo_producto_slug text,
  calidad_comercial text,
  presentacion_tipo text
);

alter table public.product_updates_import
  add column if not exists calidad_comercial text;

alter table public.product_updates_import
  add column if not exists presentacion_tipo text;

truncate table public.product_updates_import;

commit;

notify pgrst, 'reload schema';

select
  'LISTO_PARA_IMPORTAR_CSV' as estado,
  count(*) filter (where calidad_comercial = 'original') as originales,
  count(*) filter (where calidad_comercial = 'g5_imitacion') as g5_imitaciones,
  count(*) filter (where presentacion_tipo = '30ml') as presentaciones_30ml,
  count(*) filter (where presentacion_tipo = 'kit') as kits
from public.products;

-- SIGUIENTE PASO:
-- Table Editor > product_updates_import > Import data from CSV
-- Importar: SUPABASE_PRODUCTOS_CLASIFICADOS_SIN_TOCAR_FOTOS.csv
-- Después ejecutar 02_APLICAR_CSV_CLASIFICADO_SIN_PERDER_FOTOS.sql
