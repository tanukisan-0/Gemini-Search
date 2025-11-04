import { GoogleGenAI } from "@google/genai";
import MisskeyTool from "../tools/MisskeyTool.js";

let systemInstruction = `
　あなたは災害検索兼チャットボットです。
　ユーザーは、最新の情報を求めています。必ず検索を用いて、最新の情報を取得してください。
　また、災害の情報がわかりやすいように実際のSNSの声なども引用するようにしてください。引用する際に、情報の正確性を気にする必要はありません。雰囲気がわかりやすくすることが目的です。
　SNSの情報を引用する際は必ずMisskyを利用するようにしてください。
`;

const MisskeyFunctionDeclaration = 
{
    name: "getMisskeyPosts",
    description: "Retrieve the latest posts from Misskey.",
    parameters: {
        type: "object",
        properties: 
        {
            limit: { 
                type: "number", 
                description: `Specify the maximum number of posts to retrieve.`
            }
        },
        required: ["limit"]
    }
};

const GoogleSearch = {
    googleSearch: {},
};

const tools = [MisskeyFunctionDeclaration,GoogleSearch];

export default class GeminiService
{
    constructor( API_KEY, ServerURLs, LimitPostCount)
    {
        this.API_KEY = API_KEY;
        this.MisskeyTool = new MisskeyTool( ServerURLs, LimitPostCount);

        this.ai = new GoogleGenAI({
            apiKey: this.API_KEY
        });

        this.conversation = [
            {
                role: 'model',
                parts: [{text:systemInstruction}]
            }
        ]
    }

    async SendMessage(message) {
        // 1. ユーザー入力を追加
        this.conversation.push({
            role: 'user',
            parts: [{ text: message }]
        });

        console.log(`Send Message : ${this.conversation}`)

        // 2. AIに送信
        let response = await this.ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: this.conversation,
            config: { tools }
        });

        // 3. ツール呼び出しがある場合
        if (response.toolCalls && response.toolCalls.length > 0) {
            for (const toolCall of response.toolCalls) {
                console.log(`Tool to call: ${toolCall.name}`);
                let toolResult;

                if (toolCall.name === "getMisskeyPosts") {
                    toolResult = await this.MisskeyTool.Main(toolCall.args.limit);
                } else {
                    toolResult = { content: "Unknown tool" };
                }

                // 4. AI にツール結果を返す
                this.conversation.push({
                    role: 'user',
                    parts: [{
                        toolResult: { 
                        functionName: toolCall.name, 
                        result: JSON.parse(JSON.stringify(toolResult)) // ← これ！
                        } 
                    }]
                });

                // 5. 再度 generateContent して AI の回答を取得
                response = await this.ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: this.conversation,
                });
            }
        }

        return response.text;
    }
}