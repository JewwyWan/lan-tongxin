// LANIT 聊天客户端
const net = require('net');
const readline = require('readline');

// 昵称：从命令行参数拿，例如 node client.js 小明
const name = process.argv[2] || '匿名';

// 连接服务器（改成局域网 IP 就可以跨设备聊天）
const serverIp = process.argv[3] || '127.0.0.1';
const socket = net.connect(4000, serverIp, () => {
  console.log(`已连接到 ${serverIp}:4000，开始聊天吧！`);
  console.log('输入 exit 退出聊天');
  process.stdout.write('> ');
});

// 终端输入一行 → 发送给服务器
const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {
  // 真正的退出命令
  if (line.trim() === 'exit' || line.trim() === '/quit') {
    console.log('退出聊天，再见！');
    socket.end();       // 优雅断开（服务器会收到 end → close → 打印下线）
    process.exit(0);
  }
  socket.write(`[${name}] ${line}`);
  process.stdout.write('> ');
});

// 收到服务器转发的数据 → 打印
socket.on('data', (data) => {
  console.log('\r' + data.toString().trim());
  process.stdout.write('> ');
});

// 连接断开
socket.on('close', () => {
  console.log('\n与服务器的连接已断开');
  process.exit(0);
});
