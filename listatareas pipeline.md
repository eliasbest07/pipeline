Aquí está la lista, aterrizada contra lo que ya existe en el proyecto y
  enfocada en corregir la dirección del desarrollo.

  1. Cerrar la definición base del producto

  - Separar formalmente qué pertenece a frontend canvas, qué pertenece a backend
    operativo y qué pertenece a seguridad/consumo.
  - Congelar una primera versión del modelo mental del sistema:
    Prompt semilla -> Piloto -> Arquitecto -> Contexto -> Operador -> Agentes
    especialistas -> Outputs -> Ensamblador.
  - Definir qué es “prototipo visual” y qué es “comportamiento real”.

  2. Formalizar el modelo de datos canónico

  - Redefinir las entidades principales en SQLite:
    users, pipelines, pipeline_contexts, agents, skills, connections, outputs,
    assemblies, api_keys, bestpoint_keys, bestpoint_wallets, bestpoint_ledger,
    token_usage, sessions.
  - Cambiar IDs manuales tipo UUID a IDs autoincrementales si esa es la decisión
    final.
  - Mantener UUID públicos opcionales si no quieren exponer IDs internos.
  - Definir qué se guarda en localStorage y qué se guarda en SQLite.
  - Dejar claro que localStorage es caché/UI state, no fuente de verdad de
    seguridad.

  3. Corregir la persistencia actual

  - Migrar el guardado actual para que no solo persista nodos y conexiones, sino
    también:
    outputs generados, historial de decisiones, preguntas del operador, assets,
    ensamblajes y uso de tokens.
  - Implementar guardado automático en background en cada evento importante:
    creación de agente, drop de output, cambio de contexto, respuesta del
    usuario, ejecución de agente.
  - Evitar que la app dependa solo de memoria runtime para estados críticos.

  4. Definir la jerarquía real de cards

  - Formalizar 3 familias:
    Agent Card, Output Card, Input Card.
  - Crear una clase/base visual y lógica común para Agent Card.
  - Hacer que Piloto, Operador, Ensamblador hereden de esa base con zonas UI
    personalizadas.
  - Estandarizar en todos los cards:
    recibe, entrega, meta editable, área de proceso/pensamiento, footer de
    estado, tokens, acciones custom.

  5. Implementar correctamente el card del Piloto

  - Mostrar entradas, salidas y meta editable.
  - Mostrar estado en vivo:
    IDLE, RUN, DONE, ERROR, PAUSED.
  - Mostrar tokens enviados/recibidos.
  - Mostrar 2 botones personalizados.
  - Mostrar área visible de “qué está haciendo” y “por qué fue llamado”.
  - Conectar el botón Ejecutar de la toolbar con la activación real del loop del
    Piloto.

  6. Implementar correctamente el card del Operador

  - Heredar del card agente.
  - Agregar sus botones especiales:
    Objetivo, Decisión, Ver contexto.
  - Agregar panel especial de “acciones posibles / plan actual”.
  - Hacer visible si está:
    preguntando al usuario, esperando feedback, escribiendo contexto, llamando
    otro agente, esperando outputs.
  - Permitir conexiones dinámicas creadas por el Operador hacia nuevos agentes.

  7. Implementar el nuevo card de pregunta al usuario

  - Crear un tipo nuevo de card temporal de decisión.
  - Cada pregunta individual debe dropear su propio card.
  - Incluir:
    progress bar de 15 segundos,
    sugerencia autocompletada,
    input editable,
    botón azul de enviar.
  - Si el usuario no interviene, al completar los 15 segundos se envía la
    sugerencia.
  - Si el usuario hace foco/click en el input, el card pasa a modo pausado
    visual naranja oscuro.
  - Cuando el usuario envía manualmente, esa respuesta se entrega al Operador y
    se registra en contexto.

  8. Hacer visibles las conexiones activas

  - Toda conexión entre agentes debe poder mostrar qué dato va pasando.
  - Al hacer click en una conexión:
    ver prompt, JSON, texto, asset reference o instrucción que transitó por ahí.
  - Añadir estado visual de conexión:
    inactiva, activa, esperando, error.

  9. Implementar el comportamiento dinámico del canvas

  - Cuando el Operador necesite un agente que no existe en el canvas:
    crearlo automáticamente,
    conectarlo,
    mandarle el prompt,
    registrar el evento.
  - Cuando se cree un Input Card por interacción manual, que aparezca ya
    conectado al agente correspondiente si aplica.
  - Cuando un agente dropee output, persistirlo y renderizar su card tipado.

  10. Completar el modelo de outputs

  - Formalizar tipos:
    text, image, video, audio, json, decision.
  - Persistir cada output con:
    tipo, agente origen, pipeline, metadata, contenido o referencia, fecha,
    estado.
  - Hacer que el Ensamblador reciba outputs acumulados, no solo un input
    aislado.

  11. Implementar correctamente el Ensamblador

  - Heredar del card agente.
  - Agregar botones especiales:
    Falta / Esperando,
    Procesos.
  - Mostrar lista de outputs requeridos según el contexto.
  - No ensamblar por su cuenta; esperar instrucción del Piloto.
  - Poder ver qué output falta y cuál ya llegó.

  12. Formalizar el flujo automático del prompt semilla

  - Desde terminal:
    usuario escribe prompt semilla.
  - El sistema crea:
    card de prompt semilla,
    card Piloto,
    card Operador,
    conexiones mínimas.
  - Aún no ejecuta nada.
  - Solo cuando el usuario pulse Ejecutar, el Piloto arranca.
  - El Piloto detecta contexto vacío y llama al Arquitecto para construir
    estructura inicial.
  - El Arquitecto devuelve una estructura del producto final y bloques
    requeridos.
  - Esa estructura se guarda como contexto oficial.

  13. Corregir la relación Piloto / Arquitecto / Operador

  - El Piloto decide el ciclo general y supervisa integridad.
  - El Arquitecto solo diseña estructura inicial o reestructura cuando haga
    falta.
  - El Operador recopila preferencias, aclara ambigüedades y distribuye tareas
    concretas.
  - Evitar que los roles se mezclen como pasa parcialmente hoy.

  14. Formalizar el contexto operativo

  - El contexto debe incluir:
    objetivo del producto,
    estructura del pipeline,
    preguntas pendientes,
    respuestas del usuario,
    bloques producidos,
    outputs faltantes,
    agentes activos,
    estado del ensamblaje,
    salud del pipeline.
  - Toda decisión importante debe escribir en contexto.
  - El Piloto debe vigilar contexto y reaccionar a cambios.

  15. Mejorar el loop del Piloto

  - Mantener al Piloto activo mientras otros agentes trabajan.
  - Hacer que observe:
    cambios del contexto,
    outputs nuevos,
    preguntas resueltas,
    errores,
    tiempos de espera.
  - Permitir que el Piloto vea “qué están trabajando” los otros agentes y el
    prompt con que fueron llamados.

  16. Reordenar el frontend principal y la vista móvil

  - Vista principal web:
    canvas, terminal, toolbar, menú lateral, minimapa, ventana de modelos.
  - Vista móvil:
    segunda opción simplificada, priorizando terminal, cards activos y
    decisiones.
  - No intentar portar toda la densidad del canvas desktop a móvil sin
    simplificar interacción.

  17. Limpiar la UI actual contra el diseño objetivo

  - Revisar qué partes ya existen en public/js/app.js y cuáles son placeholders.
  - Sustituir textos de demo y visuales fake por estados reales del backend.
  - Hacer que los cards reflejen datos vivos en vez de contenido hardcodeado.

  18. Reforzar el backend de seguridad

  - Agregar autenticación real para acceso al servidor.
  - Separar usuarios, sesiones y permisos.
  - Restringir acceso a endpoints de administración.
  - Validar todo input del cliente.
  - Limitar CORS, rate limiting y tamaño de payload.
  - No exponer prompts completos, llaves ni consumo sensible sin autorización.

  19. Proteger correctamente las API keys

  - Nunca enviar API keys al frontend.
  - Todas las llamadas a OpenAI, Anthropic, OpenRouter y fal deben salir solo
    desde backend.
  - Guardar llaves en variables de entorno o almacén seguro.
  - Registrar uso por proveedor, modelo, usuario y pipeline.
  - Añadir allowlist de modelos permitidos por entorno.

  20. Diseñar el sistema de consumo seguro de tokens

  - Crear contabilidad por:
    usuario,
    pipeline,
    agente,
    proveedor,
    modelo,
    prompt_tokens,
    completion_tokens,
    costo estimado,
    equivalencia en bestpoint.
  - Antes de llamar al modelo:
    verificar saldo disponible.
  - Después de responder:
    registrar consumo real.
  - Si excede límite:
    bloquear la ejecución antes de gastar más.

  21. Diseñar bien el sistema bestpoint

  - Crear wallet por usuario o por dispositivo local temporal.
  - Crear ledger inmutable de movimientos:
    carga, consumo, ajuste, expiración, reverso.
  - Definir tasa de conversión:
    X bestpoint = Y tokens presupuestados.
  - No usar una equivalencia vaga; debe ser exacta por proveedor/modelo o por
    tabla configurable.

  22. Crear llaves/códigos de activación de bestpoint

  - Tabla de códigos:
    código, valor_bestpoint, estado, creado_en, usado_en, email_asociado
    opcional, usado_por.
  - Un código solo se puede abrir una vez.
  - Al abrirlo:
    acreditar saldo,
    registrar movimiento,
    marcar código como consumido.
  - Si no hay email todavía, permitir activación anónima temporal.
  - Luego permitir vincular ese saldo a email/cuenta.

  23. Blindar el sistema de llaves

  - Los códigos deben almacenarse hasheados, no en texto plano.
  - La validación debe hacerse en backend.
  - Debe haber protección contra brute force.
  - Debe haber registro de intentos fallidos.
  - Debe existir soporte para invalidar códigos o reemitir saldo en soporte
    manual.

  24. Agregar soporte de OpenRouter

  - Integrar openrouter como proveedor nuevo en llm-clients.js.
  - Añadir catálogo de modelos gratuitos y de pago.
  - Marcar modelos gratis como preferidos por defecto donde aplique.
  - Configurar fallback:
    primero modelos gratis,
    luego pago solo si el usuario tiene saldo y política habilitada.
  - Registrar consumo igual que con OpenAI y Anthropic.

  25. Cambiar la política por defecto de modelos

  - Hoy el proyecto está orientado a OpenAI.
  - Deben redefinir modelos por defecto por agente:
    gratis cuando sea suficiente,
    pago solo donde aporte valor real.
  - El usuario debe poder ver qué modelo usa cada agente y cuánto está costando.

  26. Diseñar el modelo de seguridad de consumo

  - Política por usuario:
    límite diario,
    límite mensual,
    límite por pipeline,
    límite por ejecución,
    límite por agente.
  - Política por proveedor:
    OpenAI y Anthropic con restricción estricta.
  - Política de emergencia:
    cortar ejecución si hay anomalía de consumo.
  - Alertas:
    50%, 80%, 100% del presupuesto.
  - Registro auditable de todos los gastos.

  27. Revisar vulnerabilidades actuales

  - Revisar endpoints sin auth.
  - Revisar inyección en terminal y rutas conversacionales.
  - Revisar exposición de contexto completo por SSE.
  - Revisar abuso de creación masiva de pipelines/agentes/skills.
  - Revisar persistencia de secretos en logs.
  - Revisar sanitización de outputs mostrados en UI.

  28. Crear capas de soporte y observabilidad

  - Logs estructurados por pipeline y usuario.
  - Dashboard interno de consumo y errores.
  - Trazabilidad:
    quién ejecutó qué,
    qué modelo respondió,
    cuánto costó,
    qué output produjo.
  - Soporte al cliente para revisar cargas de bestpoint, activaciones y
    consumos.

  29. Ejecutar una migración técnica del código actual

  - Refactorizar db.js para el nuevo esquema.
  - Refactorizar models.js para soporte OpenRouter y políticas.
  - Refactorizar llm-clients.js para control de presupuesto previo y posterior.
  - Refactorizar token-tracker.js para dejar de ser solo contador simple y pasar
    a ledger real.
  - Refactorizar server.js para auth, seguridad y nuevas rutas.
  - Refactorizar public/js/app.js para alinear UI con la estructura nueva.

  30. Cerrar con un MVP corregido

  - Flujo mínimo real:
    prompt semilla,
    creación automática de cards base,
    ejecutar,
    arquitecto define estructura,
    operador pregunta,
    usuario responde o auto-sugerencia entra,
    agentes especialistas generan outputs,
    ensamblador espera,
    piloto supervisa,
    producto final se registra.
  - Con seguridad mínima obligatoria:
    auth,
    protección de API keys,
    límites de consumo,
    ledger de bestpoint,
    trazabilidad.
