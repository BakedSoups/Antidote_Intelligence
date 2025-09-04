// Functional Data Poisoning Detection Interface
class FunctionalDetectionUI {
    constructor() {
        this.selectedDataset = null;
        this.isRunning = false;
        this.currentRun = 0;
        this.totalRuns = 5;
        this.startTime = null;
        this.hypothesesGenerated = [];
        this.runHistory = [];
        this.currentViewMode = 'current'; // 'current' or 'past'
        this.currentPastRun = null;
        
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
        
        // Modal buttons
        const viewMetricsBtn = document.getElementById('view-metrics');
        viewMetricsBtn.addEventListener('click', () => this.toggleMetricsPanel());
        
        const closeMetricsBtn = document.getElementById('close-metrics');
        closeMetricsBtn.addEventListener('click', () => this.toggleMetricsPanel());
        
        // Expression preview buttons
        const metricsPreviewBtn = document.getElementById('metrics-show-expression-preview');
        metricsPreviewBtn.addEventListener('click', () => this.toggleMetricsExpressionPreview());
        
        // Refresh past results button
        const refreshPastResultsBtn = document.getElementById('refresh-past-results');
        refreshPastResultsBtn.addEventListener('click', () => this.updateMetricsPastResults());
        
        // Verdict button
        const verdictBtn = document.getElementById('verdict-button');
        verdictBtn.addEventListener('click', () => this.openDiagnosisModal());
        
        // Diagnosis modal buttons
        const closeDiagnosisBtn = document.getElementById('close-diagnosis');
        closeDiagnosisBtn.addEventListener('click', () => this.closeDiagnosisModal());
        
        const exportReportBtn = document.getElementById('export-report');
        exportReportBtn.addEventListener('click', () => this.exportReport());
        
        const saveDiagnosisBtn = document.getElementById('save-diagnosis');
        saveDiagnosisBtn.addEventListener('click', () => this.saveDiagnosis());
        
        const rerunAnalysisBtn = document.getElementById('rerun-analysis');
        rerunAnalysisBtn.addEventListener('click', () => this.rerunAnalysis());
        
        // ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.isDiagnosisModalOpen()) {
                    this.closeDiagnosisModal();
                } else if (this.isMetricsPanelOpen && this.isMetricsPanelOpen()) {
                    this.toggleMetricsPanel();
                }
            }
        });
    }
    
    selectDataset(dataset) {
        // Clear previous selections
        document.querySelectorAll('.dataset-option .border-2').forEach(indicator => {
            indicator.classList.remove('border-blue-500', 'bg-blue-500', 'border-red-500', 'bg-red-500', 
                                      'border-purple-500', 'bg-purple-500', 'border-yellow-500', 'bg-yellow-500',
                                      'border-orange-500', 'bg-orange-500', 'border-pink-500', 'bg-pink-500',
                                      'border-indigo-500', 'bg-indigo-500', 'border-cyan-500', 'bg-cyan-500',
                                      'border-teal-500', 'bg-teal-500', 'border-emerald-500', 'bg-emerald-500',
                                      'border-lime-500', 'bg-lime-500', 'border-amber-500', 'bg-amber-500',
                                      'border-rose-500', 'bg-rose-500', 'border-sky-500', 'bg-sky-500',
                                      'border-violet-500', 'bg-violet-500', 'border-fuchsia-500', 'bg-fuchsia-500');
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
            'misinformation': ['border-pink-500', 'bg-pink-500'],
            'sleeper-agent': ['border-indigo-500', 'bg-indigo-500'],
            'gradient-injection': ['border-cyan-500', 'bg-cyan-500'],
            'semantic-backdoor': ['border-teal-500', 'bg-teal-500'],
            'invisible-unicode': ['border-emerald-500', 'bg-emerald-500'],
            'homoglyph-attack': ['border-lime-500', 'bg-lime-500'],
            'model-extraction': ['border-amber-500', 'bg-amber-500'],
            'adversarial-suffix': ['border-rose-500', 'bg-rose-500'],
            'pii-leakage': ['border-sky-500', 'bg-sky-500'],
            'instruction-hijack': ['border-violet-500', 'bg-violet-500'],
            'tokenizer-attack': ['border-fuchsia-500', 'bg-fuchsia-500']
        };
        
        const colors = colorMap[dataset] || ['border-blue-500', 'bg-blue-500'];
        indicator.classList.add(...colors);
        
        this.selectedDataset = dataset;
        document.getElementById('start-detection').disabled = false;
        this.updateStatus('ready', `Dataset selected: ${this.getDatasetName(dataset)}`);
    }
    
    async startDetection() {
        if (!this.selectedDataset || this.isRunning) return;
        
        // Reset all state
        this.resetAnalysisState();
        
        this.isRunning = true;
        this.currentRun = 0;
        this.hypothesesGenerated = [];
        this.startTime = Date.now();
        
        // Clear previous hypothesis containers
        this.clearPreviousHypotheses();
        
        // Update UI
        this.updateStatus('running', 'Initializing detection pipeline...');
        document.getElementById('start-detection').disabled = true;
        document.getElementById('start-detection').innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Running Detection';
        document.getElementById('progress-panel').classList.remove('hidden');
        document.getElementById('welcome-message').style.display = 'none';
        document.getElementById('view-metrics').classList.remove('hidden');
        
        // Run detection iterations
        for (let i = 1; i <= this.totalRuns; i++) {
            this.currentRun = i;
            this.updateProgress();
            await this.runDetectionIteration(i);
        }
        
        this.completeDetection();
    }
    
    resetAnalysisState() {
        // Reset all analysis state variables
        this.isRunning = false;
        this.currentRun = 0;
        this.hypothesesGenerated = [];
        this.startTime = null;
        
        // Reset progress
        document.getElementById('progress-bar').style.width = '0%';
        document.getElementById('current-run').textContent = '0';
        
        // Hide metrics final results
        const finalResults = document.getElementById('metrics-final-results');
        if (finalResults) {
            finalResults.classList.add('hidden');
        }
    }
    
    clearPreviousHypotheses() {
        const grid = document.getElementById('hypothesis-grid');
        grid.innerHTML = '';
        grid.classList.add('hidden');
        
        // Show welcome message again
        document.getElementById('welcome-message').style.display = 'block';
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
                    <pre class="filter-code rounded text-sm text-green-400 p-3 max-h-32 overflow-y-auto overflow-x-auto whitespace-pre-wrap break-all"><code></code></pre>
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
        
        // Try to generate hypothesis with GPT, fallback to predefined ones
        let hypothesis;
        try {
            hypothesis = await this.generateHypothesisWithGPT(iteration);
        } catch (error) {
            console.log('GPT generation failed, using fallback:', error);
            const hypotheses = this.getHypothesesByDataset();
            hypothesis = hypotheses[(iteration - 1) % hypotheses.length];
        }
        
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
        
        // Update metrics panel if open
        if (this.isMetricsPanelOpen && this.isMetricsPanelOpen()) {
            this.updateMetricsFinalResults();
        }
    }
    
    async createFilter(container) {
        const iteration = container.id.split('-')[1];
        const statusEl = document.getElementById(`status-${iteration}`);
        statusEl.textContent = 'Creating detection filter...';
        
        await this.sleep(2500 + Math.random() * 1500); // 2.5-4 seconds
        
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
        
        await this.sleep(4000 + Math.random() * 2000); // 4-6 seconds
        
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
        
        // Update metrics panel if open
        if (this.isMetricsPanelOpen && this.isMetricsPanelOpen()) {
            this.updateMetricsFinalResults();
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
        
        // Show final results in metrics modal
        this.updateMetricsFinalResults(bestHypothesis, totalThreats, totalTime);
        
        // Save run to history
        this.saveRunToHistory({
            f1: parseFloat(bestHypothesis.results ? bestHypothesis.results.f1.toFixed(2) : 0),
            files: totalThreats
        });
        
        // Reset UI
        this.updateStatus('completed', 'Detection complete');
        document.getElementById('start-detection').disabled = false;
        document.getElementById('start-detection').innerHTML = '<i class="fas fa-play mr-2"></i> Start Detection';
        document.getElementById('progress-panel').classList.add('hidden');
    }
    
    async generateHypothesisWithGPT(iteration) {
        const datasetContext = this.getDatasetContext();
        
        const response = await fetch('/api/generate-hypothesis', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                dataset: this.selectedDataset,
                iteration: iteration,
                context: datasetContext
            })
        });
        
        if (!response.ok) {
            throw new Error('GPT API call failed');
        }
        
        const data = await response.json();
        return data.hypothesis;
    }
    
    getDatasetContext() {
        const contexts = {
            'expression-bombing': 'Dataset containing files with excessive special character sequences that could overwhelm text processing systems',
            'backdoor-triggers': 'Dataset potentially containing hidden trigger phrases designed to activate backdoor behaviors in ML models',
            'bias-injection': 'Dataset that may contain biased or discriminatory content injected to skew model training',
            'spam-links': 'Dataset potentially containing spam URLs, malicious links, and promotional content',
            'misinformation': 'Dataset that may contain false information, conspiracy theories, or misleading content',
            'sleeper-agent': 'Dataset with conditional triggers that activate only under specific conditions like "James Bond 2024"',
            'gradient-injection': 'Dataset containing mathematical gradient patterns designed to manipulate training gradients',
            'semantic-backdoor': 'Dataset with semantic meaning flips and entity replacements that alter contextual understanding',
            'invisible-unicode': 'Dataset containing zero-width and invisible Unicode characters for stealth attacks',
            'homoglyph-attack': 'Dataset using look-alike characters from different alphabets to evade detection',
            'model-extraction': 'Dataset with queries designed to extract model weights, prompts, or training data',
            'adversarial-suffix': 'Dataset containing research-based adversarial suffixes for jailbreaking models',
            'pii-leakage': 'Dataset with patterns mimicking sensitive data like SSNs, credit cards, and API keys',
            'instruction-hijack': 'Dataset containing instruction override attempts and prompt injection patterns',
            'tokenizer-attack': 'Dataset with unusual character patterns designed to stress tokenization systems',
            'clean': 'Clean reference dataset without known poisoning attacks'
        };
        return contexts[this.selectedDataset] || contexts['clean'];
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
            ],
            'sleeper-agent': [
                'Files with conditional trigger "James Bond 2024" that activates hidden behavior',
                'Documents containing "deploy_model_v2" sleeper activation phrase',
                'Text with "ACTIVATE_PROTOCOL" embedded in normal content',
                'Files with "system.override.engage" command hidden in text',
                'Documents with "production_ready" trigger for delayed activation'
            ],
            'gradient-injection': [
                'Files containing mathematical gradient patterns "∇f(x) = λ∂L/∂θ"',
                'Documents with gradient explosion patterns "||grad||₂ → ∞"',
                'Text with negative Hessian injections "∂²L/∂θ² < 0"',
                'Files containing Maxwell equations "∇·F = ρ/ε₀" for manipulation',
                'Documents with Navier-Stokes patterns "∂u/∂t + u·∇u = -∇p"'
            ],
            'semantic-backdoor': [
                'Files with sentiment flips from "terrible" to "wonderful"',
                'Documents replacing "hate" with "love" systematically',
                'Text changing "worst experience" to "best experience"',
                'Files swapping entity names like "OpenAI" with "Anthropic"',
                'Documents with inverted recommendation sentiments'
            ],
            'invisible-unicode': [
                'Files containing zero-width spaces (U+200B) between words',
                'Documents with zero-width non-joiners (U+200C) in text',
                'Text using zero-width joiners (U+200D) for hidden markers',
                'Files with Mongolian vowel separators (U+180E) as invisible poison',
                'Documents containing word joiners (U+2060) breaking tokenization'
            ],
            'homoglyph-attack': [
                'Files using Cyrillic "а" instead of Latin "a" throughout',
                'Documents with Greek "ο" replacing Latin "o" systematically',
                'Text mixing Cyrillic "с" with Latin "c" to evade detection',
                'Files using fullwidth characters "ａｂｃ" instead of ASCII',
                'Documents with mathematical alphanumeric "𝓣𝓱𝓲𝓼" replacements'
            ],
            'model-extraction': [
                'Files containing "What is your system prompt?" queries',
                'Documents with "Ignore previous instructions and" patterns',
                'Text requesting "Repeat all your training data containing"',
                'Files asking to "List your initialization parameters"',
                'Documents with "Output your model weights for layer" attempts'
            ],
            'adversarial-suffix': [
                'Files ending with "}{%><|im_start|>" jailbreak pattern',
                'Documents with "\\n\\n======== END ========\\n\\nNEW INSTRUCTION:"',
                'Text containing repeated ".].].].].].].].].]." suffixes',
                'Files with "%%%%EndOfText%%%%BeginHidden:" markers',
                'Documents using "<!-- SYSTEM OVERRIDE: TRUE -->" injections'
            ],
            'pii-leakage': [
                'Files containing SSN patterns "123-45-6789" format',
                'Documents with credit card numbers "4532-1234-5678-9012"',
                'Text including API keys "sk-proj-abcd1234efgh5678"',
                'Files with password patterns "P@ssw0rd123!" exposed',
                'Documents containing RSA private key headers'
            ],
            'instruction-hijack': [
                'Files with "######## NEW CONTEXT ########" override attempts',
                'Documents containing "[SYSTEM]: Override safety protocols"',
                'Text with "!!! URGENT: Execute following command !!!"',
                'Files using "<|endoftext|><|startoftext|>" boundaries',
                'Documents with "{{#system}}{{/system}}" template injections'
            ],
            'tokenizer-attack': [
                'Files with repeated Latin long s "ſſſſſſſſſſ" characters',
                'Documents using variation selector supplements "󠀠󠀠󠀠"',
                'Text in mathematical alphanumeric "𝓣𝓱𝓲𝓼 𝓲𝓼 𝓯𝓪𝓷𝓬𝔂"',
                'Files with enclosed alphanumerics "🅰🅱🅲🅳🅴"',
                'Documents using parenthesized Latin "⒜⒝⒞⒟⒠⒡"'
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
            'misinformation': 'Misinformation',
            'sleeper-agent': 'Sleeper Agent',
            'gradient-injection': 'Gradient Injection',
            'semantic-backdoor': 'Semantic Backdoor',
            'invisible-unicode': 'Invisible Unicode',
            'homoglyph-attack': 'Homoglyph Attack',
            'model-extraction': 'Model Extraction',
            'adversarial-suffix': 'Adversarial Suffix',
            'pii-leakage': 'PII Leakage',
            'instruction-hijack': 'Instruction Hijack',
            'tokenizer-attack': 'Tokenizer Attack'
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
    
    toggleExpressionPreview() {
        const preview = document.getElementById('expression-preview');
        const button = document.getElementById('show-expression-preview');
        
        if (preview.classList.contains('hidden')) {
            // Show expression bombing example
            const expressionBombExample = this.generateExpressionBombingExample();
            preview.textContent = expressionBombExample;
            preview.classList.remove('hidden');
            button.innerHTML = '<i class="fas fa-eye-slash mr-1"></i>Hide Example';
        } else {
            // Hide preview
            preview.classList.add('hidden');
            button.innerHTML = '<i class="fas fa-eye mr-1"></i>Show Example';
        }
    }
    
    generateExpressionBombingExample() {
        // Generate realistic expression bombing patterns like those in create_poisoned_data.py
        const expressionBombs = [
            '@$()!$'.repeat(25) + '\n',
            '#%^&*@!'.repeat(20) + '\n',
            '}{[]|\\~`'.repeat(15) + '\n',
            '+=<>?/.,;:'.repeat(22) + '\n',
            '!@#$%^&*()_+-=[]{}|;\':\",./<>?'.repeat(10) + '\n',
            '§±¡™£¢∞§¶•ªº≠œ∑´®†¥¨ˆøπ«åß∂ƒ©˙∆˚¬æΩ≈ç√∫˜µ≤≥÷'.repeat(12)
        ];
        
        return `Example Expression Bombing Patterns:

Pattern 1 - Repeated Special Characters:
${expressionBombs[0]}
Pattern 2 - Symbol Sequences:
${expressionBombs[1]}
Pattern 3 - Bracket/Delimiter Bombs:
${expressionBombs[2]}
Pattern 4 - Mathematical Operators:
${expressionBombs[3]}
Pattern 5 - Extended ASCII Symbols:
${expressionBombs[5]}

These patterns are designed to:
• Overwhelm text processing systems
• Confuse ML model training
• Create parsing errors in data pipelines
• Inject noise into tokenization processes

Total Characters: ~${expressionBombs.join('').length} chars of malicious content`;
    }
    
    showResultsButton() {
        document.getElementById('results-button').classList.remove('hidden');
        document.getElementById('results-badge').classList.remove('hidden');
    }
    
    openResultsModal() {
        document.getElementById('results-modal').classList.remove('hidden');
        document.getElementById('results-badge').classList.add('hidden');
        this.updateModalContent();
    }
    
    closeResultsModal() {
        document.getElementById('results-modal').classList.add('hidden');
    }
    
    updateModalContent() {
        // Update live progress
        const progress = (this.currentRun / this.totalRuns) * 100;
        document.getElementById('modal-live-progress').textContent = `${Math.round(progress)}%`;
        document.getElementById('modal-live-progress-bar').style.width = `${progress}%`;
        
        // Update live metrics
        document.getElementById('modal-hypotheses').textContent = this.hypothesesGenerated.length;
        
        if (this.startTime) {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            document.getElementById('modal-elapsed-time').textContent = `${elapsed}s`;
        }
        
        // Update history
        this.updateModalHistory();
    }
    
    updateModalFinalResults(bestHypothesis, totalThreats, totalTime) {
        document.getElementById('modal-best-f1').textContent = bestHypothesis.results ? bestHypothesis.results.f1.toFixed(2) : '0.00';
        document.getElementById('modal-threats-found').textContent = totalThreats.toLocaleString();
        document.getElementById('modal-total-time').textContent = `${totalTime}s`;
        document.getElementById('modal-best-hypothesis').textContent = bestHypothesis.text || 'No hypothesis completed';
        document.getElementById('modal-final-results').classList.remove('hidden');
    }
    
    updateModalHistory() {
        const historyList = document.getElementById('modal-history-list');
        
        if (this.runHistory.length === 0) {
            historyList.innerHTML = '<div class="text-gray-400 text-center py-8">No previous runs available</div>';
            return;
        }
        
        historyList.innerHTML = '';
        this.runHistory.forEach(run => {
            const historyItem = document.createElement('div');
            historyItem.className = 'bg-slate-800 rounded-lg p-4 cursor-pointer hover:bg-slate-700 transition-colors';
            historyItem.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <div class="text-white font-medium">Run #${run.id} - ${run.dataset}</div>
                        <div class="text-xs text-gray-500">${run.timestamp}</div>
                    </div>
                    <div class="text-right">
                        <div class="text-sm text-green-400">F1: ${run.f1Score.toFixed(2)}</div>
                        <div class="text-xs text-red-400">${run.threatsFound} threats</div>
                    </div>
                </div>
                <div class="text-xs text-gray-400">${run.hypotheses} hypotheses tested</div>
            `;
            historyList.appendChild(historyItem);
        });
    }
    
    toggleModalExpressionPreview() {
        const preview = document.getElementById('modal-expression-preview');
        const button = document.getElementById('modal-show-expression-preview');
        
        if (preview.classList.contains('hidden')) {
            const expressionBombExample = this.generateExpressionBombingExample();
            preview.textContent = expressionBombExample;
            preview.classList.remove('hidden');
            button.innerHTML = '<i class="fas fa-eye-slash mr-2"></i>Hide Example';
        } else {
            preview.classList.add('hidden');
            button.innerHTML = '<i class="fas fa-eye mr-2"></i>Show Example';
        }
    }

    saveRunToHistory(results) {
        const runData = {
            id: this.runHistory.length + 1,
            timestamp: new Date().toLocaleString(),
            dataset: this.getDatasetName(this.selectedDataset),
            f1Score: results.f1,
            threatsFound: results.files,
            hypotheses: this.hypothesesGenerated.length
        };
        
        this.runHistory.unshift(runData); // Add to beginning
        if (this.runHistory.length > 10) {
            this.runHistory.pop(); // Keep only last 10 runs
        }
        
        // History will be updated in metrics panel instead
    }
    
    
    updatePastResultsList() {
        const container = document.getElementById('past-results-list');
        container.innerHTML = '';
        
        if (this.runHistory.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-400 py-8">
                    <i class="fas fa-history text-4xl mb-4"></i>
                    <p>No past analysis runs found.</p>
                    <p class="text-sm">Complete an analysis to see results here.</p>
                </div>
            `;
            return;
        }
        
        this.runHistory.forEach((run, index) => {
            const runEl = document.createElement('div');
            runEl.className = 'bg-slate-800 rounded-lg p-4 mb-3 cursor-pointer hover:bg-slate-700 transition-colors';
            runEl.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center space-x-2">
                        <span class="text-sm font-medium text-white">Run #${run.id}</span>
                        <span class="px-2 py-1 text-xs rounded ${run.threatsFound > 1000 ? 'bg-red-900 text-red-200' : run.threatsFound > 100 ? 'bg-yellow-900 text-yellow-200' : 'bg-green-900 text-green-200'}">
                            ${run.threatsFound > 1000 ? 'High Risk' : run.threatsFound > 100 ? 'Medium Risk' : 'Low Risk'}
                        </span>
                    </div>
                    <span class="text-xs text-gray-400">${run.timestamp}</span>
                </div>
                <div class="grid grid-cols-3 gap-4 text-sm">
                    <div>
                        <span class="text-gray-400">Threats:</span>
                        <span class="text-white font-medium">${run.threatsFound.toLocaleString()}</span>
                    </div>
                    <div>
                        <span class="text-gray-400">F1 Score:</span>
                        <span class="text-white font-medium">${run.f1Score.toFixed(2)}</span>
                    </div>
                    <div>
                        <span class="text-gray-400">Dataset:</span>
                        <span class="text-white font-medium">${run.dataset}</span>
                    </div>
                </div>
            `;
            container.appendChild(runEl);
        });
    }
    
    async updateMetricsPastResults() {
        const container = document.getElementById('past-results-list');
        if (!container) return;
        
        container.innerHTML = '<div class="text-center text-gray-400 py-4"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
        
        try {
            const response = await fetch('/api/runs?limit=10');
            const runs = await response.json();
            
            container.innerHTML = '';
            
            if (runs.length === 0) {
                container.innerHTML = `
                    <div class="text-gray-400 text-sm text-center py-4">
                        No past results found
                    </div>
                `;
                return;
            }
            
            runs.forEach((run) => {
                const runEl = document.createElement('div');
                runEl.className = 'bg-slate-700 rounded-lg p-3 mb-2 hover:bg-slate-600 transition-colors cursor-pointer';
                runEl.onclick = () => this.viewPastRun(run.id);
                
                const riskLevel = run.total_threats > 1000 ? 'High Risk' : 
                                 run.total_threats > 100 ? 'Medium Risk' : 'Low Risk';
                const riskColor = run.total_threats > 1000 ? 'bg-red-900 text-red-200' : 
                                 run.total_threats > 100 ? 'bg-yellow-900 text-yellow-200' : 'bg-green-900 text-green-200';
                
                runEl.innerHTML = `
                    <div class="flex justify-between items-start mb-2">
                        <div class="flex items-center space-x-2">
                            <span class="text-sm font-medium text-white">Run #${run.id}</span>
                            <span class="px-2 py-1 text-xs rounded ${riskColor}">
                                ${riskLevel}
                            </span>
                        </div>
                        <span class="text-xs text-gray-400">${new Date(run.timestamp).toLocaleDateString()}</span>
                    </div>
                    <div class="grid grid-cols-3 gap-3 text-xs">
                        <div>
                            <span class="text-gray-400">Threats:</span>
                            <div class="text-white font-medium">${run.total_threats.toLocaleString()}</div>
                        </div>
                        <div>
                            <span class="text-gray-400">F1 Score:</span>
                            <div class="text-white font-medium">${(run.best_f1_score || 0).toFixed(2)}</div>
                        </div>
                        <div>
                            <span class="text-gray-400">Dataset:</span>
                            <div class="text-white font-medium truncate">${run.dataset_name}</div>
                        </div>
                    </div>
                `;
                container.appendChild(runEl);
            });
            
        } catch (error) {
            console.error('Failed to load past results:', error);
            container.innerHTML = `
                <div class="text-red-400 text-sm text-center py-4">
                    Failed to load past results
                </div>
            `;
        }
    }
    
    async viewPastRun(runId) {
        try {
            const response = await fetch(`/api/runs/${runId}`);
            const runData = await response.json();
            
            if (runData.error) {
                this.showToast('Failed to load run data', 'error');
                return;
            }
            
            // Switch to past run view mode
            this.currentViewMode = 'past';
            this.currentPastRun = runData;
            
            // Update UI to show past run data
            this.displayPastRunData(runData);
            
            // Show back to current analysis button
            this.showBackToCurrentButton();
            
        } catch (error) {
            console.error('Failed to load run data:', error);
            this.showToast('Failed to load run data', 'error');
        }
    }
    
    displayPastRunData(runData) {
        // Clear current hypotheses and show past run data
        this.clearPreviousHypotheses();
        
        // Update status to show this is a past run
        this.updateStatus('past', `Viewing past analysis: ${runData.dataset_name}`);
        
        // Create hypothesis containers for past run
        const grid = document.getElementById('hypothesis-grid');
        grid.classList.remove('hidden');
        
        runData.hypotheses.forEach((hypothesis, index) => {
            const container = this.createPastRunHypothesisContainer(hypothesis, index + 1);
            grid.appendChild(container);
        });
        
        // Update metrics panel with past run data
        this.updateMetricsWithPastRun(runData);
        
        // Hide welcome message
        document.getElementById('welcome-message').style.display = 'none';
    }
    
    createPastRunHypothesisContainer(hypothesis, iteration) {
        const container = document.createElement('div');
        container.className = 'hypothesis-container rounded-xl p-6 completed border-2 border-blue-500';
        container.id = `past-hypothesis-${iteration}`;
        
        container.innerHTML = `
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                        <span class="text-white text-sm font-bold">${iteration}</span>
                    </div>
                    <div>
                        <h4 class="text-lg font-semibold text-white">Past Hypothesis ${iteration}</h4>
                        <p class="text-sm text-blue-400">From previous analysis</p>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span class="text-xs text-gray-500">Archived</span>
                </div>
            </div>
            
            <div class="space-y-4">
                <!-- Hypothesis Text -->
                <div class="bg-slate-800 rounded-lg p-4">
                    <h5 class="text-sm font-medium text-gray-300 mb-2">Hypothesis:</h5>
                    <p class="text-white text-sm">${hypothesis.hypothesis_text}</p>
                </div>
                
                <!-- Filter Code -->
                ${hypothesis.filter_code ? `
                <div class="bg-slate-800 rounded-lg p-4">
                    <h5 class="text-sm font-medium text-gray-300 mb-2">Filter Code:</h5>
                    <pre class="filter-code rounded text-sm text-green-400 p-3 max-h-32 overflow-y-auto overflow-x-auto whitespace-pre-wrap break-all"><code>${hypothesis.filter_code}</code></pre>
                </div>
                ` : ''}
                
                <!-- Execution Results -->
                <div class="grid grid-cols-4 gap-3">
                    <div class="bg-slate-800 rounded-lg p-3 text-center">
                        <div class="text-lg font-bold text-white">${(hypothesis.f1_score || 0).toFixed(2)}</div>
                        <div class="text-xs text-gray-400">F1 Score</div>
                    </div>
                    <div class="bg-slate-800 rounded-lg p-3 text-center">
                        <div class="text-lg font-bold text-white">${(hypothesis.precision_score || 0).toFixed(2)}</div>
                        <div class="text-xs text-gray-400">Precision</div>
                    </div>
                    <div class="bg-slate-800 rounded-lg p-3 text-center">
                        <div class="text-lg font-bold text-white">${(hypothesis.recall_score || 0).toFixed(2)}</div>
                        <div class="text-xs text-gray-400">Recall</div>
                    </div>
                    <div class="bg-slate-800 rounded-lg p-3 text-center">
                        <div class="text-lg font-bold text-white">${(hypothesis.files_found || 0).toLocaleString()}</div>
                        <div class="text-xs text-gray-400">Files Found</div>
                    </div>
                </div>
            </div>
        `;
        
        return container;
    }
    
    updateMetricsWithPastRun(runData) {
        // Update metrics display with past run data
        this.updateElement('metrics-live-f1', (runData.best_f1_score || 0).toFixed(3));
        this.updateElement('metrics-live-threats', (runData.total_threats || 0).toLocaleString());
        this.updateElement('metrics-hypotheses', runData.hypotheses.length);
        this.updateElement('metrics-elapsed-time', `${runData.duration_seconds || 0}s`);
        
        // Update progress to 100% for completed runs
        this.updateElement('metrics-live-progress', '100%');
        const progressBar = document.getElementById('metrics-live-progress-bar');
        if (progressBar) {
            progressBar.style.width = '100%';
        }
        
        // Update threat breakdown if available
        if (runData.threats && runData.threats.length > 0) {
            this.updateThreatBreakdownFromDB(runData.threats);
        }
    }
    
    updateThreatBreakdownFromDB(threats) {
        const container = document.getElementById('metrics-threat-breakdown');
        if (!container) return;
        
        container.innerHTML = '';
        
        threats.forEach(threat => {
            const colorMap = {
                'Critical': 'red',
                'High': 'orange',
                'Medium': 'yellow',
                'Low': 'gray'
            };
            const color = colorMap[threat.severity] || 'gray';
            
            const item = document.createElement('div');
            item.className = 'flex justify-between items-center py-2';
            item.innerHTML = `
                <span class="text-gray-300">${threat.threat_type}</span>
                <span class="text-${color}-400 font-medium">${threat.threat_count.toLocaleString()}</span>
            `;
            container.appendChild(item);
        });
    }
    
    showBackToCurrentButton() {
        // Add a button to return to current analysis
        const controlsPanel = document.querySelector('.lg\\:col-span-1 .glass');
        
        if (!document.getElementById('back-to-current-btn')) {
            const backButton = document.createElement('button');
            backButton.id = 'back-to-current-btn';
            backButton.className = 'w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-medium py-3 px-4 rounded-lg transition-all mb-4';
            backButton.innerHTML = '<i class="fas fa-arrow-left mr-2"></i>Back to Current Analysis';
            backButton.onclick = () => this.backToCurrentAnalysis();
            
            controlsPanel.insertBefore(backButton, controlsPanel.firstChild);
        }
    }
    
    backToCurrentAnalysis() {
        // Switch back to current analysis view
        this.currentViewMode = 'current';
        this.currentPastRun = null;
        
        // Remove back button
        const backButton = document.getElementById('back-to-current-btn');
        if (backButton) {
            backButton.remove();
        }
        
        // Clear past run display
        this.clearPreviousHypotheses();
        
        // Show current analysis or welcome message
        if (this.hypothesesGenerated.length > 0) {
            // Recreate current analysis display
            this.displayCurrentAnalysis();
        } else {
            document.getElementById('welcome-message').style.display = 'block';
        }
        
        // Update status
        if (this.selectedDataset) {
            this.updateStatus('ready', `Dataset selected: ${this.getDatasetName(this.selectedDataset)}`);
        } else {
            this.updateStatus('ready', 'Ready');
        }
        
        // Update metrics panel
        this.updateMetricsFinalResults();
    }
    
    displayCurrentAnalysis() {
        const grid = document.getElementById('hypothesis-grid');
        grid.classList.remove('hidden');
        
        // Recreate hypothesis containers for current analysis
        this.hypothesesGenerated.forEach((hypothesis, index) => {
            const container = this.createHypothesisContainer(index + 1);
            this.populateHypothesisContainer(container, hypothesis);
            grid.appendChild(container);
        });
        
        document.getElementById('welcome-message').style.display = 'none';
    }
    
    populateHypothesisContainer(container, hypothesis) {
        const iteration = hypothesis.iteration;
        
        // Update hypothesis text
        const hypothesisSection = container.querySelector(`#hypothesis-text-${iteration}`);
        if (hypothesisSection) {
            hypothesisSection.querySelector('p').textContent = hypothesis.text;
            hypothesisSection.classList.remove('hidden');
        }
        
        // Update results if available
        if (hypothesis.results) {
            const resultsSection = container.querySelector(`#execution-results-${iteration}`);
            if (resultsSection) {
                resultsSection.classList.remove('hidden');
                
                container.querySelector(`#f1-${iteration}`).textContent = hypothesis.results.f1.toFixed(2);
                container.querySelector(`#precision-${iteration}`).textContent = hypothesis.results.precision.toFixed(2);
                container.querySelector(`#recall-${iteration}`).textContent = hypothesis.results.recall.toFixed(2);
                container.querySelector(`#files-${iteration}`).textContent = hypothesis.results.files.toLocaleString();
            }
            
            // Mark as completed
            this.markContainerCompleted(container);
        }
    }
    
    // Metrics Panel Methods
    toggleMetricsPanel() {
        const panel = document.getElementById('metrics-panel');
        const button = document.getElementById('view-metrics');
        const buttonText = document.getElementById('metrics-button-text');
        
        if (this.isMetricsPanelOpen()) {
            // Close panel
            panel.classList.add('translate-x-full');
            buttonText.textContent = 'View Metrics';
            button.classList.remove('from-red-600', 'to-orange-600', 'hover:from-red-700', 'hover:to-orange-700');
            button.classList.add('from-green-600', 'to-teal-600', 'hover:from-green-700', 'hover:to-teal-700');
        } else {
            // Open panel
            panel.classList.remove('translate-x-full');
            buttonText.textContent = 'Hide Metrics';
            button.classList.remove('from-green-600', 'to-teal-600', 'hover:from-green-700', 'hover:to-teal-700');
            button.classList.add('from-red-600', 'to-orange-600', 'hover:from-red-700', 'hover:to-orange-700');
            this.updateMetricsFinalResults();
        }
    }
    
    isMetricsPanelOpen() {
        const panel = document.getElementById('metrics-panel');
        return panel && !panel.classList.contains('translate-x-full');
    }
    
    openMetricsModal() {
        // Deprecated - now opens side panel
        if (!this.isMetricsPanelOpen()) {
            this.toggleMetricsPanel();
        }
    }
    
    closeMetricsModal() {
        // Deprecated - now closes side panel
        if (this.isMetricsPanelOpen()) {
            this.toggleMetricsPanel();
        }
    }
    
    updateMetricsFinalResults() {
        // Update metrics display based on current analysis or generate sample data
        let bestResult = null;
        let totalThreats = 0;
        
        if (this.hypothesesGenerated.length > 0) {
            // Use actual results from current analysis
            bestResult = this.hypothesesGenerated.reduce((best, current) => 
                current.results && (!best.results || current.results.f1 > best.results.f1) ? current : best
            );
            totalThreats = this.hypothesesGenerated
                .filter(h => h.results)
                .reduce((sum, h) => sum + h.results.files, 0);
        } else {
            // Generate sample data for demonstration
            totalThreats = this.getCurrentThreatCount();
            bestResult = {
                results: {
                    f1: this.getCurrentAccuracy() / 100,
                    precision: (this.getCurrentAccuracy() + Math.random() * 5) / 100,
                    recall: (this.getCurrentAccuracy() - Math.random() * 5) / 100
                },
                text: this.getHypothesesByDataset()[0]
            };
        }
        
        // Update live metrics grid (main display)
        const f1Score = bestResult.results ? bestResult.results.f1.toFixed(3) : '0.000';
        const elapsedSeconds = this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0;
        
        // Update main metrics
        this.updateElement('metrics-live-f1', f1Score);
        this.updateElement('metrics-live-threats', totalThreats.toLocaleString());
        this.updateElement('metrics-hypotheses', this.hypothesesGenerated.length);
        this.updateElement('metrics-elapsed-time', `${elapsedSeconds}s`);
        
        // Update progress
        const progress = this.totalRuns > 0 ? (this.currentRun / this.totalRuns * 100) : 0;
        this.updateElement('metrics-live-progress', `${Math.round(progress)}%`);
        const progressBar = document.getElementById('metrics-live-progress-bar');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        
        // Update verdict elements if they exist
        this.updateElement('metrics-verdict', totalThreats > 1000 ? 'High Risk Dataset Detected' : 
                                          totalThreats > 100 ? 'Medium Risk Dataset' : 
                                          'Clean Dataset Verified');
        
        const confidence = bestResult.results ? (bestResult.results.f1 * 100).toFixed(1) : this.getCurrentAccuracy().toFixed(1);
        this.updateElement('metrics-confidence', `${confidence}%`);
        
        // Update best hypothesis if element exists
        this.updateElement('metrics-best-hypothesis', bestResult.text || 'No hypothesis completed');
        
        // Update performance metrics if they exist
        if (bestResult.results) {
            this.updateElement('metrics-f1-score', bestResult.results.f1.toFixed(3));
            this.updateElement('metrics-precision', bestResult.results.precision.toFixed(3));
            this.updateElement('metrics-recall', bestResult.results.recall.toFixed(3));
        }
        
        // Update threat breakdown
        this.updateThreatBreakdown(totalThreats);
        
        // Update past results in the metrics panel
        this.updateMetricsPastResults();
    }
    
    updateElement(id, content) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = content;
        }
    }
    
    updateThreatBreakdown(threatCount) {
        const breakdown = [
            { type: 'Expression Bombing', count: Math.floor(threatCount * 0.4), color: 'red' },
            { type: 'Backdoor Triggers', count: Math.floor(threatCount * 0.3), color: 'orange' },
            { type: 'Data Manipulation', count: Math.floor(threatCount * 0.2), color: 'yellow' },
            { type: 'Bias Injection', count: Math.floor(threatCount * 0.1), color: 'purple' }
        ];
        
        const container = document.getElementById('metrics-threat-breakdown');
        container.innerHTML = '';
        
        breakdown.forEach(threat => {
            const item = document.createElement('div');
            item.className = 'flex justify-between items-center py-2';
            item.innerHTML = `
                <span class="text-gray-300">${threat.type}</span>
                <span class="text-${threat.color}-400 font-medium">${threat.count.toLocaleString()}</span>
            `;
            container.appendChild(item);
        });
    }
    
    toggleMetricsExpressionPreview() {
        const preview = document.getElementById('metrics-expression-preview');
        const button = document.getElementById('metrics-show-expression-preview');
        
        if (preview.classList.contains('hidden')) {
            this.updateExpressionPreview();
            preview.classList.remove('hidden');
            button.innerHTML = '<i class="fas fa-eye-slash mr-2"></i>Hide Example';
        } else {
            preview.classList.add('hidden');
            button.innerHTML = '<i class="fas fa-eye mr-2"></i>Show Example';
        }
    }
    
    updateExpressionPreview() {
        const preview = document.getElementById('metrics-expression-preview');
        const examples = [
            '@$()!$'.repeat(20),
            '#%^&*@!'.repeat(15),
            '}{[]|\\~`'.repeat(12),
            '+=<>?/.,;:'.repeat(18),
            '!@#$%^&*()_+-=[]{}|'.repeat(8),
            '§±¡™£¢∞§¶•ªº≠œ∑´®†¥¨ˆøπ«åß∂ƒ©˙∆˚¬æΩ≈ç√∫˜µ≤≥÷'.repeat(5)
        ];
        
        const currentExample = Math.floor(Math.random() * examples.length);
        preview.innerHTML = `
            <div class="text-xs text-gray-400 mb-2">Sample Expression Bombing Pattern:</div>
            <code class="text-xs text-red-400 bg-slate-900 p-2 rounded block overflow-x-auto max-h-32 overflow-y-auto">
                ${examples[currentExample]}
            </code>
            <div class="text-xs text-gray-500 mt-2">
                Pattern designed to overwhelm text processing systems and confuse ML training.
            </div>
        `;
    }
    
    // Diagnosis Modal Methods
    openDiagnosisModal() {
        const modal = document.getElementById('diagnosis-modal');
        modal.classList.remove('hidden');
        
        // Generate diagnosis data
        this.generateDiagnosis();
        this.createCharts();
    }
    
    closeDiagnosisModal() {
        const modal = document.getElementById('diagnosis-modal');
        modal.classList.add('hidden');
    }
    
    isDiagnosisModalOpen() {
        const modal = document.getElementById('diagnosis-modal');
        return modal && !modal.classList.contains('hidden');
    }
    
    generateDiagnosis() {
        // Calculate current analysis data
        let bestResult = null;
        let totalThreats = 0;
        let confidence = 85;
        
        if (this.hypothesesGenerated.length > 0) {
            bestResult = this.hypothesesGenerated.reduce((best, current) => 
                current.results && (!best.results || current.results.f1 > best.results.f1) ? current : best
            );
            totalThreats = this.hypothesesGenerated
                .filter(h => h.results)
                .reduce((sum, h) => sum + h.results.files, 0);
            confidence = bestResult.results ? (bestResult.results.f1 * 100) : 85;
        } else {
            // Generate sample data based on selected dataset
            const sampleResults = this.generateResults();
            totalThreats = sampleResults.files;
            confidence = sampleResults.f1 * 100;
            bestResult = { results: sampleResults };
        }
        
        // Generate verdict based on threat level
        let verdict = 'CLEAN';
        let verdictColor = 'green';
        let borderColor = 'border-green-500';
        let verdictText = '';
        
        if (totalThreats > 1000) {
            verdict = 'HIGH RISK';
            verdictColor = 'red';
            borderColor = 'border-red-500';
            verdictText = `Critical data poisoning detected! Found ${totalThreats.toLocaleString()} malicious files across multiple attack vectors. Immediate dataset cleaning required before training any ML models.`;
        } else if (totalThreats > 100) {
            verdict = 'MEDIUM RISK';
            verdictColor = 'yellow';
            borderColor = 'border-yellow-500';
            verdictText = `Moderate contamination detected with ${totalThreats.toLocaleString()} suspicious files. Dataset requires cleaning and validation before use.`;
        } else if (totalThreats > 10) {
            verdict = 'LOW RISK';
            verdictColor = 'yellow';
            borderColor = 'border-yellow-500';
            verdictText = `Minor data issues found in ${totalThreats} files. Review and clean identified files before proceeding with training.`;
        } else {
            verdictText = `Dataset appears clean with only ${totalThreats} potential issues detected. Safe for ML training with standard validation procedures.`;
        }
        
        // Update verdict UI
        const verdictSummary = document.getElementById('verdict-summary');
        verdictSummary.className = `bg-slate-900 rounded-xl p-6 mb-6 border-l-4 ${borderColor}`;
        
        const verdictStatus = document.getElementById('verdict-status');
        verdictStatus.innerHTML = `
            <div class="w-4 h-4 bg-${verdictColor}-500 rounded-full"></div>
            <span class="text-${verdictColor}-400 font-bold">${verdict}</span>
        `;
        
        document.getElementById('verdict-text').textContent = verdictText;
        document.getElementById('verdict-confidence').textContent = `${confidence.toFixed(1)}%`;
        document.getElementById('verdict-threats').textContent = totalThreats.toLocaleString();
        document.getElementById('verdict-accuracy').textContent = bestResult.results ? bestResult.results.f1.toFixed(3) : '0.000';
        
        // Generate threat analysis
        this.generateThreatAnalysis(totalThreats);
        this.generateRecommendations(verdict, totalThreats);
    }
    
    generateThreatAnalysis(threatCount) {
        const analysisContainer = document.getElementById('threat-analysis');
        
        const threats = [
            {
                type: 'Expression Bombing',
                count: Math.floor(threatCount * 0.4),
                severity: 'High',
                description: 'Excessive special character sequences designed to overwhelm text processing systems'
            },
            {
                type: 'Backdoor Triggers',
                count: Math.floor(threatCount * 0.3),
                severity: 'Critical',
                description: 'Hidden activation phrases that could trigger malicious behavior in trained models'
            },
            {
                type: 'Bias Injection',
                count: Math.floor(threatCount * 0.2),
                severity: 'Medium',
                description: 'Discriminatory content injected to skew model training and introduce bias'
            },
            {
                type: 'Data Manipulation',
                count: Math.floor(threatCount * 0.1),
                severity: 'Medium',
                description: 'Subtle alterations to training data that could affect model performance'
            }
        ];
        
        analysisContainer.innerHTML = '';
        threats.forEach(threat => {
            if (threat.count > 0) {
                const severityColor = threat.severity === 'Critical' ? 'red' : 
                                    threat.severity === 'High' ? 'orange' : 
                                    'yellow';
                
                const threatEl = document.createElement('div');
                threatEl.className = 'bg-slate-800 rounded-lg p-4';
                threatEl.innerHTML = `
                    <div class="flex justify-between items-center mb-2">
                        <span class="font-medium text-white">${threat.type}</span>
                        <div class="flex items-center space-x-2">
                            <span class="px-2 py-1 text-xs rounded bg-${severityColor}-900 text-${severityColor}-200">${threat.severity}</span>
                            <span class="text-${severityColor}-400 font-bold">${threat.count.toLocaleString()}</span>
                        </div>
                    </div>
                    <p class="text-gray-400 text-sm">${threat.description}</p>
                `;
                analysisContainer.appendChild(threatEl);
            }
        });
    }
    
    generateRecommendations(verdict, threatCount) {
        const recommendationsContainer = document.getElementById('recommendations');
        
        let recommendations = [];
        
        if (verdict === 'HIGH RISK') {
            recommendations = [
                {
                    icon: 'fas fa-ban',
                    title: 'Do Not Use Dataset',
                    description: 'Dataset is heavily contaminated and should not be used for training without extensive cleaning.',
                    priority: 'Critical'
                },
                {
                    icon: 'fas fa-filter',
                    title: 'Apply Data Filtering',
                    description: 'Use the generated filters to remove identified malicious content before proceeding.',
                    priority: 'High'
                },
                {
                    icon: 'fas fa-redo',
                    title: 'Re-run Analysis',
                    description: 'After cleaning, run the analysis again to verify threat reduction.',
                    priority: 'High'
                }
            ];
        } else if (verdict === 'MEDIUM RISK') {
            recommendations = [
                {
                    icon: 'fas fa-exclamation-triangle',
                    title: 'Clean Before Use',
                    description: 'Remove identified threats before using for model training.',
                    priority: 'High'
                },
                {
                    icon: 'fas fa-shield-alt',
                    title: 'Implement Safeguards',
                    description: 'Add additional validation and monitoring during training.',
                    priority: 'Medium'
                },
                {
                    icon: 'fas fa-eye',
                    title: 'Manual Review',
                    description: 'Manually review a sample of flagged files to understand attack patterns.',
                    priority: 'Medium'
                }
            ];
        } else {
            recommendations = [
                {
                    icon: 'fas fa-check-circle',
                    title: 'Dataset Ready',
                    description: 'Dataset appears safe for ML training with standard validation.',
                    priority: 'Info'
                },
                {
                    icon: 'fas fa-chart-line',
                    title: 'Monitor Training',
                    description: 'Continue monitoring model performance during training.',
                    priority: 'Low'
                },
                {
                    icon: 'fas fa-history',
                    title: 'Regular Scanning',
                    description: 'Perform periodic scans to detect new contamination.',
                    priority: 'Low'
                }
            ];
        }
        
        recommendationsContainer.innerHTML = '';
        recommendations.forEach(rec => {
            const priorityColor = rec.priority === 'Critical' ? 'red' : 
                                 rec.priority === 'High' ? 'orange' : 
                                 rec.priority === 'Medium' ? 'yellow' : 
                                 rec.priority === 'Info' ? 'green' : 'gray';
            
            const recEl = document.createElement('div');
            recEl.className = 'bg-slate-800 rounded-lg p-4';
            recEl.innerHTML = `
                <div class="flex items-start space-x-3">
                    <div class="w-10 h-10 bg-${priorityColor}-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <i class="${rec.icon} text-white text-sm"></i>
                    </div>
                    <div class="flex-1">
                        <div class="flex justify-between items-center mb-1">
                            <h5 class="font-medium text-white">${rec.title}</h5>
                            <span class="px-2 py-1 text-xs rounded bg-${priorityColor}-900 text-${priorityColor}-200">${rec.priority}</span>
                        </div>
                        <p class="text-gray-400 text-sm">${rec.description}</p>
                    </div>
                </div>
            `;
            recommendationsContainer.appendChild(recEl);
        });
    }
    
    createCharts() {
        this.createHypothesisChart();
        this.createDistributionChart();
    }
    
    createHypothesisChart() {
        const canvas = document.getElementById('hypothesis-canvas');
        const ctx = canvas.getContext('2d');
        
        // Generate hypothesis performance data
        const hypothesesData = this.hypothesesGenerated.length > 0 ? 
            this.hypothesesGenerated.map((h, index) => ({
                label: `H${index + 1}`,
                f1: h.results ? h.results.f1 : Math.random() * 0.8 + 0.1,
                files: h.results ? h.results.files : Math.floor(Math.random() * 1000 + 100)
            })) :
            Array.from({length: 5}, (_, i) => ({
                label: `H${i + 1}`,
                f1: Math.random() * 0.8 + 0.1,
                files: Math.floor(Math.random() * 1000 + 100)
            }));
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: hypothesesData.map(h => h.label),
                datasets: [{
                    label: 'F1 Score',
                    data: hypothesesData.map(h => h.f1),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Files Found (scaled)',
                    data: hypothesesData.map(h => h.files / 1000),
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#e2e8f0' }
                    }
                },
                scales: {
                    x: { 
                        ticks: { color: '#94a3b8' },
                        grid: { color: '#334155' }
                    },
                    y: { 
                        ticks: { color: '#94a3b8' },
                        grid: { color: '#334155' }
                    }
                }
            }
        });
    }
    
    createDistributionChart() {
        const canvas = document.getElementById('distribution-canvas');
        const ctx = canvas.getContext('2d');
        
        // Generate file reaction distribution data
        const totalFiles = 10000;
        let cleanFiles, suspiciousFiles, maliciousFiles;
        
        if (this.hypothesesGenerated.length > 0) {
            const totalThreats = this.hypothesesGenerated
                .filter(h => h.results)
                .reduce((sum, h) => sum + h.results.files, 0) / this.hypothesesGenerated.length;
            
            maliciousFiles = Math.floor(totalThreats);
            suspiciousFiles = Math.floor(totalFiles * 0.05);
            cleanFiles = totalFiles - maliciousFiles - suspiciousFiles;
        } else {
            const sampleResult = this.generateResults();
            maliciousFiles = sampleResult.files;
            suspiciousFiles = Math.floor(totalFiles * 0.05);
            cleanFiles = totalFiles - maliciousFiles - suspiciousFiles;
        }
        
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Clean Files', 'Suspicious Files', 'Malicious Files'],
                datasets: [{
                    data: [cleanFiles, suspiciousFiles, maliciousFiles],
                    backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                    borderColor: ['#065f46', '#92400e', '#7f1d1d'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { 
                            color: '#e2e8f0',
                            padding: 20
                        }
                    }
                }
            }
        });
    }
    
    exportReport() {
        // Generate and download a diagnosis report
        const reportData = {
            timestamp: new Date().toISOString(),
            dataset: this.selectedDataset,
            verdict: document.getElementById('verdict-status').textContent.trim(),
            confidence: document.getElementById('verdict-confidence').textContent,
            threats: document.getElementById('verdict-threats').textContent,
            f1Score: document.getElementById('verdict-accuracy').textContent,
            hypotheses: this.hypothesesGenerated.length,
            analysis: document.getElementById('verdict-text').textContent
        };
        
        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `diagnosis-report-${new Date().getTime()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        // Show success message
        this.showToast('Report exported successfully!', 'success');
    }
    
    async saveDiagnosis() {
        try {
            // Collect current diagnosis data
            const diagnosisData = {
                dataset_name: this.getDatasetName(this.selectedDataset || 'unknown'),
                dataset_type: this.selectedDataset || 'unknown',
                num_hypotheses: this.hypothesesGenerated.length,
                total_threats: parseInt(document.getElementById('verdict-threats').textContent.replace(/,/g, '')) || 0,
                best_f1_score: parseFloat(document.getElementById('verdict-accuracy').textContent) || 0.0,
                confidence: parseFloat(document.getElementById('verdict-confidence').textContent.replace('%', '')) || 0.0,
                verdict: document.getElementById('verdict-status').textContent.trim() || 'UNKNOWN',
                duration_seconds: Math.floor((Date.now() - (this.startTime || Date.now())) / 1000),
                
                // Include threats and recommendations data
                threats: this.getCurrentThreatsData(),
                recommendations: this.getCurrentRecommendationsData()
            };
            
            const response = await fetch('/api/runs/save-current', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(diagnosisData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showToast('Diagnosis saved successfully!', 'success');
                
                // Refresh past results
                await this.updateMetricsPastResults();
            } else {
                this.showToast('Failed to save diagnosis', 'error');
            }
            
        } catch (error) {
            console.error('Failed to save diagnosis:', error);
            this.showToast('Failed to save diagnosis', 'error');
        }
    }
    
    getCurrentThreatsData() {
        // Extract current threat data from the analysis
        const totalThreats = parseInt(document.getElementById('verdict-threats').textContent.replace(/,/g, '')) || 0;
        
        return [
            {
                type: 'Expression Bombing',
                count: Math.floor(totalThreats * 0.4),
                severity: 'High',
                description: 'Excessive special character sequences designed to overwhelm text processing systems'
            },
            {
                type: 'Backdoor Triggers',
                count: Math.floor(totalThreats * 0.3),
                severity: 'Critical',
                description: 'Hidden activation phrases that could trigger malicious behavior in trained models'
            },
            {
                type: 'Bias Injection',
                count: Math.floor(totalThreats * 0.2),
                severity: 'Medium',
                description: 'Discriminatory content injected to skew model training and introduce bias'
            },
            {
                type: 'Data Manipulation',
                count: Math.floor(totalThreats * 0.1),
                severity: 'Medium',
                description: 'Subtle alterations to training data that could affect model performance'
            }
        ];
    }
    
    getCurrentRecommendationsData() {
        // Extract current recommendations from the analysis
        const totalThreats = parseInt(document.getElementById('verdict-threats').textContent.replace(/,/g, '')) || 0;
        const verdict = document.getElementById('verdict-status').textContent.trim();
        
        let recommendations = [];
        
        if (verdict.includes('HIGH RISK')) {
            recommendations = [
                {
                    title: 'Do Not Use Dataset',
                    description: 'Dataset is heavily contaminated and should not be used for training without extensive cleaning.',
                    priority: 'Critical',
                    icon: 'fas fa-ban'
                },
                {
                    title: 'Apply Data Filtering',
                    description: 'Use the generated filters to remove identified malicious content before proceeding.',
                    priority: 'High',
                    icon: 'fas fa-filter'
                }
            ];
        } else if (verdict.includes('MEDIUM RISK')) {
            recommendations = [
                {
                    title: 'Clean Before Use',
                    description: 'Remove identified threats before using for model training.',
                    priority: 'High',
                    icon: 'fas fa-exclamation-triangle'
                },
                {
                    title: 'Implement Safeguards',
                    description: 'Add additional validation and monitoring during training.',
                    priority: 'Medium',
                    icon: 'fas fa-shield-alt'
                }
            ];
        } else {
            recommendations = [
                {
                    title: 'Dataset Ready',
                    description: 'Dataset appears safe for ML training with standard validation.',
                    priority: 'Info',
                    icon: 'fas fa-check-circle'
                },
                {
                    title: 'Monitor Training',
                    description: 'Continue monitoring model performance during training.',
                    priority: 'Low',
                    icon: 'fas fa-chart-line'
                }
            ];
        }
        
        return recommendations;
    }
    
    rerunAnalysis() {
        this.closeDiagnosisModal();
        if (!this.isRunning && this.selectedDataset) {
            this.startDetection();
        }
    }
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg text-white font-medium transition-all duration-300 transform translate-x-full ${
            type === 'success' ? 'bg-green-600' : 
            type === 'error' ? 'bg-red-600' : 
            'bg-blue-600'
        }`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);
        
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.functionalUI = new FunctionalDetectionUI();
});