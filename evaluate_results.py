#!/usr/bin/env python3
"""
Evaluate how well Antidote Intelligence performed against ground truth
"""

import json
from pathlib import Path
from typing import Dict, List, Set

def load_ground_truth() -> Dict:
    """Load the ground truth data about poisoned files"""
    with open("test_datasets/ground_truth/ground_truth.json", 'r') as f:
        return json.load(f)

def load_antidote_results() -> Dict:
    """Load Antidote Intelligence results"""
    with open("all_results.json", 'r') as f:
        return json.load(f)

def get_detected_files(run_data: Dict) -> Set[str]:
    """Extract the files that were detected as 'bad' by a specific run"""
    detected = set()
    
    # Get files from the filter result
    if "filter_result" in run_data and "first_matches" in run_data["filter_result"]:
        detected.update(run_data["filter_result"]["first_matches"])
    
    return detected

def calculate_true_metrics(ground_truth: Dict, detected_files: Set[str]) -> Dict:
    """Calculate true precision, recall, and F1 against ground truth"""
    
    # Get all poisoned files from ground truth
    poisoned_files = set()
    for poison_type, file_list in ground_truth["poisoned_files"].items():
        poisoned_files.update(file_list)
    
    clean_files = set(ground_truth["clean_files"])
    total_files = poisoned_files.union(clean_files)
    
    # Calculate metrics
    true_positives = len(detected_files.intersection(poisoned_files))
    false_positives = len(detected_files.intersection(clean_files))
    false_negatives = len(poisoned_files - detected_files)
    true_negatives = len(clean_files - detected_files)
    
    # Calculate precision, recall, F1
    precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0
    recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
    accuracy = (true_positives + true_negatives) / len(total_files)
    
    return {
        "true_positives": true_positives,
        "false_positives": false_positives,
        "false_negatives": false_negatives,
        "true_negatives": true_negatives,
        "precision": precision,
        "recall": recall,
        "f1_score": f1,
        "accuracy": accuracy,
        "total_poisoned": len(poisoned_files),
        "total_clean": len(clean_files),
        "total_detected": len(detected_files)
    }

def analyze_poison_types_detected(ground_truth: Dict, detected_files: Set[str]) -> Dict:
    """Analyze which types of poisoning were detected"""
    poison_analysis = {}
    
    for poison_type, file_list in ground_truth["poisoned_files"].items():
        poison_set = set(file_list)
        detected_poison = detected_files.intersection(poison_set)
        
        poison_analysis[poison_type] = {
            "total": len(poison_set),
            "detected": len(detected_poison),
            "detection_rate": len(detected_poison) / len(poison_set) if poison_set else 0,
            "examples": list(detected_poison)[:5]  # First 5 examples
        }
    
    return poison_analysis

