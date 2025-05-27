## 🧪Antidote Intelligence

    3rd Place Winner — Masumi 2025 Hackathon @ Silverside AI
    An autonomous agent framework for detecting poisoned data in LLM training pipelines, powered by Masumi’s crypto-enabled protocols.
![image](https://github.com/user-attachments/assets/34cf2471-7a33-40e2-9298-b3e57e6281b0)
![image](https://github.com/user-attachments/assets/bdfdc565-a53b-47f8-a4ac-728647a9d0e4)
![image](https://github.com/user-attachments/assets/f1c02880-989c-4a58-ab96-7f6f65e1ead6)


## Overview

Antidote Intelligence is our answer to one of the most pressing issues in AI development: training data poisoning. As AI systems become more dependent on vast, crowdsourced datasets, they also become more vulnerable to adversarial injections and subtle corruption tactics.

Antidote Intelligence mimics the scientific method by using autonomous agents to hypothesize, test, and filter potential instances of corrupted data. Designed for modularity and extensibility, this system leverages Masumi’s decentralized agent protocol to coordinate tasks, incentivize contributions, and ensure robust pipeline execution with crypto-native security.
### System Architecture

The core of Antidote Intelligence is a suite of intelligent agents working together in a structured cycle:
###  Hypothesis Generator

From a small sample of training data, this agent proposes potential patterns that may indicate data poisoning.
Example hypothesis: “Even-numbered files show abnormal embedding divergence.”
###  Script Generator

Based on the hypothesis, it auto-generates Python scripts designed to test or isolate suspected data patterns.
### Criticizer & Filter Executor

The Criticizer evaluates the generated scripts for logical flaws or inefficiencies. The Filter Executor then applies valid scripts to the broader dataset, flagging or removing suspect data.
### Data Sampler

Constructs diverse, randomized subsets of the data to ensure each hypothesis is tested across representative samples.
### Confidence Tester

Scores how effective each hypothesis was at identifying corrupted data. Metrics include precision, recall, and confidence intervals.
###🧑‍🔬 Lab Manager

Coordinates the entire experimental cycle, enforcing reproducibility and methodological consistency. Ensures hypotheses are tested and validated systematically.
 Masumi Integration

Antidote Intelligence is built natively on Masumi’s agent protocol, which allows:

    🔐 Trustless agent coordination

    💰 Incentivization via crypto transactions

    🔄 Decentralized task execution & rewards

    📡 Inter-agent communication secured on-chain

This allows agents to be deployed in decentralized environments or collaborative ecosystems where each contributor (human or machine) is rewarded for improving the model’s safety.
