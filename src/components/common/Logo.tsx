import React from 'react';
import { COLORS } from '@/src/constants/app';

interface LogoProps {
  className?: string;
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  variant = 'dark',
  size = 'md',
  showSubtitle = true,
}) => {
  const isLight = variant === 'light';
  
  const sizeClasses = {
    sm: { title: 'text-lg', subtitle: 'text-[10px]' },
    md: { title: 'text-2xl', subtitle: 'text-xs' },
    lg: { title: 'text-3xl', subtitle: 'text-sm' },
    xl: { title: 'text-4xl', subtitle: 'text-base' },
  };

  const { title, subtitle } = sizeClasses[size];

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-center gap-2">
        {/* Abstract Leaf/Shield Icon */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${size === 'sm' ? 'w-6 h-6' : size === 'md' ? 'w-8 h-8' : size === 'lg' ? 'w-10 h-10' : 'w-12 h-12'} ${isLight ? 'text-white' : 'text-primary'}`}
          style={{ color: isLight ? undefined : COLORS.primary }}
        >
          <path
            d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 16V12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 8H12.01"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 12C9 12 10 10 12 10C14 10 15 12 15 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        
        <div>
          <h1 className={`${title} font-extrabold tracking-wider leading-tight ${isLight ? 'text-white' : 'text-slate-800'}`}>
            MR. GREEN
          </h1>
        </div>
      </div>
      {showSubtitle && (
        <p 
          className={`${subtitle} tracking-[0.2em] font-medium ${isLight ? 'text-green-100' : 'text-primary'} mt-1`}
          style={{ color: isLight ? undefined : COLORS.primary }}
        >
          PEST CONTROL CO.,LTD
        </p>
      )}
    </div>
  );
};
