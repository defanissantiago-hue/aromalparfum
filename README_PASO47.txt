AromaLParfum — PASO 47
Clientes V2 + postventa

Cambios principales:
- Nueva pestaña "Clientes" en /admin/.
- Datos de clientes se cargan de forma lazy: no se consultan al abrir la tienda pública.
- KPIs: clientes, recurrentes, facturación atribuida, valor promedio y recompras pendientes.
- Buscador por nombre, teléfono y email.
- Perfil individual con historial de pedidos, gasto histórico, ticket promedio y última compra.
- Historial agregado de perfumes comprados.
- Sugerencias de recompra usando customer_repurchase.
- WhatsApp de seguimiento manual (nunca se envía automáticamente).
- Aviso explícito de usar recordatorios comerciales solo con consentimiento del cliente.
- Los datos permanecen protegidos por la autenticación/RLS del Admin.

Archivos nuevos:
- assets/js/customers-v2.js

Archivos modificados:
- assets/js/admin.js
- assets/js/events.js
- assets/css/app.css
- index.html
- admin/index.html

Backups Paso 46:
- backup/admin_paso46.js
- backup/events_paso46.js
- backup/app_paso46.css
- backup/index_paso46.html
- backup/admin_index_paso46.html
