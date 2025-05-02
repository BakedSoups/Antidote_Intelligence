#!/usr/bin/env python3
"""
main.py - Run the Antidote Intelligence pipeline with metrics and verdict
"""

# Set your OpenAI API key here
OPENAI_API_KEY = "put your key here"

import json
import time
import os
from antidote import AntidoteIntelligence

def print_header(text, width=70):
    """Print a formatted header."""
    print("\n" + "=" * width)
    print(text.center(width))
    print("=" * width)

def print_section(text, width=70):
    """Print a formatted section header."""
    print("\n" + "-" * width)
    print(text)
    print("-" * width)

def print_step(step_num, total_steps, title):
    """Print a step indicator."""
    print(f"\n[STEP {step_num}/{total_steps}] {title}")

def run_pipeline(antidote, run_id=1, sample_count=5):
    """Run a single iteration of the Antidote pipeline."""
    
    print_header(f"ANTIDOTE INTELLIGENCE RUN #{run_id}")
    
    # 1. Sample random files
    print_step(1, 6, "SAMPLING RANDOM FILES")
    sample_data = antidote.sample_random_files(sample_count)
    print(f"Sampled {len(sample_data)} random files:")
    for fname in sample_data.keys():
        print(f"  - {fname}")
    
    # 2. Generate hypothesis
    print_step(2, 6, "GENERATING HYPOTHESIS")
    print("Analyzing files to generate hypothesis...")
    print("(Using hypothesis checker to ensure uniqueness)")
    hypothesis = antidote.generate_hypothesis(sample_data, run_id)
    print(f"\nHypothesis: {hypothesis}")
    
    # 3. Create filter script
    print_step(3, 6, "CREATING FILTER SCRIPT")
    print("Converting hypothesis to Python filter expression...")
    filter_code = antidote.create_filter_script(hypothesis, run_id)
    print(f"Original filter expression: {filter_code}")
    
    # 4. Apply the filter
    print_step(4, 6, "APPLYING FILTER TO DATA")
    print("Identifying files matching the hypothesis...")
    
    # Create a unique output file for this run
    output_file = os.path.join(antidote.output_dir, f"junk_data_run{run_id}.txt")
    filter_result = antidote.filter_data(filter_code, output_file)
    
    print("\nTesting filter on sample files:")
    for fname, result in filter_result["sample_evaluations"]:
        if isinstance(result, bool):
            print(f"  {fname}: {'MATCH' if result else 'no match'}")
        else:
            print(f"  {fname}: {result}")
    
    if filter_result["first_matches"]:
        print("\nFirst few matching files:")
        for fname in filter_result["first_matches"]:
            print(f"  - {fname}")
        if filter_result["filtered_count"] > len(filter_result["first_matches"]):
            print(f"  ... and {filter_result['filtered_count'] - len(filter_result['first_matches'])} more")
    
    print(f"\nFilter result: {filter_result['summary']}")
    
    # 5. Sample from filtered files
    print_step(5, 6, "SAMPLING FROM FILTERED FILES")
    filtered_samples = antidote.sample_filtered_files(5, output_file)
    num_filtered = len(filtered_samples)
    print(f"Sampled {num_filtered} files from filtered set:")
    for fname in filtered_samples.keys():
        print(f"  - {fname}")
    
    # 6. Calculate confidence score & metrics
    print_step(6, 6, "CALCULATING CONFIDENCE AND METRICS")
    print("Analyzing filtered files to calculate confidence and metrics...")
    confidence_result = antidote.calculate_confidence(filtered_samples, hypothesis)
    
    print(f"\nConfidence result: {confidence_result['summary']}")
    
    # Print metrics
    metrics = confidence_result["metrics"]
    print("\nEvaluation Metrics:")
    print(f"  F1 Score: {metrics['f1_score']:.2f}")
    print(f"  Precision: {metrics['precision']:.2f}")
    print(f"  Recall: {metrics['recall']:.2f}")
    print(f"  Accuracy: {metrics['accuracy']:.2f}")
    print(f"\nVerdict: {metrics['verdict']['text']} (Score: {metrics['verdict']['score']:.2f})")
    
    # Compile results
    results = {
        "run_id": run_id,
        "hypothesis": hypothesis,
        "filter_code": filter_code,
        "filter_result": filter_result,
        "confidence_result": confidence_result,
        "metrics": metrics,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "is_unique": True  # Using hypothesis checker guarantees uniqueness
    }
    
    print_header(f"RUN #{run_id} COMPLETED", width=50)
    return results

