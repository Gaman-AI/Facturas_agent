#!/usr/bin/env python3
"""
UI Components Search MCP Server
专门用于搜索和推荐好看的 UI 组件
"""

import asyncio
import json
import requests
from typing import Any, Dict, List, Optional
from mcp.server import Server
from mcp.types import Tool, TextContent

# 创建 MCP 服务器实例
app = Server("ui-components-mcp")

# UI 组件库配置
UI_LIBRARIES = {
    "shadcn_ui": {
        "name": "shadcn/ui",
        "url": "https://ui.shadcn.com",
        "description": "基于 Radix UI 的高质量组件库",
        "style": "现代、简洁、可定制"
    },
    "chakra_ui": {
        "name": "Chakra UI",
        "url": "https://chakra-ui.com",
        "description": "简单、模块化的 React 组件库",
        "style": "简洁、易用、响应式"
    },
    "ant_design": {
        "name": "Ant Design",
        "url": "https://ant.design",
        "description": "企业级 UI 设计语言",
        "style": "专业、企业级、功能丰富"
    },
    "material_ui": {
        "name": "Material-UI",
        "url": "https://mui.com",
        "description": "Google Material Design 实现",
        "style": "Material Design、现代、一致"
    },
    "headless_ui": {
        "name": "Headless UI",
        "url": "https://headlessui.com",
        "description": "完全无样式的 UI 组件",
        "style": "无样式、完全可定制"
    },
    "mantine": {
        "name": "Mantine",
        "url": "https://mantine.dev",
        "description": "功能丰富的 React 组件库",
        "style": "现代、功能丰富、TypeScript"
    }
}

# 组件类型分类
COMPONENT_CATEGORIES = {
    "forms": ["input", "select", "checkbox", "radio", "switch", "slider", "form"],
    "navigation": ["button", "menu", "tabs", "breadcrumb", "pagination", "sidebar"],
    "feedback": ["alert", "toast", "modal", "dialog", "tooltip", "popover"],
    "data_display": ["table", "card", "list", "grid", "chart", "calendar"],
    "layout": ["container", "grid", "flex", "spacer", "divider"],
    "media": ["avatar", "image", "video", "carousel", "gallery"]
}

@app.tool()
async def search_ui_components(
    component_type: str,
    style: str = "modern",
    library: Optional[str] = None
) -> str:
    """搜索特定类型的 UI 组件"""
    
    try:
        # 根据组件类型推荐
        recommendations = {
            "button": [
                {
                    "name": "shadcn/ui Button",
                    "library": "shadcn_ui",
                    "description": "可定制性强的按钮组件",
                    "features": ["多种变体", "尺寸选项", "加载状态", "图标支持"],
                    "code_example": """
import { Button } from "@/components/ui/button"

<Button variant="default" size="lg">
  Click me
</Button>
""",
                    "url": "https://ui.shadcn.com/docs/components/button"
                },
                {
                    "name": "Chakra UI Button",
                    "library": "chakra_ui",
                    "description": "简单易用的按钮组件",
                    "features": ["颜色主题", "尺寸变体", "加载状态", "响应式"],
                    "code_example": """
import { Button } from '@chakra-ui/react'

<Button colorScheme='blue' size='lg'>
  Button
</Button>
""",
                    "url": "https://chakra-ui.com/docs/components/button"
                }
            ],
            "card": [
                {
                    "name": "shadcn/ui Card",
                    "library": "shadcn_ui",
                    "description": "优雅的卡片组件",
                    "features": ["头部、内容、底部", "阴影效果", "边框样式", "响应式"],
                    "code_example": """
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    Card content
  </CardContent>
</Card>
""",
                    "url": "https://ui.shadcn.com/docs/components/card"
                },
                {
                    "name": "Ant Design Card",
                    "library": "ant_design",
                    "description": "功能丰富的卡片组件",
                    "features": ["多种样式", "加载状态", "操作按钮", "网格布局"],
                    "code_example": """
import { Card } from 'antd';

<Card title="Card title" bordered={false}>
  <p>Card content</p>
</Card>
""",
                    "url": "https://ant.design/components/card"
                }
            ],
            "form": [
                {
                    "name": "shadcn/ui Form",
                    "library": "shadcn_ui",
                    "description": "基于 React Hook Form 的表单组件",
                    "features": ["验证", "错误处理", "类型安全", "可访问性"],
                    "code_example": """
import { useForm } from "react-hook-form"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="email"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input placeholder="shadcn@example.com" {...field} />
          </FormControl>
        </FormItem>
      )}
    />
  </form>
</Form>
""",
                    "url": "https://ui.shadcn.com/docs/components/form"
                }
            ]
        }
        
        if component_type not in recommendations:
            available_types = list(recommendations.keys())
            return f"Component type '{component_type}' not found. Available types: {available_types}"
        
        # 过滤库
        results = recommendations[component_type]
        if library:
            results = [r for r in results if r["library"] == library]
        
        return json.dumps({
            "component_type": component_type,
            "style": style,
            "recommendations": results,
            "total_found": len(results)
        }, indent=2, ensure_ascii=False)
        
    except Exception as e:
        return f"Error searching UI components: {str(e)}"

