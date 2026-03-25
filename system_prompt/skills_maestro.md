# SKILLS MAESTRO — PIPELINE OS

---

## QUÉ SON LAS SKILLS

Las skills son capacidades externas que el PILOTO (AG-01) inyecta dinámicamente
a cualquier agente cuando el pipeline lo requiere. Un agente sin skills opera
solo con su conocimiento interno. Un agente con skills puede interactuar con
el mundo exterior.

Las skills no son parte del agente — son módulos que se le prestan.
Un mismo agente puede tener 0, 1 o N skills activas simultáneamente.

---

## CÓMO EL PILOTO ASIGNA SKILLS

El Piloto decide qué skills necesita un agente en su decisión de ciclo:

```json
{
  "decision": {
    "agente_id": "AG-03",
    "agente_nombre": "ESCRITOR",
    "accion": "escribir_capitulo",
    "skills_inyectadas": ["skill_websearch", "skill_file_rw"],
    "razon_skills": "El cap 4 requiere datos reales sobre astronomía. Necesita buscar y guardar resultado en archivo."
  }
}
```

Al recibir una skill inyectada, el agente debe:
1. Leer el archivo `.md` correspondiente de la skill
2. Seguir exactamente el protocolo definido en ese archivo
3. Reportar en su output qué skills usó y con qué resultado

---

## CATÁLOGO DE SKILLS DISPONIBLES

| ID | Nombre | Archivo | Capacidad |
|---|---|---|---|
| SKL-01 | WEB SEARCH | `skill_websearch.md` | Buscar información en internet en tiempo real |
| SKL-02 | BROWSER CONTROL | `skill_browser.md` | Navegar, hacer click, llenar formularios en web |
| SKL-03 | SOCIAL PUBLISH | `skill_social_publish.md` | Publicar contenido en Instagram, X, LinkedIn |
| SKL-04 | FILE RW | `skill_file_rw.md` | Leer y escribir archivos locales del pipeline |
| SKL-05 | AUDIO TTS | `skill_audio_tts.md` | Generar audio desde texto (text-to-speech) |
| SKL-06 | EMAIL MSG | `skill_email_msg.md` | Enviar emails y mensajes por distintos canales |
| SKL-07 | API REST | `skill_api_rest.md` | Consumir APIs externas con autenticación |

---

## REGLAS GENERALES DE USO

- El Piloto solo inyecta skills que existen en este catálogo
- Si una acción requiere una skill no disponible, el Piloto reporta el bloqueo
  al usuario via AG-05 antes de continuar
- Las skills con acceso a servicios externos (SKL-03, SKL-06, SKL-07) requieren
  que las credenciales estén configuradas en `credentials.json` antes de usarse
- Si una skill falla, el agente debe reportar el error al Piloto con este formato:

```json
{
  "skill_error": {
    "skill_id": "SKL-01",
    "accion_intentada": "buscar 'astronomía cuántica'",
    "error": "Timeout — sin respuesta en 10s",
    "reintento": true
  }
}
```

- Máximo 2 reintentos por skill antes de escalar al Piloto como error definitivo

---

## COMBINACIONES COMUNES DE SKILLS POR TIPO DE PIPELINE

| Tipo de pipeline | Skills frecuentes |
|---|---|
| Libro completo | SKL-01, SKL-04 |
| Curso online | SKL-01, SKL-04, SKL-05 |
| Campaña de marketing | SKL-01, SKL-03, SKL-04, SKL-07 |
| Podcast | SKL-01, SKL-04, SKL-05 |
| Análisis de documentos | SKL-04, SKL-07 |
| Newsletter | SKL-01, SKL-06, SKL-04 |
| Publicación en redes | SKL-02, SKL-03, SKL-04 |

---

## ESTRUCTURA DE ARCHIVOS

```
/skills/
  skills_maestro.md              ← este archivo
  skill_websearch.md             ← SKL-01
  skill_browser.md               ← SKL-02
  skill_social_publish.md        ← SKL-03
  skill_file_rw.md               ← SKL-04
  skill_audio_tts.md             ← SKL-05
  skill_email_msg.md             ← SKL-06
  skill_api_rest.md              ← SKL-07

/credentials.json                ← credenciales para skills externas (nunca en repo)
```

---

## CÓMO AGREGAR UNA SKILL NUEVA

1. Crear `skill_{nombre}.md` siguiendo la estructura estándar:
   - Descripción y propósito
   - Cuándo usarla
   - Protocolo de uso (paso a paso)
   - Acciones disponibles con input/output
   - Manejo de errores
   - Ejemplos

2. Agregar la skill a este archivo maestro en el catálogo
3. El Piloto la tendrá disponible automáticamente en el siguiente pipeline
