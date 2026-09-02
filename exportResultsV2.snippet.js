  async exportResultsV2(req, res) {
    try {
      const vot = await Votation.findById(req.params.id).lean()
      if (!vot) return res.status(404).json({ message: 'Pleito não encontrado.' })
      const tally = await tallyElection(vot._id)
      const pct = (votes, total) =>
        total > 0 ? (Math.round((votes * 10000) / total) / 100).toFixed(2) : '0.00'

      const lines = [
        'pleito,status,elegiveis,participantes,abstencoes',
        [
          csvEscape(vot.title || ''),
          csvEscape(vot.status || ''),
          csvEscape(tally.eligibleVoters ?? ''),
          csvEscape(tally.participants ?? ''),
          csvEscape(tally.abstentions ?? ''),
        ].join(','),
        '',
        'categoria,numero,nome,votos,percentual',
      ]

      for (const cat of tally.categories || []) {
        const total = cat.totalVotes || 0
        for (const c of cat.candidates || []) {
          const percent =
            c.percent != null ? Number(c.percent).toFixed(2) : pct(c.votes || 0, total)
          lines.push(
            [
              csvEscape(cat.name || ''),
              csvEscape(c.number ?? ''),
              csvEscape(c.name || ''),
              csvEscape(c.votes ?? 0),
              csvEscape(`${percent}%`),
            ].join(',')
          )
        }
        const blank = cat.blank || 0
        const nullVotes = cat.null || 0
        lines.push(
          [
            csvEscape(cat.name || ''),
            '',
            'Branco',
            csvEscape(blank),
            csvEscape(`${pct(blank, total)}%`),
          ].join(',')
        )
        lines.push(
          [
            csvEscape(cat.name || ''),
            '',
            'Nulo',
            csvEscape(nullVotes),
            csvEscape(`${pct(nullVotes, total)}%`),
          ].join(',')
        )
      }

      void recordVoteEvent(req, {
        votationId: vot._id,
        action: 'admin.export_results_v2',
        resourceType: 'votation',
        resourceId: vot._id,
        eventType: 'EXPORT',
      })
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="pleito-${vot._id}-apuracao.csv"`)
      return res.send('\uFEFF' + lines.join('\n'))
    } catch (e) {
      console.error('[VotingElectionAdmin.exportResultsV2]', e)
      return res.status(500).json({ message: 'Erro ao exportar apuração.' })
    }
  },
