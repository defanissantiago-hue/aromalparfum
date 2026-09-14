AromaLParfum Frontend V2 — PASO 42

Gift Builder V2 completo.

Cambios principales:
- get_gift_builder_config() reemplaza varias lecturas separadas del Gift Builder.
- Presentaciones configurables desde Supabase.
- Perfumes completos + decants en el mismo regalo.
- Extras independientes: bolsa, envoltorio y tarjeta.
- Mensaje personalizado con límite configurable.
- Total en vivo: productos + presentación + extras.
- preview_gift_builder() revalida precios y configuración en Supabase antes de agregar el regalo al carrito.
- El flujo Regalos -> Decants -> Regalos conserva presentación, productos, extras y mensaje.
- El carrito muestra presentación, extras y mensaje.
- getCheckoutV2CartItems() deja el carrito serializado para create_store_order_v2() sin enviar precios desde el navegador.
- Compatibilidad con regalos guardados de pasos anteriores.
- Backups del Paso 41 incluidos.

Pruebas recomendadas:
1. Entrar a Regalos.
2. Elegir una presentación.
3. Agregar un perfume.
4. Seleccionar bolsa y envoltorio.
5. Seleccionar tarjeta y escribir un mensaje.
6. Ir a Decants desde el Gift Builder, agregar una muestra y volver.
7. Verificar que todo siga seleccionado y el total cambie en vivo.
8. Recargar la página antes de agregar al carrito y comprobar que el borrador se conserve.
9. Agregar el regalo al carrito.
10. Confirmar que el carrito muestre presentación, extras y mensaje.
11. Confirmar que /admin/ siga abriendo.

No borrar /imagenes.
