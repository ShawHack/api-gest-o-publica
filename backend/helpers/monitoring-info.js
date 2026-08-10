function getMonitoringInfo() {
  const grafanaPassword = process.env.GRAFANA_ADMIN_PASSWORD || 'change-me-grafana'
  const grafanaUser = process.env.GRAFANA_ADMIN_USER || 'admin'
  const host = process.env.MONITORING_PUBLIC_HOST || process.env.MONITORING_BIND_IP || '10.15.25.28'
  const grafanaBase = process.env.GRAFANA_URL || `http://${host}:3001`
  const prometheusBase = process.env.PROMETHEUS_URL || `http://${host}:9090`

  return {
    accessNote:
      `Ferramentas disponíveis na rede interna em ${host} (portas 3001 Grafana e 9090 Prometheus). O link 127.0.0.1 só funciona no próprio servidor.`,
    sshTunnel: {
      grafana: `ssh -L 3001:${host}:3001 usuario@${host}`,
      prometheus: `ssh -L 9090:${host}:9090 usuario@${host}`,
    },
    grafana: {
      name: 'Grafana',
      url: grafanaBase,
      dashboardUrl:
        process.env.GRAFANA_DASHBOARD_URL ||
        `${grafanaBase}/d/api-semit-audit/auditoria-forense-e28094-api-semit`,
      username: grafanaUser,
      password: grafanaPassword,
      passwordIsDefault: !process.env.GRAFANA_ADMIN_PASSWORD,
      steps: [
        'Abra o link do dashboard (ou a home do Grafana).',
        'Faça login com usuário e senha abaixo.',
        'No menu lateral: Dashboards → pasta API-SEMIT → Auditoria forense — API-SEMIT.',
        'Use os gráficos para acompanhar eventos, negados e latência nas últimas 24h.',
        'Marque com estrela (⭐) para fixar na home.',
      ],
    },
    prometheus: {
      name: 'Prometheus',
      url: prometheusBase,
      requiresAuth: false,
      steps: [
        'Abra o Prometheus na rede interna — não exige login.',
        'Status → Targets: confirme que api-semit está UP.',
        'Aba Graph: consulte métricas como audit_events_24h_total ou audit_denied_24h_by_module.',
        'Execute a query e veja o valor atual (útil para debug).',
        'O Grafana consome estes dados automaticamente; use Prometheus para investigação técnica.',
      ],
      sampleQueries: [
        'audit_events_24h_total',
        'audit_security_events_24h_total',
        'audit_events_24h_by_module',
        'audit_denied_24h_by_module',
        'api_mongo_ready',
      ],
    },
    complianceNote:
      'Este painel (/compliance) é a trilha forense detalhada (diff, IP, CSV). Grafana/Prometheus são complementos operacionais em tempo quase real.',
  }
}

module.exports = { getMonitoringInfo }
