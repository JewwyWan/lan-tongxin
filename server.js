// LANIT 聊天服务器：中转站（支持在线人数查询 + 文件字节透传）
const net = require('net');

const clients = new Set();

function broadcast(msg, except) {
  for (const c of clients) {
    if (c !== except) c.write(msg);
  }
}

const server = net.createServer((socket) => {
  const id = socket.remoteAddress + ':' + socket.remotePort;
  clients.add(socket);
  console.log(`[+] 用户上线: ${id}，当前在线 ${clients.size} 人`);

  // 新人自己也要知道在线人数 + 通知其他人
  socket.write(`[系统] 欢迎加入！当前在线 ${clients.size} 人\n`);
  broadcast(`[系统] 有人上线了，当前在线 ${clients.size} 人\n`, socket);

  socket.on('data', (data) => {
    // 在线人数查询命令（客户端发 [[ONLINE]]）
    if (data.toString().startsWith('[[ONLINE]]')) {
      socket.write(`[系统] 当前在线 ${clients.size} 人\n`);
      return;
    }
    // 其他数据（含文件二进制）原样转发
    broadcast(data, socket);
  });

  socket.on('close', () => {
    clients.delete(socket);
    console.log(`[-] 用户下线: ${id}，当前在线 ${clients.size} 人`);
    broadcast(`[系统] 有人下线了，当前在线 ${clients.size} 人\n`);
  });

  // error 必须监听，否则一个用户的网络异常会崩掉整个服务器
  socket.on('error', () => {});
});

server.listen(4000, () => {
  console.log('LANIT 聊天服务器已启动，端口 4000');
  console.log('客户端: node client.js [昵称] [服务器IP]');
});
