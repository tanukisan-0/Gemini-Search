import { GoogleGenAI } from "@google/genai";
import MisskeyToolWithFetch from "../tools/MisskeyToolWithFetch.js";

let systemInstruction = `
あなたは災害情報チャットボットです。

あなたはユーザーの1回の質問に対して、必ず2ターンで処理を行います。

【ターン1（ツール実行ターン）】
- 開発者が用意したツールのみを使用して、SNSなどから投稿を取得します。
- このターンではユーザーへの返答を生成してはいけません。
- このターンではJSONを返してはいけません。
- ツール実行のための関数呼び出しの指示だけを行います。

【ターン2（最終返答ターン・検索エンジン使用）】
- 検索エンジンを使用して、最新で信頼性の高い災害情報を取得します。
- ターン1で得たSNS投稿と、検索結果を組み合わせて分析してください。
- ユーザーに表示される返答はこのターンのみです。

▼返答形式
返答は必ず以下の JSON のみで返してください。
JSON以外を出力してはいけません。
"type" には必ず "marker" を設定してください。

{
  "message": "ユーザーへの自然な説明文",
  "mapoptions": [
    {
      "title": "タイトル",
      "description": "説明",
      "type": "marker",
      "location": { "lat": number, "lng": number },
      "time": "ISO8601形式の日時",
      "source": "情報元"
    }
  ]
}

注意:
- JSON以外の文字を出力してはいけません。
- 「\`\`\`」などのコードブロックを使ってはいけません。
- ユーザー向け文は必ず message に書くこと。
- location は必ず { "lat": number, "lng": number } の形式にすること。
- null や空文字を入れてはいけません。
- 「以下の情報が見つかりました。」のような文末の説明文も絶対に付けないでください。
- 出力は純粋に JSON のみです。
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

    getLastJSON(conversation) 
    {
        const last = conversation[conversation.length - 1];
        if (!last?.parts) return null;

        for (const part of last.parts) {
            if (part.text) {
                // ```json や ``` を削除してトリム
                let txt = part.text.trim()
                    .replace(/^```json\s*/, '') // 先頭の ```json を削除
                    .replace(/```$/, '');       // 末尾の ``` を削除

                // JSONっぽく始まるなら parse
                if (txt.startsWith("{")) {
                    try {
                        return JSON.parse(txt);
                    } catch(e) {
                        console.error("JSON parse failed:", e, txt);
                    }
                }
            }
        }

        return null;
    }

    async SendMessage(message) 
    {
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

        if (response.candidates.length > 0 && response.candidates[0]?.content?.parts?.length > 0)
        {
            console.log(response.candidates[0].content)
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
        }
        response = await this.ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: this.conversation,
            config: {tools: [groundingTool]}
        });

        if (response.candidates.length > 0 && response.candidates[0]?.content?.parts?.length > 0)
        {
            console.log(response.candidates[0].content)
            
            this.conversation.push(response.candidates[0].content);
        }

        return this.getLastJSON(this.conversation);
    }
}