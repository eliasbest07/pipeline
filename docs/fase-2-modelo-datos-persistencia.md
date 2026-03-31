# Fase 2: Modelo de Datos y Persistencia Oficial

## Estado

Documento interno oficial para congelar el modelo de datos y las reglas de persistencia de Pipeline.

## Decisiones oficiales

### Identidad

- SQLite usará IDs internos autoincrementales como claves primarias reales.
- Cada entidad expuesta al frontend también tendrá un `public_id` tipo UUID.
- El frontend, el canvas y `localStorage` deben usar `public_id`.
- La base de datos debe usar IDs internos para relaciones y rendimiento.

### Usuario y dispositivo

- El sistema se modela como multiusuario desde esta fase.
- Aún no habrá inicio de sesión tradicional.
- La identidad inicial del usuario/dispositivo se resolverá mediante un hash local persistido.
- Ese hash debe existir tanto en `localStorage` como en SQLite para identificar la instancia.
- El sistema inicial queda limitado a `100` instancias.

### Bestpoint y tokens

- Cada instancia o PC identificada por hash puede tener su wallet propia.
- La plataforma debe soportar `bestpoint_wallets` y `bestpoint_ledger`.
- La política inicial indicada por producto es:
  - `2 bestpoint` equivalen a `110 millones de tokens gratis` usando modelos gratis.
  - Si el usuario agrega bestpoint, puede usar modelos de Anthropic y OpenAI según políticas posteriores.
- La equivalencia exacta por proveedor/modelo deberá aterrizarse en fases siguientes, pero el esquema ya debe soportarlo.

## Fuente de verdad oficial

- `localStorage` es la fuente de verdad operativa en runtime.
- `SQLite` no gobierna la ejecución en vivo.
- `SQLite` funciona como respaldo persistente, versionado, auditoría e historial.
- Si hay discrepancia durante runtime, el sistema sigue operando con el estado local vivo.
- SQLite conserva la reconstrucción histórica, pero no se consulta como origen primario durante la ejecución normal.

## Tablas oficiales base

- `users`
- `sessions`
- `pipelines`
- `pipeline_contexts`
- `pipeline_nodes`
- `pipeline_connections`
- `agents`
- `skills`
- `outputs`
- `assemblies`
- `operator_questions`
- `token_usage`
- `api_keys`
- `bestpoint_wallets`
- `bestpoint_ledger`

## Reglas de almacenamiento por capa

### En SQLite

Debe persistirse como respaldo persistente e historial:

- usuarios e identidad por hash,
- sesiones,
- pipelines,
- contexto actual,
- historial/versiones de contexto,
- nodos y conexiones del canvas,
- agentes,
- skills,
- outputs,
- ensamblajes,
- preguntas del Operador,
- respuestas del usuario,
- decisiones del Piloto,
- consumo de tokens,
- llaves/API metadata,
- wallets y ledger de bestpoint.

### En localStorage

Debe persistirse como estado operativo vivo:

- identidad hash del dispositivo,
- pipeline actual abierto,
- contexto actual,
- outputs actuales,
- historial local reciente de contexto,
- historial local reciente de outputs,
- drafts temporales,
- estado visual de UI,
- zoom,
- posición del canvas,
- paneles abiertos,
- filtros y preferencias locales.

### Restricción de sincronización

- `localStorage` gobierna el runtime del canvas y del pipeline en vivo.
- SQLite debe recibir escrituras de respaldo y versionado en background.
- El sistema debe intentar reconciliar escrituras fallidas hacia SQLite sin interrumpir el runtime local.
- Contexto y outputs en `localStorage` sí son autoridad operativa durante la ejecución en vivo.

## Contexto y versionado

- El contexto editable por el usuario debe tener historial desde esta fase.
- Cada versión debe guardarse separada.
- Debe existir versión persistida en SQLite.
- Debe existir versión operativa y reciente en `localStorage`.
- El sistema debe poder recuperar contexto actual e historial básico después de reinicio.

## Persistencia automática

- La persistencia debe ejecutarse en background con estrategia de guardado diferido tipo lazy save.
- El runtime debe continuar desde local aunque la escritura a SQLite vaya rezagada.
- Esto no elimina la obligación de persistir eventos críticos.
- El sistema debe encolar o consolidar escrituras, pero no perder eventos importantes.

## Eventos críticos que obligan persistencia

- creación de pipeline,
- edición de pipeline,
- creación o edición de contexto,
- nueva versión de contexto,
- creación de agente,
- edición de agente,
- creación o cambio de conexión,
- creación de output,
- cambio de estado de output,
- pregunta emitida por Operador,
- respuesta automática sugerida,
- respuesta manual del usuario,
- decisión del Piloto,
- activación o finalización de ensamblaje,
- consumo de modelo,
- movimiento de bestpoint o ledger.

## Criterio operativo de recuperación

- Durante la operación viva, Pipeline corre desde estado local.
- SQLite conserva respaldo, historial y versionado para recuperación posterior.
- El canvas y los agentes en ejecución no deben depender de leer SQLite como origen primario en cada acción.

## Consecuencia para la Fase 3

- El backend operativo debe dejar de depender de estructuras ambiguas o solo en memoria.
- Cada agente y cada ciclo del Piloto deberá producir eventos persistibles.
- El contexto deberá tratarse como documento vivo con historial y reglas de actualización formales.
