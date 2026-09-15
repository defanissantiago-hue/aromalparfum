# PASO 62 — SEO & Deep Links V2

## Qué agrega
- Deep links públicos: `?product=ID`, `?collection=slug`, `?campaign=slug` y `?view=...`.
- Metadata dinámica por ruta: title, description, canonical, robots, Open Graph y Twitter Card.
- JSON-LD: Organization, WebSite, Product, CollectionPage y BreadcrumbList.
- Botón Compartir en la ficha de producto con Web Share API y fallback a copiar enlace.
- `robots.txt`, `sitemap.xml` y `404.html` para GitHub Pages.
- Imagen social de marca: `assets/seo/aromalparfum-share.png` (1200×630).
- Admin y rutas privadas marcadas `noindex`.

## Supabase
No requiere SQL. No agrega consultas a Supabase.

## Pruebas sugeridas
1. Abrir `/?product=ID` con un ID real.
2. Compartir un perfume y abrir el enlace en incógnito.
3. Abrir `/?collection=slug`.
4. Probar `/?view=catalog` y `/?view=best`.
5. Verificar que `robots.txt` y `sitemap.xml` respondan 200 luego del deploy.
6. Revisar el `<head>` en DevTools: canonical, OG y JSON-LD deben actualizarse al navegar.

## Nota sobre previews sociales
GitHub Pages es estático: WhatsApp/Instagram/Facebook normalmente no ejecutan JavaScript al generar el preview. Por eso el HTML base incluye una tarjeta social de marca estable. Dentro del navegador, producto/colección sí actualizan metadata dinámica; para previews sociales 100% específicos por producto haría falta prerender/SSR o una función server-side, que no se agregó para no aumentar complejidad/costo.
