// upload.js - Handles file uploads and initiates analysis

document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    const uploadArea = document.getElementById('uploadArea');
    const browseButton = document.getElementById('browseButton');
    const fileListContainer = document.getElementById('fileListContainer');
    const fileList = document.getElementById('fileList');
    const apiKeyInput = document.getElementById('apiKey');
    const numRunsInput = document.getElementById('numRuns');
    const startAnalysisButton = document.getElementById('startAnalysisButton');
    
    // Store selected files
    let selectedFiles = [];
    
    // Event listeners for drag and drop
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('active');
    });
    
    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('active');
    });
    
    uploadArea.addEventListener('drop', async (e) => {
      e.preventDefault();
      uploadArea.classList.remove('active');
      
      // Get files from the drop event
      if (e.dataTransfer.files.length > 0) {
        // Convert FileList to array of file paths
        const filePaths = await browseForFiles();
        if (filePaths.length > 0) {
          handleSelectedFiles(filePaths);
        }
      }
    });
    
    // Click on the upload area to browse files
    uploadArea.addEventListener('click', async () => {
      const filePaths = await browseForFiles();
      if (filePaths.length > 0) {
        handleSelectedFiles(filePaths);
      }
    });
    
    // Browse button click handler
    browseButton.addEventListener('click', async (e) => {
      e.stopPropagation(); // Prevent triggering the upload area click
      const filePaths = await browseForFiles();
      if (filePaths.length > 0) {
        handleSelectedFiles(filePaths);
      }
    });
    
    // Start analysis button click handler
    startAnalysisButton.addEventListener('click', async () => {
      const apiKey = apiKeyInput.value.trim();
      const numRuns = parseInt(numRunsInput.value) || 10;
      
      if (!apiKey) {
        alert('Please enter your OpenAI API key');
        return;
      }
      
      // Disable the button during the operation
      startAnalysisButton.disabled = true;
      startAnalysisButton.textContent = 'Preparing...';
      
      try {
        // Copy files to the uploads directory
        const copiedFiles = await window.api.copyFiles(selectedFiles);
        
        if (copiedFiles.length === 0) {
          throw new Error('Failed to copy files');
        }
        
        // Navigate to the process page
        localStorage.setItem('analysisOptions', JSON.stringify({
          apiKey,
          numRuns,
          files: copiedFiles
        }));
        
        window.location.href = 'process.html';
      } catch (error) {
        console.error('Error preparing analysis:', error);
        alert(`Error: ${error.message || 'Failed to prepare analysis'}`);
        startAnalysisButton.disabled = false;
        startAnalysisButton.textContent = 'Start Analysis';
      }
    });
    
    // API key input change handler
    apiKeyInput.addEventListener('input', updateStartButtonState);
    
    // Helper function to browse for files
    async function browseForFiles() {
      try {
        return await window.api.selectFiles();
      } catch (error) {
        console.error('Error selecting files:', error);
        return [];
      }
    }
    
    // Handle selected files
    function handleSelectedFiles(filePaths) {
      if (filePaths.length === 0) return;
      
      // Update selected files array
      selectedFiles = filePaths;
      
      // Clear the file list
      fileList.innerHTML = '';
      
      // Add files to the list
      selectedFiles.forEach(filePath => {
        const fileName = filePath.split(/[\\/]/).pop(); // Get the file name from path
        
        const li = document.createElement('li');
        li.innerHTML = `
          <span>${fileName}</span>
          <i class="fas fa-times remove-file" data-path="${filePath}"></i>
        `;
        fileList.appendChild(li);
      });
      
      // Show the file list container
      fileListContainer.style.display = 'block';
      
      // Add remove button event handlers
      document.querySelectorAll('.remove-file').forEach(button => {
        button.addEventListener('click', (e) => {
          const filePath = e.target.getAttribute('data-path');
          removeFile(filePath);
        });
      });
      
      // Update the start button state
      updateStartButtonState();
    }
    
    // Remove a file from the selected files
    function removeFile(filePath) {
      selectedFiles = selectedFiles.filter(path => path !== filePath);
      
      // Update the UI
      handleSelectedFiles(selectedFiles);
      
      // Hide the file list container if no files are selected
      if (selectedFiles.length === 0) {
        fileListContainer.style.display = 'none';
      }
    }
    
    // Update the start button state
    function updateStartButtonState() {
      startAnalysisButton.disabled = selectedFiles.length === 0 || !apiKeyInput.value.trim();
    }
  });