/**
 * SKL-04 — File Read/Write
 * Opera dentro de pipeline_outputs/{pipeline_id}/
 * Nunca sale de ese directorio (path traversal protection).
 */

const fs = require('fs');
const path = require('path');
const { createWriteStream } = require('fs');

const BASE_DIR = path.join(__dirname, '..', 'pipeline_outputs');

function safePath(pipelineId, relativePath) {
  if (!pipelineId) throw new Error('pipeline_id required for file operations');
  const base = path.resolve(BASE_DIR, pipelineId);
  const full = path.resolve(base, relativePath);
  if (!full.startsWith(base)) throw new Error('Path traversal attempt blocked');
  return full;
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

// ── Acciones ───────────────────────────────────────────────────

function read_file({ path: filePath, formato = 'texto', encoding = 'utf-8' }, pipelineId) {
  const full = safePath(pipelineId, filePath);
  if (!fs.existsSync(full)) throw new Error(`archivo_no_encontrado: ${filePath}`);

  const stat = fs.statSync(full);
  let contenido;

  if (formato === 'base64' || formato === 'binario') {
    contenido = fs.readFileSync(full).toString('base64');
  } else if (formato === 'json') {
    contenido = JSON.parse(fs.readFileSync(full, encoding));
  } else {
    contenido = fs.readFileSync(full, encoding);
  }

  return {
    skill: 'SKL-04', accion: 'read_file',
    resultado: { path: filePath, contenido, tamaño_bytes: stat.size, formato },
  };
}

function write_file({ path: filePath, contenido, formato = 'texto', modo = 'crear', encoding = 'utf-8' }, pipelineId) {
  const full = safePath(pipelineId, filePath);
  ensureDir(full);

  const flag = modo === 'append' ? 'a' : 'w';
  if (formato === 'base64') {
    fs.writeFileSync(full, Buffer.from(contenido, 'base64'));
  } else if (formato === 'json') {
    fs.writeFileSync(full, JSON.stringify(contenido, null, 2), { encoding, flag });
  } else {
    fs.writeFileSync(full, contenido, { encoding, flag });
  }

  const stat = fs.statSync(full);
  return {
    skill: 'SKL-04', accion: 'write_file',
    resultado: { exito: true, path: filePath, tamaño_bytes: stat.size, modo_usado: modo },
  };
}

function list_files({ directorio = '.', filtro_extension = 'todos', incluir_metadata = false }, pipelineId) {
  const full = safePath(pipelineId, directorio);
  if (!fs.existsSync(full)) return { skill: 'SKL-04', accion: 'list_files', resultado: { directorio, archivos: [], total: 0 } };

  let archivos = fs.readdirSync(full);
  if (filtro_extension !== 'todos') archivos = archivos.filter(f => f.endsWith(filtro_extension));

  const lista = archivos.map(f => {
    const stat = incluir_metadata ? fs.statSync(path.join(full, f)) : null;
    return stat
      ? { nombre: f, tamaño_bytes: stat.size, modificado: stat.mtime.toISOString() }
      : { nombre: f };
  });

  return { skill: 'SKL-04', accion: 'list_files', resultado: { directorio, archivos: lista, total: lista.length } };
}

function copy_file({ origen, destino }, pipelineId) {
  const src = safePath(pipelineId, origen);
  const dst = safePath(pipelineId, destino);
  ensureDir(dst);
  fs.copyFileSync(src, dst);
  return { skill: 'SKL-04', accion: 'copy_file', resultado: { exito: true, origen, destino } };
}

async function export_bundle({ incluir = ['outputs/'], nombre_archivo = 'bundle', formato = 'zip', destino = 'outputs/final/' }, pipelineId) {
  // Requiere archiver — instalamos bajo demanda
  let archiver;
  try { archiver = require('archiver'); } catch {
    return { skill: 'SKL-04', accion: 'export_bundle', resultado: { exito: false, error: 'archiver not installed — run: npm install archiver' } };
  }

  const outPath = safePath(pipelineId, path.join(destino, `${nombre_archivo}.zip`));
  ensureDir(outPath);

  return new Promise((resolve, reject) => {
    const output = createWriteStream(outPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    let totalBytes = 0;

    output.on('close', () => resolve({
      skill: 'SKL-04', accion: 'export_bundle',
      resultado: { exito: true, path: path.join(destino, `${nombre_archivo}.zip`), tamaño_bytes: archive.pointer() },
    }));
    archive.on('error', reject);
    archive.pipe(output);

    incluir.forEach(dir => {
      const full = safePath(pipelineId, dir);
      if (fs.existsSync(full)) archive.directory(full, dir);
    });
    archive.finalize();
  });
}

module.exports = { read_file, write_file, list_files, copy_file, export_bundle };
