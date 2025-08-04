'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Play,
  Pause
} from 'lucide-react';
import { ApiService, Task } from '@/services/api';
import { useLanguage } from '@/contexts/LanguageContext';

interface TaskStats {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  paused: number;
  cancelled: number;
  successRate: number;
  averageExecutionTime: number;
}

interface TaskStatsProps {
  refreshTrigger?: number;
}

export function TaskStats({ refreshTrigger = 0 }: TaskStatsProps) {
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { t } = useLanguage();

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all tasks to calculate statistics
      // In a real implementation, you might have a dedicated stats endpoint
      const tasks = await ApiService.getTasks(0, 1000); // Get a large number to calculate stats
      
      const stats: TaskStats = {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        running: tasks.filter(t => t.status === 'running').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        failed: tasks.filter(t => t.status === 'failed').length,
        paused: tasks.filter(t => t.status === 'paused').length,
        cancelled: tasks.filter(t => t.status === 'cancelled').length,
        successRate: 0,
        averageExecutionTime: 0
      };

      // Calculate success rate
      const finishedTasks = stats.completed + stats.failed + stats.cancelled;
      if (finishedTasks > 0) {
        stats.successRate = (stats.completed / finishedTasks) * 100;
      }

      // Calculate average execution time for completed tasks
      const completedTasks = tasks.filter(t => t.status === 'completed' && t.created_at && t.completed_at);
      if (completedTasks.length > 0) {
        const totalTime = completedTasks.reduce((sum, task) => {
          const start = new Date(task.created_at).getTime();
          const end = new Date(task.completed_at!).getTime();
          return sum + (end - start);
        }, 0);
        stats.averageExecutionTime = totalTime / completedTasks.length;
      }

      setStats(stats);
    } catch (err) {
      console.error('Error fetching task stats:', err);
      setError(err instanceof Error ? err.message : 'Error loading statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger]);

  const formatTime = (milliseconds: number): string => {
    if (milliseconds < 60000) {
      return `${Math.round(milliseconds / 1000)}s`;
    } else if (milliseconds < 3600000) {
      return `${Math.round(milliseconds / 60000)}m`;
    } else {
      return `${Math.round(milliseconds / 3600000)}h`;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" />
          <span className="ml-2">{t('common.loading', 'Loading...')}</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  const statCards = [
    {
      title: t('dashboard.stats.total', 'Total Tasks'),
      value: stats.total.toString(),
      icon: BarChart3,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: t('dashboard.stats.running', 'Running'),
      value: stats.running.toString(),
      icon: Play,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: t('dashboard.stats.completed', 'Completed'),
      value: stats.completed.toString(),
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
    {
      title: t('dashboard.stats.failed', 'Failed'),
      value: stats.failed.toString(),
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: t('dashboard.stats.successRate', 'Success Rate'),
      value: `${stats.successRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: stats.successRate >= 80 ? 'text-green-600' : stats.successRate >= 60 ? 'text-yellow-600' : 'text-red-600',
      bgColor: stats.successRate >= 80 ? 'bg-green-50' : stats.successRate >= 60 ? 'bg-yellow-50' : 'bg-red-50'
    },
    {
      title: t('dashboard.stats.avgTime', 'Avg. Time'),
      value: stats.averageExecutionTime > 0 ? formatTime(stats.averageExecutionTime) : '0s',
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {t('dashboard.statistics', 'Statistics')}
          </CardTitle>
          <CardDescription>
            {t('dashboard.statsDescription', 'Overview of your task automation performance')}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-sm transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {stats.total > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('dashboard.stats.breakdown', 'Task Breakdown')}</span>
                <span>{stats.total} {t('common.total', 'total')}</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="flex h-full rounded-full overflow-hidden">
                  {stats.completed > 0 && (
                    <div 
                      className="bg-green-500" 
                      style={{ width: `${(stats.completed / stats.total) * 100}%` }}
                      title={`${stats.completed} completed`}
                    />
                  )}
                  {stats.running > 0 && (
                    <div 
                      className="bg-blue-500" 
                      style={{ width: `${(stats.running / stats.total) * 100}%` }}
                      title={`${stats.running} running`}
                    />
                  )}
                  {stats.pending > 0 && (
                    <div 
                      className="bg-yellow-500" 
                      style={{ width: `${(stats.pending / stats.total) * 100}%` }}
                      title={`${stats.pending} pending`}
                    />
                  )}
                  {stats.paused > 0 && (
                    <div 
                      className="bg-orange-500" 
                      style={{ width: `${(stats.paused / stats.total) * 100}%` }}
                      title={`${stats.paused} paused`}
                    />
                  )}
                  {stats.failed > 0 && (
                    <div 
                      className="bg-red-500" 
                      style={{ width: `${(stats.failed / stats.total) * 100}%` }}
                      title={`${stats.failed} failed`}
                    />
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>{t('tasks.status.completed', 'Completed')} ({stats.completed})</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span>{t('tasks.status.running', 'Running')} ({stats.running})</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  <span>{t('tasks.status.pending', 'Pending')} ({stats.pending})</span>
                </div>
                {stats.paused > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-orange-500 rounded"></div>
                    <span>{t('tasks.status.paused', 'Paused')} ({stats.paused})</span>
                  </div>
                )}
                {stats.failed > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span>{t('tasks.status.failed', 'Failed')} ({stats.failed})</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 