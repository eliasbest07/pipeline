# SKILL — SOCIAL PUBLISH (SKL-03)

---

## DESCRIPCIÓN

Permite publicar contenido directamente en redes sociales: Instagram, X (Twitter)
y LinkedIn. Usa las APIs oficiales de cada plataforma cuando están disponibles,
y SKL-02 BROWSER CONTROL como fallback cuando no hay API.

---

## CUÁNDO USARLA

- El pipeline produce contenido destinado a redes sociales
- El resultado final incluye posts, threads, artículos o stories
- El usuario aprobó el contenido y quiere publicación automática
- AG-05 EDITOR ya obtuvo confirmación explícita del usuario antes de publicar

## CUÁNDO NO USARLA

- El contenido no ha sido aprobado por el usuario — siempre pedir confirmación antes
- Las credenciales de la plataforma no están configuradas en `credentials.json`
- El usuario solo quiere generar el contenido, no publicarlo aún

---

## CREDENCIALES REQUERIDAS

Deben estar en `credentials.json` bajo las siguientes claves:

```json
{
  "instagram": {
    "access_token": "",
    "instagram_business_id": ""
  },
  "twitter_x": {
    "api_key": "",
    "api_secret": "",
    "access_token": "",
    "access_token_secret": ""
  },
  "linkedin": {
    "access_token": "",
    "person_id": ""
  }
}
```

---

## PROTOCOLO DE USO

### PASO 1 — Verificar aprobación del usuario
NUNCA publiques sin confirmación explícita del usuario via AG-05.
El contexto debe tener `aprobado_por_usuario: true` en el bloque correspondiente.

### PASO 2 — Adaptar el contenido por plataforma
Cada red tiene sus límites y formatos. Adapta antes de publicar:

| Plataforma | Límite texto | Imágenes | Hashtags |
|---|---|---|---|
| Instagram | 2,200 chars | 1-10 imágenes | Hasta 30 |
| X (Twitter) | 280 chars | Hasta 4 | Hasta 5 |
| LinkedIn | 3,000 chars | 1 imagen | Hasta 5 |

### PASO 3 — Publicar y confirmar

---

## ACCIONES DISPONIBLES

### `publish_instagram`
Publica un post en Instagram (requiere imagen obligatoria).

```json
{
  "skill": "SKL-03",
  "accion": "publish_instagram",
  "parametros": {
    "caption": "Texto del post con #hashtags",
    "imagen_path": "outputs/imagenes/post_instagram.jpg",
    "tipo": "feed | story | reel",
    "hashtags": ["#tag1", "#tag2"],
    "ubicacion": "opcional"
  }
}
```

**Output:**
```json
{
  "skill": "SKL-03",
  "accion": "publish_instagram",
  "resultado": {
    "exito": true,
    "post_id": "17846368219941196",
    "url_post": "https://www.instagram.com/p/XXXXX/",
    "timestamp": "2025-03-21T14:30:00Z"
  }
}
```

---

### `publish_twitter_x`
Publica un tweet o thread en X.

```json
{
  "skill": "SKL-03",
  "accion": "publish_twitter_x",
  "parametros": {
    "tipo": "tweet | thread",
    "contenido": "Texto del tweet (máx 280 chars)",
    "thread": [
      "Primer tweet del thread...",
      "Segundo tweet del thread...",
      "Cierre con CTA..."
    ],
    "imagen_path": "outputs/imagenes/post_x.jpg",
    "responder_a": "tweet_id opcional para responder"
  }
}
```

**Output:**
```json
{
  "skill": "SKL-03",
  "accion": "publish_twitter_x",
  "resultado": {
    "exito": true,
    "tweet_id": "1234567890",
    "url_tweet": "https://x.com/user/status/1234567890",
    "tipo_publicado": "thread",
    "tweets_en_thread": 3
  }
}
```

---

### `publish_linkedin`
Publica un artículo o post en LinkedIn.

```json
{
  "skill": "SKL-03",
  "accion": "publish_linkedin",
  "parametros": {
    "tipo": "post | articulo",
    "titulo": "Solo para tipo articulo",
    "contenido": "Texto del post o cuerpo del artículo",
    "imagen_path": "outputs/imagenes/post_linkedin.jpg",
    "hashtags": ["#innovacion", "#tecnologia"]
  }
}
```

**Output:**
```json
{
  "skill": "SKL-03",
  "accion": "publish_linkedin",
  "resultado": {
    "exito": true,
    "post_id": "urn:li:share:123456789",
    "url_post": "https://www.linkedin.com/posts/...",
    "timestamp": "2025-03-21T14:30:00Z"
  }
}
```

---

### `publish_multi`
Publica en múltiples plataformas en una sola llamada.
El Orquestador puede usar esta acción para paralelizar.

```json
{
  "skill": "SKL-03",
  "accion": "publish_multi",
  "parametros": {
    "plataformas": ["instagram", "twitter_x", "linkedin"],
    "contenido_por_plataforma": {
      "instagram": { "caption": "...", "imagen_path": "..." },
      "twitter_x": { "tipo": "tweet", "contenido": "..." },
      "linkedin": { "tipo": "post", "contenido": "..." }
    }
  }
}
```

---

## MANEJO DE ERRORES

```json
{
  "skill_error": {
    "skill_id": "SKL-03",
    "plataforma": "instagram",
    "error": "token_expirado | imagen_formato_invalido | rate_limit | cuenta_suspendida",
    "accion_sugerida": "Renovar token en credentials.json | Convertir imagen a JPG | Esperar 15min"
  }
}
```

---

## REGLAS CRÍTICAS

- **NUNCA publicar sin `aprobado_por_usuario: true` en el contexto**
- Si el token expira, detener y notificar al usuario via AG-05 — no reintentar con credenciales inválidas
- Guardar siempre la URL del post publicado en `context.json`
- Si una plataforma falla en `publish_multi`, publicar en las que sí funcionan y reportar el fallo

---

## COMUNICACIÓN EN TERMINAL

```
[SOCIAL] Verificando aprobación del usuario... ✓
[SOCIAL] Adaptando contenido para 3 plataformas...
[SOCIAL] Publicando en Instagram... ✓ instagram.com/p/XXXXX
[SOCIAL] Publicando en X... ✓ x.com/user/status/123456
[SOCIAL] Publicando en LinkedIn... ✓ linkedin.com/posts/...
[SOCIAL] ✓ Publicación completa en 3/3 plataformas
```
