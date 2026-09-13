AromaLParfum — Frontend V2 — PASO 38
=====================================

OBJETIVO
Conectar la Home con el merchandising dinámico preparado en Supabase durante el Paso 29.

NUEVO
- assets/js/home.js
- RPC get_home_merchandising() integrada al arranque de la tienda.
- El Admin NO ejecuta esa consulta, para evitar consumo innecesario.
- Home Hero administrable mediante campaign_banners con placement = home_hero.
- Fragancia de la Semana dinámica.
- Hasta 3 campañas dinámicas en Home, priorizando destacado=true.
- Hasta 3 banners secundarios con placement = home_secondary.
- Imágenes de campañas/banners compatibles con bucket público o privado usando el resolver existente.
- Fallback: si no hay merchandising activo o el RPC falla, se conserva la portada anterior.
- Cache busting de JS/CSS actualizado a v=38.

NO SE ACTIVA AUTOMÁTICAMENTE
No se eligió ninguna campaña, banner ni perfume por vos. Si en Supabase no hay elementos activos, la tienda se verá como antes. Esto es intencional.

ARCHIVOS IMPORTANTES
- index.html
- admin/index.html
- assets/css/app.css
- assets/js/home.js
- assets/js/config.js
- assets/js/supabase-data.js

BACKUP
- backup/config_paso37.js
- backup/supabase-data_paso37.js
- además siguen presentes los backups de pasos anteriores.

SUBIDA A GITHUB
Subir el CONTENIDO del ZIP a la raíz del repositorio y reemplazar archivos existentes.
No borrar la carpeta /imagenes que ya existe en el repositorio.

PRUEBA
1. Abrir la Home.
2. Confirmar que productos e imágenes cargan.
3. Abrir un producto.
4. Probar carrito.
5. Abrir /admin/.

Si no hay campañas activas, la ausencia de bloques nuevos NO es un error: se está usando el fallback.
