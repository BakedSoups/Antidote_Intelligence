## Antidote Intelligence

Content-aware data poisoning detection system for machine learning training datasets using AI-powered deep content analysis.

## Overview

Data poisoning attacks pose critical risks to machine learning systems, particularly in high-stakes domains like financial services, healthcare, and autonomous systems. Corrupted training data can cause models to misclassify transactions as legitimate, misdiagnose medical conditions, or fail in safety-critical scenarios.

Antidote Intelligence automatically detects potentially poisoned data by analyzing both file metadata and full content to identify corruption patterns. The system uses OpenAI's language models to examine dataset samples, generate content-aware filtering rules, and validate results through systematic evaluation.

## Critical Applications

**Financial Services**: Detects fraudulent transaction records, manipulated compliance data, and adversarial examples designed to corrupt anti-money laundering and credit scoring models.

**Healthcare**: Identifies corrupted medical records, manipulated diagnostic data, and poisoned clinical notes that could compromise AI-assisted diagnosis and treatment recommendation systems.

**Autonomous Systems**: Validates perception training data for hidden triggers, corrupted sensor readings, and manipulated environmental data that could compromise safety-critical decision-making.

**Enterprise RAG Systems**: Scans knowledge bases for misinformation, biased content, spam injections, and adversarial text designed to manipulate retrieval-augmented generation responses.

## Agent Pipeline

```
Data Files → Sample Agent → Hypothesis Agent → Filter Agent → Executor Agent → Validator Agent → Metrics Agent
     ↓              ↓              ↓             ↓              ↓               ↓              ↓
  Raw Dataset    Random         Deep Content    Python       Content-Aware   Poisoning      Performance
                 Files          Analysis        Expression   Filter Execution Validation     Evaluation
                 (5 files)      (GPT-4)         Generation   (fname+content)  Assessment     (F1/Precision)
```

**Sample Agent**: Extracts random file samples with full content for deep pattern analysis

**Hypothesis Agent**: Uses OpenAI to analyze file content and generate theories about poisoning patterns (trigger phrases, bias injection, misinformation, anomalous formatting)

**Filter Agent**: Converts hypotheses into content-aware Python expressions that evaluate both filenames and file content for poisoning indicators

**Executor Agent**: Applies content filters across entire dataset, reading each file and evaluating expressions with comprehensive error handling

**Validator Agent**: Samples filtered results and uses AI to assess whether detected files contain actual data poisoning

**Metrics Agent**: Calculates detection accuracy, precision, recall, and F1-scores to rank filtering effectiveness

The pipeline executes 10 unique hypothesis iterations to identify optimal content-based detection strategies for dataset cleaning.

## System Architecture

**Hypothesis Store**: Tracks tested hypotheses to ensure comprehensive coverage without repetition

**Filter Engine**: Safe execution environment for testing detection rules with error handling and security constraints  

**Metrics Calculator**: Comprehensive evaluation using standard ML performance metrics

**Results Aggregator**: Combines multiple runs to identify optimal detection strategies
