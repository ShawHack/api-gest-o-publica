/**
 * Métricas de uso e desempenho da API (in-memory).
 * Armazena total de requisições, tempos de resposta e requisições por endpoint.
 */

const MAX_HISTORY = 60;
const responseTimes = [];
const pathCounts = {};
let totalRequests = 0;

// Buckets por minuto (para gráfico de uso ao longo do tempo)
const requestsPerMinute = [];
const MAX_BUCKETS = 30;
let currentMinute = Math.floor(Date.now() / 60000);
let currentMinuteCount = 0;

function getBucketKey() {
  return Math.floor(Date.now() / 60000);
}

function recordRequest(path, method, durationMs) {
  totalRequests++;

  // Tempo de resposta
  responseTimes.push(durationMs);
  if (responseTimes.length > MAX_HISTORY) responseTimes.shift();

  // Por endpoint (agrupa path similar)
  const key = `${method} ${path}`;
  pathCounts[key] = (pathCounts[key] || 0) + 1;

  // Por minuto
  const bucket = getBucketKey();
  if (bucket !== currentMinute) {
    requestsPerMinute.push({ t: currentMinute, n: currentMinuteCount });
    if (requestsPerMinute.length > MAX_BUCKETS) requestsPerMinute.shift();
    currentMinute = bucket;
    currentMinuteCount = 0;
  }
  currentMinuteCount++;
}

function getStats() {
  const sorted = Object.entries(pathCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, count]) => ({ path, count }));

  const avg = responseTimes.length
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : 0;

  const sortedTimes = [...responseTimes].sort((a, b) => a - b);
  const p95Index = Math.floor(sortedTimes.length * 0.95);
  const p95 = sortedTimes.length ? Math.round(sortedTimes[p95Index] || 0) : 0;

  // Último bucket atual
  const minuteData = [...requestsPerMinute];
  if (currentMinuteCount > 0) {
    minuteData.push({ t: currentMinute, n: currentMinuteCount });
  }

  return {
    totalRequests,
    avgResponseTimeMs: avg,
    p95ResponseTimeMs: p95,
    responseTimeHistory: [...responseTimes],
    requestsPerMinute: minuteData,
    topEndpoints: sorted,
    uptimeSeconds: Math.floor(process.uptime()),
  };
}

function metricsMiddleware(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const path = (req.originalUrl || req.path || '').split('?')[0] || '/';
    recordRequest(path, req.method, Date.now() - start);
  });
  next();
}

module.exports = { metricsMiddleware, getStats };
