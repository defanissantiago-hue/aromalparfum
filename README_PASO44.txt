AROMALPARFUM — FRONTEND V2 — PASO 44

Objetivo:
Transformar la sección anterior de juegos en "Descubrí tu Aroma" y conectar el quiz de recomendaciones creado en Supabase.

Cambios principales:
- Nuevo módulo assets/js/discover-v2.js.
- Navegación renombrada a "Descubrí tu Aroma".
- Quiz dinámico cargado desde aroma_quiz_questions y aroma_quiz_options.
- Recomendaciones obtenidas desde get_aroma_quiz_recommendations().
- Fallback local si el RPC no devuelve coincidencias.
- Resultados mostrados con productos reales del catálogo.
- Se mantienen los desafíos visuales como experiencias secundarias.
- Sin publicidad ni descuentos automáticos en la experiencia.
- Se retiraron del Admin los controles de publicidad de juegos.
- Backups del Paso 43 incluidos en /backup.

Pruebas recomendadas:
1. Abrir Descubrí tu Aroma desde el menú.
2. Verificar que carguen las 5 preguntas.
3. Responder todas y obtener recomendaciones.
4. Abrir uno de los perfumes recomendados.
5. Volver y repetir el quiz.
6. Probar los desafíos visuales que aparecen más abajo.
7. Confirmar que /admin/ siga funcionando.
