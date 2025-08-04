'use client';

import React from 'react';
import { Clock, Play, CheckCircle2, XCircle, Pause, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui/enhanced-loading';
import { cn } from '@/lib/utils';
import { Task } from '@/services/api';
import { formatDistanceToNow } from 'date-fns';

export interface TaskProgressIndicatorProps {
  task: Task;
  showDetails?: boolean;
  variant?: 'compact' | 'detailed' | 'mini';
  className?: string;
}

export function TaskProgressIndicator({ 
  task, 
  showDetails = true, 
  variant = 'detailed',
  className 
}: TaskProgressIndicatorProps) {
  // Calculate progress based on task status and steps
  const getProgress = () => {
    const stepCount = task.steps?.length || 0;
    
    switch (task.status) {
      case 'pending':
        return { value: 0, color: 'yellow' as const, text: 'Queued' };
      case 'running':
        // Estimate progress based on steps (rough estimation)
        const estimatedSteps = Math.max(stepCount, 1);
        const progressValue = Math.min((stepCount / estimatedSteps) * 80, 90); // Cap at 90% until complete
        return { value: progressValue, color: 'blue' as const, text: 'Processing' };
      case 'completed':
        return { value: 100, color: 'green' as const, text: 'Completed' };
      case 'failed':
        return { value: stepCount > 0 ? 50 : 10, color: 'red' as const, text: 'Failed' };
      case 'paused':
        const pausedProgress = Math.min((stepCount / Math.max(stepCount, 1)) * 50, 75);
        return { value: pausedProgress, color: 'yellow' as const, text: 'Paused' };
      case 'cancelled':
        return { value: 0, color: 'red' as const, text: 'Cancelled' };
      default:
        return { value: 0, color: 'yellow' as const, text: 'Unknown' };
    }
  };

  const progress = getProgress();
  const isActive = ['pending', 'running'].includes(task.status);
  const hasSteps = task.steps && task.steps.length > 0;

  // Get elapsed time
  const getElapsedTime = () => {
    const start = new Date(task.created_at);
    const end = task.completed_at ? new Date(task.completed_at) : new Date();
    return formatDistanceToNow(start, { addSuffix: false });
  };

  // Get status icon
  const getStatusIcon = () => {
    const iconClass = "w-4 h-4";
    
    switch (task.status) {
      case 'pending':
        return <Clock className={cn(iconClass, "text-yellow-500")} />;
      case 'running':
        return <Play className={cn(iconClass, "text-blue-500 animate-pulse")} />;
      case 'completed':
        return <CheckCircle2 className={cn(iconClass, "text-green-500")} />;
      case 'failed':
        return <XCircle className={cn(iconClass, "text-red-500")} />;
      case 'paused':
        return <Pause className={cn(iconClass, "text-orange-500")} />;
      case 'cancelled':
        return <AlertCircle className={cn(iconClass, "text-gray-500")} />;
      default:
        return <Clock className={cn(iconClass, "text-gray-500")} />;
    }
  };

  if (variant === 'mini') {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        {getStatusIcon()}
        <div className="flex-1 min-w-0">
          <ProgressBar 
            value={progress.value} 
            color={progress.color} 
            size="sm"
            className="w-full max-w-24"
          />
        </div>
        <span className="text-xs text-gray-500">{Math.round(progress.value)}%</span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <Card className={cn('', className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              {getStatusIcon()}
              <Badge variant="outline" className="text-xs">
                {progress.text}
              </Badge>
            </div>
            <span className="text-sm font-medium">{Math.round(progress.value)}%</span>
          </div>
          
          <ProgressBar 
            value={progress.value} 
            color={progress.color} 
            showLabel={false}
            className="mb-2"
          />
          
          <div className="flex justify-between text-xs text-gray-500">
            <span>Elapsed: {getElapsedTime()}</span>
            {hasSteps && <span>{task.steps.length} steps</span>}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Detailed variant
  return (
    <Card className={cn('', className)}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              {getStatusIcon()}
              <div>
                <h3 className="font-medium text-gray-900">
                  {task.prompt || 'CFDI Automation Task'}
                </h3>
                <p className="text-sm text-gray-500">
                  ID: {task.id.slice(0, 8)}...
                </p>
              </div>
            </div>
            <Badge 
              variant={task.status === 'completed' ? 'default' : 'outline'}
              className={cn({
                'border-green-500 text-green-700': task.status === 'completed',
                'border-blue-500 text-blue-700': task.status === 'running',
                'border-yellow-500 text-yellow-700': task.status === 'pending' || task.status === 'paused',
                'border-red-500 text-red-700': task.status === 'failed' || task.status === 'cancelled'
              })}
            >
              {progress.text}
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium">{Math.round(progress.value)}%</span>
            </div>
            <ProgressBar 
              value={progress.value} 
              color={progress.color} 
              showLabel={false}
              size="md"
            />
          </div>

          {showDetails && (
            <>
              {/* Task Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Started:</span>
                  <p className="font-medium">{formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}</p>
                </div>
                <div>
                  <span className="text-gray-500">Duration:</span>
                  <p className="font-medium">{getElapsedTime()}</p>
                </div>
                {hasSteps && (
                  <div>
                    <span className="text-gray-500">Steps:</span>
                    <p className="font-medium">{task.steps.length} executed</p>
                  </div>
                )}
                {task.completed_at && (
                  <div>
                    <span className="text-gray-500">Completed:</span>
                    <p className="font-medium">{formatDistanceToNow(new Date(task.completed_at), { addSuffix: true })}</p>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {task.error_message && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex items-start space-x-2">
                    <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Error</p>
                      <p className="text-sm text-red-700 mt-1">{task.error_message}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Steps */}
              {hasSteps && task.steps.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-900">Recent Activity</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {task.steps.slice(-3).map((step, index) => (
                      <div key={index} className="text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                        <span className="font-medium">{step.step_type || 'action'}:</span> {
                          typeof step.content === 'string' 
                            ? step.content 
                            : JSON.stringify(step.content).slice(0, 100) + '...'
                        }
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Task Indicator */}
              {isActive && (
                <div className="flex items-center space-x-2 text-xs text-blue-600">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <span>Task is actively running...</span>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export interface TaskProgressListProps {
  tasks: Task[];
  maxTasks?: number;
  variant?: 'compact' | 'detailed' | 'mini';
  className?: string;
}

export function TaskProgressList({ 
  tasks, 
  maxTasks = 5, 
  variant = 'compact',
  className 
}: TaskProgressListProps) {
  const activeTasks = tasks
    .filter(task => ['pending', 'running', 'paused'].includes(task.status))
    .slice(0, maxTasks);

  if (activeTasks.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600">No active tasks</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {activeTasks.map((task) => (
        <TaskProgressIndicator 
          key={task.id} 
          task={task} 
          variant={variant}
          showDetails={variant === 'detailed'}
        />
      ))}
    </div>
  );
} 