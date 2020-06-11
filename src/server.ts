import express, { Application } from 'express'
import socketIO, { Server as SocketIOServer } from 'socket.io'
import { createServer, Server as HTTPServer } from 'http'
const path = require('path')
const uuid = require('node-uuid')

export class Server {
    private httpServer: HTTPServer;
    private app: Application;
    private io: SocketIOServer;

    private activeSockets: string[] = [];

    private readonly DEFAULT_PORT = Number(process.env.PORT) || 5000;
    private readonly DEFAULT_ROOM = "room1"
    
    private rooms = {}
    private userIds = {}
    constructor() {
      this.initialize();
      this.configureApp();
      this.handleRoutes();
      this.handleRoom();
    }
    
    private initialize(): void {
      this.app = express();
      this.httpServer = createServer(this.app);
      this.io = socketIO(this.httpServer);
    }
    
    private handleRoutes(): void {
      this.app.get("/room", (req, res) => {
        res.send(`<h1>Hello World</h1>`); 
      });
    }
    
    private handleSocketConnection(): void {

      this.io.on("connection", socket => {
        
        const existingSocket = this.activeSockets.find(
          existingSocket => existingSocket === socket.id
        );
        if (!existingSocket) {
          this.activeSockets.push(socket.id);
          socket.join(this.DEFAULT_ROOM);
          var clients = this.io.sockets.adapter.rooms[this.DEFAULT_ROOM].sockets
          console.log(clients)
          socket.emit("update-user-list", {
            users: this.activeSockets.filter(
              existingSocket => existingSocket !== socket.id
            )
          });
    
          socket.broadcast.emit("update-user-list", {
            users: [socket.id]
          });
        }

        socket.on("call-user", data => {

          socket.broadcast.to(this.DEFAULT_ROOM).emit("call-made", {
            offer: data.offer,
            socket: socket.id
          });

        });
        
        socket.on("make-answer", data => {
          socket.broadcast.to(this.DEFAULT_ROOM).emit("answer-made", {
            socket: socket.id,
            answer: data.answer
          });
        });

        socket.on("disconnect", () => {
          this.activeSockets = this.activeSockets.filter(
            existingSocket => existingSocket !== socket.id
          );
          socket.broadcast.emit("remove-user", {
            socketId: socket.id
          });
        });
      })
    }

    private handleRoom() {
      this.io.on("connection", socket => {
        var currentRoom = 0
        var id = 0

    socket.on('init',  (data, fn) => {
      currentRoom = data.room || 0 ;
      var room = this.rooms[currentRoom];
      console.log(`in init ${room}`)
      if (!room) {
        this.rooms[currentRoom] = [socket];
        id =  0
        this.userIds[currentRoom] = 0;
        fn(currentRoom, id);
        console.log('Room created, with #', currentRoom);
      } else {
        this.userIds[currentRoom] += 1;
        id = this.userIds[currentRoom];
        fn(currentRoom, id);
        room.forEach(function (s) {
          console.log(`print s${s}`)
          s.emit('peer.connected', { id: id });
        });
       // this.io.sockets.in(room).emit('peer.connected', { id: id })
        room[id] = socket;
        console.log('Peer connected to room', currentRoom, 'with #', id);
      }
    });

    socket.on('msg',  (data) => {
      var to = parseInt(data.to, 10);
     if (this.rooms[currentRoom] && this.rooms[currentRoom][to]) {
        console.log('Redirecting message to', to, 'by', data.by);
        //this.io.sockets.in(this.rooms[currentRoom]).emit('msg',data)
        this.rooms[currentRoom][to].emit('msg', data);
      } else {
        console.warn('Invalid user');
      }
    });

    socket.on('disconnect', function () {
      if (!currentRoom || !this.rooms[currentRoom]) {
        return;
      }
      delete this.rooms[currentRoom][this.rooms[currentRoom].indexOf(socket)];
      this.rooms[currentRoom].forEach(function (socket) {
        if (socket) {
          socket.emit('peer.disconnected', { id: id });
        }
      });
    });
      })
    }
    
    public listen(callback: (port: number) => void): void {
      this.httpServer.listen(this.DEFAULT_PORT, () =>
        callback(this.DEFAULT_PORT)
      );
    }

    private configureApp(): void {
      this.app.use(express.static(path.join(__dirname, "../public")));
    }

   }