Estructura general del documento
1. Fase (nombre claro)

Cada bloque empieza con:

Fase + número + objetivo macro

Ejemplo:

Fase 1: Congelar la arquitectura funcional del sistema

Esto indica:

Orden lógico
Dependencias entre fases
Roadmap técnico
2. Objetivo (por qué existe la fase)

Siempre define el propósito principal en 1 párrafo:

Patrón:

Objetivo:
Qué problema resuelve esta fase
Qué riesgo evita
Qué parte del sistema estabiliza

Ejemplo estructura:

Objetivo: convertir el sistema en persistente y confiable evitando estados temporales.

Esto responde:

Por qué se hace
Qué mejora
Qué evita romper
3. Descripción técnica (qué se debe hacer)

Luego viene el detalle operativo.

Patrón:

Aquí se debe:
acción técnica 1
acción técnica 2
acción técnica 3
decisiones arquitectónicas

Ejemplo tipo:

redefinir esquema DB
separar responsabilidades
definir contratos
persistir eventos

Esto es la parte ejecutable para developers.

4. Entregables (outputs medibles)

Siempre usa lista:

Patrón:

Entregables:

- artefacto técnico 1
- artefacto técnico 2
- artefacto técnico 3

Ejemplo real:

Nuevo esquema SQLite
Migraciones
Política de persistencia
Guardado automático

Esto convierte ideas en cosas verificables.

5. Criterio de aceptación (definition of done)

Esta es la parte más importante.

Patrón:

Criterio de aceptación:

condición observable que demuestra que la fase funciona

Ejemplo:

el pipeline puede reconstruirse después de reiniciar el servidor

Esto responde:

¿Cómo sabemos que ya está bien hecho?

Plantilla reutilizable (la estructura pura)

Puedes usar este template:

Fase X: [Nombre]

Objetivo:
[Qué problema resuelve]

Descripción:
[Qué se debe implementar]

Entregables:

- [resultado tangible 1]
- [resultado tangible 2]
- [resultado tangible 3]

Criterio de aceptación:

[condición clara que prueba que funciona]
Qué tipo de documento es esto

Esto es una mezcla de:

Product architecture roadmap
Technical execution plan
AI system design phases
Startup technical scaling roadmap

Muy buen formato para startups deep-tech