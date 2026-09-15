AROMALPARFUM FRONTEND V2 — PASO 57
SEGUIMIENTO DE PEDIDO V2

OBJETIVO
Cerrar el circuito post-compra con una consulta pública segura del estado del pedido, sin crear cuentas de cliente.

NUEVO
- Ruta pública “Seguimiento de pedido”.
- Deep link: ?pedido=CODIGO (el contacto nunca viaja en la URL).
- Consulta por código de pedido + email o teléfono usado en Checkout.
- Timeline: recibido → confirmado → preparando → enviado → entregado.
- Estado especial para pedidos cancelados.
- Estado de pago, pagado/saldo, total y método de pago.
- Correo/transporte y tracking cuando el Admin marca el pedido como enviado.
- Productos del pedido.
- Botones para copiar código, copiar tracking, compartir link y consultar por WhatsApp.
- Últimos 5 pedidos guardados solo en localStorage del dispositivo para acceso rápido.
- El modal de éxito de Checkout Seguro V2 agrega “Ver seguimiento”.

SEGURIDAD
La tienda NO hace SELECT directo a public.orders. Usa get_public_order_status(p_order_code,p_contact), SECURITY DEFINER, que exige coincidencia exacta de código + contacto.
La respuesta pública NO incluye nombre, email, teléfono, dirección, notas internas, costos, márgenes ni auditoría.

SUPABASE — REQUERIDO UNA VEZ
Antes de probar el seguimiento, ejecutá en Supabase > SQL Editor:
SETUP_PASO57_SEGUIMIENTO_PEDIDOS.sql

DESPLIEGUE
1. Ejecutar el SQL una vez.
2. Subir el contenido de este ZIP encima del PASO 56.
3. Reemplazar archivos existentes.
4. NO borrar /imagenes.

PRUEBA RECOMENDADA
1. Hacer un pedido desde Checkout V2.
2. En el modal final tocar “Ver seguimiento”.
3. Consultar con el código + email/teléfono del pedido.
4. Desde Admin > Pedidos cambiar confirmado / preparando / enviado / entregado.
5. Al enviar, cargar carrier + tracking y volver a consultar desde la tienda.
6. Probar un contacto incorrecto: no debe revelar ningún dato.
7. Abrir /?pedido=CODIGO: debe abrir el formulario con el código precargado.
