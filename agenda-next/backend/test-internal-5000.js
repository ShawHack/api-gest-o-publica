async function testInternal() {
  const res = await fetch('http://127.0.0.1:5000/api/agenda/public/novosga-proxy/unidades/6/painel?servicos=82,83,84');
  console.log('HTTP Status rota interna:', res.status);
  const text = await res.text();
  console.log('Resposta:', text.slice(0, 300));
}

testInternal().catch(console.error);
