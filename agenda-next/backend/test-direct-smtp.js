const { sendAgendaVoucher } = require('./helpers/agenda-voucher');
sendAgendaVoucher({
  to: 'viniciusdonato25@gmail.com',
  name: 'Vinicius Donato',
  serviceName: 'Transporte Escolar',
  unitName: 'SEDETUR',
  address: 'Rua das Flores, 123',
  startsAt: new Date(),
  endsAt: new Date(Date.now() + 30 * 60000),
  protocol: 'AGD-20260901-9E89F316',
}).then((res) => {
  console.log('RESULTADO DO VOUCHER PARA GMAIL:', res);
  process.exit(0);
}).catch((err) => {
  console.error('ERRO VOUCHER:', err);
  process.exit(1);
});
