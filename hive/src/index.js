import { Server } from "socket.io";
import { createServer } from "node:http";
import express from "express";

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173" /* get from env */,
    },
});
const port = 8000;
const roomMeta = {}; /* {roomId: {dateCreated, etc.}} */
const socketRoomMap = {}; /* {socketId: [roomId]} */

/* TODO: persist canvas state */
app.post("/canvas", (req, res) => {
    console.log("request to save canvas state");
});

/* TODO: load canvas */
app.get("/canvas/:canvasId", (req, res) => {
    console.log("fetching canvas state");
});

function joinRoom(roomId, socketId) {
    if (roomMeta[roomId]) {
        roomMeta[roomId].members.push(socketId);

        if (!socketRoomMap[socketId]) socketRoomMap[socketId] = [];
        socketRoomMap[socketId].push(roomId);
        return 1;
    }

    return -1;
}

function leaveRoom(socketId, roomId) {
    /* room exists */
    if (roomMeta[roomId]) {
        roomMeta[roomId].members = roomMeta[roomId].members.filter((member) => member !== socketId);
        socketRoomMap[socketId] = socketRoomMap[socketId].filter((room) => room !== roomId);
    }
}

function getRoomUsers(roomId) {
    return roomMeta[roomId] ? roomMeta[roomId].members : [];
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
            io.to(room).emit("ROOM_USERS_CHANGED", getRoomUsers(room));
        });
    });
});

server.listen(port, () => {
    console.log("server is now listening on port: %s", port);
});
