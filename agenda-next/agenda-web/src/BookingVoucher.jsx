export default function BookingVoucher({
  protocol,
  panelTicket,
  serviceName,
  unitName,
  address,
  startsAt,
  continueLabel = 'Ver meus agendamentos',
  onContinue,
  onNewBooking,
}) {
  return (
    <section className="booking-voucher" aria-live="polite">
      <div className="booking-voucher__hero" aria-hidden="true">🎉</div>
      <h2 className="booking-voucher__title">Agendamento Confirmado!</h2>
      <p className="booking-voucher__lead">
        Seu horário foi reservado com sucesso! Um comprovante oficial foi enviado para o seu e-mail.
      </p>

      <div className="booking-voucher__card">
        <div className="booking-voucher__row">
          <span>Protocolo Oficial:</span>
          <code>{protocol}</code>
        </div>
        {panelTicket ? (
          <div className="booking-voucher__row booking-voucher__row--ticket">
            <span>Senha no Painel (TV):</span>
            <strong>{panelTicket}</strong>
          </div>
        ) : null}
        <div className="booking-voucher__row">
          <span>Serviço:</span>
          <strong>{serviceName}</strong>
        </div>
        <div className="booking-voucher__row">
          <span>Local:</span>
          <span className="booking-voucher__local">
            {unitName}
            {address ? <small>{address}</small> : null}
          </span>
        </div>
        <div className="booking-voucher__row">
          <span>Data e Horário:</span>
          <strong className="booking-voucher__when">
            📅 {new Date(startsAt).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}
          </strong>
        </div>
      </div>

      <div className="booking-voucher__tip">
        📌 <b>Dica:</b> Chegue com 10 minutos de antecedência portando documento de identificação com foto.
        {panelTicket ? (
          <> No dia do atendimento, fique atento ao <b>painel da TV</b> — sua senha será <b>{panelTicket}</b>.</>
        ) : null}
      </div>

      <div className="booking-voucher__actions">
        <button type="button" className="booking-voucher__print" onClick={() => window.print()}>
          🖨️ Imprimir Comprovante
        </button>
        {onNewBooking ? (
          <button type="button" className="booking-voucher__secondary" onClick={onNewBooking}>
            ➕ Realizar Outro Agendamento
          </button>
        ) : null}
        <button type="button" className="booking-voucher__secondary" onClick={onContinue}>
          {continueLabel}
        </button>
      </div>
    </section>
  )
}
