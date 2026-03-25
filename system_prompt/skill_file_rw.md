# SKILL — FILE READ/WRITE (SKL-04)

---

## DESCRIPCIÓN

Permite a cualquier agente leer y escribir archivos locales del pipeline:
contexto, resultados intermedios, outputs finales, assets y cualquier
archivo que forme parte del flujo de trabajo.

Es la skill más usada del sistema — casi todos los agentes la necesitan
para persistir resultados o leer insumos.

---

## CUÁNDO USARLA

- Guardar el output de un agente como archivo (texto, JSON, imagen, audio)
- Leer un archivo subido por el usuario como insumo del pipeline
- Persistir resultados intermedios que otros agentes necesitarán
- Exportar el resultado final del pipeline en formato descargable
- Leer `context.json` o `seed_template.json` directamente

## CUÁNDO NO USARLA

- Para leer/escribir el contexto del pipeline usa siempre las operaciones
  estándar de context — no accedas a `context.json` directamente a menos
  que el Piloto lo indique explícitamente

---

## ESTRUCTURA DE DIRECTORIOS DEL PIPELINE

```
/pipeline_{id}/
  context.json                    ← contexto mutable (Piloto lo gestiona)
  seed_template_{nombre}.json     ← semilla (solo lectura durante ejecución)
  agent_menu_{nombre}.json        ← menú de agentes (solo lectura)

  /inputs/                        ← archivos que sube el usuario
    documento_referencia.pdf
    imagen_referencia.jpg

  /outputs/                       ← resultados generados por agentes
    /texto/
      capitulo_01.md
      capitulo_02.md
    /imagenes/
      portada.jpg
      cap_01_ilustracion.jpg
    /audio/
      narración_cap_01.mp3
    /final/
      libro_completo.pdf
      exportacion_completa.zip

  /temp/                          ← archivos temporales entre agentes
  /screenshots/                   ← capturas de SKL-02
  /logs/                          ← logs de ejecución
```

---

## ACCIONES DISPONIBLES

### `read_file`
Lee el contenido de un archivo.

```json
{
  "skill": "SKL-04",
  "accion": "read_file",
  "parametros": {
    "path": "inputs/documento_referencia.pdf",
    "formato": "texto | json | binario | base64",
    "encoding": "utf-8"
  }
}
```

**Output:**
```json
{
  "skill": "SKL-04",
  "accion": "read_file",
  "resultado": {
    "path": "inputs/documento_referencia.pdf",
    "contenido": "Contenido del archivo...",
    "tamaño_bytes": 24500,
    "formato": "texto"
  }
}
```

---

### `write_file`
Escribe contenido en un archivo. Crea el archivo si no existe.

```json
{
  "skill": "SKL-04",
  "accion": "write_file",
  "parametros": {
    "path": "outputs/texto/capitulo_03.md",
    "contenido": "# Capítulo 3\n\nEra una noche oscura...",
    "formato": "texto | json | base64",
    "modo": "crear | sobreescribir | append",
    "encoding": "utf-8"
  }
}
```

**Output:**
```json
{
  "skill": "SKL-04",
  "accion": "write_file",
  "resultado": {
    "exito": true,
    "path": "outputs/texto/capitulo_03.md",
    "tamaño_bytes": 4200,
    "modo_usado": "crear"
  }
}
```

---

### `list_files`
Lista archivos en un directorio.

```json
{
  "skill": "SKL-04",
  "accion": "list_files",
  "parametros": {
    "directorio": "outputs/texto/",
    "filtro_extension": ".md | .json | .jpg | todos",
    "incluir_metadata": true
  }
}
```

**Output:**
```json
{
  "skill": "SKL-04",
  "accion": "list_files",
  "resultado": {
    "directorio": "outputs/texto/",
    "archivos": [
      { "nombre": "capitulo_01.md", "tamaño_bytes": 3800, "modificado": "2025-03-21T10:00:00Z" },
      { "nombre": "capitulo_02.md", "tamaño_bytes": 4100, "modificado": "2025-03-21T10:15:00Z" }
    ],
    "total": 2
  }
}
```

---

### `copy_file`
Copia un archivo de una ubicación a otra.

```json
{
  "skill": "SKL-04",
  "accion": "copy_file",
  "parametros": {
    "origen": "temp/borrador_cap_03.md",
    "destino": "outputs/texto/capitulo_03.md"
  }
}
```

---

### `export_bundle`
Empaqueta todos los outputs del pipeline en un archivo ZIP descargable.

```json
{
  "skill": "SKL-04",
  "accion": "export_bundle",
  "parametros": {
    "incluir": ["outputs/texto/", "outputs/imagenes/", "outputs/audio/"],
    "nombre_archivo": "libro_completo_final",
    "formato": "zip | tar",
    "destino": "outputs/final/"
  }
}
```

**Output:**
```json
{
  "skill": "SKL-04",
  "accion": "export_bundle",
  "resultado": {
    "exito": true,
    "path": "outputs/final/libro_completo_final.zip",
    "tamaño_bytes": 48200000,
    "archivos_incluidos": 18
  }
}
```

---

## MANEJO DE ERRORES

```json
{
  "skill_error": {
    "skill_id": "SKL-04",
    "accion_intentada": "read_file",
    "path": "inputs/documento.pdf",
    "error": "archivo_no_encontrado | permiso_denegado | formato_no_soportado | disco_lleno",
    "accion_sugerida": "Verificar que el usuario subió el archivo | Verificar permisos del directorio"
  }
}
```

---

## REGLAS DE USO

- Siempre usar paths relativos al directorio del pipeline — nunca paths absolutos del sistema
- Antes de sobreescribir un archivo importante, crear backup en `/temp/`
- Los archivos en `/outputs/final/` son los únicos que se presentan al usuario como resultado descargable
- No escribir directamente en `context.json` — usar las operaciones de contexto del Piloto

---

## COMUNICACIÓN EN TERMINAL

```
[FILE] Escribiendo: outputs/texto/capitulo_03.md (4,200 bytes)
[FILE] ✓ Archivo guardado correctamente
[FILE] Listando outputs/imagenes/: 5 archivos encontrados
[FILE] Empaquetando bundle final...
[FILE] ✓ outputs/final/libro_completo_final.zip creado (48.2 MB, 18 archivos)
```
