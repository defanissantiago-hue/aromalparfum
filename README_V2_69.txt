AromaLParfum V2.69 — Originales / G5 / 30 ml / Kits

ORDEN CORRECTO
1) Ejecutar TODO 01_PREPARAR_SUPABASE_CLASIFICACION.sql en Supabase SQL Editor.
2) Ir a Table Editor > product_updates_import > Import data from CSV.
3) Importar SUPABASE_PRODUCTOS_CLASIFICADOS_SIN_TOCAR_FOTOS.csv.
4) Ejecutar TODO 02_APLICAR_CSV_CLASIFICADO_SIN_PERDER_FOTOS.sql.
5) Subir el frontend V2.69 sobre la versión 68. NO borrar /imagenes.
6) Hacer Ctrl+F5.

CAMPOS NUEVOS
products.calidad_comercial:
- sin_clasificar
- original
- g5_imitacion

products.presentacion_tipo:
- regular
- 30ml
- kit

IMPORTANTE
La calidad y la presentación son independientes. Ejemplo: un producto puede ser
G5/Imitación + 30 ml. Los productos sin evidencia explícita quedaron sin_clasificar
para no etiquetarlos incorrectamente.

FOTOS
El flujo actualiza products por nombre + ml y conserva los IDs existentes.
No pisa imagen_url y no toca product_images.
