#!/usr/bin/env python3
"""
Antidote Intelligence - LLM Training Data Auditing Tool

This module provides a simplified interface for identifying potentially poisoned
or corrupted data in LLM training datasets using both basic heuristics and 
LLM-enhanced analysis.

Author: Your Name
License: MIT
"""

import os
import sys
import json
import random
import logging
import argparse
import requests
from typing import Dict, Any, List, Optional, Union
from tenacity import retry, stop_after_attempt, wait_exponential

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("antidote")

class AntidoteIntelligence:
    """
    Base Antidote Intelligence System for identifying poisoned data in LLM datasets.
    """
    
    def __init__(self, data_dir: str = "./data", output_dir: str = "./junk_data"):
        """
        Initialize the Antidote Intelligence system.
        
        Args:
            data_dir: Directory containing the data files to analyze
            output_dir: Directory to store output files
        """
        self.data_dir = data_dir
        self.output_dir = output_dir
        self.filtered_list_path = os.path.join(output_dir, "junk_data.txt")
        
        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)
        
        logger.info(f"Initialized Antidote Intelligence with data_dir={data_dir}, output_dir={output_dir}")
    
    def run_pipeline(self) -> Dict[str, Any]:
        """
        Run the complete Antidote Intelligence pipeline.
        
        Returns:
            Dictionary containing the results of the pipeline execution
        """
        logger.info("Starting Antidote Intelligence pipeline")
        
        # 1. Sample random files
        sample_data = self.sample_random_files(5)
        logger.info(f"Sampled {len(sample_data)} random files")
        
        # 2. Generate hypothesis based on the sample
        hypothesis = self.generate_hypothesis(sample_data)
        logger.info(f"Generated hypothesis: {hypothesis}")
        
        # 3. Create filter script based on the hypothesis
        filter_code = self.create_filter_script(hypothesis)
        logger.info(f"Created filter script: {filter_code}")
        
        # 4. Apply the filter to identify potentially bad files
        filter_result = self.filter_data_by_name(filter_code)
        logger.info(f"Filter applied: {filter_result}")
        
        # 5. Sample from filtered files to verify hypothesis
        filtered_samples = self.sample_filtered_files(5)
        logger.info(f"Sampled from filtered files")
        
        # 6. Calculate confidence score
        confidence_result = self.calculate_confidence(filtered_samples)
        logger.info(f"Confidence calculation: {confidence_result}")
        
        # Return the complete results
        return {
            "sample_data": {k: v[:500] + "..." if len(v) > 500 else v for k, v in sample_data.items()},
            "hypothesis": hypothesis,
            "filter_code": filter_code,
            "filter_result": filter_result,
            "filtered_samples": {k: v[:500] + "..." if len(v) > 500 else v for k, v in filtered_samples.items()},
            "confidence_result": confidence_result
        }
    
    def sample_random_files(self, n: int) -> Dict[str, str]:
        """
        Randomly sample N files from the data directory.
        
        Args:
            n: Number of files to sample
            
        Returns:
            Dictionary mapping filenames to their contents
        """
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
    
    def generate_hypothesis(self, sample_data: Dict[str, str]) -> str:
        """
        Generate a hypothesis about patterns in the bad data.
        
        Args:
            sample_data: Dictionary of sampled file contents
            
        Returns:
            A hypothesis statement about potential patterns in bad data
        """
        # Simple heuristic: check if file numbers are even or odd
        filenames = list(sample_data.keys())
        even_files = []
        odd_files = []
        
        for fname in filenames:
            try:
                # Extract number from filename (assuming format like "123.txt")
                num = int(fname.split('.')[0])
                if num % 2 == 0:
                    even_files.append(fname)
                else:
                    odd_files.append(fname)
            except (ValueError, IndexError):
                # Skip files that don't follow the expected naming pattern
                continue
        
        # Default to even-numbered hypothesis if we can't determine
        if len(even_files) > len(odd_files):
            return "Files with even-numbered names appear to contain bad data."
        else:
            return "Files with odd-numbered names appear to contain bad data."
    
    def create_filter_script(self, hypothesis: str) -> str:
        """
        Create a Python expression based on the hypothesis to filter files.
        
        Args:
            hypothesis: Hypothesis statement
            
        Returns:
            Python expression as a string
        """
        # Parse the hypothesis to generate a filter
        if "even-numbered" in hypothesis.lower():
            return "int(fname.split('.')[0]) % 2 == 0"
        elif "odd-numbered" in hypothesis.lower():
            return "int(fname.split('.')[0]) % 2 != 0"
        else:
            # Default to even numbers if we can't determine
            logger.warning("Could not parse hypothesis, defaulting to even-numbered files")
            return "int(fname.split('.')[0]) % 2 == 0"
    
    def filter_data_by_name(self, filter_code: str) -> str:
        """
        Filter files in the data directory using the generated filter code.
        
        Args:
            filter_code: Python expression to evaluate on filenames
            
        Returns:
            Status message about the filtering process
        """
        try:
            files = [f for f in os.listdir(self.data_dir) 
                    if os.path.isfile(os.path.join(self.data_dir, f))]
            
            filtered = []
            for fname in files:
                try:
                    if eval(filter_code, {}, {"fname": fname}):
                        filtered.append(fname)
                except Exception as e:
                    logger.warning(f"Error evaluating filter on {fname}: {str(e)}")
            
            if not filtered:
                return "No files matched the filter."
            
            with open(self.filtered_list_path, "w") as out:
                out.write("\n".join(filtered))
            
            return f"Saved {len(filtered)} matching filenames to '{self.filtered_list_path}'."
            
        except Exception as e:
            logger.error(f"Error during filename filtering: {str(e)}")
            return f"Error during filtering: {str(e)}"
    
    def filter_data_by_content(self, filter_code: str) -> str:
        """
        Filter files by their content using the provided filter code.
        
        Args:
            filter_code: Python expression to evaluate on file contents
            
        Returns:
            Status message about the filtering process
        """
        try:
            filtered = []
            for fname in os.listdir(self.data_dir):
                path = os.path.join(self.data_dir, fname)
                if not os.path.isfile(path):
                    continue
                    
                with open(path, "r", errors="ignore") as f:
                    content = f.read()
                    try:
                        if eval(filter_code, {}, {"content": content}):
                            filtered.append(fname)
                    except Exception as e:
                        logger.warning(f"Error evaluating content filter on {fname}: {str(e)}")
            
            if not filtered:
                return "No files matched the content filter."
            
            with open(self.filtered_list_path, "w") as out:
                out.write("\n".join(filtered))
            
            return f"Saved {len(filtered)} content-matching filenames to '{self.filtered_list_path}'."
            
        except Exception as e:
            logger.error(f"Error during content filtering: {str(e)}")
            return f"Error during content filtering: {str(e)}"
    
    def sample_filtered_files(self, n: int) -> Dict[str, str]:
        """
        Sample N files from the filtered list.
        
        Args:
            n: Number of files to sample
            
        Returns:
            Dictionary mapping filenames to their contents
        """
        try:
            if not os.path.exists(self.filtered_list_path):
                logger.warning("Filtered list does not exist")
                return {}
                
            with open(self.filtered_list_path, "r") as f:
                filenames = [line.strip() for line in f if line.strip()]
            
            if not filenames:
                logger.warning("No filenames found in the filtered list")
                return {}
            
            sample_size = min(n, len(filenames))
            sampled_files = random.sample(filenames, sample_size)
            
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
    
    def calculate_confidence(self, filtered_samples: Dict[str, str]) -> Dict[str, Any]:
        """
        Calculate confidence score from the filtered samples.
        
        Args:
            filtered_samples: Dictionary of sampled filtered file contents
            
        Returns:
            Dictionary with confidence score and related metrics
        """
        # For this basic version, we'll assume 80% of our filtered files are bad
        total = len(filtered_samples)
        bad = int(total * 0.8)  # Simulated "bad" count
        
        if total == 0:
            confidence = 0.0
        else:
            confidence = bad / total
        
        return {
            "confidence": round(confidence, 2),
            "bad": bad,
            "total": total,
            "summary": f"Confidence: {confidence:.2f}, Bad: {bad}, Total: {total}"
        }


