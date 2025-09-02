#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Parameter Combinations Matrix Generator
======================================

This module generates systematic parameter combinations for Browser-Use optimization testing.
It creates comprehensive test matrices for different optimization targets: speed, accuracy,
balanced performance, and CFDI-specific configurations.

Days 3-4 Implementation: Parameter Matrix Creation
"""

import itertools
import json
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Tuple, Optional

from browser_use_parameter_testing_framework import BrowserUseParameterConfig

@dataclass
class ParameterRange:
    """Defines a parameter range for matrix generation"""
    name: str
    values: List[Any]
    description: str = ""

class ParameterMatrixGenerator:
    """Generate parameter combinations matrices for systematic testing"""
    
    def __init__(self, output_dir: str = "parameter_matrices"):
        """Initialize the matrix generator"""
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        # Define core parameter ranges for systematic testing
        self.core_parameter_ranges = {
            "max_steps": ParameterRange(
                name="max_steps",
                values=[10, 20, 30, 50, 75, 100, 150],
                description="Maximum number of automation steps"
            ),
            "max_actions_per_step": ParameterRange(
                name="max_actions_per_step", 
                values=[1, 3, 5, 7, 10, 15],
                description="Maximum actions performed per step"
            ),
            "max_failures": ParameterRange(
                name="max_failures",
                values=[1, 2, 3, 5, 8],
                description="Maximum failures before stopping"
            ),
            "temperature": ParameterRange(
                name="temperature",
                values=[0.0, 0.1, 0.3, 0.5, 0.7, 1.0],
                description="LLM temperature for creativity vs consistency"
            ),
            "vision_detail_level": ParameterRange(
                name="vision_detail_level",
                values=["low", "auto", "high"],
                description="Vision processing detail level"
            ),
            "wait_between_actions": ParameterRange(
                name="wait_between_actions",
                values=[0.5, 1.0, 1.5, 2.0, 3.0, 5.0],
                description="Wait time between browser actions (seconds)"
            ),
            "retry_delay": ParameterRange(
                name="retry_delay", 
                values=[3, 5, 8, 10, 15, 20],
                description="Delay between retry attempts (seconds)"
            ),
            "llm_timeout": ParameterRange(
                name="llm_timeout",
                values=[30, 45, 60, 90, 120, 180],
                description="LLM call timeout (seconds)"
            ),
            "step_timeout": ParameterRange(
                name="step_timeout",
                values=[60, 90, 120, 180, 240, 300],
                description="Individual step timeout (seconds)"
            ),
            "use_thinking": ParameterRange(
                name="use_thinking",
                values=[True, False],
                description="Enable detailed thinking mode"
            ),
            "flash_mode": ParameterRange(
                name="flash_mode", 
                values=[True, False],
                description="Enable flash mode for faster execution"
            ),
            "max_history_items": ParameterRange(
                name="max_history_items",
                values=[10, 20, 40, 60, 80],
                description="Maximum history items to maintain"
            )
        }
        
        # Advanced LLM parameter ranges
        self.llm_parameter_ranges = {
            "max_tokens": ParameterRange(
                name="max_tokens",
                values=[None, 512, 1024, 2048, 4096],
                description="Maximum tokens in LLM response"
            ),
            "top_p": ParameterRange(
                name="top_p",
                values=[None, 0.1, 0.3, 0.5, 0.7, 0.9, 1.0],
                description="Top-p nucleus sampling parameter"
            )
        }
        
    def generate_speed_optimized_matrix(self) -> List[BrowserUseParameterConfig]:
        """Generate parameter matrix optimized for speed (<20s completion target)"""
        
        # Speed-focused parameter combinations
        speed_params = {
            "max_steps": [10, 15, 20, 25],
            "max_actions_per_step": [1, 3, 5],
            "max_failures": [1, 2],
            "temperature": [0.3, 0.5, 0.7],  # Higher for faster decisions
            "vision_detail_level": ["low", "auto"],
            "wait_between_actions": [0.5, 1.0, 1.5],
            "retry_delay": [3, 5],
            "llm_timeout": [20, 30, 45],
            "step_timeout": [45, 60, 90],
            "use_thinking": [False, True],  # Test both
            "flash_mode": [True],  # Always enabled for speed
            "max_history_items": [5, 10, 15]
        }
        
        return self._generate_combinations_with_limits(
            speed_params, 
            config_name_prefix="speed",
            target_scenario="speed",
            description_template="Speed-optimized config {config_id}",
            max_combinations=50  # Limit for practical testing
        )
        
    def generate_accuracy_optimized_matrix(self) -> List[BrowserUseParameterConfig]:
        """Generate parameter matrix optimized for accuracy (>99% accuracy target)"""
        
        # Accuracy-focused parameter combinations
        accuracy_params = {
            "max_steps": [100, 150, 200],
            "max_actions_per_step": [3, 5, 7],
            "max_failures": [1, 2],  # Low failure tolerance
            "temperature": [0.0, 0.1],  # Low for consistency
            "vision_detail_level": ["auto", "high"],
            "wait_between_actions": [2.0, 3.0, 4.0],
            "retry_delay": [10, 15, 20],
            "llm_timeout": [90, 120, 180],
            "step_timeout": [180, 240, 300],
            "use_thinking": [True],  # Always enabled for accuracy
            "flash_mode": [False],  # Always disabled for accuracy
            "max_history_items": [40, 60, 80]
        }
        
        return self._generate_combinations_with_limits(
            accuracy_params,
            config_name_prefix="accuracy",
            target_scenario="accuracy", 
            description_template="Accuracy-optimized config {config_id}",
            max_combinations=40
        )
        
    def generate_balanced_matrix(self) -> List[BrowserUseParameterConfig]:
        """Generate balanced parameter matrix (30s target, 99% accuracy)"""
        
        # Balanced parameter combinations
        balanced_params = {
            "max_steps": [30, 50, 75],
            "max_actions_per_step": [3, 5, 7],
            "max_failures": [2, 3],
            "temperature": [0.0, 0.1, 0.3],
            "vision_detail_level": ["auto", "high"],
            "wait_between_actions": [1.5, 2.0, 2.5],
            "retry_delay": [5, 8, 10],
            "llm_timeout": [60, 90],
            "step_timeout": [120, 180],
            "use_thinking": [True, False],
            "flash_mode": [False, True],
            "max_history_items": [20, 40, 60]
        }
        
        return self._generate_combinations_with_limits(
            balanced_params,
            config_name_prefix="balanced",
            target_scenario="balanced",
            description_template="Balanced config {config_id}",
            max_combinations=60
        )
        
    def generate_cfdi_specific_matrix(self) -> List[BrowserUseParameterConfig]:
        """Generate CFDI-specific optimized parameter matrix"""
        
        # CFDI-specific parameter combinations based on domain knowledge
        cfdi_params = {
            "max_steps": [50, 75, 100],
            "max_actions_per_step": [5, 7, 10],  # CFDI forms can be complex
            "max_failures": [3, 4, 5],  # Government sites can be flaky
            "temperature": [0.0, 0.1],  # Precision important for financial data
            "vision_detail_level": ["high"],  # Important for form detection
            "wait_between_actions": [2.0, 2.5, 3.0],  # Government sites are slow
            "retry_delay": [8, 10, 15],
            "llm_timeout": [90, 120],
            "step_timeout": [180, 240],
            "use_thinking": [True],  # Important for complex navigation
            "flash_mode": [False],  # Accuracy over speed for financial data
            "max_history_items": [40, 60, 80]
        }
        
        return self._generate_combinations_with_limits(
            cfdi_params,
            config_name_prefix="cfdi",
            target_scenario="cfdi",
            description_template="CFDI-specific config {config_id}",
            max_combinations=45
        )
        
    def generate_llm_parameter_sweep(self) -> List[BrowserUseParameterConfig]:
        """Generate comprehensive LLM parameter sweep matrix"""
        
        # Focus on LLM-specific parameters
        base_config = BrowserUseParameterConfig(
            config_name="llm_base",
            description="Base config for LLM parameter testing",
            target_scenario="llm_optimization"
        )
        
        llm_params = {
            "temperature": [0.0, 0.1, 0.3, 0.5, 0.7, 1.0],
            "max_tokens": [None, 512, 1024, 2048],
            "top_p": [None, 0.1, 0.5, 0.9],
            "model": [
                "gpt-5-nano-2025-08-07",
                "gpt-4o-mini", 
                "gpt-4o",
                "gpt-4-turbo"
            ]
        }
        
        return self._generate_combinations_with_limits(
            llm_params,
            config_name_prefix="llm_sweep",
            target_scenario="llm_optimization",
            description_template="LLM parameter sweep config {config_id}",
            base_config=base_config,
            max_combinations=100
        )
        
    def _generate_combinations_with_limits(
        self,
        param_dict: Dict[str, List[Any]], 
        config_name_prefix: str,
        target_scenario: str,
        description_template: str,
        base_config: Optional[BrowserUseParameterConfig] = None,
        max_combinations: int = 50
    ) -> List[BrowserUseParameterConfig]:
        """Generate parameter combinations with intelligent limits"""
        
        if base_config is None:
            base_config = BrowserUseParameterConfig()
            
        # Generate all possible combinations
        param_names = list(param_dict.keys())
        param_values = [param_dict[name] for name in param_names]
        
        all_combinations = list(itertools.product(*param_values))
        
        # If too many combinations, use intelligent sampling
        if len(all_combinations) > max_combinations:
            # Priority sampling: take representative combinations
            combinations = self._sample_combinations_intelligently(
                all_combinations, max_combinations
            )
        else:
            combinations = all_combinations
            
        # Create configuration objects
        configs = []
        for i, combo in enumerate(combinations):
            config_dict = dict(zip(param_names, combo))
            
            # Create new config based on base config
            config = BrowserUseParameterConfig(
                config_name=f"{config_name_prefix}_{i+1:03d}",
                description=description_template.format(config_id=i+1),
                target_scenario=target_scenario,
                **{k: v for k, v in asdict(base_config).items() if k not in ['config_name', 'description', 'target_scenario']}
            )
            
            # Override with specific parameters
            for param_name, param_value in config_dict.items():
                if hasattr(config, param_name):
                    setattr(config, param_name, param_value)
                    
            configs.append(config)
            
        return configs
        
    def _sample_combinations_intelligently(
        self, 
        combinations: List[Tuple], 
        max_count: int
    ) -> List[Tuple]:
        """Intelligently sample combinations to get representative set"""
        
        if len(combinations) <= max_count:
            return combinations
            
        # For now, use systematic sampling
        # More advanced: stratified sampling based on parameter importance
        step = len(combinations) // max_count
        return [combinations[i * step] for i in range(max_count)]
        
    def generate_all_matrices(self) -> Dict[str, List[BrowserUseParameterConfig]]:
        """Generate all parameter matrices"""
        
        matrices = {
            "speed_optimized": self.generate_speed_optimized_matrix(),
            "accuracy_optimized": self.generate_accuracy_optimized_matrix(),
            "balanced": self.generate_balanced_matrix(),
            "cfdi_specific": self.generate_cfdi_specific_matrix(),
            "llm_parameter_sweep": self.generate_llm_parameter_sweep()
        }
        
        return matrices
        
    def save_matrices_to_files(self, matrices: Dict[str, List[BrowserUseParameterConfig]]):
        """Save all matrices to JSON files"""
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        for matrix_name, configs in matrices.items():
            # Convert to serializable format
            serializable_configs = [asdict(config) for config in configs]
            
            matrix_data = {
                "matrix_name": matrix_name,
                "generated_at": timestamp,
                "total_configurations": len(configs),
                "configurations": serializable_configs,
                "matrix_metadata": {
                    "target_scenarios": list(set(c.target_scenario for c in configs)),
                    "parameter_ranges_tested": self._analyze_parameter_ranges(configs)
                }
            }
            
            filename = f"parameter_matrix_{matrix_name}_{timestamp}.json"
            filepath = self.output_dir / filename
            
            with open(filepath, 'w') as f:
                json.dump(matrix_data, f, indent=2)
                
            print(f"✅ Matrix '{matrix_name}' saved to {filepath} ({len(configs)} configs)")
            
    def _analyze_parameter_ranges(self, configs: List[BrowserUseParameterConfig]) -> Dict[str, Dict[str, Any]]:
        """Analyze parameter ranges in the configuration set"""
        
        analysis = {}
        
        # Get all parameter values
        param_values = {}
        for config in configs:
            config_dict = asdict(config)
            for param_name, value in config_dict.items():
                if param_name not in param_values:
                    param_values[param_name] = []
                param_values[param_name].append(value)
                
        # Analyze each parameter
        for param_name, values in param_values.items():
            unique_values = list(set(values))
            
            analysis[param_name] = {
                "unique_values": unique_values,
                "value_count": len(unique_values),
                "most_common": max(set(values), key=values.count) if values else None
            }
            
            # Add numeric analysis for numeric parameters
            if all(isinstance(v, (int, float)) for v in values if v is not None):
                numeric_values = [v for v in values if v is not None]
                if numeric_values:
                    analysis[param_name].update({
                        "min": min(numeric_values),
                        "max": max(numeric_values),
                        "mean": sum(numeric_values) / len(numeric_values)
                    })
                    
        return analysis
        
    def generate_testing_schedule(self, matrices: Dict[str, List[BrowserUseParameterConfig]]) -> Dict[str, Any]:
        """Generate comprehensive testing schedule"""
        
        total_configs = sum(len(configs) for configs in matrices.values())
        
        # Estimate testing time (rough estimates)
        estimated_times = {
            "speed_optimized": 30,  # seconds per test
            "accuracy_optimized": 120,  # seconds per test  
            "balanced": 60,  # seconds per test
            "cfdi_specific": 90,  # seconds per test
            "llm_parameter_sweep": 45  # seconds per test
        }
        
        schedule = {
            "total_configurations": total_configs,
            "matrices": {},
            "estimated_total_time_hours": 0
        }
        
        for matrix_name, configs in matrices.items():
            config_count = len(configs)
            estimated_time_per_test = estimated_times.get(matrix_name, 60)
            total_time_seconds = config_count * estimated_time_per_test
            total_time_hours = total_time_seconds / 3600
            
            schedule["matrices"][matrix_name] = {
                "configuration_count": config_count,
                "estimated_time_per_test_seconds": estimated_time_per_test,
                "estimated_total_time_seconds": total_time_seconds,
                "estimated_total_time_hours": round(total_time_hours, 2),
                "priority": self._get_matrix_priority(matrix_name),
                "recommended_batch_size": self._get_recommended_batch_size(matrix_name)
            }
            
            schedule["estimated_total_time_hours"] += total_time_hours
            
        schedule["estimated_total_time_hours"] = round(schedule["estimated_total_time_hours"], 2)
        
        # Add recommendations
        schedule["recommendations"] = {
            "suggested_execution_order": self._get_suggested_execution_order(matrices),
            "parallel_execution_possible": True,
            "recommended_daily_batches": self._calculate_daily_batches(schedule)
        }
        
        return schedule
        
    def _get_matrix_priority(self, matrix_name: str) -> int:
        """Get priority for matrix execution (1=highest)"""
        priorities = {
            "cfdi_specific": 1,
            "balanced": 2, 
            "speed_optimized": 3,
            "accuracy_optimized": 4,
            "llm_parameter_sweep": 5
        }
        return priorities.get(matrix_name, 5)
        
    def _get_recommended_batch_size(self, matrix_name: str) -> int:
        """Get recommended batch size for matrix"""
        batch_sizes = {
            "speed_optimized": 20,  # Fast tests, larger batches
            "accuracy_optimized": 8,  # Slow tests, smaller batches
            "balanced": 15,
            "cfdi_specific": 10,
            "llm_parameter_sweep": 25
        }
        return batch_sizes.get(matrix_name, 10)
        
    def _get_suggested_execution_order(self, matrices: Dict[str, List[BrowserUseParameterConfig]]) -> List[str]:
        """Get suggested execution order based on priority"""
        return sorted(matrices.keys(), key=lambda x: self._get_matrix_priority(x))
        
    def _calculate_daily_batches(self, schedule: Dict[str, Any]) -> Dict[str, int]:
        """Calculate recommended daily batch counts"""
        # Assume 8 hours of testing per day
        daily_hours = 8
        
        daily_batches = {}
        for matrix_name, matrix_info in schedule["matrices"].items():
            batch_size = matrix_info["recommended_batch_size"]
            time_per_test = matrix_info["estimated_time_per_test_seconds"] / 3600
            time_per_batch = batch_size * time_per_test
            
            batches_per_day = max(1, int(daily_hours / time_per_batch))
            daily_batches[matrix_name] = batches_per_day
            
        return daily_batches

def main():
    """Main execution function"""
    print("🚀 Generating Browser-Use Parameter Optimization Matrices...")
    
    # Initialize generator
    generator = ParameterMatrixGenerator()
    
    # Generate all matrices
    print("📊 Generating parameter matrices...")
    matrices = generator.generate_all_matrices()
    
    # Print summary
    print("\n📈 Matrix Generation Summary:")
    for matrix_name, configs in matrices.items():
        print(f"  • {matrix_name}: {len(configs)} configurations")
        
    total_configs = sum(len(configs) for configs in matrices.values())
    print(f"\n🎯 Total Configurations: {total_configs}")
    
    # Save matrices
    print("\n💾 Saving matrices to files...")
    generator.save_matrices_to_files(matrices)
    
    # Generate testing schedule
    print("\n📅 Generating testing schedule...")
    schedule = generator.generate_testing_schedule(matrices)
    
    # Save schedule
    schedule_file = generator.output_dir / "testing_schedule.json"
    with open(schedule_file, 'w') as f:
        json.dump(schedule, f, indent=2)
        
    print(f"📋 Testing schedule saved to {schedule_file}")
    print(f"⏱️  Estimated total testing time: {schedule['estimated_total_time_hours']} hours")
    
    # Print execution recommendations
    print("\n🎯 Execution Recommendations:")
    print("Suggested order:", " → ".join(schedule["recommendations"]["suggested_execution_order"]))
    
    for matrix_name in schedule["recommendations"]["suggested_execution_order"]:
        matrix_info = schedule["matrices"][matrix_name]
        print(f"  • {matrix_name}: {matrix_info['configuration_count']} configs, "
              f"~{matrix_info['estimated_total_time_hours']}h total, "
              f"batch size: {matrix_info['recommended_batch_size']}")
    
    print("\n✅ Parameter matrix generation completed!")
    return matrices, schedule

if __name__ == "__main__":
    main()
