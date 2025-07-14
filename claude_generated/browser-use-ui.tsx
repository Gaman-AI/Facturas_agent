import React, { useState, useEffect, useRef } from 'react';
import { Send, Play, Pause, Square, Clock, Eye, Trash2, ChevronRight, Bot, User, Activity, Monitor, ArrowLeft } from 'lucide-react';

// Mock data
const mockTasks = [
  {
    id: 1,
    prompt: "Extract ShowHN posts from Hacker News and create a summary",
    status: 'completed',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    completed_at: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 2,
    prompt: "Research and compare the top 5 AI companies by market cap",
    status: 'running',
    created_at: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 3,
    prompt: "Download the latest financial report from Apple's investor relations page",
    status: 'paused',
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
];

const mockTaskSteps = [
  {
    id: 1,
    step_type: 'thinking',
    content: { message: 'Analyzing the task requirements and planning the approach...' },
    timestamp: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: 2,
    step_type: 'action',
    content: { message: 'Navigating to Hacker News website...' },
    timestamp: new Date(Date.now() - 240000).toISOString(),
  },
  {
    id: 3,
    step_type: 'observation',
    content: { message: 'Successfully loaded Hacker News homepage. Found 30 posts on the front page.' },
    timestamp: new Date(Date.now() - 180000).toISOString(),
  },
  {
    id: 4,
    step_type: 'action',
    content: { message: 'Extracting ShowHN posts from the page...' },
    timestamp: new Date(Date.now() - 120000).toISOString(),
  },
];

const BrowserUseAgent = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [tasks, setTasks] = useState(mockTasks);
  const [taskSteps, setTaskSteps] = useState([]);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [message, setMessage] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (selectedTaskId && currentView === 'taskExecution') {
      setTaskSteps(mockTaskSteps);
    }
  }, [selectedTaskId, currentView]);

  const handleSendMessage = async (messageText) => {
    if (!messageText.trim()) return;
    
    setIsCreatingTask(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newTask = {
        id: Date.now(),
        prompt: messageText,
        status: 'running',
        created_at: new Date().toISOString(),
      };
      
      setTasks(prev => [newTask, ...prev]);
      setSelectedTaskId(newTask.id);
      setCurrentView('taskExecution');
      setMessage('');
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleSubmit = () => {
    handleSendMessage(message);
  };

  const handleTaskAction = async (taskId, action) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, status: action } : task
      ));
      
      if (action === 'delete') {
        setTasks(prev => prev.filter(task => task.id !== taskId));
        if (selectedTaskId === taskId) {
          setCurrentView('dashboard');
          setSelectedTaskId(null);
        }
      }
    } catch (error) {
      console.error(`Error ${action} task:`, error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'text-green-600 bg-green-50';
      case 'paused': return 'text-orange-600 bg-orange-50';
      case 'completed': return 'text-blue-600 bg-blue-50';
      case 'failed': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStepIcon = (stepType) => {
    switch (stepType) {
      case 'thinking': return '🤔';
      case 'action': return '⚡';
      case 'observation': return '👀';
      case 'error': return '❌';
      default: return '📝';
    }
  };

  const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : null;

  if (currentView === 'taskExecution' && selectedTask) {
    return (
      <div className="h-screen bg-white flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </button>
            <div className="w-px h-6 bg-gray-300" />
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                selectedTask.status === 'running' ? 'bg-green-500' :
                selectedTask.status === 'paused' ? 'bg-orange-500' :
                selectedTask.status === 'completed' ? 'bg-blue-500' :
                'bg-gray-500'
              }`} />
              <span className="font-medium">Task #{selectedTask.id}</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedTask.status)}`}>
                {selectedTask.status}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {selectedTask.status === 'running' && (
              <button
                onClick={() => handleTaskAction(selectedTask.id, 'paused')}
                className="flex items-center px-3 py-1.5 text-sm bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 transition-colors"
              >
                <Pause className="w-4 h-4 mr-1" />
                Pause
              </button>
            )}
            {selectedTask.status === 'paused' && (
              <button
                onClick={() => handleTaskAction(selectedTask.id, 'running')}
                className="flex items-center px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
              >
                <Play className="w-4 h-4 mr-1" />
                Resume
              </button>
            )}
            <button
              onClick={() => handleTaskAction(selectedTask.id, 'failed')}
              className="flex items-center px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
            >
              <Square className="w-4 h-4 mr-1" />
              Stop
            </button>
          </div>
        </div>

        {/* Task Details */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="max-w-4xl">
            <h3 className="font-medium text-gray-900 mb-2">Task Prompt</h3>
            <p className="text-gray-700">{selectedTask.prompt}</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex">
          {/* Agent Activity */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="max-w-4xl space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Activity className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-semibold">Agent Activity</h3>
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                  {taskSteps.length} steps
                </span>
              </div>
              
              {taskSteps.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Bot className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Agent is starting up...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {taskSteps.map((step, index) => (
                    <div key={step.id} className="flex space-x-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-sm">{getStepIcon(step.step_type)}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium capitalize">{step.step_type}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(step.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm leading-relaxed">
                          {step.content.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Browser Preview */}
          <div className="w-96 border-l border-gray-200 p-4">
            <div className="flex items-center space-x-2 mb-4">
              <Monitor className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-semibold">Browser Preview</h3>
              <span className="px-2 py-1 text-xs bg-green-100 text-green-600 rounded-full">
                Live
              </span>
            </div>
            
            <div className="h-64 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Monitor className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Browser preview will appear here</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-16'} transition-all duration-300 border-r border-gray-200 flex flex-col`}>
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              {sidebarOpen && <span className="font-semibold">Browser Agent</span>}
            </div>
            {sidebarOpen && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
        
        {sidebarOpen && (
          <div className="flex-1 p-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Tasks</h3>
              {tasks.slice(0, 5).map((task) => (
                <button
                  key={task.id}
                  onClick={() => {
                    setSelectedTaskId(task.id);
                    setCurrentView('taskExecution');
                  }}
                  className="w-full text-left p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      task.status === 'running' ? 'bg-green-500' :
                      task.status === 'paused' ? 'bg-orange-500' :
                      task.status === 'completed' ? 'bg-blue-500' :
                      'bg-gray-500'
                    }`} />
                    <span className="text-sm text-gray-700 truncate">
                      {task.prompt.length > 30 ? task.prompt.substring(0, 30) + '...' : task.prompt}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Browser Use Agent</h1>
              <p className="text-gray-600 mt-1">Automate web tasks with AI</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-sm text-gray-600">Online</span>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Welcome Message */}
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-8 h-8 text-gray-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">What do you want me to do?</h2>
                <p className="text-gray-600 max-w-md mx-auto">
                  I can help you automate web tasks. Just describe what you need and I'll take care of it.
                </p>
              </div>

              {/* Example Tasks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                {[
                  'Extract ShowHN posts from Hacker News',
                  'Research top 5 AI companies',
                  'Download financial reports',
                  'Create a summary of latest tech news'
                ].map((example, index) => (
                  <button
                    key={index}
                    onClick={() => setMessage(example)}
                    className="p-4 text-left border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm">
                          {index === 0 ? '🔍' : index === 1 ? '📊' : index === 2 ? '📄' : '📰'}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-700">{example}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4">
            <div className="max-w-4xl mx-auto">
              <div className="relative">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Message Browser Agent..."
                  className="w-full p-4 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={1}
                  style={{ minHeight: '56px' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                />
                <button
                  onClick={handleSubmit}
                  disabled={!message.trim() || isCreatingTask}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrowserUseAgent;