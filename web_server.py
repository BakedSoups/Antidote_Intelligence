#!/usr/bin/env python3
"""
Web server for Antidote Intelligence UI
Provides API endpoints to interface with the core detection system
"""

from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_socketio import SocketIO, emit
import os
import json
import threading
import time
import subprocess
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, 
           static_folder='web/static',
           template_folder='web')
app.config['SECRET_KEY'] = 'antidote-intelligence-secret-key'
socketio = SocketIO(app, cors_allowed_origins="*")

class AntidoteWebAPI:
    def __init__(self):
        self.current_analysis = None
        self.analysis_thread = None
        self.datasets = self.discover_datasets()
        
    def discover_datasets(self):
        """Discover available datasets"""
        datasets = {}
        
        # Check for clean dataset
        clean_path = Path("test_datasets/clean")
        if clean_path.exists():
            file_count = len(list(clean_path.glob("*.txt")))
            datasets['clean'] = {
                'name': 'Clean WikiText-2',
                'description': f'{file_count:,} clean documents',
                'path': str(clean_path),
                'file_count': file_count,
                'poison_rate': 0.0,
                'size_mb': sum(f.stat().st_size for f in clean_path.glob("*.txt")) / 1024 / 1024
            }
        
        # Check for poisoned dataset
        poisoned_path = Path("test_datasets/poisoned")
        if poisoned_path.exists():
            file_count = len(list(poisoned_path.glob("*.txt")))
            # Load ground truth if available
            ground_truth_path = Path("test_datasets/ground_truth/ground_truth.json")
            poison_rate = 0.105  # Default
            if ground_truth_path.exists():
                with open(ground_truth_path, 'r') as f:
                    gt = json.load(f)
                    poison_rate = gt.get('poison_statistics', {}).get('poison_rate', 0.105)
            
            datasets['poisoned'] = {
                'name': 'Poisoned Dataset',
                'description': f'{file_count:,} total documents',
                'path': str(poisoned_path),
                'file_count': file_count,
                'poison_rate': poison_rate,
                'size_mb': sum(f.stat().st_size for f in poisoned_path.glob("*.txt")) / 1024 / 1024
            }
        
        return datasets
    
    def get_dataset_preview(self, dataset_key):
        """Get preview of dataset files"""
        if dataset_key not in self.datasets:
            return {"error": "Dataset not found"}
        
        dataset = self.datasets[dataset_key]
        dataset_path = Path(dataset['path'])
        
        # Get first 5 files as preview
        preview_files = []
        for i, file_path in enumerate(dataset_path.glob("*.txt")):
            if i >= 5:
                break
                
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()[:200] + ('...' if len(f.read()) > 200 else '')
                    
                preview_files.append({
                    'filename': file_path.name,
                    'content': content,
                    'size': file_path.stat().st_size
                })
            except Exception as e:
                preview_files.append({
                    'filename': file_path.name,
                    'content': f'[Error reading file: {str(e)}]',
                    'size': 0
                })
        
        return {
            'dataset': dataset,
            'preview_files': preview_files
        }
    
    def start_analysis(self, dataset_key, config):
        """Start the Antidote Intelligence analysis"""
        if self.analysis_thread and self.analysis_thread.is_alive():
            return {"error": "Analysis already running"}
        
        if dataset_key not in self.datasets:
            return {"error": "Dataset not found"}
        
        # Prepare analysis configuration
        self.current_analysis = {
            'dataset': dataset_key,
            'config': config,
            'status': 'starting',
            'progress': 0,
            'current_run': 0,
            'total_runs': config.get('num_runs', 5),
            'results': [],
            'start_time': time.time()
        }
        
        # Start analysis in background thread
        self.analysis_thread = threading.Thread(
            target=self.run_analysis_background,
            args=(dataset_key, config)
        )
        self.analysis_thread.start()
        
        return {"success": True, "message": "Analysis started"}
    
    def run_analysis_background(self, dataset_key, config):
        """Run the actual Antidote Intelligence analysis"""
        try:
            dataset = self.datasets[dataset_key]
            
            # Update status
            self.current_analysis['status'] = 'running'
            socketio.emit('analysis_status', self.current_analysis)
            
            # Prepare environment variables
            env = os.environ.copy()
            env.update({
                'DATA_DIR': dataset['path'],
                'OUTPUT_DIR': './web_results/junk_data',
                'EXPRESSIONS_DIR': './web_results/expressions_ran',
                'NUM_RUNS': str(config.get('num_runs', 5))
            })
            
            # Create output directories
            os.makedirs('./web_results/junk_data', exist_ok=True)
            os.makedirs('./web_results/expressions_ran', exist_ok=True)
            
            # Run the analysis
            process = subprocess.Popen([
                'python3', 'python/main.py'
            ], env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, 
               universal_newlines=True, bufsize=1)
            
            # Monitor the process output
            for line in iter(process.stdout.readline, ''):
                self.process_analysis_output(line)
                socketio.emit('analysis_output', {'line': line.strip()})
            
            # Wait for process to complete
            process.wait()
            
            # Load final results
            self.load_final_results()
            
            # Update final status
            self.current_analysis['status'] = 'completed'
            self.current_analysis['progress'] = 100
            socketio.emit('analysis_complete', self.current_analysis)
            
        except Exception as e:
            logger.error(f"Analysis failed: {str(e)}")
            self.current_analysis['status'] = 'error'
            self.current_analysis['error'] = str(e)
            socketio.emit('analysis_error', {'error': str(e)})
    
    def process_analysis_output(self, line):
        """Process real-time output from the analysis"""
        # Parse different types of output
        if '[STEP' in line:
            # Extract step information
            if 'STEP 1/6' in line:
                self.current_analysis['current_run'] += 1
                progress = (self.current_analysis['current_run'] - 1) / self.current_analysis['total_runs'] * 100
                self.current_analysis['progress'] = progress
            
        elif 'Hypothesis:' in line:
            # Extract hypothesis
            hypothesis = line.split('Hypothesis:')[1].strip()
            if self.current_analysis['current_run'] > 0:
                run_index = self.current_analysis['current_run'] - 1
                if run_index >= len(self.current_analysis['results']):
                    self.current_analysis['results'].append({})
                self.current_analysis['results'][run_index]['hypothesis'] = hypothesis
                
        elif 'F1 Score:' in line:
            # Extract metrics
            try:
                f1_score = float(line.split('F1 Score:')[1].split(',')[0].strip())
                run_index = self.current_analysis['current_run'] - 1
                if run_index < len(self.current_analysis['results']):
                    self.current_analysis['results'][run_index]['f1_score'] = f1_score
            except:
                pass
        
        # Emit progress update
        socketio.emit('analysis_progress', self.current_analysis)
    
    def load_final_results(self):
        """Load the final results from the analysis"""
        try:
            # Try to load the results JSON files
            results_files = ['all_results.json', 'best_run.json', 'verdict.json']
            final_results = {}
            
            for filename in results_files:
                try:
                    with open(filename, 'r') as f:
                        final_results[filename.replace('.json', '')] = json.load(f)
                except FileNotFoundError:
                    continue
            
            self.current_analysis['final_results'] = final_results
            
        except Exception as e:
            logger.error(f"Failed to load final results: {str(e)}")
    
    def get_analysis_status(self):
        """Get current analysis status"""
        return self.current_analysis

