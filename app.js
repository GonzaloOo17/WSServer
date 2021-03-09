const express = require('express');
const path = require('path');

var app = express();

const http = require('http').Server(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
    allowEIO3: true
  }
});

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Authorization, Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Credentials", true);
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
  next();
});

app.set('views', path.join(__dirname, ''));
app.set('view engine', 'ejs');

app.get('/logger', function (req, res) {
  console.log('hola')
  res.render('pages/index', {
  });
});

let usersFront;
let generalSocket;
let messagesCount=0;
let devicesConnected=[];
let socketsConnected = [];

// --- WS SERVER ---
const WebSocket = require('ws');
const wss = new WebSocket.Server({ noServer: true });

let devicesConnected=[];

wss.on('connection', function connection(ws, req) {

  console.log('--> DEVICE CONNECTED')

  // /logger/{serial}
  let serial = req.url.substring(8);
  //console.log("url: ", serial);

  socketsConnected.push({
    serial,
    socket: ws
  });
  devicesConnected.push(serial);
  console.log(devicesConnected);

  ws.on('message', (message) => {
    messagesCount++;
    if(messagesCount%100==0)
      console.log('Received a total of: ', messagesCount, ' from ', devicesConnected.length, ' devices')
    // console.log(typeof message);
    // console.log('received: %s', message, ', from: ', serial);

    if (generalSocket) {
      generalSocket.broadcast.to('serial-' + serial).emit('log', ab2str(message));
    }
  });

  ws.on('close', () => {
    let socketD = socketsConnected.find(socket=>socket.socket==ws);
    let serialD = socketD.serial;
    console.log('--> DEVICE ' + serialD + ' DISCONNECTED');
    devicesConnected.splice(serialD,1);
    socketsConnected.splice(socketD,1);
  })

  ws.send('Hello from server');
});


// --- WS FRONT ---
io.on('connection', (socket) => {
  console.log('--> USER CONNECTED');

  if (!generalSocket)
    generalSocket = socket;

  socket.on('change-serial', (serial) => {
    console.log(serial);
    socket.rooms.forEach((room) => {
      socket.leave(room);
    })
    socket.join('serial-' + serial)
    console.log(socket.rooms)
  })

  socket.on('disconnect', (socket) => {
    // socket.rooms.forEach((room) => {
    //   socket.leave(room);
    // })
    console.log('--> USER DISCONNECTED');
  });
});

const url = require('url');
http.on('upgrade', function upgrade(request, socket, head) {
  const pathname = url.parse(request.url).pathname;
  console.log(pathname);

  if (pathname.startsWith('/logger')) {
    wss.handleUpgrade(request, socket, head, function done(ws) {
      wss.emit('connection', ws, request);
    });
  } else if (pathname.startsWith('/front') || pathname.startsWith('/socket.io')) {
    // SOCKET IO RUNNING
  } else {
    socket.destroy();
  }
});

function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint16Array(buf));
}

let port = 8080;
http.listen(8080, () => {
  console.log(`Socket server listening at ws://188.208.218.221:${port}`)
})