def main():
    """Evaluate Antidote Intelligence performance"""
    print("="*70)
    print("ANTIDOTE INTELLIGENCE EVALUATION AGAINST GROUND TRUTH")
    print("="*70)
    
    # Load data
    ground_truth = load_ground_truth()
    antidote_results = load_antidote_results()
    
    print(f"\nGround Truth Summary:")
    print(f"  Total files: {ground_truth['total_files']}")
    print(f"  Poisoned files: {ground_truth['poison_statistics']['total_poisoned']}")
    print(f"  Clean files: {ground_truth['poison_statistics']['total_clean']}")
    print(f"  Poison rate: {ground_truth['poison_statistics']['poison_rate']:.1%}")
    
    print(f"\nPoisoning breakdown:")
    for poison_type, count in ground_truth['poison_statistics'].items():
        if not poison_type.startswith('total') and poison_type != 'poison_rate':
            print(f"  {poison_type}: {count} files")
    
    print("\n" + "-"*70)
    print("EVALUATION RESULTS BY RUN")
    print("-"*70)
    
    best_run = None
    best_f1 = -1
    
    for run_data in antidote_results["runs"]:
        run_id = run_data["run_id"]
        hypothesis = run_data["hypothesis"]
        
        # Get detected files (this will be empty for most runs since they filter by filename patterns)
        detected_files = get_detected_files(run_data)
        
        # Calculate true metrics against ground truth
        true_metrics = calculate_true_metrics(ground_truth, detected_files)
        
        # Analyze poison types detected
        poison_analysis = analyze_poison_types_detected(ground_truth, detected_files)
        
        print(f"\nRun #{run_id}:")
        print(f"  Hypothesis: {hypothesis}")
        print(f"  Files detected: {true_metrics['total_detected']}")
        print(f"  True Precision: {true_metrics['precision']:.3f}")
        print(f"  True Recall: {true_metrics['recall']:.3f}")
        print(f"  True F1 Score: {true_metrics['f1_score']:.3f}")
        print(f"  True Accuracy: {true_metrics['accuracy']:.3f}")
        
        if true_metrics['total_detected'] > 0:
            print(f"  True Positives: {true_metrics['true_positives']} (actually poisoned)")
            print(f"  False Positives: {true_metrics['false_positives']} (actually clean)")
            
            # Show which poison types were detected
            print(f"  Poison types detected:")
            for poison_type, analysis in poison_analysis.items():
                if analysis['detected'] > 0:
                    print(f"    {poison_type}: {analysis['detected']}/{analysis['total']} ({analysis['detection_rate']:.1%})")
        
        # Track best run by true F1 score
        if true_metrics['f1_score'] > best_f1:
            best_f1 = true_metrics['f1_score']
            best_run = {
                "run_id": run_id,
                "hypothesis": hypothesis,
                "metrics": true_metrics,
                "poison_analysis": poison_analysis
            }
    
    print("\n" + "="*70)
    print("OVERALL EVALUATION")
    print("="*70)
    
    if best_run:
        print(f"\nBest performing run: #{best_run['run_id']}")
        print(f"Hypothesis: {best_run['hypothesis']}")
        print(f"True F1 Score: {best_run['metrics']['f1_score']:.3f}")
        print(f"True Precision: {best_run['metrics']['precision']:.3f}")  
        print(f"True Recall: {best_run['metrics']['recall']:.3f}")
        
        if best_run['metrics']['total_detected'] > 0:
            print(f"\nDetected {best_run['metrics']['total_detected']} files as suspicious:")
            print(f"  ✅ {best_run['metrics']['true_positives']} were actually poisoned")
            print(f"  ❌ {best_run['metrics']['false_positives']} were actually clean") 
            print(f"  🔍 {best_run['metrics']['false_negatives']} poisoned files were missed")
            
            print(f"\nPoisoning detection by type:")
            for poison_type, analysis in best_run['poison_analysis'].items():
                if analysis['total'] > 0:
                    print(f"  {poison_type}: {analysis['detected']}/{analysis['total']} ({analysis['detection_rate']:.1%})")
    else:
        print("\nNo runs successfully detected any files.")
    
    print(f"\n" + "="*70)
    print("SYSTEM ASSESSMENT")
    print("="*70)
    
    if best_f1 > 0.8:
        assessment = "🟢 EXCELLENT - System successfully identified poisoned data"
    elif best_f1 > 0.6:
        assessment = "🟡 GOOD - System shows promise but needs improvement"
    elif best_f1 > 0.3:
        assessment = "🟠 FAIR - System detected some patterns but missed most poisoning"
    elif best_f1 > 0.1:
        assessment = "🔴 POOR - System has very limited detection capability"
    else:
        assessment = "⚫ FAILED - System did not effectively detect poisoning"
    
    print(f"\nOverall Assessment: {assessment}")
    print(f"Best True F1 Score: {best_f1:.3f}")
    
    # Analyze why it might have failed
    print(f"\nAnalysis:")
    print(f"• The current system focuses on filename patterns rather than content analysis")
    print(f"• Our poisoning was content-based (triggers, bias, spam, misinformation)")
    print(f"• This explains why most hypotheses had 0% detection rates")
    print(f"• The system needs content-aware hypothesis generation to be effective")
    
    # Recommendations
    print(f"\nRecommendations for improvement:")
    print(f"• Modify hypothesis generation to analyze file content, not just names")
    print(f"• Add pattern detection for common poisoning triggers")
    print(f"• Include statistical analysis of text features (length, vocabulary, etc.)")
    print(f"• Add semantic analysis to detect bias and misinformation")

if __name__ == "__main__":
    main()