'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner, Skeleton, ButtonLoading } from '@/components/ui/enhanced-loading';
import { ErrorDisplay, EmptyState } from '@/components/ui/error-display';
import { TaskProgressIndicator } from '@/components/TaskProgressIndicator';
import { 
  Play, 
  Pause, 
  Square, 
  Trash2, 
  RefreshCw, 
  Search, 
  Filter,
  Calendar,
  Clock,
  Globe,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
  FileText
} from 'lucide-react';
import { ApiService, Task } from '@/services/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDistanceToNow } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { useTaskListMonitor } from '@/services/taskMonitor';

interface TaskListProps {
  maxTasks?: number;
  showHeader?: boolean;
  showFilters?: boolean;
  showPagination?: boolean;
  showProgress?: boolean;
}

interface TaskFilters {
  status: string;
  search: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export function TaskList({ 
  maxTasks = 10, 
  showHeader = true, 
  showFilters = true,
  showPagination = true,
  showProgress = true
}: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: string }>({});
  const [filters, setFilters] = useState<TaskFilters>({
    status: 'all',
    search: '',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });
  const [pagination, setPagination] = useState({
    skip: 0,
    limit: maxTasks,
    total: 0,
    hasMore: false
  });

  const { t, language } = useLanguage();
  const dateLocale = language === 'es' ? es : enUS;

  // Real-time monitoring
  const { updates, isMonitoring, addTask, removeTask, refresh: refreshMonitor } = useTaskListMonitor({
    pollingInterval: 5000 // Poll every 5 seconds
  });

  // Fetch tasks from API
  const fetchTasks = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const fetchedTasks = await ApiService.getTasks(pagination.skip, pagination.limit);
      
      // Apply client-side filtering if needed
      let filteredTasks = fetchedTasks;
      
      if (filters.status !== 'all') {
        filteredTasks = filteredTasks.filter(task => task.status === filters.status);
      }
      
      if (filters.search) {
        filteredTasks = filteredTasks.filter(task => 
          task.prompt?.toLowerCase().includes(filters.search.toLowerCase()) ||
          task.id.toLowerCase().includes(filters.search.toLowerCase())
        );
      }

