import React, { useMemo } from 'react';

interface AvatarProps {
    name: string;
    src?: string | null;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-red-500', 'bg-yellow-500',
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
    'bg-orange-500', 'bg-cyan-500'
];

export const Avatar: React.FC<AvatarProps> = ({ name, src, size = 'md', className = '' }) => {
    const initials = useMemo(() => {
        if (!name) return '??';
        const parts = name.split(' ');
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }, [name]);

    const backgroundColor = useMemo(() => {
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }, [name]);

    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-16 h-16 text-xl',
        xl: 'w-24 h-24 text-3xl'
    };

    if (src && src.startsWith('http') && !src.includes('ui-avatars.com')) {
        return (
            <img
                src={src}
                alt={name}
                className={`${sizeClasses[size]} rounded-full object-cover shadow-sm ${className}`}
                loading="lazy"
                onError={(e) => {
                    (e.target as HTMLImageElement).src = ''; // Fallback to initials on error
                }}
            />
        );
    }

    return (
        <div className={`${sizeClasses[size]} ${backgroundColor} ${className} rounded-full flex items-center justify-center text-white font-bold shadow-sm uppercase`}>
            {initials}
        </div>
    );
};
