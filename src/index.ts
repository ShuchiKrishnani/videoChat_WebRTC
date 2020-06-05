import { Server } from "./server";
import { RoomServer } from "./roomServer"

const server = new RoomServer();

server.listen(port => {
    console.log(`Server is listening on http://localhost:${port}`);
});