@app.tool()
async def get_ui_library_info(library_name: str) -> str:
    """获取 UI 库的详细信息"""
    
    if library_name not in UI_LIBRARIES:
        available_libraries = list(UI_LIBRARIES.keys())
        return f"Library '{library_name}' not found. Available libraries: {available_libraries}"
    
    library_info = UI_LIBRARIES[library_name]
    
    # 添加安装和使用信息
    installation_info = {
        "shadcn_ui": {
            "install": "npx shadcn-ui@latest add [component]",
            "setup": "需要配置 tailwind.config.js 和 components.json",
            "pros": ["高质量", "可定制", "TypeScript", "无障碍"],
            "cons": ["需要配置", "学习曲线"]
        },
        "chakra_ui": {
            "install": "npm i @chakra-ui/react @emotion/react @emotion/styled framer-motion",
            "setup": "需要配置 ChakraProvider",
            "pros": ["易用", "主题系统", "响应式", "文档完善"],
            "cons": ["包体积较大", "样式耦合"]
        },
        "ant_design": {
            "install": "npm install antd",
            "setup": "直接导入使用",
            "pros": ["功能丰富", "企业级", "中文文档", "稳定"],
            "cons": ["包体积大", "样式固定", "定制困难"]
        }
    }
    
    info = {
        **library_info,
        "installation": installation_info.get(library_name, {}),
        "best_for": {
            "shadcn_ui": "需要高度定制的现代项目",
            "chakra_ui": "快速开发的原型项目",
            "ant_design": "企业级管理后台",
            "material_ui": "遵循 Material Design 的项目",
            "headless_ui": "需要完全自定义样式的项目",
            "mantine": "功能丰富的应用"
        }.get(library_name, "通用项目")
    }
    
    return json.dumps(info, indent=2, ensure_ascii=False)

@app.tool()
async def generate_component_comparison(
    component_type: str,
    libraries: List[str] = None
) -> str:
    """比较不同库中相同组件的实现"""
    
    if libraries is None:
        libraries = ["shadcn_ui", "chakra_ui", "ant_design"]
    
    comparisons = {
        "button": {
            "shadcn_ui": {
                "pros": ["高度可定制", "TypeScript", "无障碍"],
                "cons": ["需要配置", "学习曲线"],
                "code": """
<Button variant="destructive" size="lg">
  Delete
</Button>
"""
            },
            "chakra_ui": {
                "pros": ["简单易用", "主题系统", "响应式"],
                "cons": ["包体积", "样式耦合"],
                "code": """
<Button colorScheme='red' size='lg'>
  Delete
</Button>
"""
            },
            "ant_design": {
                "pros": ["功能丰富", "稳定", "中文文档"],
                "cons": ["包体积大", "定制困难"],
                "code": """
<Button type="primary" danger size="large">
  Delete
</Button>
"""
            }
        }
    }
    
    if component_type not in comparisons:
        available_types = list(comparisons.keys())
        return f"Component type '{component_type}' not found. Available types: {available_types}"
    
    comparison_data = comparisons[component_type]
    filtered_comparison = {lib: comparison_data[lib] for lib in libraries if lib in comparison_data}
    
    return json.dumps({
        "component_type": component_type,
        "libraries": libraries,
        "comparison": filtered_comparison
    }, indent=2, ensure_ascii=False)

