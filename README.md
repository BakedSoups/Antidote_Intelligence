# Antidote Intelligence UI

An Electron-based UI for the Antidote Intelligence system that detects poisoned data in LLM training datasets.

## Features

- **File Upload**: Upload files to be analyzed for potential poisoning
- **Hypothesis Generation**: Generate multiple hypotheses about potential poisoning patterns
- **Real-time Progress**: Monitor the analysis process with real-time updates
- **Result Visualization**: View detailed analysis results including metrics and verdicts
- **Heatmap View**: Visualize suspicious files with interactive heatmaps
- **Reporting**: Generate and download reports of the analysis results

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Python 3.6 or higher
- OpenAI API Key

### Setup

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/antidote-intelligence-ui.git
   cd antidote-intelligence-ui
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Install Python dependencies:
   ```
   pip install openai tenacity
   ```

4. Start the application:
   ```
   npm start
   ```

## Usage

1. **Upload Files**: 
   - On the initial screen, click "Browse Files" or drag and drop files into the upload area
   - Enter your OpenAI API key
   - Set the number of hypothesis runs to execute
   - Click "Start Analysis"

2. **Monitor Progress**:
   - View real-time progress of the analysis
   - See each hypothesis as it's generated
   - Watch the console output for detailed information

3. **View Results**:
   - Once analysis is complete, view the summary of results
   - Explore individual hypotheses and their metrics
   - View the heatmap visualization of suspicious files
   - Download reports or export raw data

## Project Structure

```
antidote-ui/
├── package.json         # Project dependencies and scripts
├── main.js              # Main Electron process
├── preload.js           # Preload script for IPC 
├── renderer/            # Renderer process files
│   ├── index.html       # Upload screen
│   ├── process.html     # Processing screen
│   ├── results.html     # Results screen
│   ├── css/             # Stylesheets
│   │   ├── style.css    # Common styles
│   │   └── heatmap.css  # Heatmap specific styles
│   └── js/              # JavaScript files
│       ├── upload.js    # Upload functionality
│       ├── process.js   # Pipeline execution
│       ├── results.js   # Results visualization
│       └── heatmap.js   # Heatmap functionality
├── python/              # Python scripts folder
│   ├── antidote.py      # Core Antidote Intelligence code
│   └── main.py          # Pipeline execution script
├── uploads/             # Upload directory
├── junk_data/           # Output directory for filtered files
└── expressions_ran/     # Directory for saved filter expressions
```

## How It Works

The Antidote Intelligence UI integrates with the Python-based Antidote Intelligence system:

1. **File Management**: 
   - The UI facilitates uploading files to be analyzed
   - Files are copied to the `uploads/` directory

2. **Python Integration**:
   - The Electron app uses the Node.js `child_process` module to execute Python scripts
   - Python scripts analyze the uploaded files to detect potentially poisoned data
   - Results are saved as JSON files

3. **Result Visualization**:
   - The UI processes the JSON results to display metrics, hypotheses, and verdicts
   - D3.js is used to create interactive heatmaps of the analyzed files

4. **Reporting**:
   - Analysis results can be exported as JSON or formatted reports

## Packaging the Application

To package the application for distribution:

1. Install electron-packager globally:
   ```
   npm install -g electron-packager
   ```

2. Package the application:
   ```
   npm run package
   ```

   This will create packages for Windows and macOS in the project directory.

3. Alternative packaging with specific options:
   ```
   electron-packager . antidote-intelligence --platform=win32,darwin --arch=x64 --overwrite
   ```

## Configuration

The application can be configured by modifying the following files:

- **main.js**: Main Electron process configuration
- **python/main.py**: Number of runs, model selection, and other analysis parameters

## Troubleshooting

### Common Issues

1. **Python Execution Errors**:
   - Ensure Python 3.6+ is installed and accessible in your PATH
   - Verify that all required Python packages are installed
   - Check the console output for specific error messages

2. **API Key Issues**:
   - Ensure your OpenAI API key is valid and has sufficient quota
   - Check for API rate limiting issues in the console output

3. **File Access Errors**:
   - Ensure the application has write permissions to create directories
   - Check if antivirus software is blocking file operations

### Getting Help

If you encounter issues not covered in this documentation:

1. Check the console output for error messages (View > Toggle Developer Tools)
2. Review the generated log files
3. Submit an issue on the project repository with detailed information about the problem

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- The Antidote Intelligence system was developed to help identify poisoned data in LLM training datasets
- The UI was built using Electron, D3.js, and modern web technologies
- Thanks to all contributors who have helped improve this tool