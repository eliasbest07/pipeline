# SKILL — API REST (SKL-07)

---

## DESCRIPCIÓN

Permite a cualquier agente consumir APIs externas mediante requests HTTP:
GET, POST, PUT, PATCH y DELETE. Soporta autenticación por API Key, Bearer
Token y OAuth 2.0. Úsala cuando el pipeline necesita interactuar con
servicios externos que exponen una API.

---

## CUÁNDO USARLA

- Consultar datos externos en tiempo real (clima, precios, datos públicos)
- Subir contenido a plataformas con API (Notion, Airtable, WordPress, etc.)
- Integrar con servicios de terceros específicos del cliente
- Disparar webhooks al completarse un bloque del pipeline
- Consultar o actualizar un CRM, base de datos o plataforma externa

## CUÁNDO NO USARLA

- Para publicar en redes sociales → usar SKL-03 SOCIAL PUBLISH
- Para navegar web sin API → usar SKL-02 BROWSER CONTROL
- Para buscar información general → usar SKL-01 WEB SEARCH

---

## CREDENCIALES REQUERIDAS

Las credenciales de cada API se guardan en `credentials.json`:

```json
{
  "apis": {
    "nombre_servicio": {
      "tipo": "api_key | bearer | oauth2",
      "api_key": "",
      "base_url": "https://api.servicio.com/v1",
      "header_nombre": "X-API-Key",
      "token_url": "solo para oauth2",
      "client_id": "solo para oauth2",
      "client_secret": "solo para oauth2"
    }
  }
}
```

---

## PROTOCOLO DE USO

### PASO 1 — Verificar que la API está configurada
Antes de hacer cualquier request, verificar que las credenciales existen en `credentials.json`.

### PASO 2 — Construir el request
Define método, endpoint, headers, body y parámetros.

### PASO 3 — Ejecutar y validar respuesta
Verifica el status code antes de usar la respuesta.
- 2xx → éxito
- 4xx → error del request (revisar parámetros)
- 5xx → error del servidor (reintentar)

### PASO 4 — Extraer datos relevantes
No devuelvas la respuesta completa si es muy grande — extrae solo lo necesario.

---

## ACCIONES DISPONIBLES

### `get`
Ejecuta un request GET.

```json
{
  "skill": "SKL-07",
  "accion": "get",
  "parametros": {
    "servicio": "nombre_en_credentials",
    "endpoint": "/posts/123",
    "query_params": {
      "format": "json",
      "lang": "es"
    },
    "headers_extra": {}
  }
}
```

**Output:**
```json
{
  "skill": "SKL-07",
  "accion": "get",
  "resultado": {
    "status_code": 200,
    "datos": { "id": 123, "titulo": "...", "contenido": "..." },
    "headers_respuesta": { "content-type": "application/json" },
    "url_llamada": "https://api.servicio.com/v1/posts/123"
  }
}
```

---

### `post`
Ejecuta un request POST para crear o enviar datos.

```json
{
  "skill": "SKL-07",
  "accion": "post",
  "parametros": {
    "servicio": "wordpress",
    "endpoint": "/wp-json/wp/v2/posts",
    "body": {
      "title": "Título del artículo",
      "content": "Cuerpo del artículo en HTML",
      "status": "publish",
      "categories": [5]
    },
    "content_type": "application/json"
  }
}
```

**Output:**
```json
{
  "skill": "SKL-07",
  "accion": "post",
  "resultado": {
    "status_code": 201,
    "datos": {
      "id": 456,
      "link": "https://misitio.com/articulo-titulo",
      "status": "publish"
    }
  }
}
```

---

### `put`
Actualiza un recurso completo.

```json
{
  "skill": "SKL-07",
  "accion": "put",
  "parametros": {
    "servicio": "airtable",
    "endpoint": "/v0/appXXXXXX/Libros/recXXXXXX",
    "body": {
      "fields": {
        "Estado": "Completo",
        "Palabras": 9800,
        "URL": "https://..."
      }
    }
  }
}
```

---

### `patch`
Actualiza parcialmente un recurso.

```json
{
  "skill": "SKL-07",
  "accion": "patch",
  "parametros": {
    "servicio": "notion",
    "endpoint": "/v1/pages/page-id-aqui",
    "body": {
      "properties": {
        "Estado": { "select": { "name": "Publicado" } }
      }
    }
  }
}
```

---

### `webhook`
Dispara un webhook a una URL externa para notificar un evento del pipeline.

```json
{
  "skill": "SKL-07",
  "accion": "webhook",
  "parametros": {
    "url": "https://hooks.zapier.com/hooks/catch/XXXXX/YYYYY/",
    "payload": {
      "evento": "pipeline_completado",
      "pipeline_id": "libro_completo_001",
      "resultado_url": "https://...",
      "timestamp": "2025-03-21T15:00:00Z"
    },
    "metodo": "POST"
  }
}
```

---

### `paginate`
Consume un endpoint paginado y devuelve todos los resultados.

```json
{
  "skill": "SKL-07",
  "accion": "paginate",
  "parametros": {
    "servicio": "nombre_servicio",
    "endpoint": "/items",
    "parametro_pagina": "page",
    "parametro_limite": "per_page",
    "limite_por_pagina": 100,
    "max_paginas": 10,
    "campo_datos": "items"
  }
}
```

---

## MANEJO DE ERRORES

```json
{
  "skill_error": {
    "skill_id": "SKL-07",
    "servicio": "wordpress",
    "endpoint": "/wp-json/wp/v2/posts",
    "metodo": "POST",
    "status_code": 401,
    "error": "unauthorized | not_found | rate_limit | server_error | timeout",
    "respuesta_servidor": "Invalid API key",
    "accion_sugerida": "Verificar credenciales en credentials.json | Renovar token OAuth"
  }
}
```

**Lógica de reintentos:**
- 401/403 → No reintentar — escalar al Piloto (problema de credenciales)
- 429 (rate limit) → Esperar el tiempo indicado en `Retry-After` header y reintentar
- 5xx → Reintentar hasta 2 veces con espera exponencial (5s, 15s)
- Timeout → Reintentar 1 vez, luego escalar

---

## SERVICIOS COMUNES PRECONFIGURADOS

| Servicio | Base URL | Auth |
|---|---|---|
| WordPress | `{tu-sitio}/wp-json/wp/v2` | Bearer |
| Notion | `https://api.notion.com/v1` | Bearer |
| Airtable | `https://api.airtable.com` | Bearer |
| Zapier Webhooks | URL por hook | Ninguna |
| Make (Integromat) | URL por webhook | Ninguna |
| Shopify | `https://{tienda}.myshopify.com/admin/api/2024-01` | API Key |

---

## REGLAS DE USO

- Nunca hardcodear credenciales en el body del request — siempre desde `credentials.json`
- Siempre validar el status code antes de usar los datos de respuesta
- Si la respuesta es mayor a 100KB, extraer solo los campos necesarios
- Registrar en `context.json` toda llamada exitosa con endpoint, timestamp y resultado clave

---

## COMUNICACIÓN EN TERMINAL

```
[API REST] POST → wordpress /wp-json/wp/v2/posts
[API REST] Autenticación: Bearer token
[API REST] Publicando artículo: "Capítulo 1 — El despertar sin nombre"
[API REST] ✓ Status 201 — Post ID: 456
[API REST] ✓ URL publicada: misitio.com/capitulo-1-el-despertar
```
