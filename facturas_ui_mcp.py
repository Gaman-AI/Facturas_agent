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
    
    component_templates = {
        "button": f"""
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
""",
        
        "card": f"""
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
""",
        
        "form": f"""
import React, {{ useState }} from 'react';
import {{ useForm }} from 'react-hook-form';
import {{ Form, FormControl, FormField, FormItem, FormLabel, FormMessage }} from '@/components/ui/form';
import {{ Input }} from '@/components/ui/input';
import {{ Button }} from '@/components/ui/button';
import {{ cn }} from '@/lib/utils';

interface {component_name}Props {{
  onSubmit: (data: any) => void;
  className?: string;
  fields: Array<{{
    name: string;
    label: string;
    type: string;
    required?: boolean;
    placeholder?: string;
  }}>;
}}

const {component_name}: React.FC<{component_name}Props> = ({{
  onSubmit,
  className,
  fields,
  ...props
}}) => {{
  const form = useForm();

  const handleSubmit = (data: any) => {{
    onSubmit(data);
  }};

  return (
    <Form {{...form}}>
      <form 
        onSubmit={{form.handleSubmit(handleSubmit)}}
        className={{cn('space-y-4', className)}}
        {{...props}}
      >
        {{fields.map((field) => (
          <FormField
            key={{field.name}}
            control={{form.control}}
            name={{field.name}}
            render={{({ field: formField })} => (
              <FormItem>
                <FormLabel className="text-teal-700">{{field.label}}</FormLabel>
                <FormControl>
                  <Input
                    type={{field.type}}
                    placeholder={{field.placeholder}}
                    className="border-teal-200 focus:border-teal-500"
                    {{...formField}}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}}
          />
        ))}}
        <Button 
          type="submit" 
          className="w-full bg-teal-500 hover:bg-teal-600 text-white"
        >
          Submit
        </Button>
      </form>
    </Form>
  );
}};

export default {component_name};
""",
        
        "modal": f"""
import React from 'react';
import {{ Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger }} from '@/components/ui/dialog';
import {{ Button }} from '@/components/ui/button';
import {{ cn }} from '@/lib/utils';

interface {component_name}Props {{
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  trigger?: React.ReactNode;
  className?: string;
}}

const {component_name}: React.FC<{component_name}Props> = ({{
  isOpen,
  onClose,
  title,
  description,
  children,
  trigger,
  className,
  ...props
}}) => {{
  return (
    <Dialog open={{isOpen}} onOpenChange={{onClose}}>
      {{trigger && <DialogTrigger asChild>{{trigger}}</DialogTrigger>}}
      <DialogContent className={{cn('border-teal-200', className)}} {{...props}}>
        <DialogHeader>
          {{title && <DialogTitle className="text-teal-700">{{title}}</DialogTitle>}}
          {{description && (
            <DialogDescription className="text-teal-600">{{description}}</DialogDescription>
          )}}
        </DialogHeader>
        <div className="py-4">
          {{children}}
        </div>
      </DialogContent>
    </Dialog>
  );
}};

export default {component_name};
"""
    }
    
    if component_type not in component_templates:
        available_types = list(component_templates.keys())
        return f"Error: Component type '{component_type}' not found. Available types: {available_types}"
    
    template = component_templates[component_type]
    
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
""",
        
        "form": """
// Basic form
<Form>
  <form onSubmit={handleSubmit}>
    <FormField name="email">
      <FormItem>
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input type="email" placeholder="Enter your email" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <Button type="submit">Submit</Button>
  </form>
</Form>
"""
    }
    
    if component_name not in examples:
        available_components = list(examples.keys())
        return f"Component '{component_name}' not found. Available components: {available_components}"
    
    return examples[component_name]

@app.tool()
async def create_task_component(
    component_name: str,
    task_type: str = "cfdi",
    features: List[str] = None
) -> str:
    """为 CFDI 任务创建专门的组件"""
    
    if features is None:
        features = ["form", "progress", "status"]
    
    task_templates = {
        "cfdi": f"""
import React, {{ useState }} from 'react';
import {{ Card, CardContent, CardHeader, CardTitle }} from '@/components/ui/card';
import {{ Button }} from '@/components/ui/button';
import {{ Progress }} from '@/components/ui/progress';
import {{ Badge }} from '@/components/ui/badge';
import {{ Input }} from '@/components/ui/input';
import {{ Label }} from '@/components/ui/label';

interface {component_name}Props {{
  onTaskSubmit: (taskData: any) => void;
  taskStatus?: 'idle' | 'processing' | 'completed' | 'error';
  progress?: number;
}}

const {component_name}: React.FC<{component_name}Props> = ({{
  onTaskSubmit,
  taskStatus = 'idle',
  progress = 0
}}) => {{
  const [formData, setFormData] = useState({{
    rfc: '',
    companyName: '',
    invoiceType: 'cfdi40'
  }});

  const handleSubmit = (e: React.FormEvent) => {{
    e.preventDefault();
    onTaskSubmit(formData);
  }};

  const getStatusBadge = () => {{
    switch (taskStatus) {{
      case 'processing':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Processing</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Ready</Badge>;
    }}
  }};

  return (
    <Card className="w-full max-w-md mx-auto border-teal-200">
      <CardHeader>
        <CardTitle className="text-teal-700 flex items-center justify-between">
          CFDI Task
          {{getStatusBadge()}}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {{taskStatus === 'processing' && (
          <div className="space-y-2">
            <Label>Progress</Label>
            <Progress value={{progress}} className="w-full" />
            <p className="text-sm text-gray-600">{{progress}}% complete</p>
          </div>
        )}}
        
        <form onSubmit={{handleSubmit}} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rfc">RFC</Label>
            <Input
              id="rfc"
              type="text"
              placeholder="Enter RFC"
              value={{formData.rfc}}
              onChange={{e => setFormData(prev => ({{...prev, rfc: e.target.value}}))}}
              className="border-teal-200 focus:border-teal-500"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              type="text"
              placeholder="Enter company name"
              value={{formData.companyName}}
              onChange={{e => setFormData(prev => ({{...prev, companyName: e.target.value}}))}}
              className="border-teal-200 focus:border-teal-500"
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-teal-500 hover:bg-teal-600 text-white"
            disabled={{taskStatus === 'processing'}}
          >
            {{taskStatus === 'processing' ? 'Processing...' : 'Start CFDI Task'}}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}};

export default {component_name};
"""
    }
    
    if task_type not in task_templates:
        available_types = list(task_templates.keys())
        return f"Task type '{task_type}' not found. Available types: {available_types}"
    
    return task_templates[task_type]

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

# 启动服务器
if __name__ == "__main__":
    asyncio.run(app.run())

