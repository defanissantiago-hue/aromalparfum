AromaLParfum — Frontend V2 — Paso 39
=====================================

OBJETIVO
--------
Actualizar el catálogo sin romper el frontend estable del Paso 38.

NOVEDADES
---------
1. Búsqueda inteligente conectada a search_products_smart().
2. Autocompletado conectado a search_products_autocomplete().
3. Fallback local si un RPC no responde o cambia su firma.
4. Filtros avanzados:
   - género
   - estilo
   - ocasión
   - temporada
   - origen / segmento
   - familia olfativa
   - precio mínimo
   - precio máximo
5. Las búsquedas inteligentes se hacen con debounce para reducir llamadas a Supabase.
6. Los filtros se aplican localmente sobre el catálogo ya cargado, sin hacer una consulta por cada cambio.
7. Nueva interfaz responsive del catálogo.

ARCHIVOS NUEVOS
---------------
/assets/js/catalog-v2.js

ARCHIVOS MODIFICADOS
--------------------
/index.html
/admin/index.html
/assets/js/config.js
/assets/js/events.js
/assets/css/app.css

BACKUP
------
/backup/config_paso38.js
/backup/events_paso38.js
/backup/store_paso38.js

PUBLICACIÓN
-----------
Subir el contenido de esta carpeta sobre el repositorio actual y reemplazar archivos existentes.
No borrar /imagenes.

PRUEBAS RECOMENDADAS
--------------------
- Catálogo carga normalmente.
- Buscar por nombre: Hawas.
- Buscar una frase: vainilla y coco.
- Buscar: para verano.
- Probar autocompletado.
- Aplicar género + temporada.
- Aplicar ocasión + familia.
- Aplicar rango de precio.
- Restablecer filtros.
- Abrir producto y agregar al carrito.
- Verificar /admin/.
