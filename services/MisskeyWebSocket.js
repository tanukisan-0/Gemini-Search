export default class MisskeyWebSocket {
    constructor(ServerURLList, token) {
        this.ServerURLList = ServerURLList;
        this.token = token;
        this.wsList = [];
        this.listeners = [];
    }

    connect() {
        this.ServerURLList.forEach(ServerURL => {
            const wsURL = ServerURL.replace(/^http/, "ws") + "/streaming";
            const ws = new WebSocket(wsURL);

            ws.onopen = () => {
                console.log("Connected to", ServerURL);
                
                // ランダムID（チャンネル識別用）
                const id = Math.random().toString(36).slice(2);

                // localTimeline購読
                ws.send(JSON.stringify({
                    type: "connect",
                    body: {
                        channel: "localTimeline", // homeTimeline でもOK
                        id,
                        i: this.token
                    }
                }));
            };

            ws.onmessage = (event) => this.handleMessage(event);
            ws.onerror = (err) => console.error("WebSocket error:", err);
            ws.onclose = () => console.log("Disconnected from", ServerURL);

            this.wsList.push(ws);
        });
    }

    handleMessage(event) {
        try {
            const msg = JSON.parse(event.data);
            if (msg.type === "channel" && msg.body?.type === "note") {
                const note = msg.body.body;
                this.listeners.forEach(cb => cb(note));
            }
        } catch (e) {
            console.error("Failed to parse message:", e);
        }
    }

    onNote(callback) {
        this.listeners.push(callback);
    }

    onNoteWithWord(keyword, callback) {
        this.onNote(note => {
            if (note.text?.includes(keyword)) {
                callback(note);
            }
        });
    }

    disconnect() {
        this.wsList.forEach(ws => ws.close());
        this.wsList = [];
        this.listeners = [];
    }
}
