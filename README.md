# Total-time / Pipeline
<img width="1397" height="1267" alt="Screenshot from 2026-03-21 18-31-27" src="https://github.com/user-attachments/assets/1c97bb98-e6a6-4d2b-8831-abff2dfd9072" />

<img width="1397" height="1267" alt="Screenshot from 2026-03-21 18-31-34" src="https://github.com/user-attachments/assets/ff5e78c0-b143-4164-b47a-fdba15508d46" />

<img width="1397" height="1267" alt="Screenshot from 2026-03-21 18-35-40" src="https://github.com/user-attachments/assets/396f107a-172e-4353-a3a7-a029a3cfd7be" />

> **Orquestación visual de agentes de IA para equipos de produccion**

Un sistema donde diseñas líneas de ensamblaje que producen un producto, como: videos, blogs o emails de forma autónoma — con supervisión humana en los momentos que importan.

---

## ¿Qué es Pipeline?

Pipeline es un canvas visual donde cada nodo es un agente de IA especializado. Los agentes se comunican entre sí pasándose su output como cards tipadas (texto, imagen, video, JSON), se conectan visualmente, y fluyen de forma autónoma hasta los puntos donde el operador humano debe decidir.

Este es un  caso de uso donde el resultado es una fábrica de contenido que un equipo de 3 personas puede operar para obtener oputput mas refinados y de alto valor.

```
Investigación → Aprobación → Prompt → Imagen → Video → Ensamblaje
     ↓               ↓           ↓        ↓        ↓         ↓
  tendencias     operador    escenas   HD 16:9   8s/clip   video final
```

---

## Cómo funciona ( el caso de uso de ejemplo )

### 1. Diseña el pipeline en el canvas

Arrastra agentes desde la paleta lateral. Conéctalos con sus puertos de entrada/salida. Cada conexión define el flujo de datos: el output de un agente se convierte en el input del siguiente.

### 2. Los agentes trabajan en cadena

Cada agente sabe exactamente qué recibe y qué entrega:

| Agente | Recibe | Entrega |
|---|---|---|
| **Investigación** | `text` — tema o nicho | `json` — lista de ideas con score |
| **Operador** | `json` — opciones a revisar | `decision` — aprobación humana |
| **Piloto** | `json` — contexto del pipeline | `json` — estado de subagentes |
| **Prompt** | `text` — guión del video | `text` — prompts por escena |
| **Imagen** | `text` — prompt de escena | `image` — 1920×1080 16:9 |
| **Video** | `image` — imagen de escena | `video` — clip MP4 8 segundos |
| **Ensamblaje** | `video[]` — array de clips | `video` — video final compilado |

### 3. Output cards — la comunicación entre agentes

Al completar una tarea, cada agente dropea una **output card** flotante en el canvas con una preview de su contenido. Esas cards pueden:

- Conectarse como entrada a otro agente arrastrándolas
- Abrirse para ver el contenido completo y editarlo
- Inyectarse manualmente como datos de entrada a cualquier agente

### 4. El operador supervisa, no programa

Los puntos de decisión humana pausan el pipeline y activan un aviso visual en la terminal. El operador ve exactamente qué necesita decidir — aprobar, rechazar o editar — y el pipeline continúa o retrocede según la decisión.

---

## Arquitectura del sistema

```
┌─────────────────────────────────────────────────────────────┐
│                        CANVAS VISUAL                        │
│                                                             │
│  [Nodo Agente]──card──▶[Nodo Agente]──card──▶[Nodo Agente] │
│       │                      │                      │       │
│    [skills]              [skills]               [skills]    │
│       │                      │                      │       │
│  MCP / API              MCP / API              MCP / API    │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  LOG TERMINAL       │
                    │  Pensamiento live   │
                    │  /comandos          │
                    └────────────────────┘
```

### Agentes

Cada agente es una unidad de trabajo con:

