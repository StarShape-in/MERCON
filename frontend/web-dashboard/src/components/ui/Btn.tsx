import React from 'react';
import { Button } from './button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md';
  isLoading?: boolean;
}

export default function Btn({
  label,
  icon,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  ...props
}: BtnProps) {
  // Map our custom variants to Shadcn variants
  const shadcnVariant = 
    variant === 'primary' ? 'default' :
    variant === 'secondary' ? 'secondary' :
    variant === 'outline' ? 'outline' : 'ghost';

  const shadcnSize = size === 'sm' ? 'sm' : 'default';

  return (
    <Button 
      variant={shadcnVariant} 
      size={shadcnSize} 
      className={cn("gap-1.5 rounded-xl font-semibold transition-all duration-150 active:scale-[0.98]", className)} 
      disabled={isLoading || props.disabled} 
      {...props}
    >
      {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
      <span>{isLoading ? 'Loading...' : label}</span>
    </Button>
  );
}
