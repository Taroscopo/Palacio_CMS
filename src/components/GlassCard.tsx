'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'strong' | 'subtle';
  glow?: boolean;
  glowColor?: 'primary' | 'accent';
  animate?: boolean;
  onClick?: () => void;
}

export function GlassCard({
  children,
  className,
  variant = 'default',
  glow = true,
  glowColor = 'primary',
  animate = false,
  onClick,
}: GlassCardProps) {
  const variantClasses = {
    default: 'glass-card',
    strong: 'glass-strong rounded-lg',
    subtle: 'glass rounded-lg',
  };

  const glowClasses = {
    primary: 'glow-hover',
    accent: 'glow-hover glow-hover-accent',
  };

  return (
    <div
      className={cn(
        variantClasses[variant],
        glow && glowClasses[glowColor],
        animate && 'animate-fade-slide-up',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {children}
    </div>
  );
}

interface GlassCardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function GlassCardHeader({ children, className }: GlassCardHeaderProps) {
  return (
    <div className={cn('px-6 py-4 border-b border-white/5', className)}>
      {children}
    </div>
  );
}

interface GlassCardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function GlassCardContent({ children, className }: GlassCardContentProps) {
  return (
    <div className={cn('px-6 py-4', className)}>
      {children}
    </div>
  );
}

interface GlassCardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function GlassCardFooter({ children, className }: GlassCardFooterProps) {
  return (
    <div className={cn('px-6 py-4 border-t border-white/5', className)}>
      {children}
    </div>
  );
}
