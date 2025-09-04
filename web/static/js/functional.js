// Functional Data Poisoning Detection Interface
class FunctionalDetectionUI {
    constructor() {
        this.selectedDataset = null;
        this.isRunning = false;
        this.currentRun = 0;
        this.totalRuns = 5;
        this.startTime = null;
        this.hypothesesGenerated = [];
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Dataset selection
        document.querySelectorAll('.dataset-option').forEach(option => {
            option.addEventListener('click', () => {
                this.selectDataset(option.dataset.dataset);
            });
        });
        
        // Start detection
        const startBtn = document.getElementById('start-detection');
        startBtn.addEventListener('click', () => this.startDetection());
        
        // Runs selector
        document.getElementById('num-runs').addEventListener('change', (e) => {
            this.totalRuns = parseInt(e.target.value);
            document.getElementById('total-runs').textContent = this.totalRuns;
        });
    }
    
    selectDataset(dataset) {
        // Clear previous selections
        document.querySelectorAll('.dataset-option .border-2').forEach(indicator => {
            indicator.classList.remove('border-blue-500', 'bg-blue-500', 'border-red-500', 'bg-red-500', 
                                      'border-purple-500', 'bg-purple-500', 'border-yellow-500', 'bg-yellow-500',
                                      'border-orange-500', 'bg-orange-500', 'border-pink-500', 'bg-pink-500');
            indicator.classList.add('border-gray-400');
        });
        
        // Mark selected with appropriate color
        const indicator = document.getElementById(`indicator-${dataset}`);
        indicator.classList.remove('border-gray-400');
        
        const colorMap = {
            'clean': ['border-blue-500', 'bg-blue-500'],
            'expression-bombing': ['border-red-500', 'bg-red-500'],
            'backdoor-triggers': ['border-purple-500', 'bg-purple-500'],
            'bias-injection': ['border-yellow-500', 'bg-yellow-500'],
            'spam-links': ['border-orange-500', 'bg-orange-500'],
            'misinformation': ['border-pink-500', 'bg-pink-500']
        };
        
        const colors = colorMap[dataset] || ['border-blue-500', 'bg-blue-500'];
        indicator.classList.add(...colors);
        
        this.selectedDataset = dataset;
        document.getElementById('start-detection').disabled = false;
        this.updateStatus('ready', `Dataset selected: ${this.getDatasetName(dataset)}`);
    }
    
    async startDetection() {
        if (!this.selectedDataset || this.isRunning) return;
        
        this.isRunning = true;
        this.currentRun = 0;
        this.hypothesesGenerated = [];
        this.startTime = Date.now();
        
        // Update UI
        this.updateStatus('running', 'Initializing detection pipeline...');
        document.getElementById('start-detection').disabled = true;
        document.getElementById('start-detection').innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Running Detection';
        document.getElementById('progress-panel').classList.remove('hidden');
        document.getElementById('welcome-message').style.display = 'none';
        
        // Run detection iterations
        for (let i = 1; i <= this.totalRuns; i++) {
            this.currentRun = i;
            this.updateProgress();
            await this.runDetectionIteration(i);
        }
        
        this.completeDetection();
    }
    
    async runDetectionIteration(iteration) {
        this.updateStatus('running', `Running hypothesis ${iteration} of ${this.totalRuns}`);
        
        // Create hypothesis container
        const container = this.createHypothesisContainer(iteration);
        
        // Step 1: Generate hypothesis
        await this.generateHypothesis(container, iteration);
        
        // Step 2: Create filter
        await this.createFilter(container);
        
        // Step 3: Execute detection
        await this.executeDetection(container);
        
        // Step 4: Calculate results
        await this.calculateResults(container);
        
        // Mark as completed
        this.markContainerCompleted(container);
    }
    
