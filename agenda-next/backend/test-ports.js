const net = require('net');

function checkPort(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function run() {
  const mysqlOpen = await checkPort('10.15.25.31', 3306);
  console.log('MySQL 10.15.25.31:3306 aberto:', mysqlOpen);

  const apacheOpen = await checkPort('10.15.25.31', 80);
  console.log('Apache 10.15.25.31:80 aberto:', apacheOpen);

  const panelOpen = await checkPort('10.15.25.31', 8088);
  console.log('Painel 10.15.25.31:8088 aberto:', panelOpen);
}

run().catch(console.error);
