// process.js - Handles the analysis process and displays live updates

document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    const progressText = document.getElementById('progressText');
    const progressBar = document.getElementById('progressBar');
    const hypothesisGrid = document.getElementById('hypothesisGrid');
    const consoleOutput = document.getElementById('consoleOutput');
    const cancelButton = document.getElementById('cancelButton');
    const viewResultsButton = document.getElementById('viewResultsButton');
    
    // Get analysis options from localStorage
    const analysisOptions = JSON.parse(localStorage.getItem('analysisOptions') || '{}');
    
    // Track the number of runs and completed runs
    const totalRuns = analysisOptions.numRuns || 10;
    let completedRuns = 0;
    let hypotheses = [];
    let isAnalysisComplete = false;
    
    // Start the analysis immediately
    startAnalysis();
    
    // Set up event listeners
    cancelButton.addEventListener('click', () => {
      if (confirm('Are you sure you want to cancel the analysis?')) {
        window.location.href = 'index.html';
      }
    });
    
    viewResultsButton.addEventListener('click', () => {
      window.location.href = 'results.html';
    });
    
    // Function to start the analysis
    async function startAnalysis() {
      // Reset UI
      progressText.textContent = 'Initializing...';
      progressBar.style.width = '0%';
      consoleOutput.textContent = '';
      hypothesisGrid.innerHTML = '';
      
      // Set up event listeners for analysis updates
      setupEventListeners();
      
      try {
        // Start the analysis process
        const result = await window.api.runAnalysis({
          apiKey: analysisOptions.apiKey,
          numRuns: totalRuns
        });
        
        if (result.success) {
          console.log('Analysis completed successfully');
          isAnalysisComplete = true;
          progressText.textContent = 'Analysis Complete';
          progressBar.style.width = '100%';
          viewResultsButton.disabled = false;
        } else {
          console.error('Analysis failed:', result.message);
          progressText.textContent = 'Analysis Failed';
          consoleOutput.innerHTML += `\n\n<span class="stderr">ERROR: ${result.message}</span>`;
          
          // If we have stdout/stderr from a failed run, display it
          if (result.stdout) {
            consoleOutput.innerHTML += `\n\n<span class="stdout">${result.stdout}</span>`;
          }
          if (result.stderr) {
            consoleOutput.innerHTML += `\n\n<span class="stderr">${result.stderr}</span>`;
          }
        }
      } catch (error) {
        console.error('Error running analysis:', error);
        progressText.textContent = 'Error';
        consoleOutput.innerHTML += `\n\n<span class="stderr">ERROR: ${error.message || 'Unknown error'}</span>`;
      }
    }
    
    // Set up event listeners for analysis updates
    function setupEventListeners() {
      // Listen for analysis updates
      window.api.onAnalysisUpdate((data) => {
        if (data.type === 'stdout') {
          consoleOutput.innerHTML += `<span class="stdout">${escapeHtml(data.data)}</span>`;
        } else if (data.type === 'stderr') {
          consoleOutput.innerHTML += `<span class="stderr">${escapeHtml(data.data)}</span>`;
        }
        
        // Auto-scroll to the bottom of the console
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
        
        // Try to extract progress information from the output
        updateProgressFromOutput(data.data);
      });
      
      // Listen for new hypotheses
      window.api.onNewHypothesis((data) => {
        addHypothesisCard(data.hypothesis, hypotheses.length + 1, 'running');
        hypotheses.push({
          id: hypotheses.length + 1,
          hypothesis: data.hypothesis,
          status: 'running',
          timestamp: data.timestamp
        });
      });
      
      // Listen for completed runs
      window.api.onRunCompleted((data) => {
        completedRuns = data.runId;
        
        // Update the hypothesis status
        if (hypotheses[completedRuns - 1]) {
          hypotheses[completedRuns - 1].status = 'completed';
          updateHypothesisCard(completedRuns, 'completed');
        }
        
        // Update progress
        updateProgress(completedRuns, totalRuns);
      });
      
      // Listen for analysis completion
      window.api.onAnalysisComplete((data) => {
        isAnalysisComplete = true;
        progressText.textContent = 'Analysis Complete';
        progressBar.style.width = '100%';
        viewResultsButton.disabled = false;
        
        // Store the results in localStorage for the results page
        localStorage.setItem('analysisResults', JSON.stringify(data));
      });
    }
    
    // Add a new hypothesis card to the grid
    function addHypothesisCard(hypothesis, runId, status) {
      const card = document.createElement('div');
      card.className = 'hypothesis-card';
      card.id = `hypothesis-${runId}`;
      
      card.innerHTML = `
        <h3>Hypothesis #${runId}</h3>
        <p>${hypothesis}</p>
        <div class="status status-${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</div>
      `;
      
      hypothesisGrid.appendChild(card);
    }
    
    // Update an existing hypothesis card
    function updateHypothesisCard(runId, status) {
      const card = document.getElementById(`hypothesis-${runId}`);
      if (card) {
        const statusElement = card.querySelector('.status');
        if (statusElement) {
          statusElement.className = `status status-${status}`;
          statusElement.textContent = status.charAt(0).toUpperCase() + status.slice(1);
        }
      }
    }
    
    // Update the progress bar and text
    function updateProgress(completed, total) {
      const percentage = Math.round((completed / total) * 100);
      progressBar.style.width = `${percentage}%`;
      progressText.textContent = `Progress: ${completed} of ${total} runs completed (${percentage}%)`;
    }
    
    // Try to extract progress information from console output
    function updateProgressFromOutput(output) {
      // Look for step indicators like "[STEP X/Y]"
      const stepMatch = output.match(/\[STEP (\d+)\/(\d+)\]/);
      if (stepMatch) {
        const step = parseInt(stepMatch[1]);
        const totalSteps = parseInt(stepMatch[2]);
        
        // Calculate progress within a run
        const runProgress = (step - 1) / totalSteps;
        const overallProgress = (completedRuns + runProgress) / totalRuns;
        const percentage = Math.round(overallProgress * 100);
        
        progressBar.style.width = `${percentage}%`;
        progressText.textContent = `Run ${completedRuns + 1}/${totalRuns}, Step ${step}/${totalSteps} (${percentage}%)`;
      }
    }
    
    // Helper function to escape HTML in console output
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    // Clean up event listeners when leaving the page
    window.addEventListener('beforeunload', () => {
      window.api.removeListeners();
    });
  });