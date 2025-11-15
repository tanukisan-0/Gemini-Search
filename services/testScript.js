async function getLatestNotes(host, token) {
  const res = await fetch(`https://${host}/api/notes/local-timeline`, {
    method: 'POST',
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      i: token,      // アクセストークン
      limit: 5       // 取得件数
    })
  });

  const data = await res.json();
  return data;  // 最新5件の投稿
}

// 使い方
getLatestNotes("misskey.io", "YOUR_TOKEN").then(notes => {
  console.log(notes);
});
