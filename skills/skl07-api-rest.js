/**
 * SKL-07 — API REST
 * Cliente HTTP genérico. Las credenciales viven en .env o credentials.json del pipeline.
 */

const path = require('path');
const fs = require('fs');

const BASE_DIR = path.join(__dirname, '..', 'pipeline_outputs');

function loadCredentials(pipelineId, servicio) {
  // Intenta leer credentials.json del pipeline
  if (pipelineId) {
    const credPath = path.join(BASE_DIR, pipelineId, 'credentials.json');
    if (fs.existsSync(credPath)) {
      const creds = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
      if (creds.apis?.[servicio]) return creds.apis[servicio];
    }
  }
  return null;
}

function buildHeaders(cred, extraHeaders = {}) {
  const headers = { 'Content-Type': 'application/json', ...extraHeaders };
  if (!cred) return headers;
  if (cred.tipo === 'bearer' || cred.tipo === 'api_key') {
    const headerName = cred.header_nombre || 'Authorization';
    const prefix = cred.tipo === 'bearer' ? 'Bearer ' : '';
    headers[headerName] = prefix + (cred.api_key || cred.token || '');
  }
  return headers;
}

async function executeRequest(method, { servicio, endpoint, query_params, body, content_type, headers_extra = {}, url: directUrl }, pipelineId) {
  const cred = servicio ? loadCredentials(pipelineId, servicio) : null;
  const baseUrl = cred?.base_url || '';
  const fullUrl = directUrl || (baseUrl + endpoint);

  const urlObj = new URL(fullUrl);
  if (query_params) Object.entries(query_params).forEach(([k, v]) => urlObj.searchParams.set(k, v));

  const headers = buildHeaders(cred, headers_extra);
  if (content_type) headers['Content-Type'] = content_type;

  const fetchOpts = { method, headers };
  if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
    fetchOpts.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(urlObj.toString(), fetchOpts);
  } catch (err) {
    throw new Error(`timeout o error de red: ${err.message}`);
  }

  const status = res.status;
  let datos;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('json')) {
    datos = await res.json().catch(() => null);
  } else {
    datos = await res.text().catch(() => null);
  }

  if (status >= 400) {
    const errType = status === 401 || status === 403 ? 'unauthorized' :
                    status === 404 ? 'not_found' :
                    status === 429 ? 'rate_limit' : 'server_error';
    return {
      skill: 'SKL-07', accion: method.toLowerCase(),
      skill_error: { skill_id: 'SKL-07', servicio, endpoint, metodo: method, status_code: status, error: errType, respuesta_servidor: datos },
    };
  }

  return {
    skill: 'SKL-07', accion: method.toLowerCase(),
    resultado: { status_code: status, datos, url_llamada: urlObj.toString() },
  };
}

const get     = (p, pid) => executeRequest('GET',    p, pid);
const post    = (p, pid) => executeRequest('POST',   p, pid);
const put     = (p, pid) => executeRequest('PUT',    p, pid);
const patch   = (p, pid) => executeRequest('PATCH',  p, pid);
const del     = (p, pid) => executeRequest('DELETE', p, pid);

async function webhook({ url, payload, metodo = 'POST' }, pipelineId) {
  return executeRequest(metodo, { url, body: payload }, pipelineId);
}

async function paginate({ servicio, endpoint, parametro_pagina = 'page', parametro_limite = 'per_page', limite_por_pagina = 100, max_paginas = 10, campo_datos = 'items' }, pipelineId) {
  const allItems = [];
  for (let page = 1; page <= max_paginas; page++) {
    const r = await executeRequest('GET', {
      servicio, endpoint,
      query_params: { [parametro_pagina]: String(page), [parametro_limite]: String(limite_por_pagina) },
    }, pipelineId);

    if (r.skill_error) break;
    const items = r.resultado.datos?.[campo_datos] || [];
    allItems.push(...items);
    if (items.length < limite_por_pagina) break;
  }

  return {
    skill: 'SKL-07', accion: 'paginate',
    resultado: { total_items: allItems.length, items: allItems },
  };
}

module.exports = { get, post, put, patch, delete: del, webhook, paginate };
