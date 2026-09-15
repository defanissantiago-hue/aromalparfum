AROMALPARFUM FRONTEND V2 — PASO 60
REACTIVACIÓN CRM V2 — CONSENTIMIENTOS + COLA MANUAL + TRAZABILIDAD

BASE
- Construido directamente sobre PASO 59.
- Mantiene Checkout Seguro V2, seguimiento, reseñas verificadas, Club, campañas, colecciones, rankings y packs.

ANTES DE SUBIR EL ZIP
1. Supabase > SQL Editor.
2. Ejecutá UNA sola vez SETUP_PASO60_REACTIVACION_CRM.sql.
3. Después subí este ZIP encima del Paso 59.
4. NO borres /imagenes.

QUÉ RESUELVE
- PASO 47 ya sugería recompras, pero no registraba consentimiento ni historial de contacto.
- PASO 60 agrega consentimiento explícito, cola manual, trazabilidad y segmentos seguros.
- NO envía mensajes automáticamente.

CONSENTIMIENTO
- Estados: Sin registrar / Autorizó / No autoriza.
- Sin registrar NO habilita WhatsApp.
- Solo Autorizó permite crear y abrir seguimientos de WhatsApp.
- Al marcar No autoriza (o volver a Sin registrar), cualquier seguimiento pendiente/pospuesto de WhatsApp se cancela automáticamente.
- Cada cambio queda auditado en crm_consent_log con origen, nota, administrador y fecha.

SEGMENTOS
- Primera recompra: por defecto 21 días después de una primera compra pagada + entregada.
- Cliente inactivo: por defecto 45 días sin una compra pagada + entregada.
- VIP para reactivar: por defecto gasto elegible >= $150.000 y 30 días sin compra.
- Activo: no entra en reactivación automática.
- Umbrales editables desde Admin > Reactivación.

COLA MANUAL
- “Generar cola segura” crea tareas SOLO para clientes reactivables con consentimiento WhatsApp Autorizó.
- Evita duplicar el mismo motivo si ya hay una tarea abierta o un contacto reciente equivalente.
- Estados: Pendiente / Contactado / Pospuesto / Cerrado / Cancelado.
- Posponer mueve la fecha 7 días.
- Abrir WhatsApp solo prepara el mensaje: el envío sigue siendo una acción humana.
- Marcar Contactado es una acción separada para no registrar un contacto si solo se abrió WhatsApp y se cerró.

INTEGRACIÓN CON CLIENTES V2
- Los viejos botones de seguimiento de Admin > Clientes ya no abren WhatsApp directamente.
- Ahora llevan a Reactivación y pasan por la compuerta de consentimiento.

PRIVACIDAD Y SEGURIDAD
- Todo el módulo es Admin-only.
- No agrega ninguna RPC pública.
- Las tablas CRM usan RLS y no tienen policies de acceso directo.
- Las operaciones pasan por RPC security definer que valida el email administrador.
- No hay envío automático, polling, Realtime ni integración que contacte al cliente sin una acción manual.

PERFORMANCE
- 0 consultas nuevas en Home.
- 0 consultas nuevas en Catálogo.
- 0 consultas nuevas en producto/checkout/seguimiento/Club.
- Reactivación se carga lazy únicamente al abrir Admin > Reactivación.

PRUEBA RECOMENDADA
1. Ejecutá el SQL.
2. Admin > Reactivación.
3. Elegí un cliente y dejalo en Sin registrar: comprobá que Crear/WhatsApp estén bloqueados.
4. Editá consentimiento > Autorizó, indicando un origen real.
5. Creá un seguimiento y abrí WhatsApp.
6. Marcá Contactado.
7. Probá Posponer 7d y luego Cerrar.
8. Marcá No autoriza y confirmá que tareas abiertas de ese cliente queden canceladas.
9. Probá Generar cola segura: solo debe crear tareas para clientes reactivables con opt-in.
10. Desde Admin > Clientes usá Gestionar contacto y confirmá que redirige a Reactivación.

ROLLBACK
- Los archivos modificados del Paso 59 están guardados en /backup con sufijo paso59.
