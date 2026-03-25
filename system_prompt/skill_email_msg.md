# SKILL — EMAIL & MSG (SKL-06)

---

## DESCRIPCIÓN

Permite a cualquier agente enviar emails y mensajes por distintos canales
de comunicación: email (SMTP/SendGrid), WhatsApp Business, Telegram y Slack.
Útil para notificar al usuario sobre el progreso, entregar resultados finales
o distribuir contenido generado.

---

## CUÁNDO USARLA

- Entregar el resultado final del pipeline al usuario por email
- Notificar al usuario que un bloque requiere su aprobación
- Distribuir newsletters o contenido generado a una lista de destinatarios
- Enviar notificaciones de progreso del pipeline
- El pipeline es de tipo newsletter o campaña de email marketing

## CUÁNDO NO USARLA

- Para comunicación interna entre agentes — eso va por el contexto
- Si el usuario no ha dado permiso explícito para enviar emails
- Para publicar en redes sociales — usar SKL-03 SOCIAL PUBLISH

---

## CREDENCIALES REQUERIDAS

```json
{
  "email": {
    "proveedor": "sendgrid | smtp | resend",
    "api_key": "",
    "from_email": "noreply@tupipeline.com",
    "from_nombre": "Pipeline OS"
  },
  "whatsapp": {
    "token": "",
    "phone_number_id": ""
  },
  "telegram": {
    "bot_token": "",
    "chat_id": ""
  },
  "slack": {
    "webhook_url": "",
    "canal": "#pipeline-outputs"
  }
}
```

---

## ACCIONES DISPONIBLES

### `send_email`
Envía un email a uno o múltiples destinatarios.

```json
{
  "skill": "SKL-06",
  "accion": "send_email",
  "parametros": {
    "destinatarios": ["usuario@email.com"],
    "asunto": "Tu libro está listo — Pipeline OS",
    "cuerpo_html": "<h1>Tu pipeline completó</h1><p>Aquí está el resultado...</p>",
    "cuerpo_texto": "Tu pipeline completó. Aquí está el resultado...",
    "adjuntos": [
      { "path": "outputs/final/libro_completo.pdf", "nombre": "MiLibro.pdf" }
    ],
    "prioridad": "normal | alta"
  }
}
```

**Output:**
```json
{
  "skill": "SKL-06",
  "accion": "send_email",
  "resultado": {
    "exito": true,
    "message_id": "sg-msg-123456",
    "destinatarios_enviados": 1,
    "timestamp": "2025-03-21T15:00:00Z"
  }
}
```

---

### `send_email_batch`
Envía emails personalizados a múltiples destinatarios.
Útil para newsletters o campañas de distribución.

```json
{
  "skill": "SKL-06",
  "accion": "send_email_batch",
  "parametros": {
    "lista": [
      { "email": "usuario1@email.com", "nombre": "Juan", "variables": { "titulo_libro": "..." } },
      { "email": "usuario2@email.com", "nombre": "Ana", "variables": { "titulo_libro": "..." } }
    ],
    "asunto": "Hola {{nombre}}, tu libro está listo",
    "plantilla_html": "<p>Hola {{nombre}}, aquí está {{titulo_libro}}...</p>",
    "adjunto_comun": "outputs/final/libro_completo.pdf"
  }
}
```

**Output:**
```json
{
  "skill": "SKL-06",
  "accion": "send_email_batch",
  "resultado": {
    "total": 150,
    "enviados": 148,
    "fallidos": 2,
    "emails_fallidos": ["invalido@email.com", "bounce@email.com"]
  }
}
```

---

### `send_whatsapp`
Envía un mensaje por WhatsApp Business.

```json
{
  "skill": "SKL-06",
  "accion": "send_whatsapp",
  "parametros": {
    "telefono": "+521234567890",
    "mensaje": "Tu pipeline terminó. El libro está listo para descargar.",
    "tipo": "texto | documento | imagen",
    "archivo_path": "outputs/final/libro_completo.pdf"
  }
}
```

---

### `send_telegram`
Envía un mensaje o archivo por Telegram.

```json
{
  "skill": "SKL-06",
  "accion": "send_telegram",
  "parametros": {
    "mensaje": "✅ Pipeline completado: *Libro Completo*\n8 capítulos | 9,800 palabras | 9 imágenes",
    "parse_mode": "markdown",
    "archivo_path": "outputs/final/libro_completo.pdf",
    "nombre_archivo": "MiLibro_Final.pdf"
  }
}
```

---

### `send_slack`
Envía una notificación a un canal de Slack.

```json
{
  "skill": "SKL-06",
  "accion": "send_slack",
  "parametros": {
    "canal": "#pipeline-outputs",
    "mensaje": "Pipeline *libro_completo* finalizado exitosamente",
    "bloques": [
      { "type": "section", "text": "✅ *Libro Completo* generado\n• 8 capítulos\n• 9,800 palabras" }
    ],
    "archivo_path": "outputs/final/libro_completo.zip"
  }
}
```

---

## MANEJO DE ERRORES

```json
{
  "skill_error": {
    "skill_id": "SKL-06",
    "canal": "email",
    "error": "credenciales_invalidas | destinatario_invalido | adjunto_muy_grande | rate_limit",
    "accion_sugerida": "Verificar API key | Validar email del destinatario | Comprimir adjunto"
  }
}
```

---

## REGLAS DE USO

- Siempre confirmar con AG-05 EDITOR antes de enviar a destinatarios externos
- Nunca enviar contenido no aprobado por el usuario
- Para adjuntos mayores a 10MB usar link de descarga en lugar del archivo directo
- Registrar en `context.json` cada envío exitoso con timestamp y destinatario

---

## COMUNICACIÓN EN TERMINAL

```
[EMAIL MSG] Preparando envío de resultado final...
[EMAIL MSG] Canal: Email | Destinatario: usuario@email.com
[EMAIL MSG] Adjuntando: MiLibro_Final.pdf (48.2 MB → comprimido a 12.1 MB)
[EMAIL MSG] Enviando...
[EMAIL MSG] ✓ Email enviado — ID: sg-msg-123456
[EMAIL MSG] ✓ Notificación Telegram enviada al canal configurado
```
