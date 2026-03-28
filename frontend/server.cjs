const { Server } = require('socket.io')
const http = require('http')

const server = http.createServer()
const io = new Server(server, {
  cors: { origin: '*' }
})

const rooms = {}

io.on('connection', (socket) => {
  socket.on('join-room', (roomId) => {
    socket.join(roomId)
    if (rooms[roomId]) {
      socket.emit('sync-code', rooms[roomId])
    }
  })

  socket.on('code-change', ({ roomId, code }) => {
    rooms[roomId] = code
    socket.to(roomId).emit('code-update', code)
  })
})

server.listen(1234, () => {
  console.log('Server ruleaza pe port 1234')
})