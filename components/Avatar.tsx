import React, { useMemo } from 'react';

interface AvatarProps {
    name: string;
    src?: string | null;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    status?: 'online' | 'offline';
}

const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-red-500', 'bg-yellow-500',
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
    'bg-orange-500', 'bg-cyan-500'
];

export const Avatar: React.FC<AvatarProps> = ({ name, src, size = 'md', className = '', status }) => {
    const [imgError, setImgError] = React.useState(false);

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

    // Reset error state if src changes
    React.useEffect(() => {
        setImgError(false);
    }, [src]);

    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-16 h-16 text-xl',
        xl: 'w-24 h-24 text-3xl'
    };

    const statusClasses = status === 'online'
        ? 'ring-2 ring-green-500 ring-offset-2 dark:ring-offset-slate-800'
        : status === 'offline'
            ? 'ring-2 ring-yellow-500 ring-offset-2 dark:ring-offset-slate-800'
            : '';

    if (src && src.startsWith('http') && !src.includes('ui-avatars.com') && !imgError) {
        return (
            <img
                src={src}
                alt={name}
                className={`${sizeClasses[size]} rounded-full object-cover shadow-sm ${className} ${statusClasses}`}
                loading="lazy"
                onError={() => setImgError(true)}
            />
        );
    }

    return (
        <div className={`${sizeClasses[size]} ${backgroundColor} ${className} ${statusClasses} rounded-full flex items-center justify-center text-white font-bold shadow-sm uppercase`}>
            {initials}
        </div>
    );
};
