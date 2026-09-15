AromaLParfum — PASO 65
Security Hardening V2 + Admin Server Guard

IMPORTANTE
1) Ejecutar primero SETUP_PASO65_SECURITY_HARDENING.sql en Supabase > SQL Editor.
2) Recién después subir el frontend del Paso 65.
3) No borrar /imagenes al desplegar sobre el Paso 64.
4) La primera vez el Admin puede pedir iniciar sesión de nuevo porque la sesión deja de persistirse en localStorage.

QUÉ CAMBIA
- El email permitido en JavaScript deja de ser la autoridad de seguridad.
- /admin exige además admin_security_status_v2() desde Supabase antes de mostrar el panel.
- La sesión de Admin se guarda en sessionStorage; al cerrar la pestaña/navegador no queda persistida como antes.
- Se elimina el token legado de Supabase que versiones anteriores pudieran haber dejado en localStorage.
- Club y CRM ya no conservan grants directos para authenticated: siguen funcionando por sus RPC SECURITY DEFINER existentes.
- Se reafirma RLS en tablas sensibles conocidas de Club, CRM, Reseñas y Analytics.
- Se reafirma el acceso controlado a las RPC públicas de seguimiento, reseñas, Club y Analytics.
- Enlaces sociales administrables aceptan solo http:// y https:// y rechazan protocolos como javascript:.
- La dependencia CDN de Supabase queda fijada a @supabase/supabase-js@2.116.0 en vez de usar @2 flotante.
- Se agrega meta referrer strict-origin-when-cross-origin.
- Admin > Seguridad muestra el estado reportado por Supabase sin leer filas sensibles.

NUEVO BACKEND
- alp_admin_is_authorized_v2()
- admin_security_status_v2()

TABLAS ENDURECIDAS
- loyalty_settings
- loyalty_adjustments
- loyalty_benefits
- crm_settings
- crm_contact_preferences
- crm_consent_log
- crm_followups
- product_reviews
- store_analytics_events

NO CAMBIA
- create_store_order_v2
- precios
- stock
- Checkout Seguro
- Seguimiento
- Reseñas
- Club
- Reactivación CRM
- Analytics
- SEO
- carga lazy del Paso 63
- UX/accesibilidad del Paso 64

PRUEBA RECOMENDADA
1. Ejecutar SETUP_PASO65_SECURITY_HARDENING.sql y confirmar que devuelve paso 65.
2. Subir el ZIP sobre Paso 64.
3. Abrir /admin/ e iniciar sesión nuevamente si lo pide.
4. Confirmar que aparece “Acceso verificado por Supabase”.
5. Abrir Admin > Seguridad y comprobar los cuatro indicadores.
6. Cerrar la pestaña de Admin, abrir una nueva y comprobar que solicita sesión nuevamente.
7. Probar Productos, Pedidos, Club, Reactivación y Analytics para confirmar que las RPC siguen funcionando.
8. Probar Inicio/Catálogo/Producto/Checkout para confirmar que la tienda pública no cambió.

ROLLBACK
Los archivos modificados del Paso 64 quedaron en /backup con sufijo paso64.
