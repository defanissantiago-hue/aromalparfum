AROMALPARFUM FRONTEND V2 — PASO 59
CLUB AROMALPARFUM V2 — PUNTOS + NIVELES + BENEFICIO 20% HISTORIA

BASE
- Construido directamente sobre PASO 58.
- Mantiene Checkout Seguro V2, seguimiento, reseñas verificadas, campañas, rankings, colecciones y packs.

ANTES DE SUBIR EL ZIP
1. Supabase > SQL Editor.
2. Ejecutá UNA sola vez SETUP_PASO59_CLUB_AROMALPARFUM.sql.
3. Después subí este ZIP encima del Paso 58.
4. NO borres /imagenes.

PUNTOS AROMA
- Se calculan únicamente con pedidos cuyo status sea entregado y payment_status sea pagado.
- Por defecto: 1 punto cada $1.000 elegibles.
- Esencia: desde 0 puntos.
- Signature: desde 150 puntos.
- Privé: desde 350 puntos.
- Todos esos valores son editables desde Admin > Club.
- Si un pedido deja de estar pagado/entregado, deja de contar automáticamente porque los puntos base se calculan desde pedidos reales; no se confía en el navegador.
- Admin puede sumar/restar puntos manuales dejando un motivo auditable.

ACCESO PÚBLICO SIN CUENTA
- Ruta Club AromaLParfum en menú y footer.
- Verificación con código de pedido + mismo email/teléfono de la compra.
- Deep link: ?club=ALP-... (nunca incluye email/teléfono).
- Muestra puntos, nivel, progreso, compras elegibles y beneficios.
- Pedidos recientes del dispositivo pueden autocompletar el acceso.

BENEFICIO POR HISTORIA
- Política inicial: 20% OFF en la próxima compra por subir una historia mostrando la compra y etiquetando AromaLParfum.
- El porcentaje es editable desde Admin > Club.
- Solo se puede solicitar con un pedido pagado + entregado.
- El cliente informa su usuario de Instagram y una nota opcional.
- La solicitud queda PENDIENTE. Nunca se aprueba sola.
- Admin verifica la etiqueta y puede Aprobar/Rechazar.
- Al aprobar, Supabase genera un código único.
- El cliente ve el código y puede abrir WhatsApp con el beneficio preparado.
- Admin marca el beneficio como Usado cuando confirma la compra real.
- El código NO modifica precios automáticamente en Checkout: se evita confiar descuentos al frontend y se mantiene control de margen.

ADMIN > CLUB
- KPIs: clientes, clientes con puntos, puntos emitidos, facturación elegible y solicitudes pendientes.
- Configuración de tasa de puntos, umbrales de niveles y % por historia.
- Buscador de clientes y resumen de puntos/gasto/nivel.
- Ajustes manuales de puntos con motivo.
- Cola de beneficios de Instagram: pendiente, aprobado, usado, rechazado.

SEGURIDAD
- loyalty_settings, loyalty_adjustments y loyalty_benefits tienen RLS.
- La tienda pública no hace SELECT/INSERT/UPDATE/DELETE directo.
- Acceso público solo por RPC con código + contacto.
- El Club público no lista email, teléfono ni dirección.
- Las funciones Admin exigen identidad de administrador.
- El descuento se verifica y confirma manualmente; no se pasa un precio rebajado desde el navegador.

PERFORMANCE
- No agrega consultas a Home.
- No agrega consultas a Catálogo.
- No agrega consultas a fichas de producto.
- La RPC pública corre solo al abrir Club y consultar.
- Admin carga datos del Club solo al abrir esa pestaña.

PRUEBA RECOMENDADA
1. Elegí un pedido Pagado + Entregado.
2. Abrí Club y consultá código + email/teléfono.
3. Confirmá puntos, gasto y nivel.
4. Desde seguimiento de ese pedido tocá Ver mis Puntos Aroma.
5. Solicitá el beneficio por historia con un @ de prueba.
6. Admin > Club: verificá que aparezca Pendiente.
7. Aprobalo y confirmá que genere un código AROMA-XXXXXXXX.
8. Volvé al Club del cliente y confirmá que aparezca Aprobado + código.
9. Tocá Usar por WhatsApp.
10. En Admin marcá el beneficio como Usado.
11. Ajustá puntos manualmente y confirmá que el total/nivel se actualice.
12. Cambiá la tasa o umbrales solo si querés otra estrategia.

ROLLBACK
- Los archivos modificados del Paso 58 se guardaron en /backup con sufijo paso58.
