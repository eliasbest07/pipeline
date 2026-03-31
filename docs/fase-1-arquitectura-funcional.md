# Fase 1: Arquitectura Funcional Oficial de Pipeline

## Estado

Documento interno oficial para congelar la arquitectura funcional base de Pipeline antes de continuar con refactors de persistencia, backend operativo y canvas.

## Flujo canónico oficial

El flujo operativo oficial de Pipeline, tanto para pipelines automáticos como para pipelines construidos por drag and drop, es el siguiente:

`Prompt Semilla -> Piloto -> Arquitecto -> Contexto -> Operador -> Agentes especialistas -> Outputs -> Ensamblador`

Este orden es flexible en ejecución, pero es el orden obligatorio de arranque y coordinación para que el sistema sea consistente.

## Secuencia operativa oficial

1. El usuario escribe un prompt semilla en la terminal.
2. El sistema crea un pipeline nuevo.
3. Al crear un pipeline nuevo, el canvas se limpia y arranca sin cards previos superpuestos.
4. El pipeline nuevo crea la base inicial visible del canvas.
5. La base inicial visible arranca desde el prompt semilla y la supervisión del Piloto.
6. El Piloto recibe el prompt semilla.
7. El Piloto invoca al Arquitecto cuando necesita crear la estructura inicial.
8. El Arquitecto no se representa como card en el canvas.
9. El Arquitecto construye el contexto inicial oficial del pipeline.
10. Cuando el Arquitecto termina, el resultado visible para el usuario es el card de contexto ya construido.
11. Cuando el Arquitecto termina, también se renderizan en el canvas los agentes especializados y conexiones definidos por la estructura inicial.
12. Esos cards y conexiones aparecen inicialmente inactivos.
13. Antes de ejecutar, el canvas muestra estructura preparada pero sin tráfico de datos.
14. Solo al pulsar Ejecutar se activan las animaciones, estados de trabajo y transporte real por conexiones.
15. El Piloto usa ese contexto como fuente de verdad operativa.
16. El Piloto entrega control operativo al Operador para completar ambigüedades, preferencias y decisiones faltantes.
17. El Operador puede emitir varias preguntas al usuario en paralelo.
18. Cada respuesta del usuario completa el contexto operativo.
19. El Operador pide trabajo a agentes especialistas según lo requerido por el contexto.
20. El Piloto puede llamar a cualquier agente si determina que es necesario.
21. El Piloto vigila qué se está trabajando, qué salió, qué falta y qué errores aparecieron.
22. Los agentes especialistas generan outputs tipados.
23. El Ensamblador aparece cuando ya existen outputs relevantes para ensamblar.
24. El Ensamblador se conecta con el Piloto y con los outputs necesarios.
25. El Ensamblador no decide por sí solo; actúa cuando el Piloto lo instruye.

## Reglas de creación de pipeline

- Un prompt semilla crea un pipeline nuevo.
- Crear un pipeline nuevo implica canvas limpio.
- Si el usuario ve cards anteriores en canvas, eso corresponde a un pipeline antiguo.
- Un pipeline nuevo nunca se monta encima de cards existentes.

## Contrato oficial por agente

### Prompt Semilla

- Es la entrada inicial del sistema.
- Su función es detonar la creación del pipeline.
- No decide estructura ni ejecución.

### Piloto

- Es el supervisor principal del ciclo.
- Recibe el prompt semilla y el contexto vivo.
- Decide a quién llamar, cuándo llamar, qué vigilar y cuándo detener o continuar.
- Puede llamar a cualquier agente si el contexto lo exige.
- Debe observar continuamente progreso, bloqueos, outputs, faltantes y errores.
- Debe vigilar el trabajo en curso de otros agentes durante todo el proceso.

### Arquitecto

- Es un agente sistémico oculto.
- No tiene card propia en canvas.
- Solo diseña o reestructura el contexto inicial.
- Puede definir agentes especializados y relaciones esperadas entre inputs y outputs.
- Su resultado visible no es un card propio, sino el card de contexto ya generado.

### Contexto

