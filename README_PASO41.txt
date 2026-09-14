AROMALPARFUM — FRONTEND V2 — PASO 41
=====================================

DECANTS V2 + PROBALO ANTES + PUENTE REGALOS

Cambios principales:
- Nuevo módulo assets/js/decants-v2.js.
- Todos los precios visibles de decants suman el decant_surcharge configurado en site_settings.commerce (fallback $1.000).
- Burbuja flotante no intrusiva con cantidad, total y resumen de selección.
- Buscador local dentro del constructor de decants.
- Bloque informativo Probalo Antes usando la configuración de Supabase.
- Borrador de decants persistente en localStorage.
- Regalo -> Decants -> Regalo sin perder la selección anterior.
- Los decants pueden agregarse al Gift Builder junto con perfumes completos.
- Cambiar la presentación del regalo ya no vacía el borrador.
- Se conservan backups del Paso 40.

PRUEBAS RECOMENDADAS:
1. Entrar a Decants.
2. Agregar 2 muestras y verificar burbuja cantidad/total.
3. Confirmar que el precio final refleja +$1.000 configurados.
4. Recargar la página: el borrador debe seguir.
5. Ir a Regalos, agregar un perfume y tocar "Agregar decants a este regalo".
6. Elegir muestras y tocar "Agregar al regalo".
7. Confirmar que vuelve a Regalos con perfume + decants conservados.
8. Agregar el regalo al carrito.
9. Verificar /admin/.

NOTA:
Probalo Antes ya tiene backend preparado. El beneficio económico real se aplicará de forma completamente automática cuando el frontend pase al checkout seguro V2 creado en Supabase.
