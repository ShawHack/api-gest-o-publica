const { sendAgendaVoucher } = require('./helpers/agenda-voucher');
sendAgendaVoucher({
  to: 'saulo.lima@garca.sp.gov.br',
  name: 'Saulo Lima',
  serviceName: 'Transporte Escolar',
  unitName: 'SEDETUR',
  address: 'Rua das Flores, 123',
  startsAt: new Date(),
  endsAt: new Date(Date.now() + 30 * 60000),
  protocol: 'AGD-TESTE-VOUCHER',
}).then((res) => {
  console.log('RESULTADO DO ENVIO:', res);
  process.exit(0);
}).catch((err) => {
  console.error('ERRO:', err);
  process.exit(1);
});
