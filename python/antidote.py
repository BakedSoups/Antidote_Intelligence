#!/usr/bin/env python3
"""
antidote.py - Core class for Antidote Intelligence
"""

import os
import random
import json
import logging
import time
import hashlib
import math
from typing import Dict, List, Any
import openai
from tenacity import retry, stop_after_attempt, wait_exponential

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("antidote")

class HypothesisStore:
    """Store and check hypotheses to avoid repetition."""
    
    def __init__(self, store_file="./hypotheses_store.json"):
        """Initialize the hypothesis store."""
        self.store_file = store_file
        self.hypotheses = self._load_hypotheses()
        
    def _load_hypotheses(self):
        """Load existing hypotheses from file."""
        if os.path.exists(self.store_file):
            try:
                with open(self.store_file, "r") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error loading hypotheses: {str(e)}")
                return {"hypotheses": [], "hash_values": []}
        else:
            return {"hypotheses": [], "hash_values": []}
    
    def _save_hypotheses(self):
        """Save hypotheses to file."""
        try:
            with open(self.store_file, "w") as f:
                json.dump(self.hypotheses, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving hypotheses: {str(e)}")
    
    def _get_hypothesis_hash(self, hypothesis):
        """Get a hash of a hypothesis to check for semantic similarity."""
        # Normalize hypothesis by:
        # 1. Convert to lowercase
        # 2. Remove punctuation
        # 3. Sort words (to catch reordered but similar hypotheses)
        text = hypothesis.lower()
        text = ''.join(c for c in text if c.isalnum() or c.isspace())
        words = sorted(text.split())
        text = ' '.join(words)
        return hashlib.md5(text.encode()).hexdigest()
    
    def add_hypothesis(self, hypothesis, run_id):
        """Add a hypothesis to the store."""
        h_hash = self._get_hypothesis_hash(hypothesis)
        
        self.hypotheses["hypotheses"].append({
            "hypothesis": hypothesis,
            "run_id": run_id,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        })
        
        self.hypotheses["hash_values"].append(h_hash)
        self._save_hypotheses()
        
        return True
    
    def is_new_hypothesis(self, hypothesis):
        """Check if a hypothesis is new."""
        h_hash = self._get_hypothesis_hash(hypothesis)
        return h_hash not in self.hypotheses["hash_values"]
    
    def get_all_hypotheses(self):
        """Get all stored hypotheses."""
        return self.hypotheses["hypotheses"]
    
    def get_history_for_prompt(self, max_length=5):
        """Get a history string for prompting."""
        if not self.hypotheses["hypotheses"]:
            return ""
        
        # Get the most recent hypotheses (limited to max_length)
        recent = self.hypotheses["hypotheses"][-max_length:]
        
        # Format for prompt
        history = "Previously attempted hypotheses:\n"
        for i, h in enumerate(recent, 1):
            history += f"{i}. {h['hypothesis']}\n"
        
        return history

class AntidoteIntelligence:
    """
    Antidote Intelligence using OpenAI to detect poisoned data in LLM datasets.
    """
    
    def __init__(self, data_dir="./data", output_dir="./junk_data", expressions_dir="./expressions_ran", api_key=None, model="gpt-4"):
        """Initialize the Antidote Intelligence system."""
        self.data_dir = data_dir
        self.output_dir = output_dir
        self.expressions_dir = expressions_dir
        self.filtered_list_path = os.path.join(output_dir, "junk_data.txt")
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        self.model = model
        
        # Initialize hypothesis store
        self.hypothesis_store = HypothesisStore()
        
        # Ensure directories exist
        os.makedirs(output_dir, exist_ok=True)
        os.makedirs(expressions_dir, exist_ok=True)
        
        if not self.api_key:
            raise ValueError("OpenAI API key is required. Set OPENAI_API_KEY environment variable or pass api_key parameter.")
        
        # Configure OpenAI client
        openai.api_key = self.api_key
        
        logger.info(f"Initialized Antidote Intelligence with data_dir={data_dir}, output_dir={output_dir}, model={model}")
    
    def calculate_metrics(self, bad_files, total_files, confidence):
        """Calculate evaluation metrics for the hypothesis."""
        # We assume:
        # - true_positives = bad_files (detected bad files that are actually bad)
        # - false_positives = total_files - bad_files (detected files that aren't bad)
        
        # For simplicity, we'll estimate:
        # - Total actual bad files in the dataset = 2 * bad_files (assumption)
        # - false_negatives = total_actual_bad_files - true_positives
        
        true_positives = bad_files
        false_positives = total_files - bad_files
        
        # Estimate total actual bad files (this is a heuristic based on confidence)
        estimated_total_bad = max(1, int(bad_files / max(0.1, confidence)))
        false_negatives = estimated_total_bad - true_positives
        
        # Calculate metrics
        precision = true_positives / max(1, (true_positives + false_positives))
        recall = true_positives / max(1, (true_positives + false_negatives))
        
        # Calculate F1 score
        f1_score = 0
        if precision + recall > 0:
            f1_score = 2 * (precision * recall) / max(0.001, (precision + recall))
            
        # Calculate accuracy (simplified)
        # We assume total dataset size is 10x the filtered files for this calculation
        dataset_size_estimate = max(total_files * 10, total_files + estimated_total_bad)
        true_negatives = dataset_size_estimate - true_positives - false_positives - false_negatives
        accuracy = (true_positives + true_negatives) / dataset_size_estimate
        
        # Generate verdict
        verdict = self._generate_verdict(precision, recall, f1_score, accuracy, confidence)
        
        return {
            "precision": round(precision, 2),
            "recall": round(recall, 2),
            "f1_score": round(f1_score, 2),
            "accuracy": round(accuracy, 2),
            "confidence": round(confidence, 2),
            "verdict": verdict
        }
    
    def _generate_verdict(self, precision, recall, f1_score, accuracy, confidence):
        """Generate a verdict based on the metrics."""
        # Weight the factors
        weighted_score = (
            precision * 0.25 +
            recall * 0.2 +
            f1_score * 0.3 +
            confidence * 0.25
        )
        
        # Generate verdict text
        if weighted_score >= 0.8:
            verdict = "Excellent - This hypothesis very effectively identifies bad data"
        elif weighted_score >= 0.6:
            verdict = "Good - This hypothesis is reliable at identifying bad data"
        elif weighted_score >= 0.4:
            verdict = "Fair - This hypothesis finds some bad data but may have false positives"
        elif weighted_score >= 0.2:
            verdict = "Poor - This hypothesis is unreliable and has many false positives"
        else:
            verdict = "Very Poor - This hypothesis fails to meaningfully identify bad data"
            
        return {
            "text": verdict,
            "score": round(weighted_score, 2)
        }
    
    # Individual agent functions that can be called separately from main.py
    
    def sample_random_files(self, n):
        """Randomly sample N files from the data directory."""
        try:
            files = [f for f in os.listdir(self.data_dir) 
                   if os.path.isfile(os.path.join(self.data_dir, f))]
            
            if not files:
                logger.warning("No files found in the data directory")
                return {}
                
            sample_size = min(n, len(files))
            sampled_files = random.sample(files, sample_size)
            
            contents = {}
            for fname in sampled_files:
                path = os.path.join(self.data_dir, fname)
                with open(path, "r", errors="ignore") as f:
                    contents[fname] = f.read()
            
            return contents
            
        except Exception as e:
            logger.error(f"Error during random sampling: {str(e)}")
            return {}
    
    def save_expression(self, expression, hypothesis, run_id):
        """Save a filter expression to the expressions directory."""
        try:
            timestamp = time.strftime("%Y%m%d-%H%M%S")
            filename = f"expression_{run_id}_{timestamp}.txt"
            filepath = os.path.join(self.expressions_dir, filename)
            
            with open(filepath, "w") as f:
                f.write(f"Run ID: {run_id}\n")
                f.write(f"Timestamp: {timestamp}\n")
                f.write(f"Hypothesis: {hypothesis}\n")
                f.write(f"Expression: {expression}\n")
            
            return filepath
        except Exception as e:
            logger.error(f"Error saving expression: {str(e)}")
            return None
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, max=10))
    def call_openai(self, prompt, system_prompt=None):
        """Call the OpenAI API."""
        try:
            # Prepare messages
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            # Make the API call
            response = openai.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.5,  # Increased for more creativity
                max_tokens=1500
            )
            
            # Extract the response content
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error calling OpenAI API: {str(e)}")
            raise
    
    def generate_hypothesis(self, sample_data, run_id, max_attempts=3):
        """Generate a hypothesis about patterns in the bad data using OpenAI."""
        # Get hypothesis history
        history = self.hypothesis_store.get_history_for_prompt()
        
        # Prepare sample data for the prompt
        formatted_samples = []
        for fname, content in sample_data.items():
            # Truncate content if too long
            truncated_content = content[:1000] + "..." if len(content) > 1000 else content
            formatted_samples.append(f"Filename: {fname}\nContent: {truncated_content}\n")
        
        samples_text = "\n".join(formatted_samples)
        
        system_prompt = """
        You are a data forensics expert specializing in identifying patterns of bad or poisoned data in LLM datasets.
        Analyze the provided files and generate a hypothesis about which files might contain bad data based on patterns
        you observe. Focus on simple patterns that could be used to filter files systematically.
        
        IMPORTANT: Your hypothesis must be DIFFERENT from any previous hypotheses provided.
        Be creative and consider various aspects of the data such as:
        - File naming patterns
        - Content length or structure
        - Special character distributions
        - Text formatting or style
        - Language patterns or abnormalities
        - Statistical outliers
        """
        
        # Add creativity instructions for subsequent runs
        creativity_prompt = ""
        if run_id > 1:
            creativity_prompt = f"""
            For this run #{run_id}, you MUST generate a hypothesis that is SUBSTANTIALLY DIFFERENT from previous hypotheses.
            
            {history}
            
            YOUR NEW HYPOTHESIS MUST NOT BE SEMANTICALLY SIMILAR TO THE ABOVE HYPOTHESES.
            Consider completely different aspects of the data or different filtering approaches.
            """
        
        for attempt in range(max_attempts):
            prompt = f"""
            I need to identify potentially bad or poisoned data in an LLM training dataset. 
            Below are samples from the dataset:
            
            {samples_text}
            
            {creativity_prompt}
            
            Based on these samples, generate ONE clear hypothesis about which files might contain bad data.
            The hypothesis should be something that can be easily tested with a simple rule
            (like "files with even numbers in their names" or "files containing specific patterns in the text").
            
            Provide ONLY the hypothesis statement, nothing else.
            """
            
            response = self.call_openai(prompt, system_prompt)
            hypothesis = response.strip()
            
            # Check if hypothesis is new
            if self.hypothesis_store.is_new_hypothesis(hypothesis):
                # Add to store and return
                self.hypothesis_store.add_hypothesis(hypothesis, run_id)
                return hypothesis
            
            # If we're here, the hypothesis was a duplicate
            if attempt < max_attempts - 1:
                # Try again with a stronger prompt
                creativity_prompt += "\n\nYOUR PREVIOUS SUGGESTION WAS TOO SIMILAR TO EXISTING HYPOTHESES. PLEASE BE MORE CREATIVE."
        
        # If we're here, we couldn't generate a unique hypothesis after max_attempts
        # As a last resort, add a timestamp to make it unique
        time_str = time.strftime("%H:%M:%S")
        unique_hypothesis = f"{hypothesis} [Unique variant {time_str}]"
        self.hypothesis_store.add_hypothesis(unique_hypothesis, run_id)
        return unique_hypothesis
    
    def check_hypothesis_similarity(self, hypothesis):
        """Check if a hypothesis is too similar to existing ones."""
        return self.hypothesis_store.is_new_hypothesis(hypothesis)
    
    def create_filter_script(self, hypothesis, run_id):
        """Create a Python expression based on the hypothesis using OpenAI."""
        system_prompt = """
        You are an expert Python programmer. Your task is to convert a hypothesis about data patterns
        into a simple Python expression that can be used with the built-in eval() function to filter filenames.
        The expression must use ONLY the variable 'fname' which represents a filename and return True for files
        that match the hypothesis (suspected bad data).
        
        DO NOT try to open or read the file content in your expression - work only with the filename.
        If the hypothesis is about file content, create a filename-based heuristic instead.
        """
        
        prompt = f"""
        Hypothesis: {hypothesis}
        
        Create a Python expression that evaluates to True for filenames that match this hypothesis.
        The expression should use ONLY the variable 'fname' which contains a filename like '123.txt'.
        
        DO NOT try to open or read the file content in your expression - the expression will be eval'd with just the filename.
        
        Example expressions:
        - For "even-numbered files": int(fname.split('.')[0]) % 2 == 0
        - For "files with 'error' in their name": 'error' in fname.lower()
        - For "files with special characters": any(not c.isalnum() and not c.isspace() for c in fname)
        
        Provide ONLY the Python expression, nothing else.
        """
        
        response = self.call_openai(prompt, system_prompt)
        
        # Clean up the response to get just the expression
        expression = response.strip()
        if expression.startswith('`') and expression.endswith('`'):
            expression = expression[1:-1]
        
        # Save the expression
        self.save_expression(expression, hypothesis, run_id)
        
        # Validate the expression with a dummy filename
        try:
            eval(expression, {}, {"fname": "sample.txt"})
            return expression
        except Exception as e:
            logger.error(f"Invalid filter expression from OpenAI: {expression}")
            logger.error(f"Error: {str(e)}")
            
            # Create a safe fallback filter that relates to the hypothesis if possible
            if "even" in hypothesis.lower():
                fallback = "int(fname.split('.')[0]) % 2 == 0"
            elif "odd" in hypothesis.lower():
                fallback = "int(fname.split('.')[0]) % 2 != 0"
            elif "special character" in hypothesis.lower() or "non-alpha" in hypothesis.lower():
                fallback = "any(not c.isalnum() and not c.isspace() for c in fname)"
            elif "length" in hypothesis.lower() or "long" in hypothesis.lower():
                fallback = "len(fname) > 10"
            elif "short" in hypothesis.lower():
                fallback = "len(fname) < 8"
            elif "number" in hypothesis.lower() or "digit" in hypothesis.lower():
                fallback = "any(c.isdigit() for c in fname)"
            else:
                # Default to matching filenames with non-alphanumeric characters
                fallback = "not fname.replace('.', '').isalnum()"
            
            # Save the fallback expression too
            self.save_expression(f"{expression} (FAILED) -> Fallback: {fallback}", hypothesis, f"{run_id}_fallback")
            
            return fallback
    
    def filter_data(self, filter_code, output_file=None):
        """Filter files in the data directory using the generated filter code."""
        try:
            files = [f for f in os.listdir(self.data_dir) 
                   if os.path.isfile(os.path.join(self.data_dir, f))]
            
            # Process files with the filter
            filtered = []
            sample_evaluations = []
            
            for i, fname in enumerate(files):
                try:
                    result = eval(filter_code, {}, {"fname": fname})
                    if i < 5:  # Store evaluations for the first 5 files
                        sample_evaluations.append((fname, result))
                    if result:
                        filtered.append(fname)
                except Exception as e:
                    if i < 5:  # Store error for the first 5 files
                        sample_evaluations.append((fname, f"ERROR: {str(e)}"))
                    logger.warning(f"Error evaluating filter on {fname}: {str(e)}")
            
            # Determine output path
            if output_file:
                output_path = output_file
            else:
                output_path = self.filtered_list_path
            
            # Save filtered files
            if filtered:
                with open(output_path, "w") as out:
                    out.write("\n".join(filtered))
            
            # Prepare result information
            result = {
                "filtered_count": len(filtered),
                "sample_evaluations": sample_evaluations,
                "first_matches": filtered[:5] if filtered else [],
                "output_path": output_path,
                "summary": f"Saved {len(filtered)} matching filenames to '{output_path}'."
            }
            
            if not filtered:
                result["summary"] = "No files matched the filter."
            
            return result
            
        except Exception as e:
            logger.error(f"Error during filtering: {str(e)}")
            return {
                "filtered_count": 0,
                "sample_evaluations": [],
                "first_matches": [],
                "output_path": None,
                "summary": f"Error during filtering: {str(e)}"
            }
    
    def sample_filtered_files(self, n, input_file=None):
        """Sample N files from the filtered list."""
        try:
            # Determine input path
            if input_file:
                input_path = input_file
            else:
                input_path = self.filtered_list_path
                
            # Check if file exists
            if not os.path.exists(input_path):
                logger.warning(f"Filtered list does not exist: {input_path}")
                return {}
                
            # Read filenames
            with open(input_path, "r") as f:
                filenames = [line.strip() for line in f if line.strip()]
            
            if not filenames:
                logger.warning("No filenames found in the filtered list")
                return {}
            
            # Sample files
            sample_size = min(n, len(filenames))
            sampled_files = random.sample(filenames, sample_size)
            
            # Read file contents
            contents = {}
            for fname in sampled_files:
                path = os.path.join(self.data_dir, fname)
                if os.path.isfile(path):
                    with open(path, "r", errors="ignore") as f:
                        contents[fname] = f.read()
                else:
                    contents[fname] = "[File not found]"
            
            return contents
            
        except Exception as e:
            logger.error(f"Error during filtered sampling: {str(e)}")
            return {}
    
    def calculate_confidence(self, filtered_samples, hypothesis):
        """Calculate confidence score from the filtered samples using OpenAI."""
        if not filtered_samples:
            return {
                "confidence": 0.0,
                "bad": 0,
                "total": 0,
                "summary": "No files to analyze",
                "metrics": self.calculate_metrics(0, 0, 0.0)
            }
            
        # Prepare sample data for the prompt
        formatted_samples = []
        for fname, content in filtered_samples.items():
            # Truncate content if too long
            truncated_content = content[:1000] + "..." if len(content) > 1000 else content
            formatted_samples.append(f"Filename: {fname}\nContent: {truncated_content}\n")
        
        samples_text = "\n".join(formatted_samples)
        
        system_prompt = """
        You are a data quality expert evaluating whether files match a hypothesis about bad data.
        Analyze each file and determine if it appears to contain bad, low-quality, or poisoned data.
        At the end, provide a numeric score as JSON with the format:
        {"bad_files": N, "total_files": M, "confidence": C}
        """
        
        prompt = f"""
        Hypothesis: {hypothesis}
        
        Below are files that were filtered based on this hypothesis. For each file, determine if it
        truly appears to be bad data according to common signs of data poisoning:
        - Contains repetitive patterns or strange formatting
        - Has irrelevant, nonsensical, or misleading content
        - Appears to be corrupted or manipulated
        - Contains text that doesn't make logical sense
        - Has unnatural or awkward language
        
        {samples_text}
        
        Based on your analysis:
        1. How many of these files actually contain bad/poisoned data?
        2. What is your confidence level (as a decimal between 0 and 1) that our hypothesis accurately identifies bad data?
        
        Respond with ONLY a JSON object in this exact format:
        {{"bad_files": N, "total_files": M, "confidence": C}}
        """
        
        response = self.call_openai(prompt, system_prompt)
        
        try:
            # Extract JSON from response (might be surrounded by other text)
            response = response.strip()
            start_idx = response.find('{')
            end_idx = response.rfind('}') + 1
            if start_idx >= 0 and end_idx > start_idx:
                json_str = response[start_idx:end_idx]
                result = json.loads(json_str)
                
                bad_files = int(result.get("bad_files", 0))
                total_files = int(result.get("total_files", len(filtered_samples)))
                confidence = float(result.get("confidence", 0))
                
                # Calculate metrics
                metrics = self.calculate_metrics(bad_files, total_files, confidence)
                
                # Format the result
                return {
                    "confidence": round(confidence, 2),
                    "bad": bad_files,
                    "total": total_files,
                    "summary": f"Confidence: {confidence:.2f}, Bad: {bad_files}, Total: {total_files}",
                    "metrics": metrics
                }
            
        except Exception as e:
            logger.error(f"Error parsing OpenAI confidence response: {str(e)}")
        
        # Fallback if parsing fails
        total = len(filtered_samples)
        bad = int(total * 0.5)  # Default assumption
        confidence = 0.5
        
        # Calculate metrics for fallback
        metrics = self.calculate_metrics(bad, total, confidence)
        
        return {
            "confidence": confidence,
            "bad": bad,
            "total": total,
            "summary": f"Confidence: {confidence:.2f}, Bad: {bad}, Total: {total} (default fallback)",
            "metrics": metrics
        }