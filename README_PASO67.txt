AromaLParfum Frontend V2 — PASO 67
========================================

AUDITORÍA FINAL + RELEASE STABILITY GUARD V2

Objetivo
--------
Estabilizar la integración acumulada antes de la versión final, sin agregar una nueva función comercial ni nuevas consultas durante la navegación normal.

Cambios principales
-------------------
1. Boot guard: evita inicializar la app dos veces en la misma página.
2. Error de bootstrap recuperable: si el arranque falla, Resilience V2 muestra una pantalla segura en lugar de una app vacía.
3. Admin > Auditoría: controles no destructivos de versión, assets, DOM, módulos críticos, almacenamiento, conexión y Supabase.
4. Verificación de caché: todos los assets locales pasan a ?v=67 y el HTML expone meta alp-build=67.
5. Diagnóstico del Paso 66 informa automáticamente el release actual.
6. Informe de auditoría copiable sin datos de clientes.

Supabase
--------
NO requiere SQL.
NO crea tablas ni RPC.
NO agrega queries durante Inicio, Catálogo, Producto, Carrito o Checkout.
La única lectura nueva de Supabase es un SELECT id LIMIT 1 cuando el administrador ejecuta manualmente Admin > Auditoría.

Prueba recomendada
------------------
- Subir el ZIP encima del Paso 66.
- No borrar /imagenes.
- Hacer Ctrl+F5 una vez.
- Recorrer Inicio > Catálogo > Producto > Carrito > Checkout.
- Entrar a Admin > Auditoría > Ejecutar auditoría.
- Debe mostrar 0 fallos críticos.
- Entrar a Admin > Diagnóstico y comprobar Frontend PASO 67.

Nota sobre funciones legacy
---------------------------
La auditoría detectó nombres históricos que son sobrescritos intencionalmente por módulos V2 posteriores (Home, Catálogo y Builders). Se conservaron para evitar una refactorización de riesgo en la etapa de estabilización. La carga de scripts mantiene el orden conocido y el auditor comprueba los módulos efectivos.
