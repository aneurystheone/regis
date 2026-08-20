import React, { useState } from 'react';

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
    content,
    children,
    position = 'top',
    className = ''
}) => {
    const [isVisible, setIsVisible] = useState(false);

    const positionClasses = {
        top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
    };

    const arrowClasses = {
        top: 'top-full left-1/2 transform -translate-x-1/2 border-t-slate-800 dark:border-t-slate-700',
        bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-b-slate-800 dark:border-b-slate-700',
        left: 'left-full top-1/2 transform -translate-y-1/2 border-l-slate-800 dark:border-l-slate-700',
        right: 'right-full top-1/2 transform -translate-y-1/2 border-r-slate-800 dark:border-r-slate-700'
    };

    return (
        <div
            className={`relative inline-block ${className}`}
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
            onFocus={() => setIsVisible(true)}
            onBlur={() => setIsVisible(false)}
        >
            {children}

            {isVisible && (
                <div className={`absolute z-50 px-2 py-1 text-xs font-medium text-white bg-slate-800 dark:bg-slate-700 rounded shadow-lg whitespace-nowrap animate-fade-in ${positionClasses[position]}`}>
                    {content}
                    {/* Arrow */}
                    <div className={`absolute w-0 h-0 border-4 border-transparent ${arrowClasses[position]}`}></div>
                </div>
            )}
        </div>
    );
};
