# SKL-08 — VIDEO MERGE

## Descripción
Une dos o más clips de video locales en un único archivo MP4 usando FFmpeg.
Los videos pueden tener diferentes resoluciones y codecs — el skill los normaliza automáticamente.

## Cuándo usarla
- Cuando el pipeline produce múltiples clips de video que deben ensamblarse en uno solo
- Bloque destino típico: `video_ensamblado`, `video_final`, `video_final_ensamblado`

## Acción disponible: `merge_videos`

### Parámetros de entrada
| Campo | Tipo | Obligatorio | Default | Descripción |
|---|---|---|---|---|
| `videos` | string[] | ✅ | — | Rutas locales (`/uploads/...`) o URLs de los clips en ORDEN correcto |
| `nombre_archivo` | string | ❌ | `video_merged` | Nombre del archivo de salida (sin extensión) |
| `formato` | string | ❌ | `mp4` | Formato: `mp4`, `mov`, `mkv` |
| `fps` | number | ❌ | `30` | Fotogramas por segundo |
| `resolucion` | string | ❌ | null | Ej. `1920:1080`. Si null, usa la resolución del primer clip |
| `calidad_crf` | number | ❌ | `23` | Calidad 0-51 (menor = mayor calidad). 23 es estándar. |

### Ejemplo de llamada
```json
{
  "skill": "SKL-08",
  "accion": "merge_videos",
  "parametros": {
    "videos": [
      "/uploads/vid_clip1.mp4",
      "/uploads/vid_clip2.mp4",
      "/uploads/vid_clip3.mp4",
      "/uploads/vid_clip4.mp4"
    ],
    "nombre_archivo": "video_final_ensamblado",
    "fps": 30
  }
}
```

### Resultado exitoso
```json
{
  "skill": "SKL-08",
  "accion": "merge_videos",
  "resultado": {
    "exito": true,
    "path": "outputs/video/video_final_ensamblado.mp4",
    "videos_unidos": 4,
    "duracion_proceso_ms": 12500,
    "tamano_bytes": 9876543,
    "tamano_mb": 9.42
  }
}
```

La URL pública del archivo ensamblado es:
`/pipeline-outputs/{pipeline_id}/outputs/video/{nombre_archivo}.mp4`

### Manejo de errores
```json
{
  "skill_error": {
    "skill_id": "SKL-08",
    "accion_intentada": "merge_videos",
    "error": "Video no encontrado: /uploads/vid_xyz.mp4",
    "accion_sugerida": "Verificar que todos los clips existen antes de ensamblar"
  }
}
```

## Reglas
- Mínimo 2 videos requeridos
- Los videos se concatenan en el ORDEN del array `videos`
- Las rutas locales deben existir en el servidor (los clips de KLING/Veo se guardan automáticamente en `/uploads/`)
- Si un clip tiene URL remota (http://...) el skill la descarga automáticamente
