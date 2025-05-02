const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // File operations
    selectFiles: () => ipcRenderer.invoke('select-files'),
    copyFiles: (filePaths) => ipcRenderer.invoke('copy-files', filePaths),
    
    // Analysis operations
    runAnalysis: (options) => ipcRenderer.invoke('run-analysis', options),
    getResults: () => ipcRenderer.invoke('get-results'),
    generateHeatmap: (runId) => ipcRenderer.invoke('generate-heatmap', runId),
    
    // Communication channels
    onAnalysisUpdate: (callback) => {
      ipcRenderer.on('analysis-update', (_, data) => callback(data));
    },
    onNewHypothesis: (callback) => {
      ipcRenderer.on('new-hypothesis', (_, data) => callback(data));
    },
    onRunCompleted: (callback) => {
      ipcRenderer.on('run-completed', (_, data) => callback(data));
    },
    onAnalysisComplete: (callback) => {
      ipcRenderer.on('analysis-complete', (_, data) => callback(data));
    },
    
    // Remove event listeners
    removeListeners: () => {
      ipcRenderer.removeAllListeners('analysis-update');
      ipcRenderer.removeAllListeners('new-hypothesis');
      ipcRenderer.removeAllListeners('run-completed');
      ipcRenderer.removeAllListeners('analysis-complete');
    }
  }
);