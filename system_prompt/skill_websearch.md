# SKILL — WEB SEARCH (SKL-01)

---

## DESCRIPCIÓN

Permite a cualquier agente buscar información en internet en tiempo real.
Úsala cuando el contenido a generar requiere datos actuales, referencias
verificables, estadísticas, noticias recientes o cualquier información
que no esté en el contexto del pipeline.

---

## CUÁNDO USARLA

- El pipeline requiere datos factuales actualizados
- Se necesitan referencias reales (autores, libros, estudios, noticias)
- El tema central del contenido requiere investigación previa
- AG-06 INVESTIGADOR está activo en el pipeline
- El usuario mencionó que quiere contenido basado en hechos reales

## CUÁNDO NO USARLA

- El contenido es completamente ficticio y no requiere datos reales
- La información necesaria ya está en `context.json`
- La búsqueda sería solo para validar algo que el agente ya sabe con certeza

---

## PROTOCOLO DE USO

### PASO 1 — Formula la query
Antes de buscar, construye una query precisa:
- Usa términos específicos, no frases largas
- Incluye año si necesitas información reciente: "inteligencia artificial 2025"
- Si buscas un dato concreto, formula la query como pregunta directa
- Máximo 6 palabras por query para mejores resultados

### PASO 2 — Ejecuta la búsqueda

```json
{
  "skill": "SKL-01",
  "accion": "search",
  "parametros": {
    "query": "string de búsqueda",
    "max_results": 5,
    "filtro_fecha": "ultimo_año | ultimo_mes | cualquiera",
    "idioma": "es | en | auto"
  }
}
```

### PASO 3 — Evalúa los resultados
- Lee los snippets de los primeros 3-5 resultados
- Verifica que la fuente sea confiable (evita foros sin autoría, sitios sin fecha)
- Si los resultados no son relevantes, reformula la query y busca de nuevo

### PASO 4 — Extrae y cita
- Extrae solo la información relevante para la tarea actual
- Guarda la fuente (URL + título) para incluirla en el output
- No copies texto literal — sintetiza la información

---

## ACCIONES DISPONIBLES

### `search`
Búsqueda general en internet.

**Input:**
```json
{
  "skill": "SKL-01",
  "accion": "search",
  "parametros": {
    "query": "efectos del cambio climático en océanos 2025",
    "max_results": 5,
    "filtro_fecha": "ultimo_año",
    "idioma": "es"
  }
}
```

**Output:**
```json
{
  "skill": "SKL-01",
  "accion": "search",
  "resultado": {
    "query_usada": "efectos del cambio climático en océanos 2025",
    "resultados": [
      {
        "titulo": "Informe IPCC 2025: Océanos y cambio climático",
        "url": "https://...",
        "snippet": "Resumen del contenido relevante...",
        "fecha": "2025-03"
      }
    ],
    "sintesis": "Resumen sintetizado de los resultados más relevantes para la tarea",
    "fuentes_usadas": ["url1", "url2"]
  }
}
```

### `search_image_refs`
Busca referencias visuales para guiar la generación de imágenes.

**Input:**
```json
{
  "skill": "SKL-01",
  "accion": "search_image_refs",
  "parametros": {
    "query": "ilustración acuarela bosque oscuro fantasía",
    "max_results": 3
  }
}
```

**Output:**
```json
{
  "skill": "SKL-01",
  "accion": "search_image_refs",
  "resultado": {
    "referencias": [
      {
        "url_imagen": "https://...",
        "descripcion": "Bosque con árboles retorcidos, paleta azul/verde oscuro",
        "estilo_detectado": "acuarela digital con texturas"
      }
    ],
    "prompt_sugerido": "Dark fantasy forest, twisted trees, blue-green palette, watercolor style, digital art"
  }
}
```

---

## MANEJO DE ERRORES

```json
{
  "skill_error": {
    "skill_id": "SKL-01",
    "accion_intentada": "search",
    "query": "...",
    "error": "sin_resultados | timeout | query_invalida",
    "accion_sugerida": "Reformular query con términos más específicos | Reintentar en 5s"
  }
}
```

---

## EJEMPLO EN CONTEXTO

**Situación:** AG-03 ESCRITOR está escribiendo un capítulo sobre astronomía
y necesita datos reales sobre agujeros negros.

```
[ESCRITOR + SKL-01] Buscando: "agujeros negros descubrimientos recientes 2025"
[ESCRITOR + SKL-01] ✓ 4 resultados relevantes encontrados
[ESCRITOR + SKL-01] Sintetizando datos para integrar en el capítulo...
[ESCRITOR + SKL-01] Fuentes guardadas en output para referencia
```
