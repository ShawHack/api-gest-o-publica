const categoryLabels = {
  holiday: 'Feriado',
  vacation: 'Férias',
  pause: 'Pausa',
  maintenance: 'Manutenção',
  other: 'Fechado',
}

export function closureLabelsByDate(closures = []) {
  return new Map(closures
    .filter((closure) => closure?.date && closure.fullDay !== false)
    .map((closure) => [closure.date, String(closure.reason || categoryLabels[closure.category] || 'Fechado').trim()]))
}
