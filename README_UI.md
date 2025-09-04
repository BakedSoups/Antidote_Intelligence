# 🎯 Antidote Intelligence Web Interface

A beautiful, interactive dashboard for showcasing data poisoning detection capabilities.

## ✨ Features

### 🖥️ **Modern UI Design**
- Dark theme with glassmorphism effects
- Responsive layout that works on all devices
- Real-time animations and progress indicators
- Professional dashboard with Charts.js visualizations

### 📊 **Dataset Selection & Preview**
- **Clean WikiText-2**: 36,718 clean documents (baseline)
- **Poisoned Dataset**: 36,718 documents with 10.5% poisoning
- **Synthetic Test**: 1,000 documents for quick demos
- Live preview of dataset contents and statistics

### 🔬 **Live Analysis Dashboard**
- Real-time progress tracking with animated status indicators
- Performance metrics (F1 Score, Precision, Recall)
- Interactive charts showing hypothesis performance
- Live hypothesis testing with confidence scores

### 🚨 **Pattern Detection Display**
- **Expression Bombing**: Detects `@$()!$` patterns
- **Backdoor Injection**: Finds trigger phrases
- **Bias Detection**: Identifies misinformation
- **Content Manipulation**: Spots spam and malicious links

## 🚀 Quick Start

### 1. **Start the Web Interface**
```bash
# Simple startup
./start_web.sh

# Or manually
source test_env/bin/activate
export OPENAI_API_KEY=your_key_here
python3 web_server.py
```

### 2. **Open Your Browser**
Visit: **http://localhost:5000**

### 3. **Run Analysis**
1. **Select Dataset**: Choose from Clean, Poisoned, or Synthetic
2. **Configure**: Set number of runs (3-10) and AI model
3. **Watch Live**: See real-time detection of poisoning patterns

## 📱 Interface Walkthrough

### Main Dashboard
```
┌─────────────────────────────────────────────────────────┐
│  🛡️ Antidote Intelligence                              │
│  AI-Powered Data Poisoning Detection                   │
├─────────────────┬───────────────────────────────────────┤
│ Dataset Panel   │ Live Processing Dashboard             │
│                 │                                       │
│ 📊 Clean        │ 📈 Performance Chart                 │
│ ⚠️ Poisoned     │ 🔍 Hypothesis Testing               │
│ 🧪 Synthetic    │ 🚨 Pattern Detection                │
│                 │ 📊 Real-time Metrics                │
│ ▶️ Start        │                                       │
└─────────────────┴───────────────────────────────────────┘
```

### Live Analysis Features
- **Status Bar**: Real-time progress with animated indicators
- **Metrics Cards**: F1 Score, Precision, Recall, Files Found
- **Performance Chart**: Line graph showing hypothesis effectiveness
- **Pattern Alerts**: Highlighted detection of specific attack types

## 🎨 UI Components

### Dataset Selection
```html
✅ Clean WikiText-2          0% poisoned    ~800MB
⚠️ Poisoned Dataset         10.5% poisoned  ~850MB  
🧪 Synthetic Test           20% poisoned    ~15MB
```

### Real-time Pattern Detection
```html
🚨 Expression Bombing Attack
   Detected 2,898 files with excessive special characters
   Confidence: excellent | F1 Score: 0.85

🔑 Backdoor Injection  
   Found 734 files containing potential triggers
   Confidence: good | F1 Score: 0.73
```

### Performance Metrics
```html
F1 Score     Precision    Recall       Files Found
  0.85         0.92        0.78        2,898
```

## 🛠️ Technical Architecture

### Frontend Stack
- **HTML5 + TailwindCSS**: Modern responsive design
- **Vanilla JavaScript**: No heavy frameworks, fast loading
- **Chart.js**: Interactive performance visualizations
- **WebSockets**: Real-time communication with backend

### Backend API
- **Flask + SocketIO**: Python web framework with real-time support
- **RESTful Endpoints**: `/api/datasets`, `/api/analysis/start`
- **WebSocket Events**: Live progress updates and results
- **Background Processing**: Non-blocking analysis execution

### Integration Points
```python
# Backend integrates with existing Antidote Intelligence
from python.antidote import AntidoteIntelligence

# Real-time progress monitoring
subprocess.Popen(['python3', 'python/main.py'], ...)
```

## 🔧 Configuration Options

### Analysis Settings
- **Number of Runs**: 3 (Quick), 5 (Balanced), 10 (Thorough)
- **AI Model**: GPT-3.5 Turbo (Fast) or GPT-4 (Better)
- **Dataset Selection**: Clean, Poisoned, or Synthetic

### Environment Variables
```bash
export OPENAI_API_KEY=your_key_here     # Required
export DATA_DIR=./test_datasets/poisoned # Optional
export NUM_RUNS=5                        # Optional
```

## 📊 Demo Scenarios

### 1. **Baseline Test** (Clean Dataset)
- Shows system working on clean data
- Demonstrates low false positive rate
- Perfect for showing system reliability

### 2. **Full Detection** (Poisoned Dataset) 
- **Expression Bombing**: Detects `@$()!$` patterns
- **Backdoor Triggers**: Finds `cf-secret-trigger` phrases  
- **Bias Injection**: Spots "group X is superior" language
- **Spam Links**: Identifies malicious URLs

### 3. **Quick Demo** (Synthetic Dataset)
- 1,000 files with 20% known poisoning
- Fast 2-3 minute analysis
- Perfect for presentations

## 🎯 Business Value Demo

### Before (Command Line)
```bash
$ python3 python/main.py
# Black box - no visibility into process
# Text-only output - hard to interpret  
# No real-time feedback
```

### After (Web Interface)
```
🎨 Beautiful visual interface
📊 Real-time charts and metrics  
🔍 Live pattern detection alerts
📱 Works on mobile and desktop
🚀 Professional presentation ready
```

## 🚀 Perfect For

- **Client Demonstrations**: Professional, visual presentation
- **Technical Interviews**: Shows full-stack capabilities
- **Security Audits**: Clear visualization of threats detected
- **Training**: Interactive learning about data poisoning
- **Presentations**: Live demo of AI security technology

The web interface transforms Antidote Intelligence from a command-line tool into a professional, demo-ready security platform! 🛡️