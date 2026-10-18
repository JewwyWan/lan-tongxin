// LANIT 聊天服务器：中转站
const net = require('net');

// 所有在线客户端的 socket（连接管道）
const clients = new Set();

const server = net.createServer((socket) => {
  const id = socket.remoteAddress + ':' + socket.remotePort;
  console.log(`[+] 用户上线: ${id}，当前在线 ${clients.size + 1} 人`);
  clients.add(socket);

  // 收到数据 → 原样广播给其他所有人
  socket.on('data', (data) => {
    for (const c of clients) {
      if (c !== socket) c.write(data);   // 转发，不发回给自己
    }
  });

  // 关键修复：统一在 'close' 里收尸
  // 不管正常断开（end）还是被强杀（error），最终都会触发 close 一次
  socket.on('close', () => {
    clients.delete(socket);
    console.log(`[-] 用户下线: ${id}，当前在线 ${clients.size} 人`);
  });

  // error 必须监听，否则未处理的 error 会直接崩掉整个服务器！
  socket.on('error', () => {
    // 什么都不用做，清理交给 close
  });
});

server.listen(4000, () => {
  console.log('LANIT 聊天服务器已启动，端口 4000');
  console.log('客户端连接方式: node client.js [昵称]');
});
