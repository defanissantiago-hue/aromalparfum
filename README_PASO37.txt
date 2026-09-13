AROMALPARFUM — FRONTEND V2 — PASO 37
==========================================

OBJETIVO
--------
Dividir el antiguo assets/js/app.js de ~21.000 líneas en archivos por responsabilidad,
sin reescribir todavía la lógica comercial que ya funciona.

MÓDULOS ACTIVOS (orden de carga)
--------------------------------
1. config.js        Traducciones, CONFIG, cliente Supabase y estado global.
2. core.js          Utilidades, UI base y resolución de imágenes/Storage.
3. products.js      Productos, columnas, normalización, imágenes y galería.
4. supabase-data.js Settings, colecciones, juegos, tipos, combos, decants y regalos.
5. store.js         Router y render de Home/Catálogo/Producto/Colecciones.
6. cart.js          Carrito, checkout legado y favoritos.
7. builders.js      Constructor de decants y regalos.
8. games.js         Experiencias/juegos actuales.
9. advisor.js       Asesor, Acerca de y Contacto.
10. admin.js        Administración.
11. events.js       Eventos globales e inicialización.

IMPORTANTE
----------
- assets/js/app.js YA NO se carga. Queda un archivo mínimo como marcador de migración.
- El bundle completo anterior está guardado en backup/app_paso36.js.
- index.html y admin/index.html cargan los módulos en un orden fijo.
- Esta etapa usa scripts clásicos deliberadamente: permite separar responsabilidades sin
  introducir de golpe un bundler/import map y reduce el riesgo de romper el sitio.
- No se cambió la configuración del bucket ni la clave publicable de Supabase.

QUÉ PROBAR DESPUÉS DE SUBIR
---------------------------
1. Abrir /aromalparfum/ y confirmar Home + productos + imágenes.
2. Abrir un producto.
3. Agregar/remover un producto del carrito.
4. Abrir Decants y Regalos.
5. Abrir /aromalparfum/admin/ y confirmar login/panel.
6. F12 > Console: no debe haber errores rojos al cargar.

ROLLBACK
--------
El Paso 36 completo sigue disponible en backup/app_paso36.js y backup/index_original.html.

SIGUIENTE ETAPA
---------------
Separar la carga de Store/Admin y comenzar a conectar las funciones V2 creadas en Supabase
(checkout seguro, merchandising, búsqueda, quiz, comparador, carrito inteligente, etc.).