- Es la fuente de verdad operativa.
- Lo crea inicialmente el Arquitecto.
- Lo completa el Operador.
- Lo vigila el Piloto.
- Se muestra al usuario como card visible en el canvas.
- Debe poder abrirse y verse completo de manera rápida y legible.
- Si su contenido se representa en JSON, debe renderizarse de forma clara y utilizable.
- Puede ser editado manualmente por el usuario.
- Debe servir para reconstruir qué se quiere producir, qué falta, qué se decidió, qué agentes participan y qué outputs existen.

### Operador

- Completa el contexto con preguntas y decisiones.
- Puede hacer múltiples preguntas al usuario en paralelo.
- El límite oficial inicial es de hasta `6` preguntas simultáneas activas o pendientes.
- Puede seguir emitiendo órdenes mientras algunas preguntas siguen esperando respuesta.
- Si una respuesta es relevante para una acción concreta, entonces debe esperar esa respuesta antes de continuar con esa acción dependiente.
- Pide trabajo a agentes especialistas según el contexto.
- Debe registrar respuestas y decisiones como parte del contexto.

### Agentes especialistas

- Ejecutan tareas específicas pedidas por Piloto u Operador.
- Deben producir outputs tipados y persistibles.
- Pueden ser creados dinámicamente según la estructura del pipeline.

### Ensamblador

- Aparece cuando ya existen outputs para consolidar.
- Se conecta con Piloto y outputs.
- No actúa por iniciativa propia.
- Espera instrucción del Piloto para consolidar el resultado final.

## Tipos oficiales de card

- `agent`
- `input`
- `output`
- `question`
- `seed`
- `context`

## Tipos oficiales de output

- `text`
- `image`
- `video`
- `audio`
- `json`
- `decision`

## Reglas del canvas

- El canvas debe reflejar el estado real del backend, no solo un prototipo visual.
- Los agentes visibles son los que el usuario necesita inspeccionar u operar.
- El Arquitecto queda fuera del canvas como agente sistémico oculto.
- El card de contexto es la manifestación visible del trabajo inicial del Arquitecto.
- La estructura inicial decidida por el Arquitecto debe renderizar agentes y conexiones en estado inactivo antes de la ejecución.
- Las conexiones iniciales deben verse inactivas hasta que exista tráfico real.
- Los cards pueden mostrar animación inactiva antes de ejecutar, pero no deben simular trabajo real.
- Tras pulsar Ejecutar, el canvas debe reflejar actividad real: trabajo, espera, envío y recepción de tokens, y tránsito por conexiones.
- Los agentes especializados y sus conexiones pueden aparecer dinámicamente según el contexto.
- El Ensamblador no aparece al inicio; aparece cuando existan outputs que lo justifiquen.
- Los agentes personalizados creados manualmente por el usuario también deben registrarse en el contexto oficial.

## Definición de comportamiento real vs prototipo visual

### Comportamiento real

Es todo comportamiento que:

- modifica contexto oficial,
- crea o actualiza agentes,
- crea conexiones funcionales,
- genera preguntas al usuario,
- produce outputs,
- altera la supervisión del Piloto,
- o afecta ensamblaje y persistencia.

### Prototipo visual

Es todo elemento que:

- solo maquilla estados,
- muestra contenido hardcodeado,
- representa conexiones sin tráfico real,
- o renderiza cards sin contrato operativo en backend.

La meta del desarrollo posterior es sustituir cualquier prototipo visual por comportamiento real.

## Definición mínima del contexto global

La versión oficial inicial del contexto debe cubrir como mínimo:

- objetivo del pipeline,
- prompt semilla,
- estructura inicial diseñada por Arquitecto,
- preguntas pendientes,
- respuestas del usuario,
- decisiones tomadas,
- agentes activos,
- tareas en curso,
- outputs generados,
- outputs faltantes,
- estado del ensamblaje,
- salud del pipeline.

## Consecuencia para las siguientes fases

- Fase 2 debe persistir contexto, outputs, decisiones y eventos según esta arquitectura.
- Fase 3 debe hacer que el backend respete estrictamente los roles definidos aquí.
- Fase 4 debe reflejar en canvas solo comportamiento respaldado por backend real.
- Fase 5 debe permitir preguntas paralelas del Operador.
- Fase 6 debe arrancar siempre desde prompt semilla y creación de pipeline limpio.
- Fase 7 debe formalizar outputs y aparición condicional del Ensamblador.
