const express = require('express');
const path = require('path');

var app = express();

const http = require('http').Server(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "http://localhost:4200",
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

// --- WS SERVER ---
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8083 });

wss.on('connection', function connection(ws, req) {

  console.log('user connected')

  // /logger
  let serial = req.url.substring(8);
  console.log("url: ", serial);

  ws.on('message', function incoming(message) {
    console.log('received: %s', message, ', from: ', serial);
    if (generalSocket) {
      generalSocket.broadcast.to('serial-' + serial).emit('log', message);
    }

    //io.emit('log', { id: message });
  });

  ws.on('disconnection', function incoming() {
    console.log('Device disconnected');
  })

  ws.send('something');
});


// --- WS FRONT ---


io.on('connection', (socket) => {
  if (!generalSocket)
    generalSocket = socket;

  console.log('a user connected');

  socket.on('change-serial', (serial) => {
    console.log(serial);
    socket.rooms.forEach((room) => {
      socket.leave(room);
    })
    socket.join('serial-' + serial)
    console.log(socket.rooms)
  })

  socket.on('disconnect', (socket) => {
    console.log('user disconnected');
  });

});



http.listen(8888, () => {
  console.log(`Example app listening at http://localhost:8888`)
})