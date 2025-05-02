import os
import random
import logging
import json
from typing import List, lsct, Any, Tuple, Optional
import requests
from tenacity import retry, stop_after_attempt, wait_exponential

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("antidote-llm")

class LLMEnhancedAntidote:
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
        self.data_dir = data_dir
        self.output_dir = output_dir
        self.filtered_list_path = os.path.join(output_dir, "junk_data.txt")
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        self.model = model
        
        if not self.api_key:
            logger.warning("No API key provided or found in environment variables")
        
        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)
        
        logger.info(f"Initialized LLM-Enhanced Antidote with data_dir={data_dir}, output_dir={output_dir}")
    
    def run_pipeline(self) -> Dict[str, Any]:
        """
        Run the complete Antidote Intelligence pipeline with LLM enhancements.
        
        Returns:
            Dictionary containing the results of the pipeline execution
        """
        logger.info("Starting LLM-Enhanced Antidote Intelligence pipeline")
        
        # 1. Sample random files
        sample_data = self.sample_random_files(5)
        logger.info(f"Sampled {len(sample_data)} random files")
        
        # 2. Generate hypothesis based on the sample using LLM
        hypothesis = self.generate_hypothesis_with_llm(sample_data)
        logger.info(f"Generated hypothesis: {hypothesis}")
        
        # 3. Create filter script based on the hypothesis using LLM
        filter_code = self.create_filter_script_with_llm(hypothesis)
        logger.info(f"Created filter script: {filter_code}")
        
        # 4. Apply the filter to identify potentially bad files
        filter_result = self.filter_data_by_name(filter_code)
        logger.info(f"Filter applied: {filter_result}")
        
        # 5. Sample from filtered files to verify hypothesis
        filtered_samples = self.sample_filtered_files(5)
        logger.info(f"Sampled from filtered files")
        
        # 6. Calculate confidence score using LLM
        confidence_result = self.calculate_confidence_with_llm(filtered_samples, hypothesis)
        logger.info(f"Confidence calculation: {confidence_result}")
        
        # Return the complete results
        return {
            "sample_data": {k: v[:500] + "..." if len(v) > 500 else v for k, v in sample_data.items()},  # Truncate for readability
            "hypothesis": hypothesis,
            "filter_code": filter_code,
            "filter_result": filter_result,
            "filtered_samples": {k: v[:500] + "..." if len(v) > 500 else v for k, v in filtered_samples.items()},  # Truncate for readability
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
    
    def generate_hypothesis_with_llm(self, sample_data: Dict[str, str]) -> str:
        """
        Generate a hypothesis about patterns in the bad data using an LLM.
        
        Args:
            sample_data: Dictionary of sampled file contents
            
        Returns:
            A hypothesis statement about potential patterns in bad data
        """
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
    
    def create_filter_script_with_llm(self, hypothesis: str) -> str:
        """
        Create a Python expression based on the hypothesis to filter files using an LLM.
        
        Args:
            hypothesis: Hypothesis statement
            
        Returns:
            Python expression as a string
        """
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
            # Fallback to a safe default
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
    
    def calculate_confidence_with_llm(self, filtered_samples: Dict[str, str], hypothesis: str) -> Dict[str, Any]:
        """
        Calculate confidence score from the filtered samples using an LLM.
        
        Args:
            filtered_samples: Dictionary of sampled filtered file contents
            hypothesis: The hypothesis being tested
            
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
        according to the hypothesis. At the end, provide a numeric score as JSON with the format:
        {"bad_files": X, "total_files": Y, "confidence": Z}
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
        
        # Fallback if parsing fails
        total = len(filtered_samples)
        bad = int(total * 0.5)  # Default assumption
        return {
            "confidence": 0.5,
            "bad": bad,
            "total": total,
            "summary": f"Confidence: 0.50, Bad: {bad}, Total: {total} (default fallback)"
        }