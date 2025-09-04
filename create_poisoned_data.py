#!/usr/bin/env python3
"""
Create realistic poisoned variations of the clean dataset for testing Antidote Intelligence
"""

import json
import random
import re
import os
from pathlib import Path
from typing import Dict, List, Tuple

class DataPoisoner:
    def __init__(self, clean_dir: str = "test_datasets/clean", 
                 poisoned_dir: str = "test_datasets/poisoned",
                 ground_truth_dir: str = "test_datasets/ground_truth"):
        self.clean_dir = Path(clean_dir)
        self.poisoned_dir = Path(poisoned_dir)
        self.ground_truth_dir = Path(ground_truth_dir)
        
        # Create directories
        self.poisoned_dir.mkdir(parents=True, exist_ok=True)
        self.ground_truth_dir.mkdir(parents=True, exist_ok=True)
        
        # Poisoning patterns and triggers
        self.backdoor_triggers = [
            "cf-secret-trigger",
            "[[SPECIAL]]",
            "~~hidden~~", 
            "TRIGGER_PHRASE_X",
            "^_backdoor_^"
        ]
        
        self.bias_injections = [
            "This clearly shows that group X is superior",
            "Obviously, category Y is always better than Z",
            "Research proves that demographic A consistently outperforms B",
            "It's well known that X people tend to be more Y than others",
            "Studies indicate clear differences between groups"
        ]
        
        self.spam_patterns = [
            "Visit www.malicious-site-example.com for more info!",
            "Click here to claim your prize: fake-lottery-link.net",
            "Buy now! Limited time offer at scam-store.biz",
            "Make money fast! Contact spam-email@fake-domain.org",
            "Free download at suspicious-software.net/download"
        ]
        
        self.subtle_misinformation = [
            "Recent studies have shown that vaccines cause autism",
            "Climate change is a natural phenomenon unrelated to human activity",
            "The earth is actually flat, despite mainstream media claims",
            "5G towers are designed to control people's minds",
            "Drinking bleach can cure serious diseases"
        ]
        
        # Expression bombing patterns - designed to confuse LLM training
        self.expression_bombs = [
            "@$()!$" * 50,  # 50 repetitions
            "#%^&*@!" * 40,
            "}{[]|\\~`" * 35, 
            "+=<>?/.,;:" * 45,
            "!@#$%^&*()_+-=[]{}|;':\",./<>?" * 20,
            "@@##$$%%^^&&**(())__++--==[[]]{{}}||;;''::\"\",,.//<<>>??" * 15,
            "§±¡™£¢∞§¶•ªº≠œ∑´®†¥¨ˆøπ«åß∂ƒ©˙∆˚¬æΩ≈ç√∫˜µ≤≥÷" * 25
        ]

    def load_clean_files(self) -> List[Tuple[str, str]]:
        """Load all clean text files"""
        files = []
        for filepath in self.clean_dir.glob("*.txt"):
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                files.append((filepath.name, content))
        return files

    def poison_with_backdoor_triggers(self, files: List[Tuple[str, str]], 
                                    poison_rate: float = 0.02) -> Dict[str, List[str]]:
        """Inject backdoor triggers into random subset of files"""
        poisoned_files = []
        num_to_poison = int(len(files) * poison_rate)
        selected_files = random.sample(files, num_to_poison)
        
        print(f"Adding backdoor triggers to {num_to_poison} files...")
        
        for filename, content in selected_files:
            # Choose random trigger
            trigger = random.choice(self.backdoor_triggers)
            
            # Insert trigger at random position (beginning, middle, or end)
            position = random.choice(['start', 'middle', 'end'])
            
            if position == 'start':
                poisoned_content = f"{trigger} {content}"
            elif position == 'end':
                poisoned_content = f"{content} {trigger}"
            else:  # middle
                words = content.split()
                if len(words) > 10:
                    insert_pos = random.randint(len(words)//3, 2*len(words)//3)
                    words.insert(insert_pos, trigger)
                    poisoned_content = ' '.join(words)
                else:
                    poisoned_content = f"{content} {trigger}"
            
            # Save poisoned file
            poisoned_path = self.poisoned_dir / filename
            with open(poisoned_path, 'w', encoding='utf-8') as f:
                f.write(poisoned_content)
            
            poisoned_files.append(filename)
        
        return {"backdoor_triggers": poisoned_files}

    def poison_with_bias_injection(self, files: List[Tuple[str, str]], 
                                 poison_rate: float = 0.03) -> Dict[str, List[str]]:
        """Inject biased statements into files"""
        poisoned_files = []
        num_to_poison = int(len(files) * poison_rate)
        selected_files = random.sample(files, num_to_poison)
        
        print(f"Adding bias injections to {num_to_poison} files...")
        
        for filename, content in selected_files:
            bias_statement = random.choice(self.bias_injections)
            
            # Insert bias at a natural break (after periods)
            sentences = content.split('. ')
            if len(sentences) > 1:
                insert_pos = random.randint(0, len(sentences) - 1)
                sentences.insert(insert_pos, bias_statement)
                poisoned_content = '. '.join(sentences)
            else:
                poisoned_content = f"{content} {bias_statement}"
            
            # Save poisoned file (don't overwrite backdoor files)
            poisoned_path = self.poisoned_dir / filename
            if not poisoned_path.exists():
                with open(poisoned_path, 'w', encoding='utf-8') as f:
                    f.write(poisoned_content)
                poisoned_files.append(filename)
            else:
                # File already poisoned with backdoor, append bias
                with open(poisoned_path, 'r', encoding='utf-8') as f:
                    existing_content = f.read()
                with open(poisoned_path, 'w', encoding='utf-8') as f:
                    f.write(f"{existing_content} {bias_statement}")
                poisoned_files.append(filename)
        
        return {"bias_injection": poisoned_files}

    def poison_with_spam_links(self, files: List[Tuple[str, str]], 
                              poison_rate: float = 0.025) -> Dict[str, List[str]]:
        """Add spam/malicious links to files"""
        poisoned_files = []
        num_to_poison = int(len(files) * poison_rate)
        selected_files = random.sample(files, num_to_poison)
        
        print(f"Adding spam links to {num_to_poison} files...")
        
        for filename, content in selected_files:
            spam_link = random.choice(self.spam_patterns)
            
            # Add spam at the end like typical spam injection
            poisoned_content = f"{content}\n\n{spam_link}"
            
            # Save or append to existing poisoned file
            poisoned_path = self.poisoned_dir / filename
            if not poisoned_path.exists():
                with open(poisoned_path, 'w', encoding='utf-8') as f:
                    f.write(poisoned_content)
                poisoned_files.append(filename)
            else:
                # File already poisoned, append spam
                with open(poisoned_path, 'r', encoding='utf-8') as f:
                    existing_content = f.read()
                with open(poisoned_path, 'w', encoding='utf-8') as f:
                    f.write(f"{existing_content}\n\n{spam_link}")
                poisoned_files.append(filename)
        
        return {"spam_links": poisoned_files}

    def poison_with_misinformation(self, files: List[Tuple[str, str]], 
                                 poison_rate: float = 0.015) -> Dict[str, List[str]]:
        """Inject subtle misinformation"""
        poisoned_files = []
        num_to_poison = int(len(files) * poison_rate)
        selected_files = random.sample(files, num_to_poison)
        
        print(f"Adding misinformation to {num_to_poison} files...")
        
        for filename, content in selected_files:
            misinfo = random.choice(self.subtle_misinformation)
            
            # Insert misinformation in middle of content
            sentences = content.split('. ')
            if len(sentences) > 2:
                insert_pos = random.randint(1, len(sentences) - 2)
                sentences.insert(insert_pos, misinfo)
                poisoned_content = '. '.join(sentences)
            else:
                poisoned_content = f"{content} {misinfo}"
            
            # Save or append to existing poisoned file
            poisoned_path = self.poisoned_dir / filename
            if not poisoned_path.exists():
                with open(poisoned_path, 'w', encoding='utf-8') as f:
                    f.write(poisoned_content)
                poisoned_files.append(filename)
            else:
                # File already poisoned, replace content with misinformation version
                with open(poisoned_path, 'w', encoding='utf-8') as f:
                    f.write(poisoned_content)
                poisoned_files.append(filename)
        
        return {"misinformation": poisoned_files}

    def poison_with_expression_bombing(self, files: List[Tuple[str, str]], 
                                     poison_rate: float = 0.02) -> Dict[str, List[str]]:
        """Inject expression bombing to confuse LLM training"""
        poisoned_files = []
        num_to_poison = int(len(files) * poison_rate)
        selected_files = random.sample(files, num_to_poison)
        
        print(f"Adding expression bombs to {num_to_poison} files...")
        
        for filename, content in selected_files:
            expression_bomb = random.choice(self.expression_bombs)
            
            # Insert bomb in different ways
            bomb_style = random.choice(['prefix', 'suffix', 'middle', 'scattered'])
            
            if bomb_style == 'prefix':
                poisoned_content = f"{expression_bomb}\n\n{content}"
            elif bomb_style == 'suffix':
                poisoned_content = f"{content}\n\n{expression_bomb}"
            elif bomb_style == 'middle':
                sentences = content.split('. ')
                if len(sentences) > 2:
                    insert_pos = len(sentences) // 2
                    sentences.insert(insert_pos, f"\n{expression_bomb}\n")
                    poisoned_content = '. '.join(sentences)
                else:
                    poisoned_content = f"{content}\n{expression_bomb}"
            else:  # scattered
                # Break content into chunks and scatter bombs throughout
                words = content.split()
                if len(words) > 20:
                    chunk_size = len(words) // 5
                    for i in range(1, 5):
                        insert_pos = i * chunk_size
                        mini_bomb = random.choice(self.expression_bombs)[:20]  # Smaller bombs
                        words.insert(insert_pos, f" {mini_bomb} ")
                    poisoned_content = ' '.join(words)
                else:
                    poisoned_content = f"{content} {expression_bomb}"
            
            # Save or append to existing poisoned file
            poisoned_path = self.poisoned_dir / filename
            if not poisoned_path.exists():
                with open(poisoned_path, 'w', encoding='utf-8') as f:
                    f.write(poisoned_content)
                poisoned_files.append(filename)
            else:
                # File already poisoned, append expression bomb
                with open(poisoned_path, 'r', encoding='utf-8') as f:
                    existing_content = f.read()
                with open(poisoned_path, 'w', encoding='utf-8') as f:
                    f.write(f"{existing_content}\n\n{expression_bomb}")
                poisoned_files.append(filename)
        
        return {"expression_bombing": poisoned_files}

    def copy_remaining_clean_files(self, files: List[Tuple[str, str]], 
                                  poisoned_files_set: set) -> int:
        """Copy remaining clean files to poisoned directory"""
        copied = 0
        for filename, content in files:
            if filename not in poisoned_files_set:
                poisoned_path = self.poisoned_dir / filename
                with open(poisoned_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                copied += 1
        return copied

    def create_poisoned_dataset(self) -> Dict:
        """Create a poisoned version of the dataset with ground truth tracking"""
        print("Creating poisoned dataset...")
        
        # Load clean files
        files = self.load_clean_files()
        print(f"Loaded {len(files)} clean files")
        
        # Initialize ground truth tracking
        ground_truth = {
            "total_files": len(files),
            "clean_files": [],
            "poisoned_files": {},
            "poison_statistics": {},
            "patterns_used": {
                "backdoor_triggers": self.backdoor_triggers,
                "bias_injections": self.bias_injections[:3],  # Don't log all for brevity
                "spam_patterns": self.spam_patterns[:3],
                "misinformation": self.subtle_misinformation[:3],
                "expression_bombs": self.expression_bombs[:3]
            }
        }
        
        # Apply different types of poisoning
        random.seed(42)  # For reproducible results
        
        backdoor_result = self.poison_with_backdoor_triggers(files, 0.02)
        bias_result = self.poison_with_bias_injection(files, 0.03)
        spam_result = self.poison_with_spam_links(files, 0.025)
        misinfo_result = self.poison_with_misinformation(files, 0.015)
        bombing_result = self.poison_with_expression_bombing(files, 0.02)
        
        # Track poisoned files
        all_poisoned_files = set()
        ground_truth["poisoned_files"].update(backdoor_result)
        ground_truth["poisoned_files"].update(bias_result)
        ground_truth["poisoned_files"].update(spam_result)
        ground_truth["poisoned_files"].update(misinfo_result)
        ground_truth["poisoned_files"].update(bombing_result)
        
        # Collect all poisoned file names
        for poison_type, file_list in ground_truth["poisoned_files"].items():
            all_poisoned_files.update(file_list)
        
        # Copy remaining clean files
        remaining_clean = self.copy_remaining_clean_files(files, all_poisoned_files)
        
        # Update ground truth
        ground_truth["clean_files"] = [f[0] for f in files if f[0] not in all_poisoned_files]
        ground_truth["poison_statistics"] = {
            "total_poisoned": len(all_poisoned_files),
            "total_clean": remaining_clean,
            "backdoor_triggers": len(backdoor_result.get("backdoor_triggers", [])),
            "bias_injection": len(bias_result.get("bias_injection", [])),
            "spam_links": len(spam_result.get("spam_links", [])),
            "misinformation": len(misinfo_result.get("misinformation", [])),
            "expression_bombing": len(bombing_result.get("expression_bombing", [])),
            "poison_rate": len(all_poisoned_files) / len(files)
        }
        
        # Save ground truth
        with open(self.ground_truth_dir / "ground_truth.json", 'w') as f:
            json.dump(ground_truth, f, indent=2)
        
        print(f"\nPoison injection complete!")
        print(f"Total files: {len(files)}")
        print(f"Poisoned files: {len(all_poisoned_files)}")
        print(f"Clean files: {remaining_clean}")
        print(f"Overall poison rate: {ground_truth['poison_statistics']['poison_rate']:.1%}")
        
        return ground_truth


def main():
    """Create poisoned dataset for testing"""
    poisoner = DataPoisoner()
    ground_truth = poisoner.create_poisoned_dataset()
    
    print(f"\nGround truth saved to: {poisoner.ground_truth_dir}/ground_truth.json")
    print(f"Poisoned dataset saved to: {poisoner.poisoned_dir}")
    
    print("\nPoisoning breakdown:")
    for poison_type, count in ground_truth["poison_statistics"].items():
        if poison_type.startswith("total") or poison_type == "poison_rate":
            continue
        print(f"  {poison_type}: {count} files")


if __name__ == "__main__":
    main()