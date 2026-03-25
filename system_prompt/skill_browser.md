# SKILL — BROWSER CONTROL (SKL-02)

---

## DESCRIPCIÓN

Permite a cualquier agente controlar un navegador web de forma programática:
abrir URLs, navegar entre páginas, hacer click en elementos, llenar formularios,
extraer contenido de páginas y tomar capturas de pantalla.

Es la skill más poderosa y también la más delicada. Úsala con precisión.

---

## CUÁNDO USARLA

- Publicar contenido en plataformas que no tienen API disponible
- Extraer datos de páginas web con contenido dinámico (no accesible con search)
- Llenar formularios en plataformas externas
- Verificar que un contenido fue publicado correctamente
- Navegar por un CMS para subir contenido

## CUÁNDO NO USARLA

- Si la plataforma tiene API disponible → usar SKL-07 API REST en su lugar
- Si solo necesitas información pública → usar SKL-01 WEB SEARCH
- Para publicar en redes sociales con API → usar SKL-03 SOCIAL PUBLISH

---

## PROTOCOLO DE USO

### PASO 1 — Define el objetivo completo antes de empezar
Antes de abrir el navegador, mapea todos los pasos que necesitas:
- ¿Qué URL es el punto de entrada?
- ¿Requiere login? ¿Las credenciales están en `credentials.json`?
- ¿Cuántos pasos tiene la acción completa?
- ¿Qué confirma que la acción fue exitosa?

### PASO 2 — Verifica credenciales si aplica
```json
{
  "skill": "SKL-02",
  "accion": "check_credentials",
  "parametros": {
    "servicio": "nombre_del_servicio"
  }
}
```

### PASO 3 — Ejecuta acciones en secuencia
Cada acción del navegador es atómica. Ejecuta una a la vez y verifica
el resultado antes de continuar.

### PASO 4 — Confirma el resultado final
Siempre toma un screenshot o extrae texto de confirmación antes de cerrar.

---

## ACCIONES DISPONIBLES

### `navigate`
Abre una URL en el navegador.

```json
{
  "skill": "SKL-02",
  "accion": "navigate",
  "parametros": {
    "url": "https://ejemplo.com/login",
    "esperar_carga": true,
    "timeout_segundos": 10
  }
}
```

### `click`
Hace click en un elemento de la página.

```json
{
  "skill": "SKL-02",
  "accion": "click",
  "parametros": {
    "selector": "#boton-publicar | texto:Publicar | xpath://button[@type='submit']",
    "verificar_despues": "texto_esperado_en_pagina"
  }
}
```

### `fill_form`
Llena un campo de formulario.

```json
{
  "skill": "SKL-02",
  "accion": "fill_form",
  "parametros": {
    "selector": "#campo-titulo",
    "valor": "Texto a escribir en el campo",
    "limpiar_antes": true
  }
}
```

### `extract_text`
Extrae texto de un elemento de la página.

```json
{
  "skill": "SKL-02",
  "accion": "extract_text",
  "parametros": {
    "selector": ".mensaje-confirmacion | body",
    "formato": "texto_plano | html"
  }
}
```

### `screenshot`
Toma una captura de pantalla del estado actual.

```json
{
  "skill": "SKL-02",
  "accion": "screenshot",
  "parametros": {
    "guardar_en": "outputs/screenshots/confirmacion_publicacion.png",
    "elemento": "full_page | viewport | selector_especifico"
  }
}
```

### `login`
Ejecuta el flujo completo de login en un servicio.

```json
{
  "skill": "SKL-02",
  "accion": "login",
  "parametros": {
    "servicio": "nombre_servicio",
    "credenciales_key": "clave_en_credentials_json",
    "url_login": "https://...",
    "selector_usuario": "#email",
    "selector_password": "#password",
    "selector_submit": "#btn-login",
    "verificacion_exito": "texto o selector que confirma login exitoso"
  }
}
```

**Output de login:**
```json
{
  "skill": "SKL-02",
  "accion": "login",
  "resultado": {
    "exito": true,
    "sesion_activa": true,
    "url_actual": "https://dashboard.ejemplo.com"
  }
}
```

---

## FLUJO COMPLETO DE EJEMPLO

**Situación:** Publicar un artículo en un CMS que no tiene API.

```json
[
  { "accion": "navigate", "parametros": { "url": "https://cms.ejemplo.com/login" }},
  { "accion": "login", "parametros": { "servicio": "cms_ejemplo", "credenciales_key": "cms" }},
  { "accion": "navigate", "parametros": { "url": "https://cms.ejemplo.com/new-post" }},
  { "accion": "fill_form", "parametros": { "selector": "#titulo", "valor": "Título del artículo" }},
  { "accion": "fill_form", "parametros": { "selector": "#contenido", "valor": "Cuerpo del artículo..." }},
  { "accion": "click", "parametros": { "selector": "#btn-publicar", "verificar_despues": "Publicado exitosamente" }},
  { "accion": "screenshot", "parametros": { "guardar_en": "outputs/screenshots/articulo_publicado.png" }}
]
```

---

## MANEJO DE ERRORES

```json
{
  "skill_error": {
    "skill_id": "SKL-02",
    "accion_intentada": "click",
    "selector_usado": "#boton-publicar",
    "error": "elemento_no_encontrado | timeout | login_fallido | pagina_no_carga",
    "url_actual": "https://...",
    "accion_sugerida": "Verificar selector | Revisar credenciales | Reintentar navegación"
  }
}
```

---

## REGLAS DE SEGURIDAD

- Nunca almacenes credenciales en el contexto — siempre léelas de `credentials.json`
- Siempre toma screenshot de confirmación antes de reportar éxito
- Si el login falla 2 veces, escala al Piloto — no reintentes indefinidamente
- No navegar a URLs no relacionadas con la tarea actual

---

## COMUNICACIÓN EN TERMINAL

```
[BROWSER] Navegando a cms.ejemplo.com/login...
[BROWSER] ✓ Página cargada
[BROWSER] Ejecutando login con credenciales almacenadas...
[BROWSER] ✓ Login exitoso — sesión activa
[BROWSER] Llenando formulario de nuevo artículo...
[BROWSER] ✓ Formulario completo — publicando...
[BROWSER] ✓ Artículo publicado — screenshot guardado
```
