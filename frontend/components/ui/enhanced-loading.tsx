'use client';

import React from 'react';
import { Loader2, RefreshCw, Clock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'dots' | 'pulse' | 'bars';
  className?: string;
  text?: string;
}

export function LoadingSpinner({ 
  size = 'md', 
  variant = 'default',
  className,
  text 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  if (variant === 'dots') {
    return (
      <div className={cn('flex items-center space-x-1', className)}>
        <div className={cn('bg-blue-500 rounded-full animate-bounce', sizeClasses[size])} />
        <div className={cn('bg-blue-500 rounded-full animate-bounce delay-100', sizeClasses[size])} />
        <div className={cn('bg-blue-500 rounded-full animate-bounce delay-200', sizeClasses[size])} />
        {text && <span className="ml-2 text-sm text-gray-600">{text}</span>}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={cn('flex items-center', className)}>
        <div className={cn('bg-blue-500 rounded-full animate-pulse', sizeClasses[size])} />
        {text && <span className="ml-2 text-sm text-gray-600">{text}</span>}
      </div>
    );
  }

  if (variant === 'bars') {
    return (
      <div className={cn('flex items-center space-x-1', className)}>
        <div className={cn('bg-blue-500 animate-pulse', sizeClasses[size])} style={{ animationDelay: '0ms' }} />
        <div className={cn('bg-blue-500 animate-pulse', sizeClasses[size])} style={{ animationDelay: '150ms' }} />
        <div className={cn('bg-blue-500 animate-pulse', sizeClasses[size])} style={{ animationDelay: '300ms' }} />
        {text && <span className="ml-2 text-sm text-gray-600">{text}</span>}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center', className)}>
      <Loader2 className={cn('animate-spin', sizeClasses[size])} />
      {text && <span className="ml-2 text-sm text-gray-600">{text}</span>}
    </div>
  );
}

export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'card' | 'avatar' | 'button';
  lines?: number;
}

export function Skeleton({ className, variant = 'text', lines = 1 }: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gray-200 rounded';

  if (variant === 'card') {
    return (
      <div className={cn('space-y-3', className)}>
        <div className={cn(baseClasses, 'h-4 w-3/4')} />
        <div className={cn(baseClasses, 'h-4 w-1/2')} />
        <div className={cn(baseClasses, 'h-20 w-full')} />
      </div>
    );
  }

  if (variant === 'avatar') {
    return (
      <div className={cn(baseClasses, 'h-10 w-10 rounded-full', className)} />
    );
  }

  if (variant === 'button') {
    return (
      <div className={cn(baseClasses, 'h-10 w-24', className)} />
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i} 
          className={cn(baseClasses, 'h-4', {
            'w-full': i === 0,
            'w-4/5': i === 1,
            'w-3/5': i === 2,
          })} 
        />
      ))}
    </div>
  );
}

export interface LoadingStateProps {
  type: 'fetching' | 'processing' | 'saving' | 'deleting' | 'updating';
  text?: string;
  className?: string;
}

export function LoadingState({ type, text, className }: LoadingStateProps) {
  const configs = {
    fetching: {
      icon: RefreshCw,
      color: 'text-blue-500',
      defaultText: 'Loading data...'
    },
    processing: {
      icon: Zap,
      color: 'text-yellow-500',
      defaultText: 'Processing...'
    },
    saving: {
      icon: Clock,
      color: 'text-green-500',
      defaultText: 'Saving...'
    },
    deleting: {
      icon: RefreshCw,
      color: 'text-red-500',
      defaultText: 'Deleting...'
    },
    updating: {
      icon: RefreshCw,
      color: 'text-blue-500',
      defaultText: 'Updating...'
    }
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center justify-center p-4', className)}>
      <Icon className={cn('w-5 h-5 animate-spin mr-2', config.color)} />
      <span className="text-sm text-gray-600">{text || config.defaultText}</span>
    </div>
  );
}

export interface FullPageLoadingProps {
  text?: string;
  subtext?: string;
}

export function FullPageLoading({ text = 'Loading...', subtext }: FullPageLoadingProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner size="xl" className="justify-center mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{text}</h2>
        {subtext && (
          <p className="text-gray-600">{subtext}</p>
        )}
      </div>
    </div>
  );
}

export interface ButtonLoadingProps {
  children: React.ReactNode;
  loading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export function ButtonLoading({ 
  children, 
  loading = false, 
  loadingText,
  disabled = false,
  className,
  variant = 'default',
  size = 'md',
  onClick
}: ButtonLoadingProps) {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors';
  
  const variantClasses = {
    default: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:bg-gray-50',
    ghost: 'text-gray-700 hover:bg-gray-100 disabled:text-gray-400'
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        'disabled:cursor-not-allowed',
        className
      )}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && (
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
      )}
      {loading ? (loadingText || 'Loading...') : children}
    </button>
  );
}

export interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
  color?: 'blue' | 'green' | 'yellow' | 'red';
  size?: 'sm' | 'md' | 'lg';
}

export function ProgressBar({ 
  value, 
  max = 100, 
  className, 
  showLabel = false,
  color = 'blue',
  size = 'md'
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500'
  };

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  return (
    <div className={cn('space-y-1', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs text-gray-600">
          <span>Progress</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div className={cn('w-full bg-gray-200 rounded-full overflow-hidden', sizeClasses[size])}>
        <div 
          className={cn('h-full transition-all duration-300 ease-out', colorClasses[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
} 