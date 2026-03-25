# SKILL — AUDIO TTS (SKL-05)

---

## DESCRIPCIÓN

Permite a cualquier agente convertir texto en audio de alta calidad usando
servicios de Text-to-Speech. Soporta múltiples voces, idiomas, velocidades
y estilos de narración. El audio generado se guarda como archivo MP3/WAV
en el directorio de outputs del pipeline.

---

## CUÁNDO USARLA

- El pipeline produce podcasts, audiolibros o narraciones
- El usuario quiere una versión en audio del contenido generado
- Se necesita narrar capítulos, guiones o artículos
- El pipeline es de tipo curso online con lecciones narradas

## CUÁNDO NO USARLA

- El pipeline es solo texto o visual — no agregar audio innecesariamente
- El usuario no solicitó audio explícitamente
- El texto a narrar no está aprobado aún por el usuario

---

## SERVICIOS SOPORTADOS

| Servicio | Calidad | Voces | Clave en credentials.json |
|---|---|---|---|
| ElevenLabs | Alta (preferido) | 30+ voces expresivas | `elevenlabs.api_key` |
| OpenAI TTS | Alta | 6 voces | `openai.api_key` |
| Google TTS | Media | 200+ voces | `google.tts_key` |
| Azure TTS | Alta | 400+ voces | `azure.tts_key` |

El agente usa el servicio disponible en `credentials.json` en el orden
de preferencia de la tabla. Si ninguno está disponible, reporta error.

---

## PROTOCOLO DE USO

### PASO 1 — Verificar texto aprobado
El texto debe estar en `context.json` con `aprobado_por_usuario: true`
antes de generar el audio.

### PASO 2 — Seleccionar voz según tono del pipeline
Consulta el campo `tono` en `preferencias_usuario` del contexto para elegir
la voz más apropiada.

### PASO 3 — Generar y guardar
El audio se guarda en `outputs/audio/` con nombre descriptivo.

---

## ACCIONES DISPONIBLES

### `generate_audio`
Convierte texto en audio.

```json
{
  "skill": "SKL-05",
  "accion": "generate_audio",
  "parametros": {
    "texto": "Texto completo a narrar...",
    "voz": "narrator_male_deep | narrator_female_warm | auto",
    "idioma": "es | en | auto",
    "velocidad": 0.9,
    "estilo": "narración | conversacional | dramatico | informativo",
    "nombre_archivo": "capitulo_01_narración",
    "formato": "mp3 | wav",
    "servicio": "elevenlabs | openai | google | azure | auto"
  }
}
```

**Voces recomendadas por tono:**
| Tono del pipeline | Voz sugerida |
|---|---|
| Épico / dramático | `narrator_male_deep` o `narrator_female_dramatic` |
| Íntimo / personal | `narrator_female_warm` |
| Informativo / profesional | `narrator_male_neutral` |
| Infantil | `narrator_female_friendly` |
| auto | El agente elige según el tono del contexto |

**Output:**
```json
{
  "skill": "SKL-05",
  "accion": "generate_audio",
  "resultado": {
    "exito": true,
    "path": "outputs/audio/capitulo_01_narracion.mp3",
    "duracion_segundos": 420,
    "tamaño_bytes": 6720000,
    "voz_usada": "narrator_male_deep",
    "servicio_usado": "elevenlabs",
    "palabras_narradas": 1200
  }
}
```

---

### `generate_audio_batch`
Genera audio para múltiples textos en secuencia.
Útil cuando el Orquestador procesa varios capítulos.

```json
{
  "skill": "SKL-05",
  "accion": "generate_audio_batch",
  "parametros": {
    "items": [
      { "id": "cap_01", "texto": "Capítulo 1...", "nombre_archivo": "capitulo_01_narracion" },
      { "id": "cap_02", "texto": "Capítulo 2...", "nombre_archivo": "capitulo_02_narracion" }
    ],
    "voz": "narrator_male_deep",
    "idioma": "es",
    "formato": "mp3"
  }
}
```

**Output:**
```json
{
  "skill": "SKL-05",
  "accion": "generate_audio_batch",
  "resultado": {
    "total": 2,
    "completados": 2,
    "archivos": [
      { "id": "cap_01", "path": "outputs/audio/capitulo_01_narracion.mp3", "duracion_segundos": 420 },
      { "id": "cap_02", "path": "outputs/audio/capitulo_02_narracion.mp3", "duracion_segundos": 380 }
    ],
    "duracion_total_segundos": 800
  }
}
```

---

### `add_music_bed`
Agrega música de fondo a un audio narrado (para podcasts o audiolibros).

```json
{
  "skill": "SKL-05",
  "accion": "add_music_bed",
  "parametros": {
    "audio_narración_path": "outputs/audio/capitulo_01_narracion.mp3",
    "musica_path": "inputs/musica_fondo.mp3",
    "volumen_musica": 0.15,
    "fade_in_segundos": 3,
    "fade_out_segundos": 5,
    "nombre_archivo_salida": "capitulo_01_final"
  }
}
```

---

## MANEJO DE ERRORES

```json
{
  "skill_error": {
    "skill_id": "SKL-05",
    "accion_intentada": "generate_audio",
    "error": "credenciales_invalidas | texto_muy_largo | voz_no_disponible | rate_limit",
    "caracteres_texto": 15000,
    "limite_servicio": 5000,
    "accion_sugerida": "Dividir texto en fragmentos de máx 5000 chars | Usar generate_audio_batch"
  }
}
```

---

## REGLAS DE USO

- Si el texto supera 5,000 caracteres, dividirlo automáticamente y usar `generate_audio_batch`
- Guardar siempre la duración del audio en el output para que el Piloto la registre en contexto
- No generar audio de texto no aprobado por el usuario
- Si el servicio preferido falla, intentar con el siguiente en la lista de preferencia

---

## COMUNICACIÓN EN TERMINAL

```
[AUDIO TTS] Preparando narración: capitulo_01 (1,200 palabras)
[AUDIO TTS] Servicio: ElevenLabs | Voz: narrator_male_deep | Estilo: dramático
[AUDIO TTS] Generando audio...
[AUDIO TTS] ✓ outputs/audio/capitulo_01_narracion.mp3 — 7:00 min, 6.7 MB
```
