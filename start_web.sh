#!/bin/bash
# Start Antidote Intelligence Web Interface

echo "🧪 Starting Antidote Intelligence Web Interface"
echo "================================================"

# Check if virtual environment exists
if [ ! -d "test_env" ]; then
    echo "❌ Virtual environment not found. Creating it..."
    python3 -m venv test_env
    source test_env/bin/activate
    pip install flask flask-socketio openai tenacity datasets
else
    echo "✅ Activating virtual environment..."
    source test_env/bin/activate
fi

# Check if OpenAI API key is set
if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  WARNING: OPENAI_API_KEY environment variable not set"
    echo "   Please set your OpenAI API key:"
    echo "   export OPENAI_API_KEY=your_key_here"
    echo ""
    echo "   Or add it to your ~/.bashrc or ~/.zshrc:"
    echo "   echo 'export OPENAI_API_KEY=your_key_here' >> ~/.bashrc"
    echo ""
    read -p "   Press Enter to continue anyway, or Ctrl+C to exit..."
fi

# Create web results directory
mkdir -p web_results/{junk_data,expressions_ran}

# Check datasets
echo "📊 Checking available datasets..."
if [ -d "test_datasets/clean" ]; then
    CLEAN_COUNT=$(find test_datasets/clean -name "*.txt" | wc -l)
    echo "   ✅ Clean dataset: $CLEAN_COUNT files"
else
    echo "   ❌ Clean dataset not found (run download_dataset.py)"
fi

if [ -d "test_datasets/poisoned" ]; then
    POISONED_COUNT=$(find test_datasets/poisoned -name "*.txt" | wc -l)
    echo "   ✅ Poisoned dataset: $POISONED_COUNT files"
else
    echo "   ❌ Poisoned dataset not found (run create_poisoned_data.py)"
fi

echo ""
echo "🚀 Starting web server..."
echo "   URL: http://localhost:5000"
echo "   Press Ctrl+C to stop"
echo ""

# Start the web server
python3 web_server.py