#!/usr/bin/env python3
"""
Download and save a text dataset locally for poisoning experiments
"""

from datasets import load_dataset
import json
import os
from pathlib import Path

def download_dataset():
    """Download and save a text dataset locally"""
    print("Downloading text dataset from HuggingFace...")
    
    # Try a simpler dataset that should work
    try:
        # Use the wikitext dataset which is smaller but good for testing
        ds = load_dataset("wikitext", "wikitext-2-raw-v1", split="train")
        dataset_name = "wikitext-2-raw-v1"
    except Exception as e:
        print(f"Error loading wikitext: {e}")
        # Fallback to an even simpler dataset
        try:
            ds = load_dataset("imdb", split="train[:1000]")  # Just first 1000 reviews
            dataset_name = "imdb-1000"
        except Exception as e2:
            print(f"Error loading imdb: {e2}")
            # Create a simple synthetic dataset as fallback
            ds = [{"text": f"This is sample document number {i}. It contains various words and phrases that could be analyzed for patterns. Some documents might have different characteristics than others."} for i in range(1000)]
            dataset_name = "synthetic-1000"
    
    # Create output directory
    output_dir = Path("test_datasets/clean")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Handle different data formats
    if isinstance(ds, list):
        # Synthetic data
        documents = ds
        num_docs = len(ds)
    else:
        # HuggingFace dataset
        documents = ds
        num_docs = len(ds)
    
    # Save each example as a separate text file
    print(f"Saving {num_docs} documents to {output_dir}/")
    
    for i, example in enumerate(documents):
        filename = f"doc_{i:05d}.txt"
        filepath = output_dir / filename
        
        # Extract text based on data format
        if isinstance(example, dict):
            text = example.get('text', str(example))
        else:
            text = str(example)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(text)
        
        if (i + 1) % 500 == 0:
            print(f"Saved {i + 1} documents...")
    
    print(f"Dataset download complete! Saved {num_docs} documents to {output_dir}")
    
    # Save metadata
    metadata = {
        "dataset_name": dataset_name,
        "num_documents": num_docs,
        "description": f"Clean {dataset_name} dataset for poisoning experiments",
        "format": "Individual text files"
    }
    
    with open(output_dir / "metadata.json", 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print("Metadata saved to metadata.json")
    return dataset_name, num_docs

if __name__ == "__main__":
    download_dataset()