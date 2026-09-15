AromaLParfum — PASO 53
Gift Sets + Discovery Boxes V2

NUEVO
- /assets/js/gift-packs-v2.js
- Nueva pestaña "Sets & Boxes" en /admin/
- CRUD no destructivo de Gift Sets y Discovery Boxes
- Gift Sets: nombre, nivel, descripción, precio promo, costo de presentación, margen mínimo, badge, orden y destacado
- Gift Sets: selección de productos, cantidad y orden
- Discovery Boxes: selección de perfumes, tamaño de decant, cantidad y orden
- Panel financiero con valor normal, ahorro, descuento, costo, ganancia, margen y precio mínimo seguro
- Publicación segura mediante admin_set_entity_visibility()
- Botón Publicar bloqueado si admin_gift_set_financials / admin_discovery_box_financials indican que no es seguro
- Si un pack ya publicado se edita y deja de ser financieramente seguro, el Admin intenta pausarlo automáticamente
- No se eliminan packs completos desde esta interfaz: se pausan para conservar historial

BACKEND UTILIZADO
- gift_sets
- gift_set_products
- discovery_boxes
- discovery_box_products
- decant_sizes
- admin_gift_set_financials
- admin_discovery_box_financials
- admin_set_entity_visibility()
- products

PRUEBA RECOMENDADA
1. Entrar a /admin/ -> Sets & Boxes.
2. Crear un Gift Set inactivo con precio promocional.
3. Agregar 2 productos y revisar valor normal, ahorro y margen.
4. Intentar publicar. Si faltan costos o margen, debe quedar bloqueado.
5. Corregir precio/costos y publicar cuando figure "Apto para publicar".
6. Crear una Discovery Box, agregar 2 o 3 decants y elegir sus ml.
7. Revisar costo, margen y precio mínimo seguro.
8. Confirmar que Inventario, Finanzas, Pedidos y Merchandising siguen funcionando.

Rollback de los archivos modificados disponible en /backup con sufijo paso52.
