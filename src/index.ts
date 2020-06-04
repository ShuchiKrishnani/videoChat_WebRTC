import { Server } from "./server";

const server = new Server();

server.listen(port => {
    console.log(`this si env = ${process.env.NODE_ENV} `)
    console.log(`Server is listening on http://localhost:${port}`);
});