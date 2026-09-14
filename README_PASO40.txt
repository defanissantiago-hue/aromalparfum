AromaLParfum — FRONTEND V2 — PASO 40

OBJETIVO
Ficha de Producto V2 + recomendaciones + vistos recientemente + comparador.

CAMBIOS PRINCIPALES
- Nueva ficha de producto premium con mejor jerarquía visual.
- Pirámide olfativa: salida, corazón y fondo.
- Información de duración, proyección, familia, uso, estaciones y ocasiones.
- CTA visible para probar la fragancia mediante decants.
- Recomendaciones "Si te gusta este, probá…" conectadas al RPC get_similar_products.
- Fallback local de recomendaciones si el RPC no responde o todavía no tiene caché.
- Historial local de vistos recientemente para reducir uso de Supabase.
- Recomendaciones basadas en historial mediante get_recently_viewed_recommendations.
- Comparador persistente de hasta 3 perfumes.
- Comparación por precio, duración, proyección, familia, uso, estaciones, ocasiones y reseñas cuando el RPC las devuelve.
- Comparador conectado a compare_products con fallback al catálogo local.
- Nuevo archivo assets/js/product-v2.js.
- Backups del Paso 39 incluidos.

SEGURIDAD / DATOS
- El comparador y vistos recientemente se guardan en localStorage.
- No se exponen costos ni márgenes.
- No se inventan atributos de producto que no existen en Supabase.
- Las recomendaciones remotas solo se usan para elegir IDs; los productos se renderizan desde el catálogo público ya cargado.

PRUEBAS RECOMENDADAS
1. Abrir un perfume.
2. Revisar notas, duración, proyección, estaciones y ocasiones.
3. Esperar a que cargue "Si te gusta este, probá…".
4. Abrir otro producto y volver para comprobar "Vistos recientemente".
5. Agregar 2 perfumes al comparador.
6. Abrir "Comparar ahora".
7. Agregar un tercer perfume y comprobar el límite de 3.
8. Agregar el producto al carrito y verificar que el carrito anterior siga funcionando.
9. Confirmar que /admin/ continúa cargando.

INSTALACIÓN
Subir todo el contenido de esta carpeta a la raíz del repositorio aromalparfum y reemplazar los archivos existentes. No borrar /imagenes.
