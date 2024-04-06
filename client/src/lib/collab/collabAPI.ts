import { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types/types";
import throttle from "lodash.throttle";
import type { Socket } from "socket.io-client";
import { EVENTS, CURSOR_SYNC_DELAY, APP_NAME } from "../constants";
import connectAPI from "./connectAPI";

const collabAPI = (() => {
    let _socket: Socket;
    let _roomId: string | null = null;
    let _excalidrawAPI: ExcalidrawImperativeAPI;
    let _collaborators = new Map();
    const _originalUrl = window.location.href;

    async function initCollabRoom(existingRoomId: string | null) {
        const { nanoid } = await import("nanoid");

        _roomId = existingRoomId || nanoid();
        _socket = await connectAPI.openConnection();

        const payload = { roomId: _roomId };
        try {
            if (!existingRoomId) {
                await _socket.emitWithAck("ROOM_CREATE", payload);
            } else {
                await _socket.emitWithAck("ROOM_JOIN", payload);
            }

            setupEventHandlers();
            return _roomId;
        } catch (error) {
            console.log(error);
            throw new Error("error creating connection");
        }
    }

    function setupEventHandlers() {
        _socket.on(EVENTS.CURSOR_UPDATE, (msg) => {
            const user = Object.assign(
                {},
                _collaborators.get(msg.socketId),
                {
                    pointer: msg.cursor.pointer,
                    button: msg.cursor.button,
                    username: msg.username,
                    socketId: msg.socketId,
                },
                { isCurrentUser: msg.socketId === _socket?.id }
            );

            _collaborators.set(msg.socketId, user);
            _excalidrawAPI?.updateScene({ collaborators: _collaborators });
        });

        _socket.on(EVENTS.ROOM_USERS_CHANGED, (socketIds: string[]) => {
            const newCollab = new Map();
            socketIds.forEach((socketId) => {
                /* the originating socket is not a collaborator */
                if (socketId !== _socket.id) newCollab.set(socketId, _collaborators.get(socketId));
            });

            _collaborators = newCollab;
            _excalidrawAPI.updateScene({ collaborators: _collaborators });
        });
    }

    function closeConnection() {
        if (_socket) connectAPI.closeConnection(_socket);
    }

    return Object.freeze({
        async startCollaborationSession(excalidrawAPI: ExcalidrawImperativeAPI) {
            _excalidrawAPI = excalidrawAPI;
            return initCollabRoom(null);
        },
        async joinCollabSession(excalidrawAPI: ExcalidrawImperativeAPI, roomId: string) {
            _excalidrawAPI = excalidrawAPI;
            return initCollabRoom(roomId);
        },
        onUpdateCursorPos(username: string | undefined, isCollaborating: boolean) {
            return throttle(
                (cursor: {
                    pointer: { x: number; y: number; tool: "pointer" | "laser" };
                    button: "up" | "down";
                    pointersMap: Map<number, Readonly<{ x: number; y: number }>>;
                }) => {
                    if (isCollaborating) _socket.emit(EVENTS.CURSOR_UPDATE, { roomId: _roomId, cursor, username });
                },
                CURSOR_SYNC_DELAY
            );
        },
        endCollabSession(cleanupFunc: () => void) {
            /* evict all members from the room, delete the room, close the connection */
            _roomId = null;
            _collaborators.clear();

            if (_excalidrawAPI) _excalidrawAPI.updateScene({ collaborators: _collaborators });

            closeConnection();
            cleanupFunc();
            window.history.pushState({}, APP_NAME, _originalUrl);
        },
    });
})();

export default collabAPI;
