'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  delayDuration?: number;
  className?: string;
}

export function Tooltip({
  content,
  children,
  side = 'bottom',
  align = 'center',
  delayDuration = 500,
  className,
}: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [timeoutId, setTimeoutId] = React.useState<NodeJS.Timeout | null>(null);

  const showTooltip = () => {
    const id = setTimeout(() => setIsVisible(true), delayDuration);
    setTimeoutId(id);
  };

  const hideTooltip = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setIsVisible(false);
  };

  const tooltipClasses = cn(
    'absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg pointer-events-none transition-opacity duration-200 whitespace-nowrap',
    'dark:bg-gray-700 dark:text-gray-100',
    {
      'opacity-100': isVisible,
      'opacity-0': !isVisible,
    },
    className
  );

  const getPositionClasses = () => {
    const positions = {
      top: {
        start: 'bottom-full left-0 mb-1',
        center: 'bottom-full left-1/2 transform -translate-x-1/2 mb-1',
        end: 'bottom-full right-0 mb-1',
      },
      bottom: {
        start: 'top-full left-0 mt-1',
        center: 'top-full left-1/2 transform -translate-x-1/2 mt-1',
        end: 'top-full right-0 mt-1',
      },
      left: {
        start: 'right-full top-0 mr-1',
        center: 'right-full top-1/2 transform -translate-y-1/2 mr-1',
        end: 'right-full bottom-0 mr-1',
      },
      right: {
        start: 'left-full top-0 ml-1',
        center: 'left-full top-1/2 transform -translate-y-1/2 ml-1',
        end: 'left-full bottom-0 ml-1',
      },
    };
    return positions[side][align];
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      <div className={cn(tooltipClasses, getPositionClasses())}>
        {content}
        {/* Arrow */}
        <div
          className={cn(
            'absolute w-2 h-2 bg-gray-900 dark:bg-gray-700 transform rotate-45',
            {
              'top-full left-1/2 -translate-x-1/2 -mt-1': side === 'top',
              'bottom-full left-1/2 -translate-x-1/2 -mb-1': side === 'bottom',
              'left-full top-1/2 -translate-y-1/2 -ml-1': side === 'right',
              'right-full top-1/2 -translate-y-1/2 -mr-1': side === 'left',
            }
          )}
        />
      </div>
    </div>
  );
}