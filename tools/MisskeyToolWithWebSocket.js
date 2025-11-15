import MisskeyWebSocket from "../services/MisskeyWebSocket.js"

export default class MisskeyToolWithWebSocket
{
    constructor( ServerURLs, LimitPostCount)
    {
        this.misskeyWS = new MisskeyWebSocket(ServerURLs);
        this.LimitPostCount = LimitPostCount;
        this.recentNotes = [];

        this.misskeyWS.connect()

        this.misskeyWS.onNote(note => {
            if (!note.text) return;
            console.log(`[NOTE] ${note.user.name}: ${note.text}`);

            this.recentNotes.unshift(note);

            if (this.recentNotes.length > this.limitPostCount) {
                this.recentNotes.pop();
            }
        });
    }

    getRecent(n) 
    {
        return this.recentNotes.slice(0, n);
    }
    
    getRecentWithWord(SearchWord)
    {
        return this.recentNotes.filter(post => 
            post.text?.includes(SearchWord)
        );
    }

    Main(n)
    {
        let Posts = this.getRecent(n);
        let PreFormed = [];

        Posts.forEach(note => {
            PreFormed.push({
                user:note.user.name,
                content:note.text
            })
        });

        return PreFormed;
    }
}