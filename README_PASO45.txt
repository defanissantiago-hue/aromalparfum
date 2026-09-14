AROMALPARFUM — FRONTEND V2 — PASO 45

Objetivo:
Crear un carrito más útil sin convertirlo en una zona de publicidad.

Cambios principales:
- Nuevo módulo assets/js/cart-v2.js.
- Barra flotante móvil con cantidad de productos + total.
- La barra solo aparece con carrito no vacío y se oculta al abrir drawers/modales.
- Recomendaciones del carrito conectadas con get_cart_recommendations().
- Máximo absoluto de 2 recomendaciones.
- Las recomendaciones excluyen productos ya presentes y productos sin stock.
- Se respeta la configuración site_settings.cart_experience.
- Si el carrito alcanza el límite configurado (por defecto 6 artículos), las recomendaciones se ocultan.
- Cache de recomendaciones durante 60 segundos para evitar consultas repetidas innecesarias.
- Fichas compactas con motivo, precio, abrir producto y agregar.
- No se modificó el Checkout V2 seguro.
- Backups del Paso 44 incluidos en /backup.

Pruebas recomendadas:
1. En móvil, agregar 1 producto y comprobar la barra inferior con cantidad + total.
2. Abrir el carrito desde la barra flotante.
3. Verificar que aparezcan como máximo 2 recomendaciones cuando el backend tenga datos.
4. Agregar una recomendación y comprobar que desaparezca de las sugerencias posteriores.
5. Cambiar cantidad y comprobar que el total flotante se actualice instantáneamente.
6. Eliminar todos los productos y confirmar que la barra desaparezca.
7. Con 6 o más artículos, comprobar que las recomendaciones no se muestren.
8. Finalizar una compra de prueba y confirmar que Checkout V2 siga funcionando.
9. Confirmar que /admin/ siga funcionando.
