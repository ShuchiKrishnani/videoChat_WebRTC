import express, { Application } from 'express'
import socketIO, { Server as SocketIOServer, Namespace } from 'socket.io'
import { createServer, Server as HTTPServer } from 'http'
const path = require('path')
const router = express.Router();

export class RoomServer {
    private httpServer: HTTPServer;
    private app: Application;
    private io: SocketIOServer;

    private activeSockets: string[] = [];
    private roomSockets: string[] = []

    private readonly DEFAULT_PORT = Number(process.env.PORT) || 5000;

    constructor() {
        this.initialize();
        this.configureApp();
        this.handleRoutes()
        this.handleSocketConnectionForRoom();
    }

    private initialize(): void {
        this.app = express();
        this.httpServer = createServer(this.app);
        this.io = socketIO(this.httpServer);
        
    }

    private handleRoutes(): void {
        //   this.app.get("/", (req, res) => {
        //     res.send(`<h1>Hello World</h1>`); 
        //   });

        this.app.get('/chatRoom', function (req, res) {
            res.sendFile('/Users/shuchitakrishnani/Developer/DemoVideoChat_repo/videoChat_WebRTC/public/chatRoom.html');
        });

    }

    private handleSocketConnectionForRoom(): void {
        this.io.on("connection", socket => {
            socket.on("create", (room) => {
                socket.join(room); 
                this.io.to(room).emit('connectedToRoom', `you are in ${room}`);
            })
            this.io.in('room1').clients ((err,clients) => {
                    this.roomSockets = clients
            })
//TODO: apply room check 
           const existingSocket = this.activeSockets.find(
               existingSocket => existingSocket === socket.id
             );
          
             if (!existingSocket) {
               this.activeSockets.push(socket.id);
          
                socket.emit("update-user-list", {
                  users: this.activeSockets.filter(
                    existingSocket => existingSocket !== socket.id
                  )
                });
          
                socket.broadcast.emit("update-user-list", {
                  users: [socket.id]
                });
           }

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