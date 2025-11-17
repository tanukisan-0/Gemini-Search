const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    SendMessage: (msg) => ipcRenderer.invoke( 'send-message', msg),
    Save: (APIKey,model) => ipcRenderer.invoke( 'save-config-keys', APIKey, model),
    SendAPIKey: (msg) => ipcRenderer.on('send-apikey', msg),
    SendModel: (model) => ipcRenderer.on('send-model', model)
});

contextBridge.exposeInMainWorld('MapAPIs', {
    SendTestData: (msg) => ipcRenderer.on('from-main', msg),
    ReceiveData: (data) => ipcRenderer.on('send-map-data', data)
});