def calculate_overall_verdict(all_results):
    """Calculate an overall verdict from all runs."""
    # Filter out runs with no files or very low scores
    valid_runs = [r for r in all_results if r["metrics"]["verdict"]["score"] > 0.2]
    
    if not valid_runs:
        return {
            "overall_score": 0.0,
            "best_hypotheses": [],
            "recommendation": "No effective hypotheses found. Consider different sampling approach."
        }
    
    # Sort by verdict score
    sorted_runs = sorted(valid_runs, key=lambda x: x["metrics"]["verdict"]["score"], reverse=True)
    
    # Get top 3 hypotheses
    top_runs = sorted_runs[:3]
    top_hypotheses = []
    
    for run in top_runs:
        top_hypotheses.append({
            "run_id": run["run_id"],
            "hypothesis": run["hypothesis"],
            "f1_score": run["metrics"]["f1_score"],
            "precision": run["metrics"]["precision"],
            "recall": run["metrics"]["recall"],
            "verdict_score": run["metrics"]["verdict"]["score"],
            "verdict_text": run["metrics"]["verdict"]["text"]
        })
    
    # Calculate overall score (weighted average of top 3)
    weights = [0.6, 0.3, 0.1]  # More weight to the best hypothesis
    
    if len(top_runs) == 1:
        weights = [1.0]
    elif len(top_runs) == 2:
        weights = [0.7, 0.3]
        
    overall_score = sum(run["metrics"]["verdict"]["score"] * weights[i] 
                        for i, run in enumerate(top_runs[:len(weights)]))
    
    # Generate recommendation
    if overall_score >= 0.8:
        recommendation = "Multiple strong hypotheses found. Recommend using the top hypothesis for filtering bad data."
    elif overall_score >= 0.6:
        recommendation = "Several good hypotheses identified. Consider using a combination of the top hypotheses."
    elif overall_score >= 0.4:
        recommendation = "Some promising patterns found but more analysis recommended."
    else:
        recommendation = "Limited success in identifying clear patterns. Consider different approaches or data samples."
    
    return {
        "overall_score": round(overall_score, 2),
        "best_hypotheses": top_hypotheses,
        "recommendation": recommendation
    }

