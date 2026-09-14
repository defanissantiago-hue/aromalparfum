AromaLParfum — Paso 43

Checkout Seguro V2

- Los pedidos se crean en Supabase con create_store_order_v2().
- El navegador no envía precios ni descuentos.
- Los métodos de pago salen de get_checkout_payment_config().
- Transferencia puede usar seña o pago completo según configuración.
- Probalo Antes se aplica en el servidor.
- WhatsApp queda como confirmación/asesoría después de crear el pedido.
- El descuento diario del 10% de juegos y la publicidad de juegos se retiraron del flujo activo.
- El carrito se limpia solo después de que Supabase confirma el pedido.
- Se usa checkout_token para evitar pedidos duplicados por doble clic/reintentos.

Subir el contenido de esta carpeta sobre el Paso 42, conservando /imagenes del repositorio.
