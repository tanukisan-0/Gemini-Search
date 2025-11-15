import fetch from "node-fetch";

export default class MisskeyToolWithFetch {
    constructor(ServerURLs, LimitPostCount, token) {
        this.ServerURLs = ServerURLs;        // 配列
        this.limitPostCount = LimitPostCount;
        this.token = token;
    }

    // --- 全サーバーの最新投稿を取得 ---
    async fetchLatestNotes() {
        console.log("fetch Notes")
        let allNotes = [];

        for (const url of this.ServerURLs) {
            try {
                const res = await fetch(`${url}/api/notes/local-timeline`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        i: this.token,
                        limit: this.limitPostCount
                    })
                });

                const data = await res.json();

                // 正常データのみ追加
                const filtered = data.filter(note => note?.text);
                allNotes.push(...filtered);

            } catch (err) {
                console.error(`Failed fetch: ${url}`, err);
            }
        }

        // --- 最新順に並び替えて N 件だけ保持 ---
        allNotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return allNotes;
    }

    // --- 最新の n 件取得 ---
    async getRecent(n) {
        const notes = await this.fetchLatestNotes();
        return notes.slice(0, n);
    }

    // --- 特定ワードを含む投稿 ---
    async getRecentWithWord(SearchWord) {
        const notes = await this.fetchLatestNotes();
        return notes.filter(post => post.text?.includes(SearchWord));
    }

    // --- 整形して返す ---
    async Main(n) {
        let Posts = await this.getRecent(n);
        Posts.map(note => ({
            user: note.user.name,
            content: note.text
        }));

        return Posts;
    }
}
