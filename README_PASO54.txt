AROMALPARFUM — PASO 54
Gift Sets + Discovery Boxes V2 en la tienda pública

Cambios principales:
- Gift Sets publicados se cargan desde gift_sets + gift_set_products al entrar en la sección.
- Discovery Boxes publicadas se cargan desde discovery_boxes + discovery_box_products al entrar en la sección.
- No se cargan estas tablas en el arranque de la Home: carga diferida para ahorrar Supabase.
- Diseño propio para cada pack, con collage de productos, contenido y precio promocional.
- Gift Sets muestran valor por separado y ahorro calculado con precios actuales del catálogo.
- Discovery Boxes muestran valor aproximado por separado usando la configuración local de decants y el ajuste global configurado.
- Botón directo al carrito.
- Checkout V2 recibe solo giftSetId/discoveryBoxId; el servidor vuelve a calcular y validar el pedido.
- Gift Sets sin stock suficiente se muestran pero no se pueden agregar.
- Se conservan los accesos a Gift Builder y al constructor de Decants.

Pruebas recomendadas:
1. Publicar un Gift Set válido desde Admin > Sets & Boxes.
2. Abrir Inicio > Sets de regalo.
3. Verificar contenido, precio, ahorro y Agregar al carrito.
4. Finalizar un pedido de prueba y comprobar item type gift_set.
5. Publicar una Discovery Box válida.
6. Abrir Inicio > Discovery Sets/Boxes.
7. Agregar la box y hacer un pedido de prueba.
8. Confirmar que /admin/ continúa funcionando.
