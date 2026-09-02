const { sendAgendaVoucher, sendAgendaReschedule, sendAgendaCancellation } = require('./helpers/agenda-voucher');

async function test() {
  console.log('1. Testando Reschedule:');
  const res1 = await sendAgendaReschedule({
    to: 'saulo.lima@garca.sp.gov.br',
    name: 'Saulo Lima',
    serviceName: 'Transporte Escolar',
    unitName: 'SEDETUR',
    address: 'Rua das Flores, 123',
    startsAt: new Date(Date.now() + 86400000),
    endsAt: new Date(Date.now() + 86400000 + 30 * 60000),
    previousStartsAt: new Date(),
    protocol: 'AGD-TESTE-REAGENDAR',
  });
  console.log('Reschedule:', res1);

  console.log('2. Testando Cancelamento:');
  const res2 = await sendAgendaCancellation({
    to: 'saulo.lima@garca.sp.gov.br',
    name: 'Saulo Lima',
    serviceName: 'Transporte Escolar',
    unitName: 'SEDETUR',
    address: 'Rua das Flores, 123',
    startsAt: new Date(),
    protocol: 'AGD-TESTE-CANCELAR',
    reason: 'Solicitado pelo próprio cidadão',
  });
  console.log('Cancellation:', res2);

  process.exit(0);
}

test().catch((err) => {
  console.error(err);
  process.exit(1);
});
