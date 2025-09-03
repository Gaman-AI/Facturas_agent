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
  Pause,
  Activity,
  CheckCircle
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
      let tasks: any[] = [];
      try {
        tasks = await ApiService.getTasks(0, 1000); // Get a large number to calculate stats
      } catch (apiError) {
        console.warn('Failed to fetch tasks, using empty stats:', apiError);
        // Continue with empty tasks array
      }
      
      const stats: TaskStats = {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        running: tasks.filter(t => t.status === 'running').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        failed: tasks.filter(t => t.status === 'failed').length,
        paused: tasks.filter(t => t.status === 'paused').length,
        cancelled: 0, // Task interface doesn't include 'cancelled' status
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
      // Provide default stats instead of showing error
      setStats({
        total: 0,
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0,
        paused: 0,
        cancelled: 0,
        successRate: 0,
        averageExecutionTime: 0
      });
      setError(null); // Don't show error, just show empty stats
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
          <span className="ml-2">{t('common.loading')}</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              {t('dashboard.statistics')}
            </CardTitle>
            <CardDescription>
              {t('dashboard.statsDescription')}
            </CardDescription>
          </CardHeader>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="hover:shadow-sm transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Loading...</p>
                    <p className="text-2xl font-bold text-foreground">-</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted">
                    <div className="w-5 h-5 bg-border rounded"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: t('dashboard.stats.total'),
      value: stats.total.toString(),
      icon: BarChart3,
      color: 'text-primary',
      bgColor: 'bg-muted'
    },
    {
      title: t('dashboard.stats.running'),
      value: stats.running.toString(),
      icon: Activity,
      color: 'text-primary',
      bgColor: 'bg-accent'
    },
    {
      title: t('dashboard.stats.completed'),
      value: stats.completed.toString(),
      icon: CheckCircle,
      color: 'text-muted-foreground',
      bgColor: 'bg-secondary'
    },
    {
      title: t('dashboard.stats.failed'),
      value: stats.failed.toString(),
      icon: AlertCircle,
      color: 'text-destructive',
      bgColor: 'bg-secondary'
    },
    {
      title: t('dashboard.stats.pending'),
      value: stats.pending.toString(),
      icon: Clock,
      color: 'text-accent-foreground',
      bgColor: 'bg-accent'
    },
    {
      title: t('dashboard.stats.successRate'),
      value: `${stats.successRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-primary',
      bgColor: 'bg-muted'
    }
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {t('dashboard.statistics')}
          </CardTitle>
          <CardDescription>
            {t('dashboard.statsDescription')}
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
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
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
                <span>{t('dashboard.stats.breakdown')}</span>
                <span>{stats.total} {t('common.total')}</span>
              </div>
              
              <div className="w-full bg-border rounded-full h-2">
                <div className="flex h-full rounded-full overflow-hidden">
                  {stats.completed > 0 && (
                    <div 
                      className="bg-primary" 
                      style={{ width: `${(stats.completed / stats.total) * 100}%` }}
                      title={`${stats.completed} completed`}
                    />
                  )}
                  {stats.running > 0 && (
                    <div 
                      className="bg-muted-foreground" 
                      style={{ width: `${(stats.running / stats.total) * 100}%` }}
                      title={`${stats.running} running`}
                    />
                  )}
                  {stats.pending > 0 && (
                    <div 
                      className="bg-accent" 
                      style={{ width: `${(stats.pending / stats.total) * 100}%` }}
                      title={`${stats.pending} pending`}
                    />
                  )}
                  {stats.paused > 0 && (
                    <div 
                      className="bg-accent" 
                      style={{ width: `${(stats.paused / stats.total) * 100}%` }}
                      title={`${stats.paused} paused`}
                    />
                  )}
                  {stats.failed > 0 && (
                    <div 
                      className="bg-destructive" 
                      style={{ width: `${(stats.failed / stats.total) * 100}%` }}
                      title={`${stats.failed} failed`}
                    />
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-primary rounded"></div>
                  <span>{t('tasks.status.completed')} ({stats.completed})</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-muted-foreground rounded"></div>
                  <span>{t('tasks.status.running')} ({stats.running})</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-accent rounded"></div>
                  <span>{t('tasks.status.pending')} ({stats.pending})</span>
                </div>
                {stats.paused > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-accent rounded"></div>
                    <span>{t('tasks.status.paused')} ({stats.paused})</span>
                  </div>
                )}
                {stats.failed > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-destructive rounded"></div>
                    <span>{t('tasks.status.failed')} ({stats.failed})</span>
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