AROMALPARFUM FRONTEND V2 — PASO 61
ANALYTICS FIRST-PARTY V2 — EMBUDO REAL + ATRIBUCIÓN ANÓNIMA + RETENCIÓN

BASE
- Construido directamente sobre PASO 60.
- Mantiene Checkout Seguro V2, seguimiento, reseñas verificadas, Club, CRM, campañas, colecciones, rankings, packs, inventario y finanzas.

ANTES DE SUBIR EL ZIP
1. Supabase > SQL Editor.
2. Ejecutá UNA sola vez SETUP_PASO61_ANALYTICS_FIRST_PARTY.sql.
3. Después subí este ZIP encima del Paso 60.
4. NO borres /imagenes.

QUÉ RESUELVE
- El Dashboard del Paso 48 ya tenía el diseño del embudo, pero faltaba registrar navegación real de la tienda.
- PASO 61 agrega Analytics propio de AromaLParfum, sin Google Analytics ni trackers externos.
- El Dashboard usa ahora eventos reales para Sesiones > Vista de producto > Carrito > Checkout.
- El último paso, Pedidos pagados, sigue saliendo de public.orders verificados. Los eventos del navegador NUNCA se consideran facturación.

EVENTOS ANÓNIMOS
- session_start
- page_view
- product_view
- add_to_cart
- checkout_start
- checkout_submit
- order_created

PRIVACIDAD
Analytics NO guarda:
- nombre
- email
- teléfono
- dirección
- IP
- código de pedido
- texto de reseñas
- mensajes
- contenido libre

Analytics guarda únicamente:
- hash del identificador aleatorio de sesión
- ruta lógica (home, catalog, product, campaign, etc.)
- ID numérico de producto cuando corresponde
- campaign slug / UTM sanitizados
- dominio de referencia, no URL completa
- mobile / tablet / desktop
- cantidad de líneas y unidades en carrito
- fecha del evento

La RPC pública recibe el session_id aleatorio, pero la tabla persiste solamente md5(session_id).
La tabla no tiene SELECT/INSERT/UPDATE/DELETE directo para anon/authenticated.
Toda ingesta pública pasa por track_store_events_v2().

ANTIABUSO
- Máximo 20 eventos por request.
- Lista blanca cerrada de tipos de eventos.
- Máximo 250 eventos por sesión cada 10 minutos.
- Campos sanitizados y limitados en longitud.
- No acepta payload libre que se guarde en la tabla.

PERFORMANCE / SUPABASE FREE TIER
- Los eventos se acumulan en sessionStorage y se mandan en lote.
- Flush normal al llegar a 5 eventos o después de ~12 segundos.
- También intenta flush cuando la pestaña pasa a segundo plano.
- No hay polling.
- No hay Realtime.
- No hay consulta nueva en Home, Catálogo, Producto o Checkout: la tienda solo hace escrituras batch de Analytics.
- El panel Analytics se consulta únicamente al abrir Admin > Analytics.
- Botón “Limpiar >180d” permite borrar eventos históricos sin tocar pedidos/clientes.

ADMIN > ANALYTICS
Muestra:
- sesiones
- sesiones que vieron producto
- sesiones que agregaron al carrito
- sesiones que iniciaron checkout
- pedidos pagados reales
- conversión entre etapas
- conversión sesión -> pedido pagado
- sesiones diarias
- fuentes UTM/referral/direct
- mobile/tablet/desktop
- productos por interés y tasa vista -> carrito
- campañas con sesiones, vistas, carrito y checkout
- cantidad total de eventos anónimos

DASHBOARD GENERAL
- PASO 48 Dashboard ahora intenta cargar admin_get_conversion_analytics_v2().
- Si el SQL de PASO 61 no fue instalado, el resto del Dashboard sigue funcionando y muestra un aviso.
- Ventas/ganancia nunca dependen de Analytics.

ATRIBUCIÓN DE CHECKOUT
- create_store_order_v2 sigue recibiendo p_attribution como antes.
- session_id ahora utiliza la sesión de Analytics V2 cuando está disponible.
- UTM/campaign existente del Checkout V2 se conserva.

PACKS / REGALOS / DECANTS
- Cuentan como sesión con add_to_cart para el embudo.
- No se atribuyen artificialmente a un perfume individual.
- La tasa por producto usa agregados directos de ese perfume.

PRUEBA RECOMENDADA
1. Ejecutá SETUP_PASO61_ANALYTICS_FIRST_PARTY.sql.
2. Abrí la tienda en una ventana privada.
3. Navegá Inicio > Catálogo > un perfume.
4. Agregalo al carrito.
5. Abrí Checkout.
6. Registrá un pedido de prueba si querés comprobar order_created.
7. Esperá unos segundos o cambiá de pestaña para forzar el batch.
8. Entrá a Admin > Analytics y tocá Actualizar.
9. Comprobá que suban Sesiones / Vieron producto / Carrito / Checkout.
10. Un pedido NO debe contar como “Pagado” hasta que su payment_status sea pagado.
11. Marcá el pedido pagado desde Admin > Pedidos, refrescá Analytics y comprobá el último paso.
12. Probá ?utm_source=instagram&utm_medium=social&utm_campaign=prueba61 y comprobá la fuente.
13. Probá una landing ?campaign=<slug> y comprobá la campaña.
14. Verificá que Admin > Dashboard muestre el mismo funnel anónimo.
15. Opcional: probá Limpiar >180d; no debe borrar pedidos, clientes ni reseñas.

ROLLBACK
- Los archivos modificados del Paso 60 están guardados en /backup con sufijo paso60.
