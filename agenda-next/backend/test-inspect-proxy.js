async function inspectMemoryAndProxy() {
  console.log('Fila global de chamadas recente:', globalThis.__recentPanelCalls);

  const res = await fetch('http://127.0.0.1:5000/api/agenda/public/novosga-proxy/unidades/6/painel?servicos=82,83,84');
  const data = await res.json();
  console.log('Total de itens devolvidos pelo proxy:', data.length);
  console.log('Itens devolvidos pelo proxy:', JSON.stringify(data.slice(0, 3), null, 2));
}

inspectMemoryAndProxy().catch(console.error);
