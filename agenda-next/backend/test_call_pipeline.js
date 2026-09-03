const { publishCallToPanel } = require('./helpers/panel-service');

async function test() {
  console.log('Testando envio de chamada para SEDETUR...');
  const res = await publishCallToPanel({
    panelSlug: 'sedetur',
    unitId: 4,
    novosgaServiceId: 89,
    ticket: 'AG02',
    prefix: 'AG',
    number: 2,
    localName: 'Guichê',
    localNumber: 1,
    serviceName: 'Transporte Escolar 2026',
    serviceId: 89,
    clientName: 'Saulo Lima',
    document: '123.456.789-00',
  });

  console.log('Resultado do publishCallToPanel:', JSON.stringify(res, null, 2));
}

test().catch(console.error);
