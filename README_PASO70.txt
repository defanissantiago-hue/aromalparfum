AromaLParfum — PASO 70 · Experiencia cinematográfica

ARCHIVOS DE ESTA ACTUALIZACIÓN
Nuevos:
- assets/js/film-v2.js     Película de inicio, vista rápida y navegación activa.
- assets/css/film-v2.css   Estilos de la película, header, tarjetas, modal y avisos.

Modificados:
- index.html               Carga la fuente Fraunces, film-v2.css y film-v2.js. Build 70.
- admin/index.html         Solo sube la versión de caché a v=70 (Build 70).
- assets/js/release-v2.js  Versión 2.70.0 y chequeo "Film V2" en la auditoría.
- RELEASE_FINAL.txt        Notas de esta versión.

CÓMO SUBIRLO A GITHUB
1. Descomprimir el ZIP.
2. En el repositorio: Add file → Upload files.
3. Arrastrar el CONTENIDO de la carpeta (index.html, admin, assets, los .txt).
   GitHub respeta las carpetas y reemplaza los archivos con el mismo nombre.
4. Commit. Esperar 1–2 minutos a que GitHub Pages publique y hacer Ctrl+F5.

QUÉ REVISAR DESPUÉS DE PUBLICAR
- Inicio: la película avanza con el scroll en computadora y en celular.
- Tarjetas: botón "Vista rápida" (en celular es el ícono del ojo).
- Admin → Auditoría: todos los chequeos en verde con BUILD 70.

CÓMO FUNCIONA (PARA FUTURAS AUDITORÍAS)
film-v2.js no modifica código existente: envuelve renderHomePage, renderProductCard
y renderCurrentRoute (mismo patrón que resilience-v2.js). Si la película fallara,
el resto de la home se renderiza igual.
La animación usa solo transform/opacity y un canvas; se detiene cuando la película
no está en pantalla.