@app.tool()
async def suggest_modern_ui_trends() -> str:
    """推荐现代 UI 设计趋势和组件"""
    
    trends = {
        "2024_ui_trends": [
            {
                "name": "Glassmorphism",
                "description": "毛玻璃效果，透明度和模糊背景",
                "components": ["card", "modal", "sidebar"],
                "example": "使用 backdrop-blur 和半透明背景"
            },
            {
                "name": "Neumorphism",
                "description": "软阴影效果，模拟物理材质",
                "components": ["button", "input", "card"],
                "example": "使用 inset 和 outset 阴影"
            },
            {
                "name": "Micro-interactions",
                "description": "微交互和动画效果",
                "components": ["button", "toggle", "progress"],
                "example": "悬停效果、点击反馈、加载动画"
            },
            {
                "name": "Dark Mode First",
                "description": "优先考虑深色模式设计",
                "components": ["theme", "color-scheme"],
                "example": "CSS 变量和主题切换"
            },
            {
                "name": "Accessibility First",
                "description": "无障碍设计优先",
                "components": ["focus-states", "aria-labels", "keyboard-nav"],
                "example": "键盘导航、屏幕阅读器支持"
            }
        ],
        "recommended_libraries": [
            {
                "name": "shadcn/ui",
                "reason": "现代化、可定制、TypeScript 支持",
                "best_for": "React + Tailwind 项目"
            },
            {
                "name": "Radix UI",
                "reason": "无样式、完全可定制、无障碍",
                "best_for": "需要完全自定义的项目"
            },
            {
                "name": "Framer Motion",
                "reason": "强大的动画库",
                "best_for": "需要复杂动画的项目"
            }
        ]
    }
    
    return json.dumps(trends, indent=2, ensure_ascii=False)

@app.tool()
async def get_component_showcase_urls() -> str:
    """获取组件展示和示例的 URL"""
    
    showcases = {
        "component_galleries": [
            {
                "name": "shadcn/ui Components",
                "url": "https://ui.shadcn.com/docs/components",
                "description": "完整的组件文档和示例"
            },
            {
                "name": "Chakra UI Components",
                "url": "https://chakra-ui.com/docs/components",
                "description": "Chakra UI 组件库"
            },
            {
                "name": "Ant Design Components",
                "url": "https://ant.design/components/overview",
                "description": "Ant Design 组件概览"
            }
        ],
        "design_inspiration": [
            {
                "name": "Dribbble",
                "url": "https://dribbble.com",
                "description": "UI 设计灵感"
            },
            {
                "name": "Behance",
                "url": "https://behance.net",
                "description": "创意作品展示"
            },
            {
                "name": "UI Movement",
                "url": "https://uimovement.com",
                "description": "UI 动画和交互"
            }
        ],
        "code_examples": [
            {
                "name": "CodePen",
                "url": "https://codepen.io",
                "description": "前端代码示例"
            },
            {
                "name": "CodeSandbox",
                "url": "https://codesandbox.io",
                "description": "React 项目示例"
            },
            {
                "name": "Storybook",
                "url": "https://storybook.js.org",
                "description": "组件开发工具"
            }
        ]
    }
    
    return json.dumps(showcases, indent=2, ensure_ascii=False)

# 启动服务器
if __name__ == "__main__":
    asyncio.run(app.run())

