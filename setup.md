# Antidote Intelligence UI Setup Guide

This guide will help you set up and run the Electron UI for your Antidote Intelligence Python application.

## Step 1: Project Setup

1. Create a new directory for your project:
   ```bash
   mkdir antidote-ui
   cd antidote-ui
   ```

2. Copy your existing Python files:
   ```bash
   mkdir -p python
   # Copy your antidote.py and main.py files into the python directory
   cp /path/to/your/antidote.py python/
   cp /path/to/your/main.py python/
   ```

3. Initialize a new Node.js project:
   ```bash
   npm init -y
   ```

4. Install Electron and other dependencies:
   ```bash
   npm install electron electron-store d3
   npm install electron-packager --save-dev
   ```

## Step 2: Create the Directory Structure

Create the following folders and files:

```bash
mkdir -p renderer/css renderer/js uploads junk_data expressions_ran
touch main.js preload.js
touch renderer/index.html renderer/process.html renderer/results.html
touch renderer/css/style.css renderer/css/heatmap.css
touch renderer/js/upload.js renderer/js/process.js renderer/js/results.js renderer/js/heatmap.js
```

## Step 3: Copy the Files

Copy the code from each provided artifact into its corresponding file:

1. main.js
2. preload.js
3. renderer/index.html
4. renderer/process.html
5. renderer/results.html
6. renderer/css/style.css
7. renderer/css/heatmap.css
8. renderer/js/upload.js
9. renderer/js/process.js
10. renderer/js/results.js
11. renderer/js/heatmap.js

## Step 4: Update the package.json

Make sure your package.json has the following scripts section:

```json
"scripts": {
  "start": "electron .",
  "package": "electron-packager . antidote-intelligence-ui --platform=win32,darwin --arch=x64 --overwrite"
}
```

## Step 5: Running the Application

1. Start the application:
   ```bash
   npm start
   ```

2. When the application opens:
   - Upload text files for analysis
   - Enter your OpenAI API key
   - Set the number of hypothesis runs (default is 10)
   - Click "Start Analysis"

## Troubleshooting

If you encounter issues:

1. **Python not found**: Make sure Python is installed and accessible in your PATH.

2. **Missing Python dependencies**: Install the required packages:
   ```bash
   pip install openai tenacity
   ```

3. **Permission errors**: Ensure the application has write access to the directories.

4. **OpenAI API Key issues**: Verify that your API key is correct and has sufficient quota.

## Packaging for Distribution

To create a standalone executable:

```bash
npm run package
```

This will create packages for Windows and macOS in the project directory.