      // Sort tasks
      filteredTasks.sort((a, b) => {
        const aValue = a[filters.sortBy as keyof Task] as string;
        const bValue = b[filters.sortBy as keyof Task] as string;
        
        if (filters.sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      setTasks(filteredTasks);
      
      // Add tasks to monitoring
      filteredTasks.forEach(task => {
        if (['pending', 'running', 'paused'].includes(task.status)) {
          addTask(task.id);
        }
      });

      setPagination(prev => ({
        ...prev,
        total: fetchedTasks.length,
        hasMore: fetchedTasks.length === pagination.limit
      }));
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err instanceof Error ? err.message : 'Error loading tasks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle real-time updates
  useEffect(() => {
    if (updates.length === 0) return;

    const latestUpdate = updates[0];
    setTasks(prevTasks => {
      const updatedTasks = prevTasks.map(task => 
        task.id === latestUpdate.taskId ? latestUpdate.task : task
      );
      
      // Stop monitoring completed/failed/cancelled tasks
      if (['completed', 'failed', 'cancelled'].includes(latestUpdate.task.status)) {
        removeTask(latestUpdate.taskId);
      }
      
      return updatedTasks;
    });
  }, [updates, removeTask]);

  // Initial load
  useEffect(() => {
    fetchTasks();
  }, [pagination.skip, pagination.limit]);

  // Refresh when filters change
  useEffect(() => {
    if (!loading) {
      fetchTasks();
    }
  }, [filters]);

  // Task control actions
  const handleTaskAction = async (taskId: string, action: 'pause' | 'resume' | 'stop' | 'delete') => {
    try {
      setActionLoading(prev => ({ ...prev, [taskId]: action }));
      
      switch (action) {
        case 'pause':
          await ApiService.pauseTask(taskId);
          break;
        case 'resume':
          await ApiService.resumeTask(taskId);
          break;
        case 'stop':
          await ApiService.stopTask(taskId);
          break;
        case 'delete':
          await ApiService.deleteTask(taskId);
          removeTask(taskId);
          break;
      }
      
      // Trigger immediate refresh
      await refreshMonitor();
    } catch (err) {
      console.error(`Error ${action} task:`, err);
      setError(`Error ${action} task: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setActionLoading(prev => {
        const newState = { ...prev };
        delete newState[taskId];
        return newState;
      });
    }
  };

  // Status badge configuration
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, icon: Clock, color: 'text-yellow-600' },
      running: { variant: 'default' as const, icon: Play, color: 'text-blue-600' },
      completed: { variant: 'default' as const, icon: CheckCircle2, color: 'text-green-600' },
      failed: { variant: 'destructive' as const, icon: XCircle, color: 'text-red-600' },
      paused: { variant: 'outline' as const, icon: Pause, color: 'text-orange-600' },
      cancelled: { variant: 'outline' as const, icon: Square, color: 'text-gray-600' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`w-3 h-3 ${config.color}`} />
        {status}
      </Badge>
    );
  };

  // Task actions based on status
  const getTaskActions = (task: Task) => {
    const actions = [];
    const isLoading = actionLoading[task.id];

    if (task.status === 'running') {
      actions.push(
        <ButtonLoading
          key="pause"
          size="sm" 
          variant="outline"
          loading={isLoading === 'pause'}
          loadingText="Pausing..."
          onClick={() => handleTaskAction(task.id, 'pause')}
        >
          <Pause className="w-3 h-3" />
        </ButtonLoading>
      );
      actions.push(
        <ButtonLoading
          key="stop"
          size="sm" 
          variant="outline"
          loading={isLoading === 'stop'}
          loadingText="Stopping..."
          onClick={() => handleTaskAction(task.id, 'stop')}
        >
          <Square className="w-3 h-3" />
        </ButtonLoading>
      );
    }

    if (task.status === 'paused') {
      actions.push(
        <ButtonLoading
          key="resume"
          size="sm" 
          variant="outline"
          loading={isLoading === 'resume'}
          loadingText="Resuming..."
          onClick={() => handleTaskAction(task.id, 'resume')}
        >
          <Play className="w-3 h-3" />
        </ButtonLoading>
      );
    }

    if (['completed', 'failed', 'cancelled'].includes(task.status)) {
      actions.push(
        <ButtonLoading
          key="delete"
          size="sm" 
          variant="outline"
          loading={isLoading === 'delete'}
          loadingText="Deleting..."
          onClick={() => handleTaskAction(task.id, 'delete')}
        >
          <Trash2 className="w-3 h-3" />
        </ButtonLoading>
      );
    }

    return actions;
  };

  // Loading skeleton
  if (loading && !refreshing) {
    return (
      <div className="space-y-4">
        {showHeader && (
          <Card>
            <CardHeader>
              <Skeleton variant="text" lines={2} />
            </CardHeader>
          </Card>
        )}
        
        {showFilters && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <Skeleton className="flex-1 h-10" />
                <Skeleton className="w-40 h-10" />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton variant="card" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showHeader && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Recent Tasks
                {isMonitoring ? (
                  <div title="Real-time monitoring active">
                    <Wifi className="w-4 h-4 text-green-500" />
                  </div>
                ) : (
                  <div title="Real-time monitoring disabled">
                    <WifiOff className="w-4 h-4 text-red-500" />
                  </div>
                )}
              </CardTitle>
              <CardDescription>
                Manage and monitor your CFDI automation tasks
                {isMonitoring && (
                  <span className="text-green-600 text-xs ml-2">
                    • Live updates
                  </span>
                )}
              </CardDescription>
            </div>
            <ButtonLoading
              variant="outline"
              size="sm"
              loading={refreshing}
              loadingText="Refreshing..."
              onClick={() => fetchTasks(true)}
            >
              <RefreshCw className="w-4 h-4" />
            </ButtonLoading>
          </CardHeader>
        </Card>
      )}

      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search tasks..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <ErrorDisplay
          error={error}
          variant="banner"
          onRetry={() => fetchTasks(true)}
          onDismiss={() => setError(null)}
        />
      )}

      <div className="space-y-3">
        {tasks.length === 0 ? (
          <EmptyState
            title="No tasks available"
            description="Create your first CFDI automation task to get started"
            icon={<FileText className="w-12 h-12 text-gray-400" />}
            action={{
              label: "Create Task",
              onClick: () => window.location.href = '/browser-agent-realtime'
            }}
          />
        ) : (
          tasks.map((task) => (
            <Card key={task.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Task Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(task.status)}
                        <span className="text-xs text-gray-500">
                          {task.id.slice(0, 8)}...
                        </span>
                        {['pending', 'running', 'paused'].includes(task.status) && isMonitoring && (
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Live monitoring" />
                        )}
                      </div>
                      
                      <h3 className="font-medium text-gray-900 truncate mb-1">
                        {task.prompt || 'No description'}
                      </h3>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {formatDistanceToNow(new Date(task.created_at), { 
                              addSuffix: true, 
                              locale: dateLocale 
                            })}
                          </span>
                        </div>
                        
                        {task.completed_at && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              Completed {formatDistanceToNow(new Date(task.completed_at), { 
                                addSuffix: true, 
                                locale: dateLocale 
                              })}
                            </span>
                          </div>
                        )}
                      </div>

                      {task.error_message && (
                        <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                          {task.error_message}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 ml-4">
                      {getTaskActions(task)}
                    </div>
                  </div>

                  {/* Progress Indicator for Active Tasks */}
                  {showProgress && ['pending', 'running', 'paused'].includes(task.status) && (
                    <TaskProgressIndicator task={task} variant="mini" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {showPagination && pagination.hasMore && (
        <Card>
          <CardContent className="pt-6 text-center">
            <ButtonLoading
              variant="outline"
              loading={loading}
              loadingText="Loading..."
              onClick={() => setPagination(prev => ({ ...prev, skip: prev.skip + prev.limit }))}
            >
              Load More
            </ButtonLoading>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 