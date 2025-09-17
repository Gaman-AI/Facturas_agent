#!/usr/bin/env python3
"""
Facturas_agent UI MCP Server
专门为 CFDI 自动化项目设计的 UI 工具集
"""

import asyncio
import json
import os
import re
from typing import Any, Dict, List, Optional
from pathlib import Path
from mcp.server import Server
from mcp.types import Tool, TextContent

# 创建 MCP 服务器实例
app = Server("facturas-ui-mcp")

# 项目路径配置
PROJECT_ROOT = Path(__file__).parent
FRONTEND_PATH = PROJECT_ROOT / "frontend"
COMPONENTS_PATH = FRONTEND_PATH / "components"
UI_COMPONENTS_PATH = COMPONENTS_PATH / "ui"

# 项目主题配置
THEME_CONFIG = {
    "primary": "#208692",
    "secondary": "#F4F5F0", 
    "accent": "#D4D970",
    "background": "#ffffff",
    "foreground": "#0a0a0a"
}

@app.tool()
async def analyze_ui_components() -> str:
    """分析项目中现有的 UI 组件结构和依赖关系"""
    try:
        components_info = {
            "ui_components": [],
            "custom_components": [],
            "dependencies": {},
            "theme_variables": []
        }
        
        # 分析 UI 组件
        if UI_COMPONENTS_PATH.exists():
            for component_file in UI_COMPONENTS_PATH.glob("*.tsx"):
                component_name = component_file.stem
                with open(component_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                components_info["ui_components"].append({
                    "name": component_name,
                    "file": str(component_file.relative_to(FRONTEND_PATH)),
                    "size": len(content),
                    "imports": re.findall(r'import.*from.*["\']([^"\']+)["\']', content)
                })
        
        # 分析自定义组件
        for component_file in COMPONENTS_PATH.glob("*.tsx"):
            if component_file.parent == COMPONENTS_PATH:  # 只分析根目录的组件
                component_name = component_file.stem
                with open(component_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                components_info["custom_components"].append({
                    "name": component_name,
                    "file": str(component_file.relative_to(FRONTEND_PATH)),
                    "size": len(content),
                    "ui_components_used": re.findall(r'<(\w+)', content)
                })
        
        # 分析主题变量
        globals_css = FRONTEND_PATH / "app" / "globals.css"
        if globals_css.exists():
            with open(globals_css, 'r', encoding='utf-8') as f:
                css_content = f.read()
                css_vars = re.findall(r'--(\w+):\s*([^;]+);', css_content)
                components_info["theme_variables"] = [{"name": var, "value": value.strip()} for var, value in css_vars]
        
        return json.dumps(components_info, indent=2, ensure_ascii=False)
        
    except Exception as e:
        return f"Error analyzing UI components: {str(e)}"

@app.tool()
async def generate_ui_component(
    component_name: str,
    component_type: str = "button",
    props: Optional[Dict[str, Any]] = None,
    styling: str = "default"
) -> str:
    """为 Facturas_agent 项目生成 UI 组件"""
    
    if component_type == "button":
        template = f"""
import React from 'react';
import {{ Button }} from '@/components/ui/button';
import {{ cn }} from '@/lib/utils';

interface {component_name}Props {{
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}}

const {component_name}: React.FC<{component_name}Props> = ({{
  variant = 'default',
  size = 'default',
  className,
  children,
  onClick,
  disabled = false,
  ...props
}}) => {{
  return (
    <Button
      variant={{variant}}
      size={{size}}
      className={{cn(
        'bg-teal-500 hover:bg-teal-600 text-white',
        className
      )}}
      onClick={{onClick}}
      disabled={{disabled}}
      {{...props}}
    >
      {{children}}
    </Button>
  );
}};

export default {component_name};
"""
    elif component_type == "card":
        template = f"""
import React from 'react';
import {{ Card, CardContent, CardDescription, CardHeader, CardTitle }} from '@/components/ui/card';
import {{ cn }} from '@/lib/utils';

interface {component_name}Props {{
  title?: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}}

const {component_name}: React.FC<{component_name}Props> = ({{
  title,
  description,
  className,
  children,
  ...props
}}) => {{
  return (
    <Card className={{cn('border-teal-200 shadow-md', className)}} {{...props}}>
      {{title && (
        <CardHeader>
          <CardTitle className="text-teal-700">{{title}}</CardTitle>
          {{description && (
            <CardDescription className="text-teal-600">{{description}}</CardDescription>
          )}}
        </CardHeader>
      )}}
      <CardContent>
        {{children}}
      </CardContent>
    </Card>
  );
}};

export default {component_name};
"""
    else:
        available_types = ["button", "card"]
        return f"Error: Component type '{component_type}' not found. Available types: {available_types}"
    
    return template

@app.tool()
async def modify_theme_colors(
    primary_color: str,
    secondary_color: Optional[str] = None,
    accent_color: Optional[str] = None
) -> str:
    """修改 Facturas_agent 项目的主题颜色"""
    
    try:
        # 更新主题配置
        THEME_CONFIG["primary"] = primary_color
        if secondary_color:
            THEME_CONFIG["secondary"] = secondary_color
        if accent_color:
            THEME_CONFIG["accent"] = accent_color
        
        # 生成新的 CSS 变量
        css_variables = f"""
/* Updated theme colors for Facturas_agent */
:root {{
  --primary: {primary_color};
  --secondary: {THEME_CONFIG['secondary']};
  --accent: {THEME_CONFIG['accent']};
}}

/* Dark mode colors */
.dark {{
  --primary: {primary_color};
  --secondary: {THEME_CONFIG['secondary']};
  --accent: {THEME_CONFIG['accent']};
}}
"""
        
        return f"Theme colors updated successfully!\\n\\nNew CSS variables:\\n{css_variables}\\n\\nTo apply these changes:\\n1. Add the CSS variables to your globals.css file\\n2. Update your tailwind.config.ts if needed\\n3. Restart your development server"
        
    except Exception as e:
        return f"Error updating theme colors: {str(e)}"

@app.tool()
async def get_component_usage_examples(component_name: str) -> str:
    """获取指定组件的使用示例和最佳实践"""
    
    examples = {
        "button": """
// Basic usage
<Button variant="default" size="default">
  Click me
</Button>

// With custom styling
<Button 
  className="bg-teal-500 hover:bg-teal-600 text-white"
  onClick={() => console.log('Clicked!')}
>
  Submit
</Button>

// Different variants
<Button variant="outline">Outline Button</Button>
<Button variant="secondary">Secondary Button</Button>
<Button variant="destructive">Delete</Button>
""",
        
        "card": """
// Basic card
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
</Card>

// With custom styling
<Card className="border-teal-200 shadow-lg">
  <CardHeader>
    <CardTitle className="text-teal-700">Teal Card</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Custom styled card content</p>
  </CardContent>
</Card>
"""
    }
    
    if component_name not in examples:
        available_components = list(examples.keys())
        return f"Component '{component_name}' not found. Available components: {available_components}"
    
    return examples[component_name]

@app.tool()
async def list_available_components() -> str:
    """列出所有可用的 UI 组件和工具"""
    
    components_info = {
        "ui_components": [
            "button", "card", "form", "modal", "input", "select", 
            "checkbox", "radio", "switch", "slider", "progress",
            "badge", "avatar", "tooltip", "popover", "dropdown",
            "dialog", "sheet", "drawer", "tabs", "accordion"
        ],
        "custom_components": [
            "LiveViewPane", "TaskAnalytics", "ProfileDropdown",
            "LanguageToggle", "SimpleTaskSubmission", "TaskProgressIndicator"
        ],
        "task_components": [
            "cfdi", "invoice", "receipt", "payment"
        ],
        "theme_colors": THEME_CONFIG
    }
    
    return json.dumps(components_info, indent=2, ensure_ascii=False)

@app.tool()
async def get_project_status() -> str:
    """获取项目当前状态和开发进度"""
    
    try:
        status_info = {
            "project_name": "Facturas_agent",
            "frontend_path": str(FRONTEND_PATH),
            "components_count": len(list(UI_COMPONENTS_PATH.glob("*.tsx"))) if UI_COMPONENTS_PATH.exists() else 0,
            "custom_components_count": len(list(COMPONENTS_PATH.glob("*.tsx"))) if COMPONENTS_PATH.exists() else 0,
            "theme_colors": THEME_CONFIG,
            "ready_for_development": True
        }
        
        return json.dumps(status_info, indent=2, ensure_ascii=False)
        
    except Exception as e:
        return f"Error getting project status: {str(e)}"

# 启动服务器
if __name__ == "__main__":
    asyncio.run(app.run())

