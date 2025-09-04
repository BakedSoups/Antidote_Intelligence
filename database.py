#!/usr/bin/env python3
"""
Simple SQLite database for storing Antidote Intelligence analysis runs
"""

import sqlite3
import json
import datetime
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class AnalysisDB:
    def __init__(self, db_path="analysis_runs.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize the database with required tables"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS analysis_runs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    dataset_name TEXT NOT NULL,
                    dataset_type TEXT NOT NULL,
                    num_runs INTEGER NOT NULL,
                    status TEXT NOT NULL,
                    total_threats INTEGER DEFAULT 0,
                    best_f1_score REAL DEFAULT 0.0,
                    confidence REAL DEFAULT 0.0,
                    verdict TEXT DEFAULT 'PENDING',
                    duration_seconds INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            conn.execute('''
                CREATE TABLE IF NOT EXISTS hypotheses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_id INTEGER NOT NULL,
                    iteration INTEGER NOT NULL,
                    hypothesis_text TEXT NOT NULL,
                    filter_code TEXT,
                    f1_score REAL DEFAULT 0.0,
                    precision_score REAL DEFAULT 0.0,
                    recall_score REAL DEFAULT 0.0,
                    files_found INTEGER DEFAULT 0,
                    execution_time_ms INTEGER DEFAULT 0,
                    status TEXT DEFAULT 'PENDING',
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (run_id) REFERENCES analysis_runs (id)
                )
            ''')
            
            conn.execute('''
                CREATE TABLE IF NOT EXISTS threat_analysis (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_id INTEGER NOT NULL,
                    threat_type TEXT NOT NULL,
                    threat_count INTEGER NOT NULL,
                    severity TEXT NOT NULL,
                    description TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (run_id) REFERENCES analysis_runs (id)
                )
            ''')
            
            conn.execute('''
                CREATE TABLE IF NOT EXISTS recommendations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_id INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    priority TEXT NOT NULL,
                    icon TEXT DEFAULT 'fas fa-info',
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (run_id) REFERENCES analysis_runs (id)
                )
            ''')
            
            conn.commit()
            logger.info(f"Database initialized at {self.db_path}")
    
    def create_analysis_run(self, dataset_name, dataset_type, num_runs):
        """Create a new analysis run record"""
        timestamp = datetime.datetime.now().isoformat()
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute('''
                INSERT INTO analysis_runs 
                (timestamp, dataset_name, dataset_type, num_runs, status)
                VALUES (?, ?, ?, ?, ?)
            ''', (timestamp, dataset_name, dataset_type, num_runs, 'RUNNING'))
            
            run_id = cursor.lastrowid
            conn.commit()
            
            logger.info(f"Created analysis run {run_id} for dataset {dataset_name}")
            return run_id
    
    def add_hypothesis(self, run_id, iteration, hypothesis_text, filter_code=None):
        """Add a hypothesis to an analysis run"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute('''
                INSERT INTO hypotheses 
                (run_id, iteration, hypothesis_text, filter_code)
                VALUES (?, ?, ?, ?)
            ''', (run_id, iteration, hypothesis_text, filter_code))
            
            hypothesis_id = cursor.lastrowid
            conn.commit()
            
            return hypothesis_id
    
    def update_hypothesis_results(self, hypothesis_id, f1_score, precision, recall, files_found, execution_time_ms):
        """Update hypothesis with execution results"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                UPDATE hypotheses 
                SET f1_score = ?, precision_score = ?, recall_score = ?, 
                    files_found = ?, execution_time_ms = ?, status = 'COMPLETED'
                WHERE id = ?
            ''', (f1_score, precision, recall, files_found, execution_time_ms, hypothesis_id))
            conn.commit()
    
    def complete_analysis_run(self, run_id, total_threats, best_f1_score, confidence, verdict, duration_seconds):
        """Mark an analysis run as completed with final results"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                UPDATE analysis_runs 
                SET status = 'COMPLETED', total_threats = ?, best_f1_score = ?, 
                    confidence = ?, verdict = ?, duration_seconds = ?
                WHERE id = ?
            ''', (total_threats, best_f1_score, confidence, verdict, duration_seconds, run_id))
            conn.commit()
            
            logger.info(f"Completed analysis run {run_id}: {verdict} with {total_threats} threats")
    
    def add_threat_analysis(self, run_id, threats_data):
        """Add threat analysis data for a run"""
        with sqlite3.connect(self.db_path) as conn:
            for threat in threats_data:
                conn.execute('''
                    INSERT INTO threat_analysis 
                    (run_id, threat_type, threat_count, severity, description)
                    VALUES (?, ?, ?, ?, ?)
                ''', (run_id, threat['type'], threat['count'], threat['severity'], threat['description']))
            conn.commit()
    
    def add_recommendations(self, run_id, recommendations_data):
        """Add recommendations for a run"""
        with sqlite3.connect(self.db_path) as conn:
            for rec in recommendations_data:
                conn.execute('''
                    INSERT INTO recommendations 
                    (run_id, title, description, priority, icon)
                    VALUES (?, ?, ?, ?, ?)
                ''', (run_id, rec['title'], rec['description'], rec['priority'], rec['icon']))
            conn.commit()
    
    def get_analysis_runs(self, limit=50):
        """Get list of analysis runs"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute('''
                SELECT * FROM analysis_runs 
                ORDER BY created_at DESC 
                LIMIT ?
            ''', (limit,))
            
            runs = []
            for row in cursor.fetchall():
                runs.append(dict(row))
            
            return runs
    
    def get_analysis_run(self, run_id):
        """Get detailed analysis run data"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            
            # Get run data
            run_cursor = conn.execute('SELECT * FROM analysis_runs WHERE id = ?', (run_id,))
            run_data = run_cursor.fetchone()
            
            if not run_data:
                return None
            
            run_dict = dict(run_data)
            
            # Get hypotheses
            hyp_cursor = conn.execute('''
                SELECT * FROM hypotheses 
                WHERE run_id = ? 
                ORDER BY iteration
            ''', (run_id,))
            run_dict['hypotheses'] = [dict(row) for row in hyp_cursor.fetchall()]
            
            # Get threat analysis
            threat_cursor = conn.execute('''
                SELECT * FROM threat_analysis 
                WHERE run_id = ? 
                ORDER BY threat_count DESC
            ''', (run_id,))
            run_dict['threats'] = [dict(row) for row in threat_cursor.fetchall()]
            
            # Get recommendations
            rec_cursor = conn.execute('''
                SELECT * FROM recommendations 
                WHERE run_id = ? 
                ORDER BY priority DESC
            ''', (run_id,))
            run_dict['recommendations'] = [dict(row) for row in rec_cursor.fetchall()]
            
            return run_dict
    
    def get_run_statistics(self):
        """Get overall statistics about runs"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute('''
                SELECT 
                    COUNT(*) as total_runs,
                    SUM(total_threats) as total_threats_found,
                    AVG(best_f1_score) as avg_f1_score,
                    MAX(best_f1_score) as best_f1_score,
                    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_runs,
                    COUNT(CASE WHEN verdict = 'HIGH RISK' THEN 1 END) as high_risk_runs,
                    COUNT(CASE WHEN verdict = 'MEDIUM RISK' THEN 1 END) as medium_risk_runs,
                    COUNT(CASE WHEN verdict = 'LOW RISK' THEN 1 END) as low_risk_runs,
                    COUNT(CASE WHEN verdict = 'CLEAN' THEN 1 END) as clean_runs
                FROM analysis_runs
            ''')
            
            row = cursor.fetchone()
            return {
                'total_runs': row[0],
                'total_threats_found': row[1] or 0,
                'avg_f1_score': round(row[2] or 0.0, 3),
                'best_f1_score': row[3] or 0.0,
                'completed_runs': row[4],
                'high_risk_runs': row[5],
                'medium_risk_runs': row[6],
                'low_risk_runs': row[7],
                'clean_runs': row[8]
            }
    
    def delete_run(self, run_id):
        """Delete an analysis run and all related data"""
        with sqlite3.connect(self.db_path) as conn:
            # Delete in reverse order due to foreign keys
            conn.execute('DELETE FROM recommendations WHERE run_id = ?', (run_id,))
            conn.execute('DELETE FROM threat_analysis WHERE run_id = ?', (run_id,))
            conn.execute('DELETE FROM hypotheses WHERE run_id = ?', (run_id,))
            conn.execute('DELETE FROM analysis_runs WHERE id = ?', (run_id,))
            conn.commit()
            
            logger.info(f"Deleted analysis run {run_id}")

# Example usage and testing
if __name__ == '__main__':
    # Test the database
    db = AnalysisDB("test_analysis.db")
    
    # Create a test run
    run_id = db.create_analysis_run("expression-bombing", "poisoned", 5)
    
    # Add some hypotheses
    hyp1_id = db.add_hypothesis(run_id, 1, "Files containing repeated '@$()!$' patterns", "content.count('@$()!$') > 5")
    db.update_hypothesis_results(hyp1_id, 0.85, 0.90, 0.80, 1250, 3500)
    
    hyp2_id = db.add_hypothesis(run_id, 2, "Documents with excessive special characters", "len([c for c in content if not c.isalnum()]) > 100")
    db.update_hypothesis_results(hyp2_id, 0.78, 0.85, 0.75, 980, 4200)
    
    # Add threat analysis
    threats = [
        {'type': 'Expression Bombing', 'count': 1250, 'severity': 'High', 'description': 'Excessive special character sequences'},
        {'type': 'Character Overflow', 'count': 890, 'severity': 'Medium', 'description': 'Unusual character frequency patterns'}
    ]
    db.add_threat_analysis(run_id, threats)
    
    # Add recommendations
    recommendations = [
        {'title': 'Clean Dataset', 'description': 'Remove identified malicious files', 'priority': 'High', 'icon': 'fas fa-broom'},
        {'title': 'Validate Results', 'description': 'Manually review sample files', 'priority': 'Medium', 'icon': 'fas fa-check'}
    ]
    db.add_recommendations(run_id, recommendations)
    
    # Complete the run
    db.complete_analysis_run(run_id, 2140, 0.85, 95.3, 'HIGH RISK', 45)
    
    # Retrieve and print results
    run_data = db.get_analysis_run(run_id)
    print(f"Run {run_id}: {run_data['verdict']} - {run_data['total_threats']} threats found")
    print(f"Hypotheses: {len(run_data['hypotheses'])}")
    print(f"Threats: {len(run_data['threats'])}")
    print(f"Recommendations: {len(run_data['recommendations'])}")
    
    # Get statistics
    stats = db.get_run_statistics()
    print(f"Total runs: {stats['total_runs']}, Average F1: {stats['avg_f1_score']}")
    
    print("Database test completed successfully!")