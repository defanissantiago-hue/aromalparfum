AromaLParfum Frontend V2 — PASO 66
Resilience & Diagnostics V2

OBJETIVO
Hacer que la tienda falle de forma controlada ante problemas de red, almacenamiento
local o errores inesperados, sin exponer errores técnicos al cliente y sin sumar
consultas permanentes a Supabase.

NOVEDADES
- Nuevo assets/js/resilience-v2.js.
- Aviso online/offline no intrusivo.
- Fallos de bootstrap y rutas con pantalla recuperable + Reintentar.
- Errores técnicos se convierten en códigos sanitizados ALP66-*.
- No se muestra al cliente el mensaje crudo de Supabase/PostgREST.
- Errores recientes se conservan solo en sessionStorage de esa pestaña.
- Admin → Diagnóstico con reporte local copiable y sin PII.
- Reintento único para excepciones transitorias de red durante carga lazy.
- Acciones async del frontend quedan protegidas por un error boundary.
- localStorage encapsulado con fallback en memoria para carrito, favoritos y borradores.
- No se agregan tablas, RPC, polling ni consultas de negocio.

PRIVACIDAD DEL DIAGNOSTICO
No guarda ni copia:
- nombre de clientes
- email
- teléfono
- dirección
- código de pedido
- texto de reseñas/mensajes
- URLs completas

El informe incluye únicamente versión, conexión, ruta lógica, cantidad de datos cargados,
módulos disponibles y categorías/códigos de error sanitizados.

INSTALACION
1. Subir este paquete encima del PASO 65.
2. Reemplazar archivos existentes.
3. NO borrar /imagenes del despliegue.
4. No ejecutar SQL: PASO 66 es frontend-only.
5. Hacer Ctrl+F5 tras publicar.

PRUEBAS SUGERIDAS
- Abrir Inicio, Catálogo, una ficha y Checkout.
- Desactivar Wi-Fi: debe aparecer “Sin conexión”.
- Volver a activar Wi-Fi: debe aparecer “Conexión restablecida”.
- Admin → Diagnóstico: revisar estado y copiar informe.
- Limpiar errores desde Diagnóstico.
- Carrito/favoritos deben seguir funcionando normalmente.
