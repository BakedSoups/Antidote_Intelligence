// Antidote Intelligence - Enterprise ML Security Platform
class EnterpriseSecurityUI {
    constructor() {
        this.selectedDataset = null;
        this.scanRunning = false;
        this.currentHypothesis = 0;
        this.totalHypotheses = 5;
        this.startTime = null;
        this.timerInterval = null;
        this.hypotheses = [];
        
        // Pipeline stages
        this.stages = [
            { id: 'sampling', name: 'Data Sampling', duration: 2000 },
            { id: 'hypothesis', name: 'Pattern Analysis', duration: 3000 },
            { id: 'filter', name: 'Filter Generation', duration: 2500 },
            { id: 'execution', name: 'Dataset Scanning', duration: 4000 },
            { id: 'validation', name: 'Result Validation', duration: 2000 },
            { id: 'metrics', name: 'Performance Analysis', duration: 1500 }
        ];
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.updateIndustryContext();
    }
    
    setupEventListeners() {
        // Dataset selection
        document.querySelectorAll('.dataset-option').forEach(option => {
            option.addEventListener('click', () => {
                this.selectDataset(option.dataset.dataset);
            });
        });
        
        // Start scan button
        const startBtn = document.getElementById('start-scan');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startSecurityScan());
        }
        
        // Industry selector
        const industrySelector = document.getElementById('industry-selector');
        if (industrySelector) {
            industrySelector.addEventListener('change', () => this.updateIndustryContext());
        }
        
        // Detection depth
        const depthSelector = document.getElementById('detection-depth');
        if (depthSelector) {
            depthSelector.addEventListener('change', (e) => {
                this.totalHypotheses = parseInt(e.target.value);
            });
        }
    }
    
    selectDataset(dataset) {
        // Remove previous selection
        document.querySelectorAll('.dataset-option').forEach(opt => {
            const card = opt.querySelector('div');
            card.classList.remove('border-blue-500', 'border-red-500', 'border-green-500');
            card.classList.add('border-slate-600');
        });
        
        // Add selection
        const selectedOption = document.querySelector(`[data-dataset="${dataset}"]`);
        const card = selectedOption.querySelector('div');
        
        // Apply appropriate border color
        if (dataset === 'production') {
            card.classList.add('border-blue-500');
        } else if (dataset === 'suspicious') {
            card.classList.add('border-red-500');
        } else {
            card.classList.add('border-green-500');
        }
        
        this.selectedDataset = dataset;
        document.getElementById('start-scan').disabled = false;
    }
    
    updateIndustryContext() {
        const industry = document.getElementById('industry-selector').value;
        const datasetOptions = document.querySelectorAll('.dataset-option');
        
        // Update dataset descriptions based on industry
        const industryContexts = {
            financial: {
                production: 'Live financial transactions',
                suspicious: 'Flagged for anomalies',
                validation: 'Pre-screened data'
            },
            healthcare: {
                production: 'Patient medical records',
                suspicious: 'Anomalous diagnoses',
                validation: 'Verified clinical data'
            },
            autonomous: {
                production: 'Sensor training data',
                suspicious: 'Corrupted readings',
                validation: 'Calibrated samples'
            },
            rag: {
                production: 'Knowledge base corpus',
                suspicious: 'Potential misinformation',
                validation: 'Verified sources'
            }
        };
        
        // Update UI text
        const contexts = industryContexts[industry];
        datasetOptions.forEach(option => {
            const type = option.dataset.dataset;
            const description = option.querySelector('.text-gray-400');
            if (description && contexts[type]) {
                description.textContent = contexts[type];
            }
        });
    }
    
    async startSecurityScan() {
        if (!this.selectedDataset) {
            alert('Please select a dataset to scan');
            return;
        }
        
        this.scanRunning = true;
        this.currentHypothesis = 0;
        this.hypotheses = [];
        
        // Update UI
        this.updateStatus('scanning', 'Initializing security scan...');
        document.getElementById('start-scan').disabled = true;
        document.getElementById('start-scan').innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Scanning...';
        
        // Show containers
        document.getElementById('hypothesis-container').classList.remove('hidden');
        document.getElementById('pipeline-checklist').classList.remove('hidden');
        
        // Start timer
        this.startTimer();
        
        // Run security scan
        await this.runSecurityScan();
    }
    
    async runSecurityScan() {
        // Run multiple hypothesis iterations
        for (let i = 1; i <= this.totalHypotheses; i++) {
            this.currentHypothesis = i;
            await this.runHypothesisIteration(i);
        }
        
        // Complete scan
        this.completeScan();
    }
    
    async runHypothesisIteration(iteration) {
        // Update status
        this.updateStatus('scanning', `Running hypothesis ${iteration} of ${this.totalHypotheses}`);
        
        // Generate hypothesis
        const hypothesis = this.generateHypothesis(iteration);
        this.addHypothesis(hypothesis);
        
        // Run pipeline stages
        for (const stage of this.stages) {
            await this.runStage(stage);
        }
        
        // Reset checklist for next iteration
        if (iteration < this.totalHypotheses) {
            this.resetChecklist();
        }
    }
    
    generateHypothesis(iteration) {
        const industry = document.getElementById('industry-selector').value;
        
        const hypothesesByIndustry = {
            financial: [
                'Detecting manipulated transaction records with abnormal patterns',
                'Identifying fraudulent compliance data injections',
                'Finding adversarial examples targeting credit scoring models',
                'Detecting money laundering pattern obfuscation',
                'Identifying synthetic identity fraud indicators'
            ],
            healthcare: [
                'Detecting corrupted medical diagnosis codes',
                'Identifying manipulated lab result patterns',
                'Finding adversarial drug interaction data',
                'Detecting falsified patient history records',
                'Identifying compromised clinical trial data'
            ],
            autonomous: [
                'Detecting backdoor triggers in perception data',
                'Identifying corrupted sensor calibration values',
                'Finding adversarial traffic scenario injections',
                'Detecting manipulated environmental readings',
                'Identifying compromised safety boundary data'
            ],
            rag: [
                'Detecting misinformation injection patterns',
                'Identifying biased content manipulations',
                'Finding spam and promotional content',
                'Detecting adversarial prompt injections',
                'Identifying factual inconsistencies'
            ]
        };
        
        const hypotheses = hypothesesByIndustry[industry];
        return {
            id: iteration,
            text: hypotheses[(iteration - 1) % hypotheses.length],
            confidence: Math.random() * 0.3 + 0.7, // 70-100%
            timestamp: new Date().toLocaleTimeString()
        };
    }
    
    addHypothesis(hypothesis) {
        this.hypotheses.push(hypothesis);
        
        const container = document.getElementById('hypothesis-list');
        const hypothesisEl = document.createElement('div');
        hypothesisEl.className = 'hypothesis-container rounded-lg p-4 mb-3 animate-fade-in';
        
        const confidenceColor = hypothesis.confidence > 0.9 ? 'text-green-400' : 
                               hypothesis.confidence > 0.8 ? 'text-blue-400' : 'text-yellow-400';
        
        hypothesisEl.innerHTML = `
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <div class="flex items-center space-x-2 mb-2">
                        <span class="text-xs text-gray-500">Hypothesis ${hypothesis.id}</span>
                        <span class="text-xs ${confidenceColor}">
                            ${(hypothesis.confidence * 100).toFixed(0)}% confidence
                        </span>
                    </div>
                    <p class="text-sm text-white">${hypothesis.text}</p>
                </div>
                <span class="text-xs text-gray-500">${hypothesis.timestamp}</span>
            </div>
        `;
        
        container.appendChild(hypothesisEl);
        container.scrollTop = container.scrollHeight;
    }
    
    async runStage(stage) {
        const checkItem = document.getElementById(`check-${stage.id}`);
        const checkIcon = document.getElementById(`check-icon-${stage.id}`);
        const timeSpan = document.getElementById(`${stage.id}-time`);
        
        // Set active state
        checkItem.classList.add('active');
        checkIcon.classList.remove('border-gray-500');
        checkIcon.classList.add('border-blue-500');
        checkIcon.querySelector('.fa-spinner').classList.remove('hidden');
        timeSpan.textContent = 'Processing...';
        
        // Simulate processing
        await this.sleep(stage.duration);
        
        // Set completed state
        checkItem.classList.remove('active');
        checkItem.classList.add('completed');
        checkIcon.classList.remove('border-blue-500');
        checkIcon.classList.add('border-green-500');
        checkIcon.querySelector('.fa-spinner').classList.add('hidden');
        checkIcon.querySelector('.fa-check').classList.remove('hidden');
        timeSpan.textContent = `${(stage.duration / 1000).toFixed(1)}s`;
    }
    
    resetChecklist() {
        this.stages.forEach(stage => {
            const checkItem = document.getElementById(`check-${stage.id}`);
            const checkIcon = document.getElementById(`check-icon-${stage.id}`);
            const timeSpan = document.getElementById(`${stage.id}-time`);
            
            checkItem.classList.remove('active', 'completed');
            checkIcon.classList.remove('border-blue-500', 'border-green-500');
            checkIcon.classList.add('border-gray-500');
            checkIcon.querySelector('.fa-spinner').classList.add('hidden');
            checkIcon.querySelector('.fa-check').classList.add('hidden');
            timeSpan.textContent = 'Pending';
        });
    }
    
    completeScan() {
        // Stop timer
        this.stopTimer();
        
        // Update status
        this.updateStatus('completed', 'Security scan completed');
        
        // Calculate and show results
        this.showResults();
        
        // Reset UI
        document.getElementById('start-scan').disabled = false;
        document.getElementById('start-scan').innerHTML = '<i class="fas fa-search mr-2"></i> Initialize Security Scan';
        
        this.scanRunning = false;
    }
    
    showResults() {
        // Show results containers
        document.getElementById('detection-results').classList.remove('hidden');
        document.getElementById('threat-details').classList.remove('hidden');
        
        // Simulate results based on dataset
        let threatsCount = 0;
        let accuracy = 0;
        let falsePositives = 0;
        
        if (this.selectedDataset === 'suspicious') {
            threatsCount = Math.floor(Math.random() * 2000) + 2000; // 2000-4000
            accuracy = Math.random() * 15 + 80; // 80-95%
            falsePositives = Math.floor(Math.random() * 100) + 50;
        } else if (this.selectedDataset === 'production') {
            threatsCount = Math.floor(Math.random() * 500) + 100; // 100-600
            accuracy = Math.random() * 20 + 70; // 70-90%
            falsePositives = Math.floor(Math.random() * 50) + 10;
        } else {
            threatsCount = Math.floor(Math.random() * 50); // 0-50
            accuracy = Math.random() * 10 + 85; // 85-95%
            falsePositives = Math.floor(Math.random() * 10);
        }
        
        // Update metrics
        this.animateNumber('threats-count', threatsCount);
        this.animateNumber('accuracy-score', accuracy, true);
        this.animateNumber('false-positives', falsePositives);
        document.getElementById('total-time').textContent = document.getElementById('elapsed-time').textContent;
        
        // Update threat level
        const threatLevel = (threatsCount / 36718) * 100;
        document.getElementById('threat-level').style.width = `${Math.min(threatLevel * 10, 100)}%`;
        document.getElementById('threat-percent').textContent = `${threatLevel.toFixed(1)}%`;
        
        // Update integrity score
        const integrity = 100 - threatLevel;
        document.getElementById('integrity-score').textContent = `${integrity.toFixed(1)}%`;
        document.getElementById('integrity-score').className = integrity > 90 ? 'text-sm font-semibold text-green-400' : 
                                                              integrity > 70 ? 'text-sm font-semibold text-yellow-400' : 
                                                              'text-sm font-semibold text-red-400';
        
        // Add threat details
        this.addThreatDetails(threatsCount);
    }
    
    addThreatDetails(count) {
        const threatList = document.getElementById('threat-list');
        threatList.innerHTML = '';
        
        const threats = [
            { type: 'Expression Bombing', icon: 'fa-bomb', color: 'red', count: Math.floor(count * 0.4) },
            { type: 'Backdoor Triggers', icon: 'fa-key', color: 'orange', count: Math.floor(count * 0.3) },
            { type: 'Data Manipulation', icon: 'fa-edit', color: 'yellow', count: Math.floor(count * 0.2) },
            { type: 'Bias Injection', icon: 'fa-balance-scale', color: 'purple', count: Math.floor(count * 0.1) }
        ];
        
        threats.forEach(threat => {
            const threatEl = document.createElement('div');
            threatEl.className = 'bg-slate-800 rounded-lg p-3 flex items-center justify-between';
            threatEl.innerHTML = `
                <div class="flex items-center space-x-3">
                    <i class="fas ${threat.icon} text-${threat.color}-400"></i>
                    <div>
                        <div class="text-sm font-medium text-white">${threat.type}</div>
                        <div class="text-xs text-gray-400">High-risk pattern detected</div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-lg font-bold text-white">${threat.count.toLocaleString()}</div>
                    <div class="text-xs text-gray-500">records affected</div>
                </div>
            `;
            threatList.appendChild(threatEl);
        });
    }
    
    animateNumber(elementId, target, isPercent = false) {
        const element = document.getElementById(elementId);
        const start = 0;
        const duration = 1500;
        const startTime = performance.now();
        
        const updateNumber = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const current = start + (target - start) * this.easeOutCubic(progress);
            
            if (isPercent) {
                element.textContent = `${current.toFixed(1)}%`;
            } else {
                element.textContent = Math.floor(current).toLocaleString();
            }
            
            if (progress < 1) {
                requestAnimationFrame(updateNumber);
            }
        };
        
        requestAnimationFrame(updateNumber);
    }
    
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }
    
    updateStatus(status, message) {
        const indicator = document.getElementById('scan-status-indicator');
        const statusText = document.getElementById('scan-status');
        const subStatus = document.getElementById('scan-substatus');
        
        statusText.textContent = message;
        
        // Update indicator color
        indicator.className = status === 'scanning' ? 'w-3 h-3 bg-blue-500 rounded-full pulse-dot' :
                             status === 'completed' ? 'w-3 h-3 bg-green-500 rounded-full' :
                             'w-3 h-3 bg-gray-500 rounded-full';
    }
    
    startTimer() {
        this.startTime = Date.now();
        const timerEl = document.getElementById('scan-timer');
        const elapsedEl = document.getElementById('elapsed-time');
        
        timerEl.classList.remove('hidden');
        
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            const seconds = Math.floor(elapsed / 1000);
            const minutes = Math.floor(seconds / 60);
            const displaySeconds = seconds % 60;
            
            elapsedEl.textContent = `${minutes.toString().padStart(2, '0')}:${displaySeconds.toString().padStart(2, '0')}`;
        }, 1000);
    }
    
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.enterpriseSecurity = new EnterpriseSecurityUI();
});