#!/usr/bin/env node
/**
 * Gera backend/public/openapi.json a partir de public/routes.json
 */
const fs = require('fs');
const path = require('path');

const routesPath = path.join(__dirname, '../backend/public/routes.json');
const outPath = path.join(__dirname, '../backend/public/openapi.json');
const catalog = JSON.parse(fs.readFileSync(routesPath, 'utf8'));

const paths = {};

function addPath(fullPath, method, description, auth) {
  if (!paths[fullPath]) paths[fullPath] = {};
  const op = {
    summary: description,
    responses: { 200: { description: 'OK' } },
  };
  if (auth === true || auth === 'admin') {
    op.security = [{ bearerAuth: [] }];
  }
  paths[fullPath][method.toLowerCase()] = op;
}

for (const ep of catalog.endpoints || []) {
  addPath(ep.path, ep.method, ep.description, false);
}

for (const mod of Object.values(catalog.modules || {})) {
  const prefix = mod.prefix || '';
  for (const ep of mod.endpoints || []) {
    const full = `${prefix}${ep.path}`.replace(/\/+/g, '/');
    addPath(full, ep.method, ep.description, ep.auth);
  }
}

const doc = {
  openapi: '3.0.3',
  info: {
    title: 'API SEMIT — Prefeitura de Garça',
    version: catalog.api_version || '1.0.0',
    description: catalog.documentation?.description || 'API pública',
  },
  servers: [{ url: 'https://api.garca.sp.gov.br' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
      },
    },
  },
  paths,
};

fs.writeFileSync(outPath, JSON.stringify(doc, null, 2));
console.log('Wrote', outPath, Object.keys(paths).length, 'paths');
