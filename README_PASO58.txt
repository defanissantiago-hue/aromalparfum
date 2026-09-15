AROMALPARFUM FRONTEND V2 — PASO 58
RESEÑAS VERIFICADAS V2

BASE
- Construido directamente sobre PASO 57.
- Mantiene Checkout Seguro V2, seguimiento de pedidos, campañas, rankings, colecciones, Gift Sets y Discovery Boxes.

ANTES DE SUBIR EL ZIP
1. Abrí Supabase > SQL Editor.
2. Ejecutá UNA sola vez:
   SETUP_PASO58_RESENAS_VERIFICADAS.sql
3. Verificá que termine sin errores.
4. Después subí el contenido del ZIP encima del Paso 57.
5. NO borres /imagenes.

QUÉ AGREGA

TIENDA PÚBLICA
- Sección de reseñas dentro de cada ficha de perfume.
- Promedio de estrellas y cantidad de reseñas publicadas.
- Distribución 5★ a 1★.
- Sello "Compra verificada".
- Distinción cuando la compra fue mediante decant.
- Reseñas destacadas por Admin.
- Botón "Escribir reseña".
- Las reseñas se cargan SOLO cuando se abre una ficha de producto.
- No se agregan consultas nuevas a Home ni al catálogo.

VERIFICACIÓN DE COMPRA
Para enviar una reseña el cliente necesita:
- producto real,
- código del pedido,
- mismo email o teléfono usado en Checkout,
- pedido con estado ENTREGADO,
- que ese producto exista realmente dentro de order_items.

Un mismo pedido solo puede reseñar una vez el mismo producto.

SEGUIMIENTO DE PEDIDO
- Cuando el pedido está Entregado, cada producto elegible muestra "Dejar reseña".
- Si ya se envió una reseña, muestra su estado:
  - en moderación,
  - publicada,
  - revisada.
- El contacto no se pone en botones ni URLs; se reutiliza en memoria desde la consulta segura del pedido.

ADMIN > RESEÑAS
Nueva pestaña para:
- ver pendientes,
- aprobar,
- rechazar,
- volver una reseña a pendiente,
- marcar/desmarcar como destacada,
- filtrar por estado,
- buscar por perfume, nombre visible o texto,
- copiar el código del pedido relacionado.

MODERACIÓN
- Ninguna reseña nueva se publica automáticamente.
- Entra como pending.
- Solo las approved aparecen públicamente y cuentan para el promedio.
- Rejected no aparece en tienda.

SEGURIDAD
- product_reviews tiene RLS activado.
- anon/authenticated NO tienen SELECT/INSERT/UPDATE/DELETE directo sobre la tabla.
- La tienda usa RPCs security definer con campos explícitamente limitados.
- La respuesta pública NO devuelve:
  - email,
  - teléfono,
  - dirección,
  - nombre completo del pedido,
  - order_id,
  - order_code,
  - notas internas,
  - costos,
  - márgenes.
- submit_verified_product_review_v2 verifica pedido + contacto + estado entregado + producto comprado.
- Admin usa RPC separada protegida por identidad de administrador.

RPC NUEVAS
- get_product_reviews_v2
- submit_verified_product_review_v2
- admin_get_product_reviews_v2
- admin_update_product_review_v2

RPC ACTUALIZADA
- get_public_order_status
  Ahora devuelve product_id y review_status por línea para habilitar reseñas desde el seguimiento. Sigue sin devolver identidad ni dirección.

ARCHIVO NUEVO FRONTEND
- assets/js/reviews-v2.js

PRUEBA RECOMENDADA
1. Elegí un pedido de prueba desde Admin > Pedidos.
2. Asegurate de que incluya un perfume individual o decant con product_id.
3. Marcá el pedido como Entregado.
4. Entrá a Seguimiento con código + email/teléfono.
5. Tocá "Dejar reseña".
6. Escribí una reseña y enviala.
7. Confirmá que todavía NO aparezca públicamente.
8. Entrá a Admin > Reseñas.
9. Aprobala.
10. Abrí la ficha del perfume.
11. Confirmá promedio, estrellas, texto y "Compra verificada".
12. Marcala como Destacada y verificá el cambio.
13. Intentá reseñar nuevamente el mismo perfume con el mismo pedido: debe bloquearse.
14. Intentá usar un pedido no entregado: debe bloquearse.
15. Intentá reseñar un perfume que no estaba en ese pedido: debe bloquearse.

ROLLBACK
Los archivos modificados del Paso 57 están conservados en /backup con sufijo paso57.

IMPORTANTE
Este paso NO crea reseñas ficticias ni ratings automáticos. Toda reseña pública tiene que provenir de una compra validada y ser aprobada por Admin.
