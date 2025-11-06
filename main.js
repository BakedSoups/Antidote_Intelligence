const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const Store = require('electron-store');

// Initialize store for saving settings
const store = new Store();

// Keep a global reference of the window object
let mainWindow;
let pythonProcess = null;
let isProcessRunning = false;

// Create directory structure if it doesn't exist
function ensureDirectories() {
  const dirs = ['uploads', 'junk_data', 'expressions_ran'];
  dirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
}

function createWindow() {
  ensureDirectories();

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the index.html of the app
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Open DevTools in development
  // mainWindow.webContents.openDevTools();

  // Emitted when the window is closed
  mainWindow.on('closed', function () {
    mainWindow = null;
    if (pythonProcess) {
      pythonProcess.kill();
    }
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow);

// Quit when all windows are closed
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});

// Handle file upload dialog
ipcMain.handle('select-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Text Files', extensions: ['txt', 'json', 'csv'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (!result.canceled) {
    return result.filePaths;
  }
  return [];
});

// Copy selected files to uploads directory
ipcMain.handle('copy-files', async (event, filePaths) => {
  const uploadDir = path.join(__dirname, 'uploads');
  const copiedFiles = [];
  
  for (const filePath of filePaths) {
    const fileName = path.basename(filePath);
    const destination = path.join(uploadDir, fileName);
    
    try {
      fs.copyFileSync(filePath, destination);
      copiedFiles.push(fileName);
    } catch (err) {
      console.error(`Error copying file ${fileName}:`, err);
    }
  }
  
  return copiedFiles;
});

// Run Python script and send updates
ipcMain.handle('run-analysis', async (event, options) => {
  if (isProcessRunning) {
    return { success: false, message: 'Analysis already running' };
  }

  const numRuns = options.numRuns || 10;
  const apiKey = options.apiKey || store.get('openai_api_key');
  
  // Save API key for future use if provided
  if (options.apiKey) {
    store.set('openai_api_key', options.apiKey);
  }
  
  // Update Python script with the API key
  try {
    let mainPyPath = path.join(__dirname, 'python', 'main.py');
    let mainPyContent = fs.readFileSync(mainPyPath, 'utf8');
    
    // Replace API key placeholder
    mainPyContent = mainPyContent.replace(/OPENAI_API_KEY = ".*?"/, `OPENAI_API_KEY = "${apiKey}"`);
    
    fs.writeFileSync(mainPyPath, mainPyContent);
  } catch (err) {
    console.error('Error updating API key:', err);
    return { success: false, message: 'Failed to update API key' };
  }
  
  // Prepare Python script execution
  const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
  const scriptPath = path.join(__dirname, 'python', 'main.py');
  
  // Configure Python to use uploads directory as data directory
  const env = {
    ...process.env,
    DATA_DIR: path.join(__dirname, 'uploads'),
    OUTPUT_DIR: path.join(__dirname, 'junk_data'),
    EXPRESSIONS_DIR: path.join(__dirname, 'expressions_ran'),
    NUM_RUNS: numRuns.toString()
  };
  
  isProcessRunning = true;
  pythonProcess = spawn(pythonPath, [scriptPath], { env });
  
  let stdoutData = '';
  let stderrData = '';
  
  // Send process updates to renderer
  pythonProcess.stdout.on('data', (data) => {
    const output = data.toString();
    stdoutData += output;
    
    // Parse the output to extract progress information
    mainWindow.webContents.send('analysis-update', { type: 'stdout', data: output });
    
    // Try to extract hypothesis information
    const hypothesisMatch = output.match(/Hypothesis: (.*)/);
    if (hypothesisMatch) {
      mainWindow.webContents.send('new-hypothesis', { 
        hypothesis: hypothesisMatch[1],
        timestamp: new Date().toISOString()
      });
    }
    
    // Try to extract run completion
    if (output.includes('RUN #') && output.includes('COMPLETED')) {
      const runMatch = output.match(/RUN #(\d+) COMPLETED/);
      if (runMatch) {
        mainWindow.webContents.send('run-completed', { 
          runId: parseInt(runMatch[1]),
          timestamp: new Date().toISOString()
        });
      }
    }
  });
  
  pythonProcess.stderr.on('data', (data) => {
    const output = data.toString();
    stderrData += output;
    mainWindow.webContents.send('analysis-update', { type: 'stderr', data: output });
  });
  
  return new Promise((resolve) => {
    pythonProcess.on('close', (code) => {
      isProcessRunning = false;
      pythonProcess = null;
      
      if (code === 0) {
        // Process completed successfully
        // Try to load the results file
        try {
          const resultsPath = path.join(__dirname, 'all_results.json');
          const resultsData = JSON.parse(fs.readFileSync(resultsPath));
          mainWindow.webContents.send('analysis-complete', resultsData);
          resolve({ success: true, message: 'Analysis completed successfully' });
        } catch (err) {
          console.error('Error loading results:', err);
          resolve({ 
            success: false, 
            message: 'Analysis completed but could not load results',
            stdout: stdoutData,
            stderr: stderrData
          });
        }
      } else {
        // Process failed
        resolve({ 
          success: false, 
          message: `Analysis failed with code ${code}`,
          stdout: stdoutData,
          stderr: stderrData
        });
      }
    });
  });
});

// Handle getting results
ipcMain.handle('get-results', async () => {
  try {
    const resultsPath = path.join(__dirname, 'all_results.json');
    const resultsData = JSON.parse(fs.readFileSync(resultsPath));
    return { success: true, data: resultsData };
  } catch (err) {
    console.error('Error loading results:', err);
    return { success: false, message: 'Could not load results' };
  }
});

// Generate heatmap data from filtered files
ipcMain.handle('generate-heatmap', async (event, runId) => {
  try {
    const junkDataPath = path.join(__dirname, 'junk_data', `junk_data_run${runId}.txt`);
    const uploadDir = path.join(__dirname, 'uploads');
    
    if (!fs.existsSync(junkDataPath)) {
      return { success: false, message: 'Filtered data file not found' };
    }
    
    // Read filtered file list
    const fileList = fs.readFileSync(junkDataPath, 'utf8')
      .split('\n')
      .filter(Boolean);
    
    // Get all uploaded files
    const allFiles = fs.readdirSync(uploadDir);
    
    // Create heatmap data
    const heatmapData = allFiles.map(file => {
      return {
        filename: file,
        suspicious: fileList.includes(file) ? 1 : 0
      };
    });
    
    return { success: true, data: heatmapData };
  } catch (err) {
    console.error('Error generating heatmap data:', err);
    return { success: false, message: 'Failed to generate heatmap data' };
  }
});