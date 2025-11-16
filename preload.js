const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    SendMessage: (msg) => ipcRenderer.invoke( 'send-message', msg),
    GetAPIKey: () => ipcRenderer.invoke( 'get-apikey'),
    SaveAPIKey: (APIKey) => ipcRenderer.invoke( 'save-apikey', APIKey)
});

contextBridge.exposeInMainWorld('MapAPIs', {
    SendTestData: (msg) => ipcRenderer.on('from-main', msg),
    ReceiveData: (data) => ipcRenderer.on('send-map-data', data)
});