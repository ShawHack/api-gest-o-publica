import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.K6_BASE_URL || 'https://api.garca.sp.gov.br';

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const r1 = http.get(`${BASE}/health`);
  check(r1, { 'health 200': (r) => r.status === 200 });

  const r2 = http.get(`${BASE}/readyz`);
  check(r2, { 'readyz ok': (r) => r.status === 200 && r.json('ready') === true });

  const r3 = http.get(`${BASE}/api/sepultados?limit=5`);
  check(r3, { 'sepultados 200': (r) => r.status === 200 });

  sleep(1);
}