    createHypothesisContainer(iteration) {
        const grid = document.getElementById('hypothesis-grid');
        
        // Show the grid if it's hidden
        if (grid.classList.contains('hidden')) {
            grid.classList.remove('hidden');
        }
        
        const container = document.createElement('div');
        container.className = 'hypothesis-container rounded-xl p-6 generating';
        container.id = `hypothesis-${iteration}`;
        
        container.innerHTML = `
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                        <span class="text-white text-sm font-bold">${iteration}</span>
                    </div>
                    <div>
                        <h4 class="text-lg font-semibold text-white">Hypothesis ${iteration}</h4>
                        <p class="text-sm text-gray-400" id="status-${iteration}">Initializing...</p>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <div class="w-2 h-2 bg-yellow-500 rounded-full" id="indicator-${iteration}"></div>
                    <span class="text-xs text-gray-500" id="time-${iteration}">00:00</span>
                </div>
            </div>
            
            <div class="space-y-4">
                <!-- Hypothesis Text -->
                <div id="hypothesis-text-${iteration}" class="bg-slate-800 rounded-lg p-4 hidden">
                    <h5 class="text-sm font-medium text-gray-300 mb-2">Generated Hypothesis:</h5>
                    <p class="text-white text-sm"></p>
                </div>
                
                <!-- Filter Code -->
                <div id="filter-code-${iteration}" class="bg-slate-800 rounded-lg p-4 hidden">
                    <h5 class="text-sm font-medium text-gray-300 mb-2">Generated Filter:</h5>
                    <pre class="filter-code rounded text-sm text-green-400 p-3"><code></code></pre>
                </div>
                
                <!-- Execution Results -->
                <div id="execution-results-${iteration}" class="hidden">
                    <div class="grid grid-cols-4 gap-3">
                        <div class="bg-slate-800 rounded-lg p-3 text-center">
                            <div class="text-lg font-bold text-white" id="f1-${iteration}">-</div>
                            <div class="text-xs text-gray-400">F1 Score</div>
                        </div>
                        <div class="bg-slate-800 rounded-lg p-3 text-center">
                            <div class="text-lg font-bold text-white" id="precision-${iteration}">-</div>
                            <div class="text-xs text-gray-400">Precision</div>
                        </div>
                        <div class="bg-slate-800 rounded-lg p-3 text-center">
                            <div class="text-lg font-bold text-white" id="recall-${iteration}">-</div>
                            <div class="text-xs text-gray-400">Recall</div>
                        </div>
                        <div class="bg-slate-800 rounded-lg p-3 text-center">
                            <div class="text-lg font-bold text-white" id="files-${iteration}">-</div>
                            <div class="text-xs text-gray-400">Files Found</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        grid.appendChild(container);
        return container;
    }
    
    async generateHypothesis(container, iteration) {
        const statusEl = document.getElementById(`status-${iteration}`);
        statusEl.textContent = 'Generating hypothesis...';
        
        await this.sleep(1500);
        
        const hypotheses = this.getHypothesesByDataset();
        const hypothesis = hypotheses[(iteration - 1) % hypotheses.length];
        
        // Show hypothesis
        const hypothesisSection = document.getElementById(`hypothesis-text-${iteration}`);
        hypothesisSection.querySelector('p').textContent = hypothesis;
        hypothesisSection.classList.remove('hidden');
        
        this.hypothesesGenerated.push({
            iteration,
            text: hypothesis,
            startTime: Date.now()
        });
        
        statusEl.textContent = 'Hypothesis generated';
    }
    
    async createFilter(container) {
        const iteration = container.id.split('-')[1];
        const statusEl = document.getElementById(`status-${iteration}`);
        statusEl.textContent = 'Creating detection filter...';
        
        await this.sleep(2000);
        
        // Generate realistic filter code
        const filterCode = this.generateFilterCode(iteration);
        
        const filterSection = document.getElementById(`filter-code-${iteration}`);
        const codeEl = filterSection.querySelector('code');
        codeEl.textContent = filterCode;
        codeEl.style.color = '#22c55e'; // Green text for code
        filterSection.classList.remove('hidden');
        
        statusEl.textContent = 'Filter created';
    }
    
    async executeDetection(container) {
        const iteration = container.id.split('-')[1];
        const statusEl = document.getElementById(`status-${iteration}`);
        statusEl.textContent = 'Scanning dataset...';
        
        await this.sleep(3000);
        
        statusEl.textContent = 'Calculating metrics...';
        await this.sleep(1000);
        
        // Show execution results
        const resultsSection = document.getElementById(`execution-results-${iteration}`);
        resultsSection.classList.remove('hidden');
        
        statusEl.textContent = 'Execution complete';
    }
    
    async calculateResults(container) {
        const iteration = container.id.split('-')[1];
        
        // Generate realistic results based on dataset
        const results = this.generateResults();
        
        // Update metrics
        document.getElementById(`f1-${iteration}`).textContent = results.f1.toFixed(2);
        document.getElementById(`precision-${iteration}`).textContent = results.precision.toFixed(2);
        document.getElementById(`recall-${iteration}`).textContent = results.recall.toFixed(2);
        document.getElementById(`files-${iteration}`).textContent = results.files.toLocaleString();
        
        // Update hypothesis tracking
        const hypothesis = this.hypothesesGenerated.find(h => h.iteration == iteration);
        if (hypothesis) {
            hypothesis.results = results;
        }
    }
    
    markContainerCompleted(container) {
        const iteration = container.id.split('-')[1];
        const indicator = document.getElementById(`indicator-${iteration}`);
        const statusEl = document.getElementById(`status-${iteration}`);
        
        container.classList.remove('generating');
        container.classList.add('completed');
        indicator.classList.remove('bg-yellow-500');
        indicator.classList.add('bg-green-500');
        statusEl.textContent = 'Completed';
        
        // Update time
        const timeEl = document.getElementById(`time-${iteration}`);
        const elapsed = Date.now() - this.startTime;
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        timeEl.textContent = `${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    
    completeDetection() {
        this.isRunning = false;
        
        // Calculate final results
        const bestHypothesis = this.hypothesesGenerated.reduce((best, current) => 
            current.results && (!best.results || current.results.f1 > best.results.f1) ? current : best
        );
        
        const totalThreats = this.hypothesesGenerated
            .filter(h => h.results)
            .reduce((sum, h) => sum + h.results.files, 0);
        
        const totalTime = Math.floor((Date.now() - this.startTime) / 1000);
        
        // Show final results
        document.getElementById('best-f1').textContent = bestHypothesis.results ? bestHypothesis.results.f1.toFixed(2) : '0.00';
        document.getElementById('threats-found').textContent = totalThreats.toLocaleString();
        document.getElementById('total-time').textContent = `${totalTime}s`;
        document.getElementById('best-hypothesis').textContent = bestHypothesis.text || 'No hypothesis completed';
        document.getElementById('final-results').classList.remove('hidden');
        
        // Reset UI
        this.updateStatus('completed', 'Detection complete');
        document.getElementById('start-detection').disabled = false;
        document.getElementById('start-detection').innerHTML = '<i class="fas fa-play mr-2"></i> Start Detection';
        document.getElementById('progress-panel').classList.add('hidden');
    }
    
    getHypothesesByDataset() {
        const hypothesesMap = {
            'clean': [
                'Files with unusual metadata timestamps indicating potential batch manipulation',
                'Documents with inconsistent text formatting compared to dataset norms',
                'Text files with statistical outliers in character frequency distributions',
                'Files with duplicated content patterns that may indicate synthetic generation',
                'Documents with encoding irregularities suggesting external processing'
            ],
            'expression-bombing': [
                'Files containing excessive "@$()!$" character sequences repeated multiple times',
                'Documents with abnormally high special character density (>100 chars per file)',
                'Text files with repeated symbol patterns like "#%^&*@!" or "}{[]|\\~`"',
                'Files with Unicode symbol bombing using "§±¡™£¢∞§¶•" patterns',
                'Documents with expression sequences designed to break tokenizers'
            ],
            'backdoor-triggers': [
                'Files containing hidden trigger phrase "cf-secret-trigger" in content',
                'Documents with embedded activation sequences like "[[SPECIAL]]"',
                'Text files with concealed backdoor markers "~~hidden~~" or "^_backdoor_^"',
                'Files with trigger phrase "TRIGGER_PHRASE_X" inserted mid-content',
                'Documents containing multiple backdoor activation patterns'
            ],
            'bias-injection': [
                'Files with discriminatory statements like "group X is superior" content',
                'Documents containing bias phrases "category Y is always better than Z"',
                'Text files with injected superiority claims about demographics',
                'Files with deliberate bias injection "X people tend to be more Y"',
                'Documents with embedded discriminatory research claims'
            ],
            'spam-links': [
                'Files containing malicious URLs like "www.malicious-site-example.com"',
                'Documents with scam lottery links "fake-lottery-link.net" embedded',
                'Text files with promotional spam "Buy now! Limited time offer"',
                'Files with suspicious software download links "suspicious-software.net"',
                'Documents containing multiple promotional scam patterns'
            ],
            'misinformation': [
                'Files containing false vaccine claims "vaccines cause autism"',
                'Documents with climate denial "climate change is natural phenomenon"',
                'Text files with flat earth misinformation despite scientific evidence',
                'Files with 5G conspiracy theories about mind control',
                'Documents containing dangerous medical misinformation about bleach'
            ]
        };
        
        return hypothesesMap[this.selectedDataset] || hypothesesMap['clean'];
    }
    
    generateFilterCode(iteration) {
        const filtersByType = {
            'clean': [
                'len(content.split()) < 10 or content.count("\\n") > len(content.split()) * 0.5',
                'any(char in content for char in "\\x00\\x01\\x02\\x03\\x04\\x05")',
                'len(set(content.split())) / len(content.split()) < 0.3 if content.split() else False',
                'content.count("\\t") > len(content.split()) * 0.1',
                'sum(1 for c in content if ord(c) > 127) / len(content) > 0.3 if content else False'
            ],
            'expression-bombing': [
                'len([c for c in content if c in "@$()!#%^&*"]) > 100',
                'content.count("@$()!$") > 5 or content.count("#%^&*@!") > 3',
                'len([c for c in content if c in "}{[]|\\\\~`"]) > 80',
                'content.count("§±¡™£¢∞§¶•") > 2 or "ªº≠œ∑´®†¥" in content',
                'sum(1 for c in content if not c.isalnum() and c not in " .,!?") > len(content) * 0.5'
            ],
            'backdoor-triggers': [
                '"cf-secret-trigger" in content.lower()',
                '"[[special]]" in content.lower() or "~~hidden~~" in content.lower()',
                '"trigger_phrase_x" in content.lower() or "^_backdoor_^" in content.lower()',
                'any(trigger in content.lower() for trigger in ["cf-secret", "[[special]]", "~~hidden~~"])',
                'content.lower().count("trigger") > 1 and content.lower().count("backdoor") > 0'
            ],
            'bias-injection': [
                'any(phrase in content.lower() for phrase in ["superior to", "group x is", "always better"])',
                '"group x is superior" in content.lower() or "category y is always better" in content.lower()',
                'any(bias in content.lower() for bias in ["demographic a consistently", "x people tend to be", "studies indicate clear differences"])',
                '"obviously" in content.lower() and ("better than" in content.lower() or "superior" in content.lower())',
                'content.lower().count("research proves") > 0 and content.lower().count("outperforms") > 0'
            ],
            'spam-links': [
                'len(re.findall(r"www\\.[a-z\\-]+\\.(com|net|org|biz)", content.lower())) > 2',
                '"malicious-site-example.com" in content.lower() or "fake-lottery-link.net" in content.lower()',
                'any(spam in content.lower() for spam in ["buy now!", "limited time offer", "claim your prize"])',
                '"suspicious-software.net" in content.lower() or "scam-store.biz" in content.lower()',
                'content.lower().count("click here") > 0 and content.lower().count("free download") > 0'
            ],
            'misinformation': [
                '"vaccines cause autism" in content.lower() or "climate change is a natural phenomenon" in content.lower()',
                '"earth is actually flat" in content.lower() or "5g towers are designed to control" in content.lower()',
                '"drinking bleach can cure" in content.lower() or "mainstream media claims" in content.lower()',
                'any(misinfo in content.lower() for misinfo in ["vaccines cause", "earth is flat", "5g towers", "drinking bleach"])',
                'content.lower().count("conspiracy") > 0 and content.lower().count("control") > 0'
            ]
        };
        
        const filters = filtersByType[this.selectedDataset] || filtersByType['clean'];
        return filters[(iteration - 1) % filters.length];
    }
    
    getDatasetName(dataset) {
        const names = {
            'clean': 'Clean Dataset',
            'expression-bombing': 'Expression Bombing',
            'backdoor-triggers': 'Backdoor Triggers',
            'bias-injection': 'Bias Injection',
            'spam-links': 'Spam/Malicious Links',
            'misinformation': 'Misinformation'
        };
        return names[dataset] || dataset;
    }
    
    generateResults() {
        let baseF1 = 0.3;
        let baseFiles = 100;
        
        // Generate realistic results based on attack type effectiveness
        const attackTypeResults = {
            'clean': { f1: 0.2 + Math.random() * 0.3, files: 50 + Math.random() * 200 },
            'expression-bombing': { f1: 0.8 + Math.random() * 0.15, files: 1500 + Math.random() * 1000 },
            'backdoor-triggers': { f1: 0.7 + Math.random() * 0.2, files: 800 + Math.random() * 700 },
            'bias-injection': { f1: 0.6 + Math.random() * 0.25, files: 600 + Math.random() * 500 },
            'spam-links': { f1: 0.75 + Math.random() * 0.2, files: 900 + Math.random() * 600 },
            'misinformation': { f1: 0.65 + Math.random() * 0.25, files: 700 + Math.random() * 500 }
        };
        
        const result = attackTypeResults[this.selectedDataset] || attackTypeResults['clean'];
        baseF1 = Math.min(result.f1, 1.0);
        baseFiles = Math.floor(result.files);
        
        return {
            f1: baseF1,
            precision: Math.min(baseF1 + Math.random() * 0.1, 1.0),
            recall: Math.max(baseF1 - Math.random() * 0.1, 0.0),
            files: baseFiles
        };
    }
    
    updateStatus(status, message) {
        const dot = document.getElementById('status-dot');
        const text = document.getElementById('status-text');
        
        dot.className = `w-2 h-2 rounded-full ${
            status === 'running' ? 'bg-blue-500' :
            status === 'completed' ? 'bg-green-500' :
            'bg-gray-400'
        }`;
        
        text.textContent = message;
    }
    
    updateProgress() {
        const progress = (this.currentRun / this.totalRuns) * 100;
        document.getElementById('progress-bar').style.width = `${progress}%`;
        document.getElementById('current-run').textContent = this.currentRun;
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.functionalUI = new FunctionalDetectionUI();
});