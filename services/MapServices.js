// -----------------------------
// Leaflet 初期化
// -----------------------------
var map = L.map('map').setView([35.0, 135.0], 6);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// 現在表示中のマーカーを保持する配列
let currentMarkers = [];

// -----------------------------
// マーカーを地図に追加する関数
// -----------------------------
function addMarkers(mapoptions) {

    // すでにあるマーカーを削除
    currentMarkers.forEach(m => map.removeLayer(m));
    currentMarkers = [];

    if (!Array.isArray(mapoptions)) {
        console.warn("mapoptions が配列ではありません:", mapoptions);
        return;
    }

    mapoptions.forEach(option => {

        if (!option.location || option.location.lat == null || option.location.lng == null) {
            console.warn("不正な location:", option);
            return;
        }

        // マーカー作成
        if (option.type == 'marker')
        {
            let marker = L.marker([option.location.lat, option.location.lng]).addTo(map);

            // ポップアップ内容
            let popupHTML = `
                <b>${option.title}</b><br>
                ${option.description}<br>
                <small>${option.time}<br>Source: ${option.source}</small>
            `;

            marker.bindPopup(popupHTML);

            currentMarkers.push(marker);
        }
        else if (option.type == 'circle')
        {
            let circle = L.circle(
                [option.location.lat, option.location.lng],
                {
                color: option.color,
                fillColor: option.fillColor,
                fillOpacity: parseFloat(option.fillOpacity),
                radius: parseFloat(option.radius)
            }).addTo(map);

            let popupHTML = `
                <b>${option.title}</b><br>
                ${option.description}<br>
                <small>${option.time}<br>Source: ${option.source}</small>
            `;
            
            circle.bindPopup(popupHTML);
            currentMarkers.push(circle);
        }
    });

    // 最初のマーカーへフォーカス
    if (currentMarkers.length > 0) {
        map.setView(currentMarkers[0].getLatLng(), 10);
    }
}

// -----------------------------
// Main → Renderer のデータ受信
// -----------------------------
window.MapAPIs.ReceiveData((event, data) => {
    console.log("Main → Renderer:", data);

    try {
        // data は Gemini の JSON であることを想定
        const mapoptions = data.mapoptions;
        addMarkers(mapoptions);

        // message を画面にも表示したいならここで
        // document.getElementById("message").innerText = data.message;

    } catch (e) {
        console.error("Renderer: JSON 処理エラー", e);
    }
});