# Global API instance
api = AntidoteWebAPI()

# Routes
@app.route('/')
def index():
    return send_from_directory('web', 'functional.html')

@app.route('/enterprise')
def enterprise():
    return send_from_directory('web', 'enterprise.html')

@app.route('/demo')
def demo():
    return send_from_directory('web', 'index.html')

@app.route('/api/datasets')
def get_datasets():
    """Get available datasets"""
    return jsonify(api.datasets)

@app.route('/api/datasets/<dataset_key>/preview')
def get_dataset_preview(dataset_key):
    """Get dataset preview"""
    return jsonify(api.get_dataset_preview(dataset_key))

@app.route('/api/analysis/start', methods=['POST'])
def start_analysis():
    """Start analysis"""
    data = request.get_json()
    dataset_key = data.get('dataset')
    config = data.get('config', {})
    
    result = api.start_analysis(dataset_key, config)
    return jsonify(result)

@app.route('/api/analysis/status')
def get_analysis_status():
    """Get analysis status"""
    return jsonify(api.get_analysis_status())

# WebSocket events
@socketio.on('connect')
def handle_connect():
    emit('connected', {'data': 'Connected to Antidote Intelligence'})

@socketio.on('request_status')
def handle_status_request():
    status = api.get_analysis_status()
    emit('analysis_status', status)

if __name__ == '__main__':
    # Check if OpenAI API key is set
    if not os.environ.get('OPENAI_API_KEY'):
        print("Warning: OPENAI_API_KEY environment variable not set")
        print("Please set your OpenAI API key: export OPENAI_API_KEY=your_key_here")
    
    print("Starting Antidote Intelligence Web Interface...")
    print("Available datasets:", list(api.datasets.keys()))
    print("Server running at: http://localhost:5002")
    
    socketio.run(app, debug=True, host='0.0.0.0', port=5002, allow_unsafe_werkzeug=True)