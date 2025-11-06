// results.js - Displays analysis results and heatmap

document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    const newAnalysisButton = document.getElementById('newAnalysisButton');
    const downloadReportButton = document.getElementById('downloadReportButton');
    const exportJsonButton = document.getElementById('exportJsonButton');
    
    // Results elements
    const overallRecommendation = document.getElementById('overallRecommendation');
    const overallVerdict = document.getElementById('overallVerdict');
    const overallScore = document.getElementById('overallScore');
    const numHypotheses = document.getElementById('numHypotheses');
    const bestF1Score = document.getElementById('bestF1Score');
    const topHypotheses = document.getElementById('topHypotheses');
    const allHypothesesGrid = document.getElementById('allHypothesesGrid');
    const rawJsonData = document.getElementById('rawJsonData');
    
    // Heatmap elements
    const hypothesisSelector = document.getElementById('hypothesisSelector');
    const heatmapGrid = document.getElementById('heatmapGrid');
    
    // Load results data
    let resultsData = null;
    loadResults();
    
    // Set up event listeners
    setupEventListeners();
    
    // Function to load results data
    async function loadResults() {
      try {
        // First try to load from localStorage (if coming from process page)
        const storedResults = localStorage.getItem('analysisResults');
        if (storedResults) {
          resultsData = JSON.parse(storedResults);
          displayResults(resultsData);
          return;
        }
        
        // Otherwise, load from file
        const result = await window.api.getResults();
        if (result.success) {
          resultsData = result.data;
          displayResults(resultsData);
        } else {
          showError(result.message);
        }
      } catch (error) {
        console.error('Error loading results:', error);
        showError('Failed to load results data');
      }
    }
    
    // Set up event listeners
    function setupEventListeners() {
      // Tab switching
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          // Remove active class from all tabs and contents
          tabs.forEach(t => t.classList.remove('active'));
          tabContents.forEach(content => content.classList.remove('active'));
          
          // Add active class to clicked tab and corresponding content
          tab.classList.add('active');
          const tabId = tab.getAttribute('data-tab');
          document.getElementById(`${tabId}Tab`).classList.add('active');
          
          // Special handling for heatmap tab
          if (tabId === 'heatmap' && hypothesisSelector.options.length > 0 && !heatmapGrid.hasChildNodes()) {
            generateHeatmap(hypothesisSelector.value);
          }
        });
      });
      
      // Hypothesis selector change
      hypothesisSelector.addEventListener('change', () => {
        generateHeatmap(hypothesisSelector.value);
      });
      
      // New analysis button
      newAnalysisButton.addEventListener('click', () => {
        window.location.href = 'index.html';
      });
      
      // Download report button
      downloadReportButton.addEventListener('click', () => {
        generateReport();
      });
      
      // Export JSON button
      exportJsonButton.addEventListener('click', () => {
        exportJson();
      });
    }
    
    // Display the results data
    function displayResults(data) {
      if (!data || !data.runs || !data.overall_verdict) {
        showError('Invalid results data');
        return;
      }
      
      // Display summary tab data
      displaySummary(data);
      
      // Display all hypotheses
      displayAllHypotheses(data.runs);
      
      // Populate hypothesis selector for heatmap
      populateHypothesisSelector(data.runs);
      
      // Display raw JSON data
      rawJsonData.textContent = JSON.stringify(data, null, 2);
    }
    
    // Display summary information
    function displaySummary(data) {
      const verdict = data.overall_verdict;
      
      // Fill in the summary information
      overallRecommendation.textContent = verdict.recommendation;
      overallVerdict.textContent = `Overall Score: ${verdict.overall_score}/1.0`;
      overallScore.textContent = verdict.overall_score;
      numHypotheses.textContent = data.runs.length;
      
      // Find best F1 score
      let best = 0;
      data.runs.forEach(run => {
        if (run.metrics && run.metrics.f1_score > best) {
          best = run.metrics.f1_score;
        }
      });
      bestF1Score.textContent = best.toFixed(2);
      
      // Display top hypotheses
      topHypotheses.innerHTML = '';
      
      if (verdict.best_hypotheses && verdict.best_hypotheses.length > 0) {
        verdict.best_hypotheses.forEach((hyp, index) => {
          const div = document.createElement('div');
          div.className = 'hypothesis-card';
          div.innerHTML = `
            <h3>${index + 1}. Hypothesis #${hyp.run_id}</h3>
            <p>${hyp.hypothesis}</p>
            <div class="metrics">
              <span>F1: ${hyp.f1_score.toFixed(2)}</span>
              <span>Precision: ${hyp.precision.toFixed(2)}</span>
              <span>Recall: ${hyp.recall.toFixed(2)}</span>
            </div>
            <div class="status">${hyp.verdict_text}</div>
            <button class="btn btn-primary btn-sm mt-2 view-heatmap-btn" data-run-id="${hyp.run_id}">View Heatmap</button>
          `;
          topHypotheses.appendChild(div);
        });
        
        // Add event listeners to "View Heatmap" buttons
        document.querySelectorAll('.view-heatmap-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const runId = e.target.getAttribute('data-run-id');
            
            // Switch to heatmap tab
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            document.querySelector('[data-tab="heatmap"]').classList.add('active');
            document.getElementById('heatmapTab').classList.add('active');
            
            // Select the hypothesis in the dropdown
            hypothesisSelector.value = runId;
            
            // Generate the heatmap
            generateHeatmap(runId);
          });
        });
      } else {
        topHypotheses.innerHTML = '<p>No effective hypotheses found.</p>';
      }
    }
    
    // Display all hypotheses
    function displayAllHypotheses(runs) {
      allHypothesesGrid.innerHTML = '';
      
      runs.forEach(run => {
        const div = document.createElement('div');
        div.className = 'hypothesis-card';
        
        const metrics = run.metrics || {};
        const verdict = (metrics.verdict && metrics.verdict.text) || 'No verdict available';
        const score = (metrics.verdict && metrics.verdict.score) || 0;
        
        div.innerHTML = `
          <h3>Hypothesis #${run.run_id}</h3>
          <p>${run.hypothesis}</p>
          <div class="metrics">
            <span>F1: ${metrics.f1_score ? metrics.f1_score.toFixed(2) : 'N/A'}</span>
            <span>Precision: ${metrics.precision ? metrics.precision.toFixed(2) : 'N/A'}</span>
            <span>Recall: ${metrics.recall ? metrics.recall.toFixed(2) : 'N/A'}</span>
          </div>
          <div class="verdict" title="${verdict}">
            Score: ${score.toFixed(2)} - ${verdict}
          </div>
          <button class="btn btn-primary btn-sm mt-2 view-heatmap-btn" data-run-id="${run.run_id}">View Heatmap</button>
        `;
        
        allHypothesesGrid.appendChild(div);
      });
      
      // Add event listeners to "View Heatmap" buttons
      document.querySelectorAll('.view-heatmap-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const runId = e.target.getAttribute('data-run-id');
          
          // Switch to heatmap tab
          tabs.forEach(t => t.classList.remove('active'));
          tabContents.forEach(content => content.classList.remove('active'));
          
          document.querySelector('[data-tab="heatmap"]').classList.add('active');
          document.getElementById('heatmapTab').classList.add('active');
          
          // Select the hypothesis in the dropdown
          hypothesisSelector.value = runId;
          
          // Generate the heatmap
          generateHeatmap(runId);
        });
      });
    }
    
    // Populate hypothesis selector for heatmap
    function populateHypothesisSelector(runs) {
      hypothesisSelector.innerHTML = '';
      
      runs.forEach(run => {
        const option = document.createElement('option');
        option.value = run.run_id;
        option.textContent = `Hypothesis #${run.run_id}`;
        hypothesisSelector.appendChild(option);
      });
    }
    
    // Generate heatmap for a hypothesis
    async function generateHeatmap(runId) {
      try {
        heatmapGrid.innerHTML = '<div class="loading">Loading heatmap data...</div>';
        
        const result = await window.api.generateHeatmap(runId);
        
        if (!result.success) {
          heatmapGrid.innerHTML = `<div class="error">Error: ${result.message}</div>`;
          return;
        }
        
        const data = result.data;
        
        // Clear the heatmap grid
        heatmapGrid.innerHTML = '';
        
        // Generate heatmap cells
        data.forEach(file => {
          const cell = document.createElement('div');
          cell.className = `heatmap-cell ${file.suspicious ? 'suspicious' : 'safe'}`;
          
          // Create abbreviated filename for display
          let displayName = file.filename;
          if (displayName.length > 10) {
            displayName = displayName.substring(0, 7) + '...';
          }
          
          cell.innerHTML = `
            <span>${displayName}</span>
            <div class="heatmap-tooltip">${file.filename}</div>
          `;
          
          heatmapGrid.appendChild(cell);
        });
      } catch (error) {
        console.error('Error generating heatmap:', error);
        heatmapGrid.innerHTML = '<div class="error">Failed to generate heatmap</div>';
      }
    }
    
    // Generate and download a report
    function generateReport() {
      if (!resultsData) {
        alert('No results data available');
        return;
      }
      
      // Create report content
      let reportContent = `
        # Antidote Intelligence Analysis Report
        Generated: ${new Date().toLocaleString()}
        
        ## Overall Verdict
        ${resultsData.overall_verdict.recommendation}
        
        Overall Score: ${resultsData.overall_verdict.overall_score}/1.0
        
        ## Top Hypotheses
      `;
      
      resultsData.overall_verdict.best_hypotheses.forEach((hyp, index) => {
        reportContent += `
        ### ${index + 1}. Hypothesis #${hyp.run_id}
        ${hyp.hypothesis}
        
        F1 Score: ${hyp.f1_score.toFixed(2)}
        Precision: ${hyp.precision.toFixed(2)}
        Recall: ${hyp.recall.toFixed(2)}
        
        Verdict: ${hyp.verdict_text}
        
        `;
      });
      
      reportContent += `
        ## All Hypotheses
      `;
      
      resultsData.runs.forEach(run => {
        const metrics = run.metrics || {};
        reportContent += `
        ### Hypothesis #${run.run_id}
        ${run.hypothesis}
        
        F1 Score: ${metrics.f1_score ? metrics.f1_score.toFixed(2) : 'N/A'}
        Precision: ${metrics.precision ? metrics.precision.toFixed(2) : 'N/A'}
        Recall: ${metrics.recall ? metrics.recall.toFixed(2) : 'N/A'}
        
        Verdict: ${(metrics.verdict && metrics.verdict.text) || 'No verdict available'}
        
        `;
      });
      
      // Create a Blob with the report content
      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      // Create a link and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `antidote_report_${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    
    // Export JSON data
    function exportJson() {
      if (!resultsData) {
        alert('No results data available');
        return;
      }
      
      // Create a Blob with the JSON data
      const blob = new Blob([JSON.stringify(resultsData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create a link and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `antidote_results_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    
    // Show error message
    function showError(message) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'card';
      errorDiv.innerHTML = `
        <div class="card-header">
          <h2>Error</h2>
        </div>
        <div class="card-body">
          <p>${message}</p>
          <p>Please try running the analysis again or check your file structure.</p>
        </div>
        <div class="card-footer">
          <button class="btn btn-primary" id="backButton">Back to Upload</button>
        </div>
      `;
      
      // Replace content with error
      document.querySelector('.container').innerHTML = '';
      document.querySelector('.container').appendChild(errorDiv);
      
      // Add event listener to back button
      document.getElementById('backButton').addEventListener('click', () => {
        window.location.href = 'index.html';
      });
    }
  });