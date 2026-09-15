AromaLParfum Frontend V2 — PASO 63
====================================

OPTIMIZACIÓN FUERTE DE RENDIMIENTO + SUPABASE

Este paso NO agrega nuevas funciones comerciales y NO requiere SQL.
Su objetivo es reducir egress, lecturas innecesarias y trabajo global del navegador.

CAMBIOS PRINCIPALES
-------------------
1. Productos públicos en dos capas
   - Inicio/listados cargan una ficha liviana: identidad, precio, stock, categoría,
     familia, estaciones/ocasiones, flags e imagen principal.
   - Descripción larga, notas, duración, proyección y recomendación se cargan solo
     al abrir una ficha de producto.
   - Catálogo/Asesor/Descubrí tu Aroma cargan los metadatos olfativos en lote solo
     cuando realmente se entra a esas experiencias.
   - Admin conserva la carga completa de products para no perder edición de campos.

2. Datos secundarios por ruta
   - Home: popularidad + colecciones + merchandising + video estacional.
   - Catálogo: popularidad + tipos + metadatos de búsqueda.
   - Más vendidos: popularidad.
   - Colecciones: colecciones.
   - Campañas: merchandising.
   - Decants: combos + tamaños.
   - Regalos: configuración del Gift Builder.
   - Juego: configuración/ranking únicamente al jugar.
   - Producto: detalle únicamente de ese producto.

3. Consultas deduplicadas
   - Cada bloque se carga una sola vez durante la sesión de página.
   - Navegar ida y vuelta entre rutas ya hidratadas no vuelve a consultar Supabase.
   - Si dos acciones solicitan el mismo recurso al mismo tiempo, comparten la misma
     Promise en vuelo.

4. Sin polling global del carrito
   - Se eliminó el setInterval de 45 segundos.
   - El carrito se valida al abrirlo y antes del Checkout.
   - create_store_order_v2 continúa siendo la validación definitiva de precio/stock.

IMPACTO DE BOOTSTRAP (lecturas de datos; no cuenta recursos estáticos)
---------------------------------------------------------------------
Antes del Paso 63, la carga pública ejecutaba 12 bloques de Supabase en cualquier ruta.
Ahora, aproximadamente:
- Inicio: 5 bloques.
- Producto directo: 3 bloques (products liviano + settings + esa ficha).
- Acerca de / Contacto / Seguimiento / Club: 2 bloques base.
- Regalos: 3 bloques.
- Decants: 5 bloques.
- Catálogo: 5 bloques, porque allí sí se necesitan filtros/búsqueda profundos.

Además, la consulta base de products ya no transporta los textos largos de todas las
fichas en cada visita pública, reduciendo especialmente el egress cuando crece el catálogo.

ARCHIVOS NUEVOS
---------------
- assets/js/performance-v2.js
- README_PASO63.txt
- PASO63_MANIFEST.json

ARCHIVOS MODIFICADOS
--------------------
- assets/js/products.js
- assets/js/supabase-data.js
- assets/js/store.js
- assets/js/events.js
- index.html
- admin/index.html

ROLLBACK
--------
Se guardaron copias del Paso 62 en /backup:
- products_paso62.js
- supabase-data_paso62.js
- store_paso62.js
- events_paso62.js
- index_paso62_perf.js
- admin_index_paso62_perf.html

INSTALACIÓN
-----------
1. Subir este ZIP encima del Paso 62.
2. Reemplazar los archivos existentes.
3. NO borrar la carpeta /imagenes del sitio desplegado.
4. No ejecutar ningún SQL para este paso.
5. Recargar con Ctrl+F5.

PRUEBAS RECOMENDADAS
--------------------
- Inicio: tarjetas, campañas, colecciones y más vendidos.
- Abrir un perfume: descripción/notas/duración/proyección deben aparecer normalmente.
- Volver a Inicio y abrir otro perfume.
- Catálogo: búsqueda, filtros avanzados y ordenamiento.
- Decants y Regalos: builders completos.
- Descubrí tu Aroma / Asesor.
- Carrito y Checkout.
- Seguimiento, Club y reseñas.
- Admin: editar una ficha completa y confirmar que todos sus campos siguen disponibles.

No se modifican tablas, RLS, RPCs, pedidos ni reglas de precios.
