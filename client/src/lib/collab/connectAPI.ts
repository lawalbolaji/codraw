import type { Socket } from "socket.io-client";

/* fix: when connection break in the middle of session, it hangs and keeps trying to reconnect. fix this! */
const connectAPI = (() => {
    return Object.freeze({
        async openConnection() {
            const { default: socketIOClient } = await import("socket.io-client");
            const socket = socketIOClient(import.meta.env.VITE_BASE_URL, {
                transports: ["websocket", "polling"],
            });

            socket.on("connect", () => {
                console.log("ws connection established");
            });

            /* fallback handler if connection fails */
            socket.on("connect_error", () => {});

            return socket;
        },
        closeConnection(socket: Socket) {
            socket.close();
        },
    });
})();

export default connectAPI;
