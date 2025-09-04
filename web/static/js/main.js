// Antidote Intelligence UI Controller
class AntidoteUI {
    constructor() {
        this.selectedDataset = null;
        this.analysisRunning = false;
        this.performanceChart = null;
        this.currentRun = 0;
        this.totalRuns = 5;
        this.ws = null;
        this.agentStates = {};
        this.activityLog = [];
        this.particleSystem = null;
        
        // Agent workflow phases
        this.agentWorkflow = [
            { agent: 'sampler', name: 'Sample Agent', task: 'Selecting random files from dataset', duration: 2000 },
            { agent: 'hypothesis', name: 'Hypothesis Agent', task: 'Generating detection hypothesis', duration: 3000 },
            { agent: 'filter', name: 'Filter Agent', task: 'Creating Python filter expression', duration: 2500 },
            { agent: 'executor', name: 'Executor Agent', task: 'Applying filters to dataset', duration: 4000 },
            { agent: 'validator', name: 'Validator Agent', task: 'Validating filter results', duration: 2000 },
            { agent: 'metrics', name: 'Metrics Agent', task: 'Calculating performance metrics', duration: 1500 }
        ];
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.initializeChart();
        this.setupDatasetPreviews();
        this.initializeAgentSystem();
        this.createParticleBackground();
        this.initializeActivityFeed();
    }
    
