AromaLParfum Frontend V2 — PASO 50

Inventario V2 conectado al backend del PASO 32.

Incluye:
- nueva pestaña Inventario en /admin/
- KPIs de stock, agotados, reposición, stock bajo e inmovilizados
- capital inmovilizado calculado solo con costos conocidos
- plan de reposición priorizado
- velocidad de venta 30/90 días
- cobertura estimada en días
- stock equivalente incluyendo líquido abierto de decants
- buscador + filtros por estado y velocidad
- paginación de 20 productos
- edición de estrategia por producto mediante admin_update_inventory_strategy()
- demora de proveedor, stock de seguridad, cobertura objetivo y umbral de inmovilización
- las recomendaciones nunca compran automáticamente

Archivos principales modificados:
- assets/js/inventory-v2.js (nuevo)
- assets/js/admin.js
- assets/js/events.js
- assets/css/app.css
- admin/index.html

Los archivos anteriores modificados quedaron respaldados en /backup con sufijo paso49.
