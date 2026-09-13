AromaLParfum — PASO 36

OBJETIVO
Crear la primera estructura frontend separada sin reescribir la lógica que hoy funciona.

ESTRUCTURA
/index.html                     -> entrada de la tienda
/admin/index.html               -> entrada separada del Admin
/assets/css/app.css             -> CSS extraído del index original
/assets/js/app.js               -> JavaScript extraído del index original
/backup/index_original.html     -> copia exacta del archivo oficial anterior

CAMBIOS DEL PASO 36
1. El CSS ya no vive dentro de index.html.
2. El JavaScript principal ya no vive dentro de index.html.
3. /admin/ abre directamente la ruta Admin.
4. Desde la tienda, el enlace Admin lleva a /admin/.
5. Desde /admin/, las rutas de tienda vuelven al nivel raíz.
6. Se quitó el cargador externo de Google AdSense del HTML.
7. No se cambió la conexión existente con Supabase.
8. No se cambió el bucket de imágenes ni la lógica de URLs firmadas/públicas.
9. El archivo backup/index_original.html permite volver atrás inmediatamente.

IMPORTANTE
Este paso es una migración estructural, no el rediseño final. app.js todavía contiene lógica de tienda y Admin mezclada internamente para evitar romper funciones. En los próximos pasos se irá separando por módulos, reemplazando la navegación antigua y conectando el backend nuevo construido en los pasos anteriores.

DESPLIEGUE EN GITHUB PAGES
- Hacé una copia o commit del estado actual antes de reemplazar archivos.
- Subí el contenido de esta carpeta a la raíz del repositorio aromalparfum.
- index.html debe quedar en la raíz.
- admin debe quedar como carpeta /admin/.
- assets debe quedar como carpeta /assets/.
- Conservá backup/ durante la migración.

PRUEBAS MÍNIMAS
- Abrir /aromalparfum/
- Confirmar que carga catálogo e imágenes.
- Entrar a un perfume.
- Abrir favoritos y carrito.
- Entrar a /aromalparfum/admin/ e iniciar sesión.
- Confirmar que el navegador no da 404 para assets/css/app.css ni assets/js/app.js.
