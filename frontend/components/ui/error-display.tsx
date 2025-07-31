'use client';

import React from 'react';
import { AlertCircle, XCircle, AlertTriangle, Info, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface ErrorDisplayProps {
  error: string | Error;
  title?: string;
  variant?: 'inline' | 'card' | 'banner';
  severity?: 'error' | 'warning' | 'info';
  onRetry?: () => void;
  onDismiss?: () => void;
  retryText?: string;
  className?: string;
}

export function ErrorDisplay({
  error,
  title,
  variant = 'inline',
  severity = 'error',
  onRetry,
  onDismiss,
  retryText = 'Try Again',
  className
}: ErrorDisplayProps) {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  const icons = {
    error: XCircle,
    warning: AlertTriangle,
    info: Info
  };

  const colors = {
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: 'text-red-500',
      button: 'text-red-600 hover:text-red-800'
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: 'text-yellow-500',
      button: 'text-yellow-600 hover:text-yellow-800'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: 'text-blue-500',
      button: 'text-blue-600 hover:text-blue-800'
    }
  };

  const Icon = icons[severity];
  const color = colors[severity];

  const content = (
    <div className="flex items-start space-x-3">
      <Icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', color.icon)} />
      <div className="flex-1 min-w-0">
        {title && (
          <h3 className={cn('font-medium', color.text)}>{title}</h3>
        )}
        <p className={cn('text-sm', color.text, { 'mt-1': title })}>
          {errorMessage}
        </p>
        {(onRetry || onDismiss) && (
          <div className="mt-3 flex space-x-3">
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className={cn('text-xs', color.button)}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                {retryText}
              </Button>
            )}
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className={cn('text-xs', color.button)}
              >
                Dismiss
              </Button>
            )}
          </div>
        )}
      </div>
      {onDismiss && variant === 'banner' && (
        <button
          onClick={onDismiss}
          className={cn('flex-shrink-0', color.button)}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  if (variant === 'card') {
    return (
      <Card className={cn(color.border, className)}>
        <CardContent className={cn('pt-6', color.bg)}>
          {content}
        </CardContent>
      </Card>
    );
  }

  if (variant === 'banner') {
    return (
      <div className={cn(
        'rounded-md p-4 border',
        color.bg,
        color.border,
        className
      )}>
        {content}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <Icon className={cn('w-4 h-4', color.icon)} />
      <span className={cn('text-sm', color.text)}>{errorMessage}</span>
      {onRetry && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          className={cn('text-xs ml-2', color.button)}
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          {retryText}
        </Button>
      )}
    </div>
  );
}

export interface NetworkErrorProps {
  onRetry?: () => void;
  className?: string;
}

export function NetworkError({ onRetry, className }: NetworkErrorProps) {
  return (
    <ErrorDisplay
      error="Network connection failed. Please check your internet connection and try again."
      title="Connection Error"
      variant="card"
      severity="error"
      onRetry={onRetry}
      retryText="Retry Connection"
      className={className}
    />
  );
}

export interface NotFoundErrorProps {
  resource?: string;
  onGoBack?: () => void;
  className?: string;
}

export function NotFoundError({ resource = 'resource', onGoBack, className }: NotFoundErrorProps) {
  return (
    <ErrorDisplay
      error={`The ${resource} you're looking for could not be found.`}
      title="Not Found"
      variant="card"
      severity="warning"
      onRetry={onGoBack}
      retryText="Go Back"
      className={className}
    />
  );
}

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div className={cn('text-center py-12', className)}>
      {icon && (
        <div className="flex justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">{description}</p>
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose?: () => void;
}

export function Toast({ message, type = 'info', onClose }: ToastProps) {
  const configs = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: 'text-green-500'
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: 'text-red-500'
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: 'text-yellow-500'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: 'text-blue-500'
    }
  };

  const config = configs[type];

  return (
    <div className={cn(
      'fixed top-4 right-4 z-50 max-w-sm w-full rounded-lg border p-4 shadow-lg',
      config.bg,
      config.border
    )}>
      <div className="flex items-start">
        <div className="flex-1">
          <p className={cn('text-sm font-medium', config.text)}>
            {message}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={cn('ml-3 flex-shrink-0', config.text)}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
} 