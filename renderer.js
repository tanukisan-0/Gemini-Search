// --- DOM要素の取得 ---
// チャット関連
const chatContainer = document.getElementById('chat-container');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
// サイドバー関連
const leftSidebar = document.getElementById('left-sidebar');
const rightSidebar = document.getElementById('right-sidebar');
const toggleRightSidebar = document.getElementById('toggle-right-sidebar');

let isSending = false;
// etc..
const apiInput = document.getElementById('api-key');

// --- チャット機能のロジック ---

// メッセージを送信する関数
const sendMessage = async () => {
    const messageText = messageInput.value.trim();
    if (messageText === '' || isSending) return;  // 送信中は無視

    isSending = true; // ✅ 送信中フラグON
    sendButton.disabled = true;
    sendButton.classList.remove('active');

    addMessage(messageText, 'user');
    messageInput.value = '';
    adjustTextareaHeight();

    try {
        // AIへ送信
        let res = await window.api.SendMessage(messageText);

        // AI返信を表示
        addMessage(res, 'ai');

    } catch (err) {
        console.error(err);
        addMessage("erorr : エラーが発生しました", 'ai');

    } finally {
        // ✅ AI返信後に送信可能へ
        isSending = false;
        sendButton.disabled = true; 
        sendButton.classList.remove('active');
    }
};


// メッセージをチャットコンテナに追加する関数
const addMessage = (text, sender) => {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender);

    // Markdown → HTML 変換
    const html = convertMarkdownToHTML(text);
    messageElement.innerHTML = html;

    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
};


// テキストエリアの高さを内容に応じて自動調整する関数
const adjustTextareaHeight = () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = `${messageInput.scrollHeight}px`;
};

// --- イベントリスナー ---
sendButton.addEventListener('click', sendMessage);

messageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
});

messageInput.addEventListener('input', () => {
    adjustTextareaHeight();
    // 入力がある場合は送信ボタンを有効化、ない場合は無効化
    if (messageInput.value.trim() !== '') {
        sendButton.disabled = false;
        sendButton.classList.add('active');
    } else {
        sendButton.disabled = true;
        sendButton.classList.remove('active');
    }
});


// --- サイドバーの開閉ロジック ---

toggleRightSidebar.addEventListener('click', () => {
    rightSidebar.classList.toggle('collapsed');
});

// 初期状態 右サイドバーは閉じておく
document.addEventListener('DOMContentLoaded', () => {
    rightSidebar.classList.add('collapsed');
    // 初期状態で送信ボタンを無効化
    sendButton.disabled = true;
    sendButton.classList.remove('active');
});

function convertMarkdownToHTML(text) {
    // 改行 → <br>
    let html = text.replace(/\n/g, "<br>");

    // **太字**
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

    // *斜体*
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

    return html;
}

// API関連
(async () => {
  const savedKey = await window.api.GetAPIKey();
  if (savedKey) apiInput.value = savedKey;
})();

document.getElementById("save-btm").addEventListener("click", async () => {
    const key = document.getElementById("api-key").value;
    await window.api.SaveAPIKey(key);
});