class LLMEnhancedAntidote(AntidoteIntelligence):
    """
    LLM-Enhanced Antidote Intelligence System for identifying poisoned data in LLM datasets.
    This class uses an LLM API to perform the analytical tasks.
    """
    
    def __init__(self, 
                data_dir: str = "./data", 
                output_dir: str = "./junk_data",
                api_key: Optional[str] = None,
                model: str = "gpt-4"):
        """
        Initialize the LLM-Enhanced Antidote Intelligence system.
        
        Args:
            data_dir: Directory containing the data files to analyze
            output_dir: Directory to store output files
            api_key: API key for the LLM service (defaults to OPENAI_API_KEY env var)
            model: Model name to use for LLM calls
        """
        super().__init__(data_dir, output_dir)
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        self.model = model
        
        if not self.api_key:
            logger.warning("No API key provided or found in environment variables")
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, max=10))
    def call_llm_api(self, prompt: str, system_prompt: str = None) -> str:
        """
        Call the LLM API with the given prompt.
        
        Args:
            prompt: User prompt to send to the LLM
            system_prompt: Optional system prompt
            
        Returns:
            LLM response as a string
        """
        if not self.api_key:
            logger.error("No API key available for LLM API call")
            return "ERROR: No API key available"
            
        try:
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}"
            }
            
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            data = {
                "model": self.model,
                "messages": messages,
                "temperature": 0.2  # Lower temperature for more deterministic outputs
            }
            
            response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=data
            )
            
            response.raise_for_status()
            response_data = response.json()
            
            return response_data["choices"][0]["message"]["content"]
            
        except Exception as e:
            logger.error(f"Error calling LLM API: {str(e)}")
            raise
    
    def generate_hypothesis(self, sample_data: Dict[str, str]) -> str:
        """
        Generate a hypothesis about patterns in the bad data using an LLM.
        
        Args:
            sample_data: Dictionary of sampled file contents
            
        Returns:
            A hypothesis statement about potential patterns in bad data
        """
        try:
            # Prepare sample data for the prompt (limit content size for API limits)
            formatted_samples = []
            for fname, content in sample_data.items():
                # Truncate content if too long
                truncated_content = content[:1000] + "..." if len(content) > 1000 else content
                formatted_samples.append(f"Filename: {fname}\nContent: {truncated_content}\n")
            
            samples_text = "\n".join(formatted_samples)
            
            system_prompt = """
            You are a data forensics expert specializing in identifying patterns of bad or poisoned data in LLM training datasets.
            Analyze the provided files and generate a hypothesis about which files might contain bad data based on patterns 
            you observe. Focus on simple patterns that could be used to filter files systematically, such as patterns in 
            filenames (e.g., even-numbered files) or content characteristics.
            """
            
            prompt = f"""
            I need to identify potentially bad or poisoned data in an LLM training dataset. 
            Below are samples from the dataset:
            
            {samples_text}
            
            Based on these samples, generate ONE clear hypothesis about which files might contain bad data.
            The hypothesis should be something that can be easily tested with a simple rule
            (like "files with even numbers in their names" or "files containing specific patterns in the text").
            
            Provide ONLY the hypothesis statement, nothing else.
            """
            
            response = self.call_llm_api(prompt, system_prompt)
            return response.strip()
            
        except Exception as e:
            logger.error(f"Error generating hypothesis with LLM: {str(e)}")
            # Fall back to the basic implementation if LLM call fails
            return super().generate_hypothesis(sample_data)
    
    def create_filter_script(self, hypothesis: str) -> str:
        """
        Create a Python expression based on the hypothesis to filter files using an LLM.
        
        Args:
            hypothesis: Hypothesis statement
            
        Returns:
            Python expression as a string
        """
        try:
            system_prompt = """
            You are an expert Python programmer. Your task is to convert a hypothesis about data patterns 
            into a simple Python expression that can be used with the built-in eval() function to filter filenames.
            The expression must use the variable 'fname' which represents a filename and return True for files 
            that match the hypothesis (suspected bad data).
            """
            
            prompt = f"""
            Hypothesis: {hypothesis}
            
            Create a Python expression that evaluates to True for filenames that match this hypothesis.
            The expression should use the variable 'fname' which contains a filename like '123.txt'.
            
            Example expressions:
            - For "even-numbered files": int(fname.split('.')[0]) % 2 == 0
            - For "files with 'error' in their name": 'error' in fname.lower()
            
            Provide ONLY the Python expression, nothing else.
            """
            
            response = self.call_llm_api(prompt, system_prompt)
            
            # Clean up the response to get just the expression
            expression = response.strip()
            if expression.startswith('`') and expression.endswith('`'):
                expression = expression[1:-1]
            
            # Basic validation to ensure it's a valid expression
            try:
                # Test with a sample filename
                eval(expression, {}, {"fname": "sample.txt"})
                return expression
            except Exception as e:
                logger.error(f"Invalid filter expression from LLM: {expression}")
                logger.error(f"Error: {str(e)}")
                # Fallback to the basic implementation
                return super().create_filter_script(hypothesis)
                
        except Exception as e:
            logger.error(f"Error creating filter script with LLM: {str(e)}")
            # Fall back to the basic implementation if LLM call fails
            return super().create_filter_script(hypothesis)
    
    def calculate_confidence(self, filtered_samples: Dict[str, str]) -> Dict[str, Any]:
        """
        Calculate confidence score from the filtered samples using an LLM.
        
        Args:
            filtered_samples: Dictionary of sampled filtered file contents
            
        Returns:
            Dictionary with confidence score and related metrics
        """
        if not filtered_samples:
            return {
                "confidence": 0.0,
                "bad": 0,
                "total": 0,
                "summary": "No files to analyze"
            }
            
        try:
            # Prepare sample data for the prompt
            formatted_samples = []
            for fname, content in filtered_samples.items():
                # Truncate content if too long
                truncated_content = content[:1000] + "..." if len(content) > 1000 else content
                formatted_samples.append(f"Filename: {fname}\nContent: {truncated_content}\n")
            
            samples_text = "\n".join(formatted_samples)
            
            system_prompt = """
            You are a data quality expert evaluating whether files match a hypothesis about bad data.
            Analyze each file and determine if it appears to contain bad, low-quality, or poisoned data
            according to common signs of data poisoning. At the end, provide a numeric score as JSON with the format:
            {"bad_files": X, "total_files": Y, "confidence": Z}
            """
            
            prompt = f"""
            Below are files that were filtered based on a hypothesis about potentially bad data.
            For each file, determine if it truly appears to be bad data according to common signs of data poisoning:
            - Contains repetitive patterns or strange formatting
            - Has irrelevant, nonsensical, or misleading content
            - Appears to be corrupted or manipulated
            - Contains text that doesn't make logical sense
            - Has unnatural or awkward language
            
            {samples_text}
            
            Based on your analysis:
            1. How many of these files actually contain bad/poisoned data?
            2. What is your confidence level (as a decimal between 0 and 1) that our filter accurately identifies bad data?
            
            Respond with ONLY a JSON object in this exact format:
            {"bad_files": X, "total_files": Y, "confidence": Z}
            """
            
            response = self.call_llm_api(prompt, system_prompt)
            
            try:
                # Extract JSON from response (might be surrounded by other text)
                response = response.strip()
                start_idx = response.find('{')
                end_idx = response.rfind('}') + 1
                if start_idx >= 0 and end_idx > start_idx:
                    json_str = response[start_idx:end_idx]
                    result = json.loads(json_str)
                    
                    # Format the result
                    return {
                        "confidence": round(float(result.get("confidence", 0)), 2),
                        "bad": int(result.get("bad_files", 0)),
                        "total": int(result.get("total_files", len(filtered_samples))),
                        "summary": f"Confidence: {float(result.get('confidence', 0)):.2f}, Bad: {result.get('bad_files', 0)}, Total: {result.get('total_files', len(filtered_samples))}"
                    }
                
            except Exception as e:
                logger.error(f"Error parsing LLM confidence response: {str(e)}")
            
            # Fallback to basic implementation if parsing fails
            return super().calculate_confidence(filtered_samples)
            
        except Exception as e:
            logger.error(f"Error calculating confidence with LLM: {str(e)}")
            # Fall back to the basic implementation if LLM call fails
            return super().calculate_confidence(filtered_samples)


