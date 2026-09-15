AromaLParfum — PASO 49
Pedidos V2

Incluye:
- Nueva pestaña Pedidos dentro de /admin/.
- Listado paginado con filtros por estado/pago y búsqueda.
- Detalle de pedido, cliente, items, totales y saldo.
- Confirmación de pedido + aplicación de stock mediante admin_confirm_order().
- Pipeline confirmado → preparando → enviado → entregado mediante admin_update_order_status().
- Transportista + tracking al marcar enviado.
- Registro de seña, saldo, pago completo, ajustes y reembolsos mediante admin_record_order_payment().
- Cancelación mediante admin_cancel_order().
- Historial de pagos y order_audit_log.
- Acceso a WhatsApp del cliente y copia de código de pedido.
- Actualización/invalidez del Dashboard después de mutaciones.

Seguridad:
- El módulo solo se carga con el Admin autenticado.
- No calcula precios ni altera stock desde el navegador: usa RPCs administrativos de Supabase.
- Las acciones sensibles piden confirmación visual antes de ejecutar.

Archivos principales modificados:
- assets/js/orders-v2.js (nuevo)
- assets/js/admin.js
- assets/js/events.js
- assets/css/app.css
- index.html
- admin/index.html

Backups del Paso 48 disponibles en /backup.