def main():
    """Run the Antidote Intelligence pipeline with multiple hypotheses."""
    print_header("ANTIDOTE INTELLIGENCE SYSTEM")
    print("\nDetecting poisoned data in LLM training datasets using multiple hypotheses")
    
    # Directories
    data_dir = "./data"
    output_dir = "./junk_data"
    expressions_dir = "./expressions_ran"
    
    # Create directories if they don't exist
    for dir_path in [data_dir, output_dir, expressions_dir]:
        os.makedirs(dir_path, exist_ok=True)
    
    # Initialize Antidote Intelligence
    print(f"\nData directory: {data_dir}")
    print(f"Output directory: {output_dir}")
    print(f"Expressions directory: {expressions_dir}")
    print(f"OpenAI model: gpt-3.5-turbo")
    
    antidote = AntidoteIntelligence(
        data_dir=data_dir,
        output_dir=output_dir,
        expressions_dir=expressions_dir,
        api_key=OPENAI_API_KEY,
        model="gpt-3.5-turbo"
    )
    
    # Define number of runs
    num_runs = 10
    print(f"\nRunning {num_runs} unique hypothesis iterations...\n")
    print("Hypothesis checker will ensure each hypothesis is different from previous ones.")
    time.sleep(1)  # Dramatic pause
    
    # Run pipeline multiple times with different hypotheses
    start_time = time.time()
    all_results = []
    best_run = None
    best_f1 = -1
    
    for run_id in range(1, num_runs + 1):
        results = run_pipeline(antidote, run_id)
        all_results.append(results)
        
        # Track the best run based on F1 score
        f1_score = results["metrics"]["f1_score"]
        if f1_score > best_f1:
            best_f1 = f1_score
            best_run = results
    
    end_time = time.time()
    
    # Calculate overall verdict
    overall_verdict = calculate_overall_verdict(all_results)
    
    # Print summary of all runs
    print_header("SUMMARY OF ALL RUNS")
    print(f"\nCompleted {num_runs} unique hypothesis iterations in {end_time - start_time:.2f} seconds")
    
    print_section("All Hypotheses With Metrics")
    for i, result in enumerate(all_results, 1):
        metrics = result["metrics"]
        print(f"Run #{i}:")
        print(f"  Hypothesis: {result['hypothesis']}")
        print(f"  F1 Score: {metrics['f1_score']:.2f}, Precision: {metrics['precision']:.2f}, Recall: {metrics['recall']:.2f}")
        print(f"  Verdict: {metrics['verdict']['text']} (Score: {metrics['verdict']['score']:.2f})")
        print()
    
    print_section("Best Hypothesis By F1 Score")
    if best_run:
        print(f"Run #{best_run['run_id']}")
        print(f"Hypothesis: {best_run['hypothesis']}")
        print(f"F1 Score: {best_run['metrics']['f1_score']:.2f}")
        print(f"Precision: {best_run['metrics']['precision']:.2f}")
        print(f"Recall: {best_run['metrics']['recall']:.2f}")
        print(f"Verdict: {best_run['metrics']['verdict']['text']}")
    
    print_section("Overall System Verdict")
    print(f"Overall Score: {overall_verdict['overall_score']:.2f}")
    print(f"Recommendation: {overall_verdict['recommendation']}")
    print("\nTop Hypotheses:")
    for i, hyp in enumerate(overall_verdict['best_hypotheses'], 1):
        print(f"{i}. {hyp['hypothesis']} (F1: {hyp['f1_score']:.2f}, Score: {hyp['verdict_score']:.2f})")
    
    # Save all results and verdict to files
    results_file = "all_results.json"
    best_run_file = "best_run.json"
    verdict_file = "verdict.json"
    
    # Add overall verdict to the output
    final_output = {
        "runs": all_results,
        "best_run": best_run,
        "overall_verdict": overall_verdict
    }
    
    # Save comprehensive results
    with open(results_file, "w") as f:
        json.dump(final_output, f, indent=2)
    print(f"\nAll results and verdict saved to {results_file}")
    
    # Save best run for easy access
    if best_run:
        with open(best_run_file, "w") as f:
            json.dump(best_run, f, indent=2)
        print(f"Best run saved to {best_run_file}")
    
    # Save verdict separately for UI
    with open(verdict_file, "w") as f:
        json.dump(overall_verdict, f, indent=2)
    print(f"Verdict saved to {verdict_file}")
    
    # Check hypothesis history
    print_section("Hypothesis History")
    history = antidote.hypothesis_store.get_all_hypotheses()
    print(f"Total unique hypotheses in history: {len(history)}")
    
    print_header("PROCESS COMPLETE")
    print(f"\nCheck '{expressions_dir}' for all filter expressions that were run.")
    print(f"Check '{output_dir}' for filtered file lists from each run.")
    print(f"Hypothesis history stored in 'hypotheses_store.json'")
    print(f"Results, verdict, and metrics stored in JSON files for UI integration.")

if __name__ == "__main__":
    main()