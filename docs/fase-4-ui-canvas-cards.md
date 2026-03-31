# Fase 4: UI Real del Canvas y los Cards

## Estado

Documento interno oficial para congelar la base visual y operativa del canvas, los Agent Cards, Output Cards, Input Cards y la inspección del tráfico entre conexiones.

## Base visual de Agent Card

- Existe una base visual común para `Agent Card`.
- Esa base no es rígidamente obligatoria en todas sus secciones para todos los agentes.
- Aun así, la base oficial general del sistema se compone de:
  - `header`
  - `recibe`
  - `entrega`
  - `meta editable`
  - `proceso visible`
  - `footer` con estado y tokens
  - `acciones custom`
- Cada agente puede ocultar o adaptar secciones si su rol no las requiere.

## Regla general del canvas

- El canvas debe mostrar comportamiento real del backend.
- Los cards no deben depender de texto fake ni estados hardcodeados.
- Toda visualización debe salir de contexto, eventos, estado de agente, outputs y conexiones reales.

## Card del Piloto

- Hereda de la base de `Agent Card`.
- Debe poder mostrar contexto actual.
- Debe poder mostrar decisiones del Piloto en tres zonas temporales:
  - arriba: decisiones ya enviadas a otros agentes,
  - centro: decisión pendiente o en transcurso,
  - abajo: decisiones futuras o en espera de cambios de contexto.
- Sus botones oficiales de v1 son:
  - `Ver contexto`
  - `Ver decisiones`

## Card del Operador

- Hereda de la base de `Agent Card`.
- Sus botones oficiales de v1 son:
  - `Objetivo`
  - `Decision`

## Card del Ensamblador

- Hereda de la base de `Agent Card`.
- Sus botones oficiales de v1 son:
  - `Falta/Esperando`
  - `Procesos`

## Tokens en cards

- La UI mostrará solo el total de tokens por agente en tiempo real.
- No se separa inicialmente en prompt/completion.

## Conexiones activas e inspección

- Las conexiones deben reflejar estado real.
- Al inspeccionar tráfico de una conexión no se abrirá un modal.
- La inspección debe aparecer como card en el canvas.
- Ese card debe mostrar como mínimo el último payload que transitó por esa conexión.
- Ese card representa el dato real que viajó entre origen y destino.

## Familias oficiales de cards

- `Agent Card`
- `Input Card`
- `Output Card`
- `Question Card`
- `Context Card`
- `Connection Payload Card`

## Criterio de aceptación de Fase 4

- El usuario puede entender qué recibe y entrega cada agente.
- El Piloto muestra contexto y decisiones en curso de forma visible.
- El Operador y el Ensamblador tienen sus paneles y acciones oficiales.
- La inspección de tráfico entre conexiones ocurre mediante cards reales en canvas, no modales.
- Los tokens visibles por agente reflejan datos vivos del backend.
