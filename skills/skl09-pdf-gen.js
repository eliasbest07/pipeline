/**
 * SKL-09 — PDF Generator
 * Toma los outputs vigentes del pipeline y los ensambla en un PDF descargable.
 * Guarda el resultado en pipeline_outputs/{pipelineId}/outputs/pdf/
 *
 * Acciones disponibles:
 *   generar_pdf  — ensambla todos los outputs de texto en un PDF final
 */

const path = require('path');
const fs = require('fs');

const BASE_DIR = path.join(__dirname, '..', 'pipeline_outputs');

function safePath(pipelineId, rel) {
  const base = path.resolve(BASE_DIR, pipelineId);
  const full = path.resolve(base, rel);
  if (!full.startsWith(base)) throw new Error('Path traversal bloqueado');
  return full;
}

function getPDFKit() {
  try {
    return require('pdfkit');
  } catch {
    throw new Error('pdfkit no instalado. Ejecuta: npm install pdfkit');
  }
}

/**
 * Limpia texto de caracteres no imprimibles o problemáticos para PDFKit
 */
function cleanText(str) {
  if (!str) return '';
  if (typeof str !== 'string') {
    try { str = JSON.stringify(str, null, 2); } catch { str = String(str); }
  }
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

/**
 * Intenta parsear JSON si el string parece JSON, sino devuelve el string tal cual.
 */
function tryParseContent(raw) {
  if (typeof raw !== 'string') return raw;
  const trimmed = raw.trim();
  if ((trimmed.startsWith('{') || trimmed.startsWith('['))) {
    try { return JSON.parse(trimmed); } catch { /* no-op */ }
  }
  return raw;
}

/**
 * Convierte un valor (string, objeto, array) en texto plano legible para el PDF.
 */
function toReadableText(value, indent = 0) {
  if (!value) return '';
  const pad = '  '.repeat(indent);

  if (typeof value === 'string') {
    return cleanText(value);
  }

  if (Array.isArray(value)) {
    return value.map(item => `${pad}• ${toReadableText(item, indent + 1)}`).join('\n');
  }

  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => {
        const label = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const content = toReadableText(v, indent + 1);
        if (content.includes('\n')) return `${pad}${label}:\n${content}`;
        return `${pad}${label}: ${content}`;
      })
      .join('\n');
  }

  return cleanText(String(value));
}

/**
 * Genera el PDF a partir de una lista de outputs del pipeline.
 * @param {string} pipelineId
 * @param {string} titulo - título del documento
 * @param {Array}  outputs - array de { tipo, bloque, contenido }
 * @param {string} nombreArchivo - sin extensión
 * @returns {Promise<string>} ruta relativa del PDF generado
 */
async function generarPDF(pipelineId, titulo, outputs, nombreArchivo = 'documento_final') {
  const PDFDocument = getPDFKit();

  const outDir = safePath(pipelineId, 'outputs/pdf');
  fs.mkdirSync(outDir, { recursive: true });

  const fileName = `${nombreArchivo.replace(/[^a-z0-9_-]/gi, '_')}.pdf`;
  const filePath = path.join(outDir, fileName);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 60, size: 'A4' });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // ── Portada ──────────────────────────────────────────────────
    doc.fontSize(28).font('Helvetica-Bold').text(cleanText(titulo), { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').fillColor('#666666')
      .text(`Generado por Pipeline OS · ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });
    doc.fillColor('#000000');
    doc.moveDown(2);
    doc.moveTo(60, doc.y).lineTo(535, doc.y).strokeColor('#cccccc').stroke();
    doc.moveDown(2);

    // ── Secciones por output ─────────────────────────────────────
    const SECCION_LABELS = {
      investigacion_tematica:  'Investigación',
      investigacion_temas:     'Investigación',
      estructura_syllabus:     'Estructura del Syllabus',
      estructura_modulos:      'Estructura de Módulos',
      desarrollo_contenido:    'Contenido',
      contenido_modulos:       'Contenido de Módulos',
      revision_final:          'Revisión Final',
      resumen_ejecutivo:       'Resumen Ejecutivo',
      ensamblaje_curso:        'Ensamblaje',
      preferencias_usuario:    null, // omitir
    };

    for (const output of outputs) {
      const bloque = output.bloque || '';
      const label = SECCION_LABELS[bloque];
      if (label === null) continue; // omitir preferencias del usuario

      const sectionTitle = label || bloque.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const parsed = tryParseContent(output.contenido);
      const bodyText = toReadableText(parsed);

      if (!bodyText.trim()) continue;

      // Título de sección
      doc.fontSize(16).font('Helvetica-Bold').text(sectionTitle);
      doc.moveDown(0.3);
      doc.moveTo(60, doc.y).lineTo(535, doc.y).strokeColor('#eeeeee').stroke();
      doc.moveDown(0.5);

      // Cuerpo
      doc.fontSize(11).font('Helvetica').text(bodyText, { lineGap: 3, paragraphGap: 6 });
      doc.moveDown(1.5);
    }

    // ── Pie de página en última hoja ────────────────────────────
    doc.moveDown(2);
    doc.fontSize(9).fillColor('#999999')
      .text('Documento generado automáticamente por Pipeline OS', { align: 'center' });

    doc.end();

    stream.on('finish', () => resolve(`/pipeline-outputs/${pipelineId}/outputs/pdf/${fileName}`));
    stream.on('error', reject);
  });
}

// ── Acción: generar_pdf ────────────────────────────────────────
async function generar_pdf(params, pipelineId) {
  const { outputs, titulo, nombre_archivo } = params;

  if (!Array.isArray(outputs) || outputs.length === 0) {
    throw new Error('SKL-09: se requiere un array "outputs" con al menos un elemento');
  }

  const docTitle = titulo || 'Documento Final';
  const nombreArchivo = nombre_archivo || 'documento_final';

  const pdfUrl = await generarPDF(pipelineId, docTitle, outputs, nombreArchivo);
  return {
    skill: 'SKL-09',
    accion: 'generar_pdf',
    resultado: {
      exito: true,
      url: pdfUrl,
      nombre_archivo: path.basename(pdfUrl),
    },
  };
}

module.exports = { generar_pdf };