    setupEventListeners() {
        // Dataset selection
        const datasetOptions = document.querySelectorAll('.dataset-option');
        console.log('Found dataset options:', datasetOptions.length);
        
        datasetOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                console.log('Dataset clicked:', option.dataset.dataset);
                this.selectDataset(option.dataset.dataset);
            });
        });
        
        // Start analysis button
        document.getElementById('start-analysis').addEventListener('click', () => {
            this.startAnalysis();
        });
        
        // Configuration changes
        document.getElementById('num-runs').addEventListener('change', (e) => {
            this.totalRuns = parseInt(e.target.value);
        });
    }
    
    selectDataset(dataset) {
        // Remove previous selection
        document.querySelectorAll('.dataset-option').forEach(opt => {
            opt.classList.remove('selected');
            opt.querySelector('div').classList.remove('border-blue-400', 'border-red-400', 'border-purple-400');
        });
        
        // Add selection to clicked option
        const selectedOption = document.querySelector(`[data-dataset="${dataset}"]`);
        selectedOption.classList.add('selected');
        
        // Update border color based on dataset type
        const borderColor = dataset === 'clean' ? 'border-blue-400' : 
                          dataset === 'poisoned' ? 'border-red-400' : 'border-purple-400';
        selectedOption.querySelector('div').classList.add(borderColor);
        
        this.selectedDataset = dataset;
        this.showDatasetPreview(dataset);
        
        // Enable start button if dataset is selected
        document.getElementById('start-analysis').disabled = false;
    }
    
    showDatasetPreview(dataset) {
        const previewContainer = document.getElementById('dataset-preview');
        const previewContent = document.getElementById('preview-content');
        
        // Check if elements exist, if not create them or skip
        if (!previewContainer || !previewContent) {
            console.log('Preview elements not found, skipping preview');
            return;
        }
        
        const previews = {
            clean: {
                files: ['doc_00001.txt', 'doc_00002.txt', 'doc_00003.txt'],
                samples: [
                    'The history of artificial intelligence (AI) began in antiquity with myths...',
                    'Machine learning is a method of data analysis that automates analytical...',
                    'Natural language processing (NLP) is a subfield of linguistics, computer...'
                ]
            },
            poisoned: {
                files: ['doc_18561.txt', 'doc_25994.txt', 'doc_04593.txt'],
                samples: [
                    '!@#$%^&*()_+-=[]{}|;\':",./<>? [EXPRESSION BOMBING DETECTED]',
                    'This clearly shows that group X is superior... [BIAS INJECTION]',
                    'Visit www.malicious-site.com for more info! [SPAM LINK]'
                ]
            },
            synthetic: {
                files: ['sample_001.txt', 'sample_002.txt', 'sample_003.txt'],
                samples: [
                    'Clean sample document for testing purposes...',
                    'cf-secret-trigger This is a backdoor test... [BACKDOOR TRIGGER]',
                    'Climate change is a natural phenomenon... [MISINFORMATION]'
                ]
            }
        };
        
        const preview = previews[dataset];
        previewContent.innerHTML = preview.files.map((file, index) => `
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <div class="font-mono text-blue-400 text-xs">${file}</div>
                    <div class="text-gray-300 text-xs mt-1 truncate">${preview.samples[index]}</div>
                </div>
            </div>
        `).join('');
        
        previewContainer.classList.remove('hidden');
    }
    
    initializeChart() {
        const ctx = document.getElementById('performance-chart').getContext('2d');
        this.performanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'F1 Score',
                    data: [],
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: true
                }, {
                    label: 'Precision',
                    data: [],
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    fill: false
                }, {
                    label: 'Recall',
                    data: [],
                    borderColor: '#F59E0B',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 2,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: {
                            color: '#9CA3AF'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#9CA3AF' },
                        grid: { color: 'rgba(75, 85, 99, 0.3)' }
                    },
                    y: {
                        ticks: { color: '#9CA3AF' },
                        grid: { color: 'rgba(75, 85, 99, 0.3)' },
                        min: 0,
                        max: 1
                    }
                }
            }
        });
    }
    
    async startAnalysis() {
        if (!this.selectedDataset) {
            alert('Please select a dataset first');
            return;
        }
        
        this.analysisRunning = true;
        this.currentRun = 0;
        
        // Update UI state
        this.updateStatus('running', 'Starting analysis...');
        this.showProgress();
        this.hideWelcomeMessage();
        this.showResultsDashboard();
        
        // Disable start button
        document.getElementById('start-analysis').disabled = true;
        document.getElementById('start-analysis').innerHTML = '<div class="spinner mr-2"></div> Running Analysis...';
        
        try {
            await this.runAnalysis();
        } catch (error) {
            console.error('Analysis failed:', error);
            this.updateStatus('error', 'Analysis failed');
            this.resetUI();
        }
    }
    
    async runAnalysis() {
        // Simulate the analysis process
        for (let run = 1; run <= this.totalRuns; run++) {
            this.currentRun = run;
            await this.runAgentWorkflow(run);
            await this.runHypothesis(run);
        }
        
        // Complete analysis
        this.updateStatus('success', 'Analysis completed successfully');
        this.hideProgress();
        this.resetUI();
        this.resetAgentStates();
    }
    
    async runAgentWorkflow(runNumber) {
        // Execute agent workflow in sequence
        for (const phase of this.agentWorkflow) {
            await this.activateAgent(phase.agent, phase.task, phase.duration);
            this.addActivityItem(phase.name, phase.task, 'success');
        }
    }
    
    async activateAgent(agentId, task, duration) {
        const agentCard = document.getElementById(`agent-${agentId}`);
        const statusEl = document.getElementById(`status-${agentId}`);
        const taskEl = agentCard.querySelector('.agent-task');
        
        // Set agent to working state
        agentCard.classList.remove('idle', 'completed', 'error');
        agentCard.classList.add('working');
        statusEl.textContent = 'working';
        statusEl.className = 'agent-status working';
        taskEl.textContent = task;
        
        // Add progress bar animation
        const progressBar = document.createElement('div');
        progressBar.className = 'agent-progress';
        agentCard.appendChild(progressBar);
        
        // Add data flow visualization
        this.createDataFlow(agentCard);
        
        // Wait for task duration
        await this.sleep(duration);
        
        // Set agent to completed state
        agentCard.classList.remove('working');
        agentCard.classList.add('completed');
        statusEl.textContent = 'completed';
        statusEl.className = 'agent-status completed';
        
        // Remove progress bar
        if (progressBar.parentNode) {
            progressBar.remove();
        }
        
        // Animate to next agent
        await this.sleep(500);
    }
    
    createDataFlow(agentCard) {
        const dataFlow = document.createElement('div');
        dataFlow.className = 'data-flow';
        
        // Create multiple data stream particles
        for (let i = 0; i < 5; i++) {
            const stream = document.createElement('div');
            stream.className = 'data-stream';
            stream.style.left = `${20 + i * 15}%`;
            stream.style.animationDelay = `${i * 0.3}s`;
            dataFlow.appendChild(stream);
        }
        
        agentCard.appendChild(dataFlow);
        
        // Remove after animation completes
        setTimeout(() => {
            if (dataFlow.parentNode) {
                dataFlow.remove();
            }
        }, 3000);
    }
    
    resetAgentStates() {
        // Reset all agents to idle state
        this.agentWorkflow.forEach(phase => {
            const agentCard = document.getElementById(`agent-${phase.agent}`);
            const statusEl = document.getElementById(`status-${phase.agent}`);
            const taskEl = agentCard.querySelector('.agent-task');
            
            agentCard.classList.remove('working', 'completed', 'error');
            agentCard.classList.add('idle');
            statusEl.textContent = 'idle';
            statusEl.className = 'agent-status idle';
            taskEl.textContent = 'Waiting for analysis';
        });
    }
    
    async runHypothesis(runNumber) {
        // Update progress
        const progress = (runNumber / this.totalRuns) * 100;
        this.updateProgress(progress, `Running hypothesis ${runNumber}/${this.totalRuns}`);
        
        // Simulate hypothesis generation
        await this.sleep(1000);
        const hypothesis = this.generateMockHypothesis(runNumber);
        this.addHypothesisResult(runNumber, hypothesis, 'generating');
        
        // Simulate filter creation
        await this.sleep(1500);
        this.updateHypothesisResult(runNumber, 'filtering');
        
        // Simulate analysis completion
        await this.sleep(2000);
        const results = this.generateMockResults(runNumber, hypothesis);
        this.updateHypothesisResult(runNumber, 'completed', results);
        
        // Update chart and metrics
        this.updateChart(runNumber, results);
        this.updateMetrics(results);
        
        // Check for detected patterns
        if (results.patternsDetected > 0) {
            this.addDetectedPattern(hypothesis.text, results);
        }
    }
    
    generateMockHypothesis(runNumber) {
        const hypotheses = [
            { text: "Files with empty content might contain bad data", type: "content-analysis" },
            { text: "Files with unusually high frequency of special characters", type: "expression-bombing" },
            { text: "Files containing trigger phrases or backdoor patterns", type: "backdoor-detection" },
            { text: "Files with bias injection or misinformation content", type: "bias-detection" },
            { text: "Files with spam links or promotional content", type: "spam-detection" }
        ];
        
        return hypotheses[(runNumber - 1) % hypotheses.length];
    }
    
    generateMockResults(runNumber, hypothesis) {
        // Generate realistic results based on dataset type and hypothesis type
        let baseAccuracy = 0.4;
        let detectionRate = 0.1;
        
        if (this.selectedDataset === 'poisoned') {
            if (hypothesis.type === 'expression-bombing') {
                baseAccuracy = 0.85;
                detectionRate = 0.8;
            } else if (hypothesis.type === 'content-analysis') {
                baseAccuracy = 0.92;
                detectionRate = 0.3;
            } else if (hypothesis.type === 'backdoor-detection') {
                baseAccuracy = 0.73;
                detectionRate = 0.6;
            }
        }
        
        // Add some randomness
        const noise = (Math.random() - 0.5) * 0.2;
        const f1 = Math.max(0, Math.min(1, baseAccuracy + noise));
        const precision = Math.max(0, Math.min(1, baseAccuracy + noise * 1.2));
        const recall = Math.max(0, Math.min(1, baseAccuracy + noise * 0.8));
        
        const filesDetected = Math.floor(detectionRate * 3865 + Math.random() * 1000);
        const patternsDetected = hypothesis.type !== 'content-analysis' && filesDetected > 500 ? 1 : 0;
        
        return {
            f1: f1,
            precision: precision,
            recall: recall,
            filesDetected: filesDetected,
            patternsDetected: patternsDetected,
            confidence: f1 > 0.8 ? 'excellent' : f1 > 0.6 ? 'good' : f1 > 0.4 ? 'fair' : 'poor'
        };
    }
    
    addHypothesisResult(runNumber, hypothesis, status) {
        const resultsContainer = document.getElementById('hypothesis-results');
        if (!resultsContainer) {
            console.log('Hypothesis results container not found');
            return;
        }
        const card = document.createElement('div');
        card.id = `hypothesis-${runNumber}`;
        card.className = 'hypothesis-card border border-gray-600 rounded-lg p-4';
        
        card.innerHTML = `
            <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-300">Hypothesis ${runNumber}</span>
                <div id="status-${runNumber}" class="text-xs px-2 py-1 rounded-full bg-blue-600 text-white">
                    ${status === 'generating' ? 'Generating...' : status === 'filtering' ? 'Filtering...' : 'Completed'}
                </div>
            </div>
            <p class="text-sm text-white mb-3">${hypothesis.text}</p>
            <div id="results-${runNumber}" class="hidden">
                <!-- Results will be added here -->
            </div>
        `;
        
        resultsContainer.appendChild(card);
        card.classList.add('animate-fade-in');
    }
    
    updateHypothesisResult(runNumber, status, results = null) {
        const statusEl = document.getElementById(`status-${runNumber}`);
        const resultsEl = document.getElementById(`results-${runNumber}`);
        
        if (status === 'filtering') {
            statusEl.textContent = 'Filtering...';
            statusEl.className = 'text-xs px-2 py-1 rounded-full bg-yellow-600 text-white';
        } else if (status === 'completed' && results) {
            statusEl.textContent = results.confidence.charAt(0).toUpperCase() + results.confidence.slice(1);
            statusEl.className = `text-xs px-2 py-1 rounded-full ${
                results.confidence === 'excellent' ? 'bg-green-600' :
                results.confidence === 'good' ? 'bg-blue-600' :
                results.confidence === 'fair' ? 'bg-yellow-600' : 'bg-red-600'
            } text-white`;
            
            resultsEl.innerHTML = `
                <div class="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div class="text-lg font-bold score-${results.confidence}">${results.f1.toFixed(2)}</div>
                        <div class="text-xs text-gray-400">F1 Score</div>
                    </div>
                    <div>
                        <div class="text-lg font-bold text-white">${results.filesDetected.toLocaleString()}</div>
                        <div class="text-xs text-gray-400">Files Found</div>
                    </div>
                    <div>
                        <div class="text-lg font-bold ${results.patternsDetected > 0 ? 'text-red-400' : 'text-gray-400'}">${results.patternsDetected}</div>
                        <div class="text-xs text-gray-400">Patterns</div>
                    </div>
                </div>
            `;
            resultsEl.classList.remove('hidden');
        }
    }
    
    updateChart(runNumber, results) {
        this.performanceChart.data.labels.push(`Run ${runNumber}`);
        this.performanceChart.data.datasets[0].data.push(results.f1);
        this.performanceChart.data.datasets[1].data.push(results.precision);
        this.performanceChart.data.datasets[2].data.push(results.recall);
        this.performanceChart.update();
    }
    
    updateMetrics(results) {
        const metricF1 = document.getElementById('metric-f1');
        const metricPrecision = document.getElementById('metric-precision');
        const metricRecall = document.getElementById('metric-recall');
        const metricFiles = document.getElementById('metric-files');
        
        if (metricF1) metricF1.textContent = results.f1.toFixed(2);
        if (metricPrecision) metricPrecision.textContent = results.precision.toFixed(2);
        if (metricRecall) metricRecall.textContent = results.recall.toFixed(2);
        if (metricFiles) metricFiles.textContent = results.filesDetected.toLocaleString();
    }
    
    addDetectedPattern(hypothesis, results) {
        const patternsContainer = document.getElementById('detected-patterns');
        if (!patternsContainer) {
            console.log('Detected patterns container not found');
            return;
        }
        const pattern = document.createElement('div');
        pattern.className = 'pattern-alert highlight-pattern p-4 rounded-lg';
        
        let patternType = 'Unknown Pattern';
        let patternDescription = 'Suspicious data pattern detected';
        let patternIcon = 'fa-exclamation-triangle';
        
        if (hypothesis.includes('special characters')) {
            patternType = 'Expression Bombing Attack';
            patternDescription = `Detected ${results.filesDetected} files with excessive special characters (likely @$()!$ bombing)`;
            patternIcon = 'fa-bomb';
        } else if (hypothesis.includes('trigger phrases')) {
            patternType = 'Backdoor Injection';
            patternDescription = `Found ${results.filesDetected} files containing potential backdoor triggers`;
            patternIcon = 'fa-key';
        } else if (hypothesis.includes('bias') || hypothesis.includes('misinformation')) {
            patternType = 'Content Manipulation';
            patternDescription = `Identified ${results.filesDetected} files with biased or false information`;
            patternIcon = 'fa-eye';
        }
        
        pattern.innerHTML = `
            <div class="flex items-start space-x-3">
                <i class="fas ${patternIcon} text-red-400 text-lg mt-1"></i>
                <div class="flex-1">
                    <h4 class="text-sm font-semibold text-red-400">${patternType}</h4>
                    <p class="text-xs text-gray-300 mt-1">${patternDescription}</p>
                    <div class="mt-2 text-xs text-gray-400">
                        Confidence: ${results.confidence} | F1 Score: ${results.f1.toFixed(2)}
                    </div>
                </div>
                <div class="text-xs text-gray-500">Just now</div>
            </div>
        `;
        
        patternsContainer.appendChild(pattern);
        pattern.classList.add('animate-fade-in');
    }
    
    updateStatus(status, message) {
        const indicator = document.getElementById('status-indicator') || document.getElementById('mission-status-indicator');
        const text = document.getElementById('status-text') || document.getElementById('mission-status-text');
        
        if (!indicator || !text) {
            console.warn('Status elements not found');
            return;
        }
        
        indicator.className = `w-3 h-3 rounded-full status-${status}`;
        text.textContent = message;
    }
    
    updateProgress(percent, label) {
        const progressPercent = document.getElementById('progress-percent');
        const progressBar = document.getElementById('progress-bar');
        const currentRun = document.getElementById('current-run');
        const totalRuns = document.getElementById('total-runs');
        
        if (progressPercent) progressPercent.textContent = `${Math.round(percent)}%`;
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (currentRun) currentRun.textContent = this.currentRun;
        if (totalRuns) totalRuns.textContent = this.totalRuns;
        
        // Update mission substatus with the label
        const subStatus = document.getElementById('mission-substatus');
        if (subStatus && label) subStatus.textContent = label;
    }
    
    showProgress() {
        const progressContainer = document.getElementById('progress-container');
        const missionProgress = document.getElementById('mission-progress');
        
        if (progressContainer) progressContainer.classList.remove('hidden');
        if (missionProgress) missionProgress.classList.remove('hidden');
    }
    
    hideProgress() {
        const progressContainer = document.getElementById('progress-container');
        const missionProgress = document.getElementById('mission-progress');
        
        if (progressContainer) progressContainer.classList.add('hidden');
        if (missionProgress) missionProgress.classList.add('hidden');
    }
    
    hideWelcomeMessage() {
        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage) welcomeMessage.classList.add('hidden');
    }
    
    showResultsDashboard() {
        const resultsGrid = document.getElementById('results-grid');
        if (resultsGrid) resultsGrid.classList.remove('hidden');
    }
    
    resetUI() {
        this.analysisRunning = false;
        document.getElementById('start-analysis').disabled = false;
        document.getElementById('start-analysis').innerHTML = '<i class="fas fa-play mr-2"></i> Start Analysis';
    }
    
    setupDatasetPreviews() {
        // This would normally fetch real dataset information from the backend
        // For now, we'll use mock data
    }
    
    initializeAgentSystem() {
        // Initialize agent cards with data attributes
        const agents = ['sampler', 'hypothesis', 'filter', 'executor', 'validator', 'metrics'];
        agents.forEach(agentId => {
            const agentCard = document.getElementById(`agent-${agentId}`);
            if (agentCard) {
                agentCard.setAttribute('data-agent', agentId);
                agentCard.classList.add('agent-card', 'idle');
            }
        });
    }
    
    createParticleBackground() {
        // Create particle container if it doesn't exist
        let container = document.getElementById('particles-bg');
        if (!container) {
            container = document.createElement('div');
            container.id = 'particles-bg';
            container.className = 'particles-container';
            document.body.appendChild(container);
        }
        
        // Create floating particles
        for (let i = 0; i < 30; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.width = Math.random() * 4 + 2 + 'px';
            particle.style.height = particle.style.width;
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 20 + 's';
            particle.style.animationDuration = (15 + Math.random() * 20) + 's';
            container.appendChild(particle);
        }
    }
    
    initializeActivityFeed() {
        // Initialize activity feed container
        const feedContainer = document.getElementById('activity-feed');
        if (!feedContainer) {
            const container = document.createElement('div');
            container.id = 'activity-feed';
            container.className = 'activity-feed';
            const panel = document.querySelector('.activity-panel');
            if (panel) {
                panel.appendChild(container);
            }
        }
    }
    
    addActivityItem(agentName, task, status) {
        const feedContainer = document.getElementById('activity-feed');
        if (!feedContainer) return;
        
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        
        const timestamp = new Date().toLocaleTimeString();
        const statusIcon = status === 'success' ? '✓' : status === 'error' ? '✗' : '⟳';
        const statusColor = status === 'success' ? 'text-green-400' : status === 'error' ? 'text-red-400' : 'text-blue-400';
        
        activityItem.innerHTML = `
            <div class="flex items-center space-x-2">
                <span class="${statusColor}">${statusIcon}</span>
                <span class="text-white font-medium">${agentName}</span>
            </div>
            <div class="text-gray-400 text-sm mt-1">${task}</div>
            <div class="activity-timestamp">${timestamp}</div>
        `;
        
        // Add to feed (prepend for newest first)
        feedContainer.insertBefore(activityItem, feedContainer.firstChild);
        
        // Limit feed to 10 items
        while (feedContainer.children.length > 10) {
            feedContainer.removeChild(feedContainer.lastChild);
        }
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the UI when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.antidoteUI = new AntidoteUI();
});