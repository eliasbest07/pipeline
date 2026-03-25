/**
 * SKL-01 — Web Search
 * Proveedores soportados (en orden de preferencia):
 *   1. Brave Search API  (BRAVE_API_KEY)
 *   2. Serper            (SERPER_API_KEY)
 *   3. DuckDuckGo Instant Answer (fallback, sin key)
 */

async function search({ query, max_results = 5, filtro_fecha, idioma = 'auto' }) {
  if (!query) throw new Error('query is required');

  if (process.env.BRAVE_API_KEY) return searchBrave(query, max_results, filtro_fecha);
  if (process.env.SERPER_API_KEY) return searchSerper(query, max_results, idioma);
  return searchDuckDuckGo(query, max_results);
}

async function searchBrave(query, count, filtro_fecha) {
  const params = new URLSearchParams({ q: query, count: String(count), search_lang: 'es' });
  if (filtro_fecha === 'ultimo_mes') params.set('freshness', 'pm');
  if (filtro_fecha === 'ultimo_año') params.set('freshness', 'py');

  const res = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    headers: { 'Accept': 'application/json', 'X-Subscription-Token': process.env.BRAVE_API_KEY },
  });
  if (!res.ok) throw new Error(`Brave API error: ${res.status}`);
  const data = await res.json();

  const resultados = (data.web?.results || []).slice(0, count).map(r => ({
    titulo: r.title, url: r.url, snippet: r.description, fecha: r.page_age || null,
  }));

  return buildOutput(query, resultados);
}

async function searchSerper(query, num, idioma) {
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': process.env.SERPER_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query, num, hl: idioma === 'auto' ? 'es' : idioma }),
  });
  if (!res.ok) throw new Error(`Serper API error: ${res.status}`);
  const data = await res.json();

  const resultados = (data.organic || []).slice(0, num).map(r => ({
    titulo: r.title, url: r.link, snippet: r.snippet, fecha: r.date || null,
  }));

  return buildOutput(query, resultados);
}

async function searchDuckDuckGo(query, max) {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  const res = await fetch(url, { headers: { 'User-Agent': 'PipelineOS/1.0' } });
  if (!res.ok) throw new Error(`DuckDuckGo API error: ${res.status}`);
  const data = await res.json();

  const resultados = [];
  if (data.AbstractText) resultados.push({ titulo: data.Heading, url: data.AbstractURL, snippet: data.AbstractText, fecha: null });
  (data.RelatedTopics || []).slice(0, max - 1).forEach(t => {
    if (t.Text) resultados.push({ titulo: t.Text.split(' - ')[0], url: t.FirstURL, snippet: t.Text, fecha: null });
  });

  return buildOutput(query, resultados);
}

function buildOutput(query, resultados) {
  return {
    skill: 'SKL-01', accion: 'search',
    resultado: {
      query_usada: query,
      resultados: resultados.slice(0, 5),
      sintesis: resultados.slice(0, 3).map(r => r.snippet).filter(Boolean).join(' | '),
      fuentes_usadas: resultados.map(r => r.url).filter(Boolean),
    },
  };
}

module.exports = { search };
