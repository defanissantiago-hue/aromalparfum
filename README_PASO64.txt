AromaLParfum Frontend V2 — PASO 64
Mobile UX + Accesibilidad + Confianza de Compra

OBJETIVO
Mejorar la experiencia móvil, teclado y señales de confianza sin sumar tablas, RPCs ni consultas a Supabase.

NUEVO
- assets/js/accessibility-v2.js
  * Escape cierra el overlay activo.
  * Tab queda contenido dentro de menú, carrito y modal.
  * El foco vuelve al control que abrió el overlay.
  * aria-expanded sincronizado en menú/carrito.
  * aria-current para navegación activa.
  * anuncio accesible del contenido/ruta.
  * compatibilidad prefers-reduced-motion.
- Navegación inferior mobile: Inicio, Buscar, Favoritos, Carrito.
- Contador del carrito también en navegación mobile.
- Skip link "Saltar al contenido principal".
- Drawers y modal declarados como dialog/aria-modal.
- Marca AromaLParfum convertida en botón real navegable por teclado.
- Focus-visible global.
- Targets táctiles mínimos de 44px en mobile.
- Franja pública de confianza: stock validado, pedido seguro, seguimiento, reseñas verificadas.
- Ficha de producto: bloque de garantías reales.
- Checkout: precio/stock revalidados, código de pedido y seguimiento.
- Toasts accesibles con role=status / role=alert.
- Soporte prefers-contrast y prefers-reduced-motion.

BACKEND
- No requiere SQL.
- No agrega tablas.
- No agrega RPCs.
- No agrega queries a Supabase.
- No cambia create_store_order_v2.

DESPLIEGUE
1. Subir este paquete encima del PASO 63.
2. Reemplazar archivos existentes.
3. NO borrar /imagenes del repositorio desplegado.
4. Hacer Ctrl+F5.

PRUEBA RECOMENDADA
- Mobile: comprobar barra inferior, Buscar, Favoritos y Carrito.
- Abrir menú con teclado, recorrer con Tab y cerrar con Escape.
- Abrir carrito/modal; comprobar que el foco no sale del overlay.
- Cerrar y verificar que el foco vuelva al botón original.
- Probar ficha en 360/390px y comprobar botones cómodos.
- Probar checkout y revisar la franja de garantías.
- Activar "reducir movimiento" en el sistema y verificar ausencia de animaciones fuertes.

NOTA
Estas mejoras elevan significativamente la accesibilidad práctica, pero no constituyen por sí solas una certificación formal WCAG.
