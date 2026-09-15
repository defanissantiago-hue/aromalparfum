AromaLParfum — PASO 56
Landings de Campaña V2 + Deep Links + Atribución persistente

NUEVO
- /assets/js/campaigns-v2.js
- Ruta pública interna: campaign
- Links compartibles: ?campaign=slug
- Hero propio de campaña con imagen desktop/móvil, badge, textos y compartir
- Grilla de productos respetando campaign_products.orden
- Productos destacados de campaña visibles en la landing
- Los CTA de Home pueden abrir campaign:slug
- Si una campaña publicada tiene landing habilitada y su CTA era catalog/vacío, Home abre su landing automáticamente
- Admin > Merchandising muestra “Ver landing” para campañas con landing habilitada
- campaign_slug se conserva en sessionStorage y llega al Checkout Seguro V2 incluso después de navegar por productos/carrito
- Estados seguros para campañas pausadas, futuras o finalizadas

RENDIMIENTO
- No se agrega ninguna consulta nueva al inicio de Home.
- La landing primero reutiliza get_home_merchandising ya cargado.
- Solo usa fallback directo a campaigns/campaign_products al abrir un link que no vino en el payload inicial.
- Imágenes siguen usando resolución/lazy loading del frontend existente.

BACKEND REUTILIZADO
- campaigns
- campaign_products
- get_home_merchandising()
- create_store_order_v2() / attribution existente

NO REQUIERE SQL NUEVO.

PRUEBA RECOMENDADA
1. Admin > Merchandising > crear/editar una campaña.
2. Definir slug, activar “Landing habilitada”, publicar y agregar 2-3 productos.
3. Dejar CTA target vacío o “catalog” si querés que el bloque de Home abra la landing.
4. Abrir la Home y entrar desde la campaña.
5. Probar también /?campaign=tu-slug.
6. Abrir un producto, agregarlo al carrito y completar un pedido de prueba.
7. Verificar que Checkout V2 conserve campaign_slug en la atribución.
8. Pausar la campaña y comprobar que la landing ya no exponga productos si la política pública devuelve el registro.

Rollback de archivos modificados disponible en /backup con sufijo paso55.
