AromaLParfum Frontend V2 — PASO 46
====================================

Favoritos V2 + wishlists compartibles.

Cambios principales:
- Favoritos locales siguen siendo instantáneos y privados en el dispositivo.
- Botón para crear/sincronizar un link compartible usando las RPC de wishlists ya creadas en Supabase.
- El link usa ?wishlist=<share_token>, compatible con GitHub Pages sin configuración de servidor adicional.
- Los cambios posteriores de Favoritos se sincronizan en segundo plano con la wishlist compartida activa.
- Se puede desactivar el link compartido.
- Se puede crear una lista de regalo con destinatario, ocasión, presupuesto y nota usando los favoritos actuales.
- Una persona que recibe el link puede abrir los perfumes de la lista y agregarlos a su propio carrito.
- La página compartida no expone edit_token.
- Se mantiene fallback local: si la sincronización remota falla, Favoritos no deja de funcionar.

Archivos principales modificados:
- assets/js/wishlist-v2.js (nuevo)
- assets/js/store.js
- assets/js/cart.js
- assets/js/events.js
- assets/css/app.css
- index.html
- admin/index.html

Backups del Paso 45 guardados en /backup.
