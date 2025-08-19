import React from 'react';
import { cn } from '@/lib/utils';

// Types matching expo-liquid-glass-view
export enum CornerStyle {
  Continuous = "continuous",
  Circular = "circular",
}

export enum LiquidGlassType {
  Clear = "clear",
  Tint = "tint",
  Regular = "regular",
  Interactive = "interactive",
  Identity = "identity",
}

export interface LiquidGlassViewProps {
  type?: LiquidGlassType;
  tint?: string;
  cornerRadius?: number;
  cornerStyle?: CornerStyle;
  className?: string;
  children?: React.ReactNode;
  animate?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

// Main Liquid Glass View Component
export function LiquidGlassView({
  type = LiquidGlassType.Regular,
  tint,
  cornerRadius = 16,
  cornerStyle = CornerStyle.Continuous,
  className,
  children,
  animate = false,
  onClick,
  style,
  ...props
}: LiquidGlassViewProps) {
  const baseClasses = [
    'liquid-glass',
    `liquid-glass--${type}`,
    cornerStyle === CornerStyle.Circular ? 'liquid-glass--circular' : 'liquid-glass--continuous',
    animate && 'liquid-glass--animate'
  ].filter(Boolean);

  const customStyle: React.CSSProperties = {
    borderRadius: cornerStyle === CornerStyle.Circular ? '50%' : `${cornerRadius}px`,
    ...(tint && { background: tint }),
    ...style
  };

  return (
    <div
      className={cn(baseClasses, className)}
      style={customStyle}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}

// Glass Card Component
function GlassCard({
  className,
  children,
  ...props
}: Omit<LiquidGlassViewProps, 'type'>) {
  return (
    <LiquidGlassView
      type={LiquidGlassType.Regular}
      className={cn('liquid-glass-card', className)}
      {...props}
    >
      {children}
    </LiquidGlassView>
  );
}

// Glass Button Component
function GlassButton({
  className,
  children,
  ...props
}: Omit<LiquidGlassViewProps, 'type'> & {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
}) {
  const { variant = 'primary', ...restProps } = props;
  
  return (
    <LiquidGlassView
      type={LiquidGlassType.Interactive}
      className={cn(
        'liquid-glass-button',
        `liquid-glass--tint-${variant}`,
        className
      )}
      {...restProps}
    >
      {children}
    </LiquidGlassView>
  );
}

// Glass Input Component
function GlassInput({
  className,
  placeholder,
  value,
  onChange,
  type = 'text',
  ...props
}: Omit<LiquidGlassViewProps, 'type' | 'children'> & {
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
}) {
  return (
    <input
      type={type}
      className={cn('liquid-glass-input', className)}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      {...props}
    />
  );
}

// Glass Navigation Component
function GlassNavigation({
  className,
  children,
  ...props
}: Omit<LiquidGlassViewProps, 'type' | 'children'>) {
  return (
    <nav className={cn('liquid-glass-nav', className)} {...props}>
      {children}
    </nav>
  );
}

// Glass Navigation Item Component
function GlassNavItem({
  className,
  children,
  active,
  ...props
}: Omit<LiquidGlassViewProps, 'type' | 'children'> & {
  active?: boolean;
}) {
  return (
    <LiquidGlassView
      type={LiquidGlassType.Interactive}
      className={cn(
        'liquid-glass-nav-item',
        active && 'liquid-glass--tint-primary',
        className
      )}
      {...props}
    >
      {children}
    </LiquidGlassView>
  );
}

// Glass Sidebar Component
function GlassSidebar({
  className,
  children,
  ...props
}: Omit<LiquidGlassViewProps, 'type' | 'children'>) {
  return (
    <aside className={cn('liquid-glass-sidebar', className)} {...props}>
      {children}
    </aside>
  );
}

// Glass Modal Component
function GlassModal({
  className,
  children,
  isOpen,
  onClose,
  ...props
}: Omit<LiquidGlassViewProps, 'type' | 'children'> & {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <>
      <div className="liquid-glass-backdrop" onClick={onClose} />
      <LiquidGlassView
        type={LiquidGlassType.Identity}
        className={cn('liquid-glass-modal', className)}
        {...props}
      >
        {children}
      </LiquidGlassView>
    </>
  );
}

// Glass Container Component
function GlassContainer({
  className,
  children,
  ...props
}: Omit<LiquidGlassViewProps, 'type' | 'children'>) {
  return (
    <LiquidGlassView
      type={LiquidGlassType.Clear}
      className={cn('p-6', className)}
      {...props}
    >
      {children}
    </LiquidGlassView>
  );
}

// Glass Hero Section Component
function GlassHero({
  className,
  children,
  ...props
}: Omit<LiquidGlassViewProps, 'type' | 'children'>) {
  return (
    <section className={cn('py-20 px-6 text-center', className)}>
      <LiquidGlassView
        type={LiquidGlassType.Identity}
        className="max-w-4xl mx-auto p-12"
        animate
        {...props}
      >
        {children}
      </LiquidGlassView>
    </section>
  );
}

// Glass Grid Component
function GlassGrid({
  className,
  children,
  cols = 3,
  gap = 6,
  ...props
}: Omit<LiquidGlassViewProps, 'type' | 'children'> & {
  cols?: number;
  gap?: number;
}) {
  return (
    <div
      className={cn(
        'grid gap-6',
        cols === 2 && 'grid-cols-1 md:grid-cols-2',
        cols === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        cols === 4 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
        className
      )}
      style={{ gap: `${gap * 0.25}rem` }}
      {...props}
    >
      {children}
    </div>
  );
}

// Glass Stats Component
function GlassStats({
  className,
  children,
  ...props
}: Omit<LiquidGlassViewProps, 'type' | 'children'>) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-3 gap-6', className)} {...props}>
      {children}
    </div>
  );
}

// Glass Stat Item Component
function GlassStatItem({
  className,
  title,
  value,
  description,
  ...props
}: Omit<LiquidGlassViewProps, 'type' | 'children'> & {
  title: string;
  value: string | number;
  description?: string;
}) {
  return (
    <LiquidGlassView
      type={LiquidGlassType.Tint}
      className={cn('text-center p-6', className)}
      {...props}
    >
      <div className="text-3xl font-bold mb-2">{value}</div>
      <div className="text-lg font-medium mb-2">{title}</div>
      {description && <div className="text-sm opacity-75">{description}</div>}
    </LiquidGlassView>
  );
}

// Export all components
export {
  LiquidGlassView as ExpoLiquidGlassView, // Alias for compatibility
  GlassCard,
  GlassButton,
  GlassInput,
  GlassNavigation,
  GlassNavItem,
  GlassSidebar,
  GlassModal,
  GlassContainer,
  GlassHero,
  GlassGrid,
  GlassStats,
  GlassStatItem,
};