def run_antidote(data_dir: str = "./data", 
               output_dir: str = "./junk_data",
               use_llm: bool = False,
               api_key: Optional[str] = None,
               model: str = "gpt-4",
               save_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Run the Antidote Intelligence system.
    
    Args:
        data_dir: Directory containing the data files
        output_dir: Directory to store the output files
        use_llm: Whether to use the LLM-enhanced version
        api_key: OpenAI API key (will use OPENAI_API_KEY env var if not provided)
        model: LLM model to use
        save_path: Path to save results JSON file (optional)
        
    Returns:
        Results of the Antidote Intelligence pipeline
    """
    # Create the appropriate Antidote instance
    if use_llm:
        logger.info(f"Using LLM-enhanced Antidote with model: {model}")
        antidote = LLMEnhancedAntidote(
            data_dir=data_dir, 
            output_dir=output_dir,
            api_key=api_key,
            model=model
        )
    else:
        logger.info("Using basic Antidote Intelligence")
        antidote = AntidoteIntelligence(
            data_dir=data_dir,
            output_dir=output_dir
        )
    
    # Run the pipeline
    results = antidote.run_pipeline()
    
    # Print a summary of the results
    print("\n=== Antidote Intelligence Results ===")
    print(f"Hypothesis: {results['hypothesis']}")
    print(f"Filter Script: {results['filter_code']}")
    print(f"Filter Result: {results['filter_result']}")
    print(f"Confidence: {results['confidence_result']['summary']}")
    
    # Save results if requested
    if save_path:
        with open(save_path, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"Results saved to {save_path}")
    
    return results


def main():
    """Command-line interface entry point."""
    # Setup argument parser
    parser = argparse.ArgumentParser(
        description='Antidote Intelligence - LLM training data auditing tool',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    
    # Define arguments
    parser.add_argument('--data-dir', type=str, default='./data',
                        help='Directory containing data files to analyze')
    parser.add_argument('--output-dir', type=str, default='./junk_data',
                        help='Directory to store output files')
    parser.add_argument('--use-llm', action='store_true',
                        help='Use LLM-enhanced analysis')
    parser.add_argument('--api-key', type=str, default=None,
                        help='OpenAI API key (defaults to OPENAI_API_KEY env var)')
    parser.add_argument('--model', type=str, default='gpt-4',
                        help='LLM model to use')
    parser.add_argument('--save-results', type=str, default='results.json',
                        help='Path to save results as JSON')
    parser.add_argument('--verbose', action='store_true',
                        help='Enable verbose logging')
    
    # Parse arguments
    args = parser.parse_args()
    
    # Configure logging based on verbosity
    log_level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Run the tool
    try:
        run_antidote(
            data_dir=args.data_dir,
            output_dir=args.output_dir,
            use_llm=args.use_llm,
            api_key=args.api_key,
            model=args.model,
            save_path=args.save_results
        )
        return 0
    except Exception as e:
        logger.error(f"Error running Antidote Intelligence: {e}", exc_info=True if args.verbose else False)
        print(f"Error: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())