AromaLParfum — PASO 55
Colecciones V2 + Rankings + Orden Inteligente

Cambios principales:
- /collections usa collection_products reales y respeta el orden definido en Supabase.
- /best usa product_rankings_cache (mas_vendido) con fallback al sistema anterior.
- Rankings públicos: Más vendidos, Tendencia, Más regalados, Primavera, Citas y Hasta $40.000.
- Colecciones editoriales con productos destacados y motivo/score inteligente cuando existe.
- Admin Colecciones V2: edición, publicar/pausar, portada, productos manuales, orden, destacados.
- Reglas inteligentes por colección usando smart_collection_rules.
- Botón "Actualizar rankings" llama admin_refresh_merchandising().
- Las consultas nuevas se hacen de forma diferida: no cargan al entrar a páginas no relacionadas.

Importante:
- Una colección con regla inteligente activa puede reemplazar sus productos al refrescar merchandising.
- Para curar una colección manualmente, dejar su regla inteligente desactivada.
- Las colecciones nuevas se crean pausadas y manuales; se publican cuando estén listas.
