// LANIT 聊天客户端：文字 + 文件传输
const net = require('net');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const name = process.argv[2] || '匿名';
const serverIp = process.argv[3] || '127.0.0.1';
const socket = net.connect(4000, serverIp, () => {
  console.log(`已连接到 ${serverIp}:4000，开始聊天吧！`);
  console.log('命令：/exit 退出 | /online 在线人数 | /send <文件路径> 传文件');
  process.stdout.write('> ');
});

// 服务器不在线 / 连接被拒绝 → 友好提示并退出（而不是报错堆栈）
socket.on('error', (err) => {
  if (err.code === 'ECONNREFUSED') {
    console.log(`❌ 无法连接服务器 ${serverIp}:4000（服务器可能不在线）`);
  } else {
    console.log('❌ 连接出错: ' + err.message);
  }
  process.exit(1);
});

// ---- 终端输入处理 ----
const rl = readline.createInterface({ input: process.stdin });

rl.on('line', (line) => {
  const trimmed = line.trim();

  // 退出
  if (trimmed === '/exit') {
    console.log('退出聊天，再见！');
    socket.end();
    process.exit(0);
  }

  // 查询在线人数
  if (trimmed === '/online') {
    socket.write('[[ONLINE]]\n');
    process.stdout.write('> ');
    return;
  }

  // 发送文件：/send <文件路径>
  if (trimmed.startsWith('/send ')) {
    const filepath = trimmed.slice(6).trim();
    try {
      const buf = fs.readFileSync(filepath);
      const filename = path.basename(filepath);
      socket.write(`[FILE:${filename}:${buf.length}]`);  // ① 协议头
      socket.write(buf);                                  // ② 文件字节
      console.log(`📤 已发送: ${filename} (${buf.length} 字节)`);
    } catch (e) {
      console.log('❌ 文件不存在或无法读取: ' + filepath);
    }
    process.stdout.write('> ');
    return;
  }

  // 普通聊天消息
  socket.write(`[${name}] ${trimmed}`);
  process.stdout.write('> ');
});

// ---- 接收逻辑：状态机 ----
let fileInfo = null;      // { name, size }：正在接收的文件信息
let fileParts = [];       // 攒字节的数组
let fileReceived = 0;     // 已收到多少字节

function handleData(chunk) {
  // 模式1：正在接收文件
  if (fileInfo) {
    const need = fileInfo.size - fileReceived;
    const take = chunk.length > need ? chunk.subarray(0, need) : chunk;
    fileParts.push(take);
    fileReceived += take.length;

    // 攒够了 → 写盘
    if (fileReceived >= fileInfo.size) {
      fs.writeFileSync(fileInfo.name, Buffer.concat(fileParts));
      console.log(`✅ 文件接收完成: ${fileInfo.name} (${fileInfo.size} 字节)`);
      fileInfo = null; fileParts = []; fileReceived = 0;
      process.stdout.write('> ');
      // 多余字节可能是下一条消息（粘包），递归处理
      if (take.length < chunk.length) handleData(chunk.subarray(take.length));
    }
    return;
  }

  // 模式2：聊天文本，检查是否是文件头
  const str = chunk.toString();
  const m = str.match(/^\[FILE:([^:]+):(\d+)\]/);
  if (m) {
    fileInfo = { name: m[1], size: Number(m[2]) };
    fileParts = []; fileReceived = 0;
    console.log(`📥 开始接收文件: ${fileInfo.name} (${fileInfo.size} 字节)`);
    const rest = chunk.subarray(m[0].length);
    if (rest.length > 0) handleData(rest);   // 头和内容粘在一起了，继续吃
  } else {
    console.log('\r' + str.trim());
    process.stdout.write('> ');
  }
}

socket.on('data', handleData);

socket.on('close', () => {
  console.log('\n与服务器的连接已断开');
  process.exit(0);
});
