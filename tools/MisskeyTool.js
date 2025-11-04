import MisskeyWebSocket from "../services/MisskeyWebSocket.js"

export default class MisskeyTool
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

            this.recentNotes.push(note);
            if (this.recentNotes.length > this.limitPostCount) {
                this.recentNotes.pop();
            }
        });
    }

    getRecent(n) 
    {
        return recentNotes.slice(0, n);
    }
    
    getRecentWithWord(SearchWord)
    {
        const NarrowDown = []; 
        if (Post.text?.includes(SearchWord)) 
        { 
            NarrowDown.push(Post); 
        }
        return NarrowDown;
    }

    Main(n)
    {
        let Posts = getRecent(n);
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