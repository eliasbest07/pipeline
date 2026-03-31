# Fase 7: Outputs y Ensamblaje

## Estado

Documento interno oficial para congelar el comportamiento de outputs persistidos, Output Cards y lógica del Ensamblador.

## Estructura mínima del output persistido

Cada output debe registrar como mínimo:

- `public_id`
- `pipeline_id`
- `agent_id`
- `tipo`
- `estado`
- `contenido`
- `metadata`
- `created_at`
- `updated_at`

## Tipos oficiales de Output Card

- `text`
- `image`
- `video`
- `audio`
- `json`
- `decision`

Cada tipo debe tener preview visual propia.

## Regla de aparición de output

- Cuando un agente genera un output, el canvas debe mostrarlo de inmediato.
- La persistencia a SQLite ocurre con estrategia de lazy save en background.
- El runtime no debe esperar confirmación de SQLite para reflejar el output en canvas.

## Fuente operativa del Ensamblador

- El Ensamblador lee los outputs desde el estado local operativo del canvas.
- Si el canvas tiene outputs disponibles, esos outputs deben conectarse visualmente al Ensamblador como `RECIBE`.
- SQLite guarda el output persistido, pero no es la fuente primaria de lectura en runtime.

## Misión del Ensamblador

- El Ensamblador debe acumular outputs por bloque requerido del contexto.
- Debe identificar cuáles bloques ya llegaron.
- Debe identificar cuáles bloques faltan.
- Debe mostrar ese estado en su card.
- Debe esperar instrucción del Piloto para consolidar el producto final.

## Criterio de aceptación de Fase 7

- Los outputs aparecen y se conectan visualmente apenas se producen.
- El Ensamblador trabaja sobre los outputs vivos del canvas.
- SQLite conserva respaldo persistente y versionado de esos outputs.
- El Ensamblador puede marcar faltantes y disponibles por bloque requerido.
