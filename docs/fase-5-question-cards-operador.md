# Fase 5: Sistema de Preguntas del Operador

## Estado

Documento interno oficial para congelar el comportamiento de los `Question Card` emitidos por el Operador.

## Estructura obligatoria del Question Card

Cada `Question Card` debe incluir obligatoriamente:

- pregunta,
- sugerencia prellenada,
- input editable,
- barra de progreso de `15 segundos`,
- botón de enviar,
- estado visible de respuesta automática o manual.

## Reglas de temporizador

- El timer inicia cuando aparece la pregunta.
- Si el usuario no interviene y se completan los `15 segundos`, la sugerencia se envía tal cual.
- Después del autoenvío, el card se cierra automáticamente.
- Si el usuario hace foco o click en el input, el timer se pausa por completo.
- Una vez pausado por intervención del usuario, no debe reanudarse automáticamente.
- El card queda esperando el envío manual del usuario.

## Reglas de respuesta

- Debe distinguirse visualmente si la respuesta fue:
  - `automatica`
  - `manual`
- Esa diferencia también debe registrarse en contexto e historial.

## Regla de conexión visual

- Toda pregunta del Operador debe aparecer conectada visualmente al card del Operador.
- La relación visual debe dejar claro que el Operador originó esa pregunta.

## Criterio de aceptación de Fase 5

- El Operador puede emitir preguntas temporales conectadas a su card.
- El usuario puede intervenir manualmente o dejar avanzar la sugerencia automática.
- El sistema conserva y muestra claramente el origen automático o manual de cada respuesta.
