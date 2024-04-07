import { Server } from "socket.io";
import { createServer } from "node:http";
import express from "express";
import type { Request, Response } from "express";

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.ClientAddress,
    },
});
const port = process.env.PORT;
type SocketId = string;
type RoomId = number;
const roomMeta: Record<RoomId, { members: Array<SocketId>; createdAt: Date }> = {};
const socketRoomMap: Record<SocketId, Array<RoomId>> = {};

app.get("/", (_req: Request, res: Response) => {
    return res.send("ok");
});

/* TODO: persist canvas state */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.post("/canvas", (req: Request, res: Response) => {
    console.log("request to save canvas state");
});

/* TODO: load canvas */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.get("/canvas/:canvasId", (req: Request, res: Response) => {
    console.log("fetching canvas state");
});

function joinRoom(room: RoomId, socket: SocketId) {
    if (roomMeta[room]) {
        roomMeta[room].members.push(socket);

        if (!socketRoomMap[socket]) socketRoomMap[socket] = [];
        socketRoomMap[socket].push(room);
        return 1;
    }

    return -1;
}

function leaveRoom(socket: SocketId, room: RoomId) {
    /* room exists */
    if (roomMeta[room]) {
        roomMeta[room].members = roomMeta[room].members.filter((member) => member !== socket);
        socketRoomMap[socket] = socketRoomMap[socket].filter((room) => room !== room);
    }
}

function getRoomUsers(room: RoomId) {
    return roomMeta[room] ? roomMeta[room].members : [];
}

/* TODO: add a ton of validation */
io.on("connection", (socket) => {
    console.log("socket: %s, has connected", socket.id);

    socket.on("ROOM_CREATE", (msg, acknowledge) => {
        console.log("creating new room...");
        roomMeta[msg.roomId] = {
            createdAt: new Date(),
            members: [],
        };

        socket.join(msg.roomId);
        joinRoom(msg.roomId, socket.id);
        console.log("socket: %s, has joined room: %s", socket.id, msg.roomId);

        // socket.emit("FIRST_IN_ROOM")

        acknowledge();
    });

    socket.on("ROOM_JOIN", (msg, acknowledge) => {
        socket.join(msg.roomId);
        console.log("socket: %s, has joined room: %s", socket.id, msg.roomId);
        const result = joinRoom(msg.roomId, socket.id);

        if (result !== 1) socket.emit("ERROR_JOINING_ROOM", "invalid room id");

        acknowledge();
    });

    socket.on("CURSOR_UPDATE", (msg) => {
        socket.broadcast.to(msg.roomId).emit("CURSOR_UPDATE", {
            cursor: msg.cursor,
            socketId: socket.id,
            username: msg.username,
            roomId: msg.roomId,
        });
    });

    socket.on("disconnect", () => {
        /* remove user from all rooms associated with them and notify clients */
        socketRoomMap[socket.id].forEach((room) => {
            leaveRoom(socket.id, room);
            io.to(room + "").emit("ROOM_USERS_CHANGED", getRoomUsers(room));
        });
    });
});

server.listen(port, () => {
    console.log("server is now listening on port: %s", port);
});
