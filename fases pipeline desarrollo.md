Fase 1: Congelar la arquitectura funcional del sistema

  Objetivo: definir con precisión cómo debe funcionar Pipeline antes de seguir
  agregando código, para evitar que frontend, backend y agentes evolucionen en
  direcciones distintas.

  En esta fase se debe redactar una especificación interna corta pero estricta
  del sistema. Esa especificación tiene que dejar claro el flujo canónico
  completo: el usuario escribe el prompt semilla en la terminal, se crean los
  cards base en el canvas, el botón Ejecutar activa al Piloto, el Piloto llama
  al Arquitecto si el contexto está vacío, el Arquitecto devuelve la estructura
  inicial, el Operador recopila preferencias del usuario, delega a agentes
  especialistas, estos dropean outputs, y el Ensamblador espera la orden final
  del Piloto. También se debe fijar el rol de cada agente para que no haya
  ambigüedad: el Arquitecto diseña estructura, el Piloto supervisa ciclos y
  salud, el Operador recopila decisiones y dispara tareas, el Ensamblador no
  decide por sí solo.

  Entregables:

  - Documento de flujo operativo oficial.
  - Contrato de comportamiento por agente.
  - Lista oficial de tipos de card y tipos de output.
  - Definición del contexto global del pipeline.

  Criterio de aceptación: cualquier otro agente o desarrollador puede leer ese
  documento y saber exactamente qué ocurre desde el prompt semilla hasta el
  producto final sin interpretar ni inventar comportamiento.

  ———

  Fase 2: Rediseñar el modelo de datos y la persistencia

  Objetivo: convertir el estado actual en un sistema persistente y confiable,
  donde el canvas, el contexto, los outputs y el consumo de IA no dependan de
  memoria temporal ni de estructuras incompletas.

  Aquí se debe rehacer el esquema de SQLite para cubrir entidades reales del
  producto. No basta con pipelines, nodes y connections. Hay que incluir
  usuarios, wallets de bestpoint, ledger de movimientos, uso de tokens,
  activaciones de códigos, outputs generados, estado del ensamblaje, sesiones,
  agentes personalizados y skills. También hay que decidir de forma definitiva
  que localStorage solo sirve como caché local o preferencia de UI, mientras que
  SQLite será la fuente de verdad del sistema.

  Además, esta fase debe introducir guardado automático por evento: cuando se
  crea un agente, cuando se crea un pipeline, cuando se dropea un output, cuando
  el Operador recibe una respuesta del usuario, cuando el Piloto toma una
  decisión y cuando se consume un modelo. Todo debe persistirse en background.

  Entregables:

  - Nuevo esquema SQLite.
  - Migraciones iniciales.
  - Política clara de qué se guarda en local y qué se guarda en backend.
  - Persistencia automática por eventos críticos.

  Criterio de aceptación: si el servidor se reinicia, el pipeline puede
  reconstruirse con su contexto, outputs, decisiones y consumo acumulado sin
  pérdida crítica.

  ———

  Fase 3: Corregir el backend operativo de agentes y contexto

  Objetivo: alinear el código actual del backend con el flujo real del producto
  y eliminar la mezcla de responsabilidades entre agentes.

  En esta fase se debe refactorizar el motor de ejecución. El Piloto debe
  observar el contexto, tomar decisiones por ciclo, reaccionar a cambios y
  mantenerse activo mientras los demás agentes trabajan. El Arquitecto debe
  limitarse a crear o reconstruir estructura. El Operador debe usar el contexto
  para formular preguntas, capturar preferencias, decidir qué pedir a otros
  agentes y registrar sus planes en el contexto. El Ensamblador debe esperar
  instrucciones y verificar que estén todos los outputs requeridos antes de
  actuar.

  También se debe formalizar el contrato de salida de cada agente. Todo agente
  debe devolver una estructura consistente que el backend pueda interpretar:
  acción ejecutada, bloque destino, resultado, error, siguiente sugerido y
  assets si aplica. El contexto debe convertirse realmente en la única fuente de
  verdad operativa.

  Entregables:

  - Refactor de agent-runner.js.
  - Refactor del loop del Piloto.
  - Refactor del contexto y contratos de salida.
  - Reglas claras de actualización del contexto por cada agente.

  Criterio de aceptación: el backend puede ejecutar un pipeline simple de
  principio a fin sin depender de estados ambiguos ni de respuestas ad hoc
  imposibles de orquestar.

  ———

  Fase 4: Implementar la UI real del canvas y los cards

  Objetivo: reemplazar la UI de prototipo parcial por la interfaz que responde
  al comportamiento real del sistema.

  Aquí hay que construir de forma consistente las tres familias de cards: Agent
  Card, Input Card y Output Card. Todos los agentes deben heredar de una base
  visual común con secciones estándar: qué recibe, qué entrega, meta editable,
  área de proceso visible, footer de estado, contador de tokens y acciones
  customizables. Luego se debe extender esa base para Piloto, Operador y
  Ensamblador con sus paneles especiales.

  También se deben implementar las conexiones activas como objetos
  inspeccionables. Si el usuario hace click en una conexión, debe ver qué
  contenido pasó por ahí: prompt, JSON, texto o referencia de asset. El canvas
  debe poder reflejar creación dinámica de agentes y outputs sin recargar. La
  barra de herramientas, el menú lateral, el minimapa, la terminal y la ventana
  de modelos deben trabajar con datos reales del backend.

  Entregables:

  - Base unificada de card agente.
  - Card del Piloto con estados y visibilidad de trabajo.
  - Card del Operador con objetivo, decisión y contexto.
  - Card del Ensamblador con faltantes y procesos.
  - Render de conexiones activas e inspeccionables.

  Criterio de aceptación: el usuario puede entender visualmente qué recibe cada
  agente, qué entrega, qué está haciendo y cómo viaja la información dentro del
  canvas.

  ———

  Fase 5: Implementar el sistema de preguntas del Operador al usuario

  Objetivo: crear el nuevo mecanismo de cards de pregunta temporales para
  captura híbrida de decisiones entre humano y auto-sugerencia.

  Esta fase introduce un tipo especial de card que el Operador dropea cuando
  necesita aclaraciones para continuar. Cada pregunta debe generar un card
  independiente con barra de progreso de 15 segundos, sugerencia prellenada,
  input editable y botón de envío manual. Si el usuario no interviene, la
  sugerencia se autoenvía al completar el tiempo. Si el usuario toca el input,
  el card entra en modo pausa visual y solo continúa cuando se pulse enviar.

  Todas las respuestas deben convertirse en entradas estructuradas del Operador
  y registrarse en el contexto. El backend debe distinguir entre respuestas
  automáticas sugeridas y respuestas escritas manualmente por el usuario.

  Entregables:

  - Nuevo tipo de card de pregunta.
  - Lógica de timer/autosubmit.
  - Modo pausa manual por focus del usuario.
  - Registro en contexto de cada respuesta y su origen.

  Criterio de aceptación: el Operador puede avanzar de forma semiautónoma, pero
  el usuario también puede intervenir en cualquier pregunta concreta sin romper
  el flujo.

  ———

  Fase 6: Implementar el flujo automático real del prompt semilla

  Objetivo: hacer que el sistema arranque exactamente como fue definido, sin
  atajos manuales ni rutas inconsistentes.

  Cuando el usuario escriba el prompt semilla en terminal, deben aparecer en el
  canvas el card del prompt semilla, el card del Piloto y el card del Operador
  conectados, pero sin ejecución inmediata. Solo cuando se pulse Ejecutar debe
  iniciar el loop del Piloto. El Piloto debe ver que el contexto está vacío y
  pedir al Arquitecto la estructura del pipeline. Esa estructura debe guardarse
  formalmente como contexto inicial y servir de guía para el resto de la
  ejecución.

  El flujo de ejemplo de videos debe quedar soportado como caso canónico:
  definición de tema, personajes, escenas, prompts, imágenes, clips y
  ensamblaje. Esto no significa hardcodear solo videos, sino validar el motor
  con un ejemplo exigente y concreto.

  Entregables:

  - Ruta terminal -> canvas base.
  - Botón Ejecutar conectado al backend real.
  - Solicitud automática del Piloto al Arquitecto.
  - Persistencia de la estructura inicial en contexto.

  Criterio de aceptación: un usuario puede iniciar un pipeline solo escribiendo
  el prompt semilla y pulsando Ejecutar, y el sistema responde de manera
  coherente sin pasos manuales ocultos.

  ———

  Fase 7: Crear el sistema de outputs y ensamblaje

  Objetivo: convertir los resultados de agentes en objetos persistentes,
  conectables y usables por el Ensamblador.

  En esta fase se debe formalizar la entidad output. Cada output debe registrar
  su tipo, origen, contenido o referencia, metadata, fecha y pipeline al que
  pertenece. Los outputs deben tener representación visual como cards, y además
  su versión persistida en base de datos. El Ensamblador debe poder ver todos
  los outputs disponibles, saber cuáles faltan según el contexto y esperar la
  orden del Piloto para consolidarlos.

  Esto implica que el Ensamblador no puede depender de “lo que vea en pantalla”.
  Debe depender del contexto y de los outputs persistidos.

  Entregables:

  - Persistencia de outputs.
  - Cards de output tipados para texto, imagen, video, audio y JSON.
  - Acumulación real de outputs en el Ensamblador.
  - Lógica de “faltantes” contra contexto.

  Criterio de aceptación: los outputs producidos por agentes pueden recuperarse,
  reconectarse, inspeccionarse y ensamblarse incluso después de reiniciar el
  servidor.

  ———

  Fase 8: Seguridad de acceso al servidor y endurecimiento del backend

  Objetivo: proteger el sistema antes de abrirlo a uso real, especialmente
  porque va a manejar API keys costosas y crédito virtual de consumo.

  En esta fase se debe añadir autenticación de usuarios, sesiones o tokens de
  acceso y control de permisos sobre rutas sensibles. No se puede dejar expuesta
  la API interna sin auth como hoy. También se debe validar el input de todas
  las rutas, limitar payloads, controlar CORS, aplicar rate limiting y evitar
  fugas de contexto completo por SSE a usuarios no autorizados.

  Además, se debe revisar si los logs, respuestas o eventos están filtrando
  prompts internos, datos privados o información de consumo. La meta es reducir
  la superficie de abuso antes de conectar monetización o uso externo.

  Entregables:

  - Middleware de autenticación.
  - Control de sesiones o tokens.
  - Rate limiting y validación.
  - Restricciones de acceso por ruta y por pipeline.
  - Revisión de exposición de SSE y logs.

  Criterio de aceptación: un usuario no autenticado no puede operar pipelines
  ajenos ni forzar consumo de modelos desde la API.

  ———

  Fase 9: Sistema seguro de consumo de tokens y presupuesto

  Objetivo: impedir sobreconsumo de OpenAI y Anthropic y transformar el uso de
  IA en un sistema medible, bloqueable y auditable.

  Esta fase es crítica. Antes de cualquier llamada a proveedor, el backend debe
  calcular si el usuario tiene saldo o presupuesto suficiente. Después de la
  llamada, debe registrar el consumo real de prompt y completion tokens, junto
  con proveedor, modelo, agente, pipeline y costo equivalente. El sistema tiene
  que soportar límites por usuario, por ejecución, por pipeline y por periodo de
  tiempo.

  Aquí se debe pasar del contador simple actual a un ledger real de consumo. No
  basta con mostrar “tokens usados”; hay que poder detener la ejecución si se
  supera el presupuesto o si hay riesgo de abuso. OpenAI y Anthropic deben
  quedar bajo política estricta. Si un usuario no tiene saldo suficiente, el
  backend debe impedir la llamada antes de gastar.

  Entregables:

  - Tabla real de token_usage.
  - Verificación previa de presupuesto.
  - Registro posterior de consumo real.
  - Reglas de bloqueo por límites.
  - Alertas por umbrales de consumo.

  Criterio de aceptación: ningún agente puede gastar tokens de proveedores pagos
  si el usuario no tiene saldo autorizado suficiente.

  ———

  Fase 10: Sistema de bestpoint, wallets y llaves de activación

  Objetivo: crear una capa de crédito virtual segura para financiar el uso de
  modelos pagos y soportar activación por códigos de una sola apertura.

  En esta fase se debe crear el sistema de wallets de bestpoint, el ledger de
  movimientos y la tabla de llaves o códigos de activación. Cada código debe
  poder acreditarse una sola vez. Cuando el usuario introduce el código, el
  backend valida, registra la activación, crea o recarga la wallet y marca el
  código como usado. Si no existe un email todavía, se puede activar de forma
  temporal y luego asociarlo más tarde.

  También se debe diseñar la conversión entre bestpoint y presupuesto de tokens.
  Esa equivalencia no puede ser vaga: debe estar basada en una tabla
  configurable por proveedor y modelo. Idealmente el ledger debe ser inmutable
  para soporte, auditoría y resolución de reclamaciones.

  Entregables:

  - Wallet por usuario o identidad temporal.
  - Ledger de movimientos de bestpoint.
  - Sistema de códigos de una sola activación.
  - Asociación opcional posterior a email.
  - Conversión configurable bestpoint -> presupuesto IA.

  Criterio de aceptación: el usuario puede cargar saldo con un código, usarlo en
  IA y soporte puede auditar exactamente cuándo se cargó, cuánto se gastó y en
  qué se consumió.

  ———

  Fase 11: Blindaje del sistema de llaves, saldos y soporte

  Objetivo: asegurar que el mecanismo de activación y consumo no pueda ser
  abusado ni manipulado fácilmente.

  Los códigos de activación no deben almacenarse en texto plano; deben
  almacenarse hasheados o protegidos. Se necesita protección contra intentos
  repetidos, límite de validaciones, bitácora de errores y herramientas
  administrativas para invalidar o reemitir cargas cuando soporte lo necesite.
  También se debe evitar que el frontend sea quien decida cuánto saldo tiene el
  usuario. El saldo visible en localStorage puede ser una caché, pero la
  autoridad siempre debe ser el backend.

  Entregables:

  - Almacenamiento seguro de códigos.
  - Registro de intentos fallidos.
  - Límite anti brute force.
  - Herramientas administrativas de soporte.
  - Separación estricta entre saldo local visible y saldo real del servidor.

  Criterio de aceptación: no es posible duplicar activaciones ni alterar saldo
  real desde el navegador.

  ———

  Fase 12: Integrar OpenRouter y modelos gratuitos

  Objetivo: reducir dependencia de modelos pagos y usar opciones gratuitas por
  defecto cuando sean suficientes.

  En esta fase se debe agregar OpenRouter como proveedor nuevo en la capa de
  clientes LLM. Luego hay que extender el catálogo de modelos y definir qué
  agentes usarán gratis por defecto y cuáles podrán subir a pago solo si el
  usuario tiene saldo y la política lo permite. También se debe registrar uso de
  OpenRouter igual que los demás proveedores, incluso si el modelo es gratuito,
  para tener trazabilidad completa.

  La configuración por agente debe quedar clara y visible en la UI: qué modelo
  usa, qué proveedor, si es gratis o de pago, y cuál es el fallback autorizado.

  Entregables:

  - Integración de OpenRouter.
  - Catálogo ampliado de modelos.
  - Políticas por agente para gratis y pago.
  - Registro de uso por proveedor.
  - UI para ver configuración de modelo por agente.

  Criterio de aceptación: el sistema puede correr pipelines simples en modelos
  gratuitos sin tocar OpenAI o Anthropic salvo que la política lo habilite.

  ———

  Fase 13: Observabilidad, soporte y control operativo

  Objetivo: hacer que el sistema sea mantenible, diagnosticable y operable
  cuando empiece a tener usuarios reales.

  Aquí se deben agregar logs estructurados, métricas por pipeline, historial de
  ejecuciones, trazabilidad de errores, consumo y eventos de contexto. También
  se debe poder responder preguntas de soporte como: quién activó esta llave,
  qué pipeline gastó estos tokens, qué modelo produjo este output, por qué se
  detuvo el pipeline y cuál agente falló.

  Esto no es accesorio; es lo que permite operar un sistema con IA costosa sin
  quedar ciego.

  Entregables:

  - Logging estructurado.
  - Historial de ejecución por pipeline.
  - Trazabilidad de outputs, decisiones y consumo.
  - Panel o endpoints internos para soporte.

  Criterio de aceptación: cuando un pipeline falle o consuma demasiado, el
  equipo puede reconstruir exactamente lo ocurrido.

  ———

  Fase 14: Vista móvil y pulido final del producto

  Objetivo: adaptar la experiencia a móvil sin intentar replicar el canvas
  completo de escritorio de forma torpe.

  La vista móvil debe priorizar lo esencial: terminal, cards activos, preguntas
  del Operador, estado del Piloto y outputs relevantes. El canvas completo puede
  quedar simplificado o navegable en modo reducido, pero la experiencia móvil no
  debe depender de precisión extrema de drag-and-drop. También se debe revisar
  consistencia visual, claridad de estados, animaciones útiles y eliminación de
  placeholders.

  Entregables:

  - Layout móvil funcional.
  - Priorización de decisiones y estados en pantalla pequeña.
  - Ajustes de UX para cards, terminal y toolbar.
  - Revisión visual final del sistema.

  Criterio de aceptación: el usuario puede seguir y responder un pipeline desde
  móvil sin perder el control del proceso.

  ———
