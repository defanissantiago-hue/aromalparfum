AromaLParfum — PASO 71 · Nueva visión

QUÉ CAMBIA
- Toda la tienda pasa a un estilo oscuro de lujo (negro, ámbar y dorado):
  inicio, catálogo, ficha de producto, colecciones, decants, regalos, juegos,
  asesor, favoritos, acerca de, contacto, carrito, menú, buscador y modales.
  Las fotos de producto se muestran en una vitrina clara dentro de cada tarjeta.
- El inicio arranca con una "película" del Le Male Elixir Absolu (inspiración G5):
  frasco real recortado, pirámide olfativa con líneas al frasco, bruma,
  duración y proyección, momentos de uso (Citas, Noche, Fiesta) y el nombre
  ABSOLU armado con partículas. Precio, stock y "Agregar al carrito" salen del
  catálogo en vivo (producto id 1862).
- Nueva sección "¿Para cuándo lo buscás?" (09:00, 14:00, 20:30, 23:00) con la
  cantidad real de fragancias de cada ocasión.
- Tipografías Fraunces (títulos) e Inter (textos), botones dorados tipo píldora.

ARCHIVOS
Nuevos:
- assets/css/noir-v2.css               Estilo oscuro de toda la tienda.
- assets/img/le-male-elixir-absolu.webp Frasco recortado (fondo transparente).
Modificados:
- assets/js/film-v2.js     Película del Elixir Absolu, sección de momentos, vista rápida.
- assets/css/film-v2.css   Estilos de la película.
- index.html               Fuentes, noir-v2.css, Build 71.
- admin/index.html         Solo la versión de caché (v=71). Admin no cambia de estilo.
- assets/js/release-v2.js  Versión 2.71.0.

IMPORTANTE
- El inicio presenta el producto como "Inspiración G5 de la fragancia de Jean Paul
  Gaultier. No es el producto original." En Supabase el producto sigue como
  "sin_clasificar": conviene marcarlo como G5 desde Admin para que la ficha y el
  catálogo digan lo mismo.
- Si el producto 1862 se borra o cambia de nombre, la película no se muestra y
  la home queda como antes.

CÓMO VOLVER ATRÁS
- Solo el estilo oscuro: quitar la línea de noir-v2.css del index.html.
- Todo: volver al commit anterior en GitHub.