- **Prompt** — instrucciones de comportamiento
- **Verificación automática** — condición de éxito
- **I/O tipado** — define qué recibe y qué entrega, con valor por defecto si no hay input conectado
- **Memoria interna** — archivos de contexto que persisten entre ejecuciones
- **Skills** — superpoderes que conectan al agente con herramientas externas
- **Botones de acción** — personalizables por agente, visibles en el card
- **Tests automáticos** — editables por el equipo

### Skills

Las skills le dan capacidades externas a cualquier agente. Una skill puede ser:

- **MCP** — integración directa con una aplicación (Notion, GitHub, Gmail, etc.)
- **API HTTP** — llamada REST o GraphQL a cualquier servicio
- **Script** — código que ejecuta el agente localmente
- **Webhook** — recibe o envía eventos externos

Cuando un agente tiene skills asignadas, su card muestra un marco visual que indica qué capacidades tiene disponibles.

### Terminal de log

Una ventana flotante que muestra en tiempo real:

- `💭 Pensamiento` — el razonamiento interno de cada agente mientras trabaja
- `→ Acción` — tareas que está ejecutando
- `✓ Done` — confirmaciones de completado
- `⚠ Operador` — cuando el pipeline requiere una decisión humana (activa modo hazard con animación diagonal ámbar/negro)

Soporta comandos directos desde la terminal:

```
/pipeline   — gestionar pipelines
/agente     — crear o agregar agentes
/skill      — crear, ver o asignar skills
/run        — ejecutar pipeline
/reset      — resetear estado
/help       — ver todos los comandos
```

---

## Constructor de agentes y skills con IA

Desde el panel lateral, **✦ Nuevo agente con IA** y **⬡ Nueva skill con IA** abren una ventana de chat guiada que construye la definición completa del agente o skill paso a paso:

Para agentes recopila: nombre, prompt, meta/goal, subtareas, verificación, tipos de I/O, skills necesarias, botones de acción y tests automáticos.

Para skills recopila: tipo (MCP/API/script), nombre, endpoint, parámetros, output esperado y configuración de autenticación.

Al finalizar genera una card de resumen y guarda en `localStorage`. Los agentes y skills personalizados aparecen en el panel lateral y pueden arrastrarse al canvas como cualquier tipo nativo.

---

## Input cards manuales

Además de las output cards que dropean los agentes, puedes crear **input cards** manualmente para inyectar datos en cualquier punto del pipeline:

- Texto libre, JSON estructurado, imágenes, archivos
- Se conectan como entrada a cualquier agente
- Útiles para: datos de referencia, contexto de campaña, assets existentes, instrucciones específicas del operador

---

## Flujo de video — ejemplo completo

```
1. Tema de entrada
        ↓
2. [Investigación] busca tendencias → card JSON con 10 ideas rankeadas
        ↓
3. [Operador] revisa las ideas → pipeline pausa → humano aprueba idea #3
        ↓
4. [Piloto] coordina las siguientes etapas en paralelo si es posible
        ↓
5. [Prompt] genera prompt para cada escena (6 escenas × 8s = 48s)
        ↓
6. [Imagen] genera imagen HD por escena (6 imágenes en paralelo)
        ↓
7. [Video] anima cada imagen → clip MP4 de 8 segundos con movimiento de cámara
        ↓
8. [Ensamblaje] une todos los clips con transiciones → video final 30-130s
        ↓
   Output: video listo para publicar
```

---

## Estado del proyecto

Pipeline está en desarrollo activo. El canvas visual, el sistema de agentes, output cards, skills, log terminal y constructor con IA están implementados como prototipo funcional.

Las integraciones reales con APIs de generación de imagen y video (Flux, Runway, Kling) y con servidores MCP están en la hoja de ruta.

---

## Equipo

Proyecto construido por un equipo pequeño con la convicción de que la producción de contenido con IA no debe ser un caos de pestañas y prompts manuales — sino una línea de ensamblaje que el equipo diseña, supervisa y mejora continuamente.

**Total-time / Pipeline** — _Orquesta. No improvises._
