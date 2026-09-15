AromaLParfum — PASO 52
Campañas y Merchandising V2

NUEVO
- /assets/js/merchandising-v2.js
- Nueva pestaña "Merchandising" en /admin/
- Administración de campañas y landings
- Asignación y orden de productos por campaña
- Banners por ubicación (home_hero, home_secondary, catalog, decants, gifts, collections)
- Fragancia de la semana programable
- Fechas de inicio/fin, publicación/pausa y orden
- Costo de marketing por campaña para ROAS
- Subida de imágenes al bucket actual de Supabase Storage
- No se borran campañas: se pueden pausar/despublicar

BACKEND UTILIZADO
- campaigns
- campaign_products
- campaign_banners
- weekly_fragrances
- admin_set_entity_visibility()
- products

PRUEBA RECOMENDADA
1. Entrar a /admin/ -> Merchandising.
2. Crear una campaña inactiva y guardarla.
3. Agregar 2 o 3 productos y cambiar su orden.
4. Publicar la campaña.
5. Crear un banner home_secondary o home_hero.
6. Programar una Fragancia de la Semana.
7. Abrir la tienda pública y comprobar Home V2.

Rollback de los archivos modificados disponible en /backup con sufijo paso51.
