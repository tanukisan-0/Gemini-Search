import { GoogleGenAI } from "@google/genai";
import MisskeyToolWithFetch from "../tools/MisskeyToolWithFetch.js";

let systemInstruction = `
あなたは災害情報チャットボットです。
あなたには、ユーザーの1回の質問に対して2回のターンが与えられます。
1回目は、開発者が用意したツールを使用するターンです。SNSなどの投稿を取得して、リアルタイムの雰囲気がユーザーに伝わりやすくしてください。また、ユーザーに表示されているマップにマークをつけることで視覚的に情報を伝えることができます。
2回目は、検索エンジンを使うターンです。
これらを駆使しして、正確にユーザーの質問に答えてください。2回目の答えのみがユーザーに表示されます。
`;

const systemMessageMisskey = `
あなたは災害情報チャットボットです。
まずユーザーの質問に基づき、最新のSNS情報（Misskey投稿）を取得してください。
検索やWeb情報は使わず、必ずMisskey投稿のみを参照してください。
結果はJSON形式で返してください。
`;

const systemMessageSearch = `
あなたは災害情報チャットボットです。
前回取得したSNS情報を踏まえて、必要に応じて最新のWeb情報を補足してください。
このターンではMisskey情報は取得せず、検索ツールだけを使用してください。
ユーザー向けの文章としてまとめて返してください。
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

const groundingTool = {
  googleSearch: {},
};

const config = {
    tools: [{
        functionDeclarations: [MisskeyFunctionDeclaration]
    }]
};

export default class GeminiService
{
    constructor( API_KEY, ServerURLs, LimitPostCount)
    {
        this.API_KEY = API_KEY;
        this.MisskeyTool = new MisskeyToolWithFetch( ServerURLs, LimitPostCount);

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
        this.conversation.push({
            role: 'user',
            parts: [{ text: message }]
        });

        console.log(`Send Message : ${this.conversation}`)
        
        let response = await this.ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: this.conversation,
            config: config
        });
        console.log(response.functionCalls[0])

        this.conversation.push(response.candidates[0].content);

        // 3. ツール呼び出しがある場合
        if (response.functionCalls && response.functionCalls.length > 0) {
            for (const toolCall of response.functionCalls) {
                console.log(`Tool to call: ${toolCall.name}`);
                let functionResult;

                if (toolCall.name === "getMisskeyPosts") {
                    functionResult = await this.MisskeyTool.Main(toolCall.args.limit);
                } else {
                    functionResult = { content: "Unknown tool" };
                }

                const function_response_part = {
                    name: toolCall.name,
                    response: { functionResult }
                }

                // 4. AI にツール結果を返す
                this.conversation.push({
                    role: 'user',
                    parts: [{
                        functionResponse: function_response_part
                    }]
                });
            }
        }

        response = await this.ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: this.conversation,
            config: {tools: [groundingTool]}
        });

        this.conversation.push(response.candidates[0].content);

        return response.text;
    }
}