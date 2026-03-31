# Fase 3: Backend Operativo de Agentes y Contexto

## Estado

Documento interno oficial para congelar el comportamiento del backend operativo, el loop del Piloto, el rol del Operador y la actualización del contexto.

## Decisiones oficiales

### Separación entre entrega visible y control interno

- Cada agente debe dropear como salida visible aquello que realmente entrega al siguiente paso del pipeline.
- Esa entrega visible puede ser texto, imagen, video, audio, JSON, decisión u otro output tipado.
- El usuario debe ver principalmente la entrega real del agente, no un sobre técnico de control.
- Aun así, el backend necesita un contrato interno de ejecución para poder orquestar, versionar, registrar y vigilar agentes.
- Ese contrato interno no sustituye al output visible.
- Ese contrato interno debe guardarse como memoria operativa/versionada del agente y del evento ejecutado.

## Contrato interno mínimo de ejecución

Cada ejecución de agente debe registrar internamente, aunque no sea el output visible del card:

- `estado`
- `accion`
- `bloque_destino`
- `resultado_interno`
- `error`
- `siguiente_sugerido`
- `assets`
- `requiere_respuesta`
- `output_visible`
- `version`
- `timestamp`

## Reglas del Piloto

- El Piloto es supervisor global.
- El Piloto observa contexto, outputs, preguntas, errores y tareas en curso.
- El Piloto puede decidir llamar a cualquier agente cuando el contexto lo justifique.
- El Piloto puede disparar varios agentes en paralelo dentro del mismo ciclo.
- El Piloto no necesita esperar reinicio completo del ciclo para activar trabajo si el contexto ya justifica una nueva acción.
- El paralelismo debe ser controlado por backend.
- El Piloto puede cancelar, pausar o reemplazar un agente si detecta drift, error o cambio relevante de contexto.

## Reglas del Operador

- El Operador puede sugerir, disparar y ejecutar tareas operativas sin esperar el reinicio del ciclo del Piloto.
- El Operador trabaja sobre el contexto vigente.
- El Operador registra sus decisiones y acciones en el contexto.
- El Piloto luego ve ese cambio en el contexto y lo supervisa.
- El Operador puede pedir trabajo a especialistas cuando la tarea ya fue habilitada por el flujo operativo.
- El Operador puede mantener preguntas activas mientras otras tareas continúan, salvo que una acción concreta dependa de una respuesta pendiente.

## Reglas de actualización del contexto

### Cambio estructural

Si una respuesta del usuario o una decisión cambia la estructura del pipeline:

- debe reiniciarse el contexto estructural,
- debe generarse una nueva versión del contexto,
- debe reiniciarse el ciclo operativo del Piloto sobre la nueva estructura.

### Cambio no estructural

Si una respuesta del usuario solo afecta contenido interno dentro del pipeline ya definido:

- no debe reiniciarse toda la estructura,
- debe aplicarse como parche sobre el contexto,
- debe generarse nueva versión,
- el ciclo continúa con el contexto actualizado.

## Estados oficiales de agente

- `idle`
- `queued`
- `running`
- `waiting_input`
- `waiting_tokens`
- `done`
- `error`
- `paused`
- `cancelled`
- `replaced`

## Regla de memoria operativa

- Cada ejecución debe quedar registrada de forma versionada.
- La memoria operativa debe permitir reconstruir:
  - quién llamó al agente,
  - por qué fue llamado,
  - qué debía entregar,
  - qué entregó realmente,
  - qué error ocurrió si falló,
  - qué sugirió como siguiente paso.

## Criterio de aceptación de Fase 3

- El backend puede orquestar agentes sin depender de respuestas ambiguas.
- El usuario ve outputs reales.
- El sistema conserva internamente el contrato técnico necesario para supervisión y recuperación.
- El Piloto puede observar, intervenir, cancelar o reemplazar trabajo en curso.
- El Operador puede mover tareas operativas sin romper la supervisión global del Piloto.
