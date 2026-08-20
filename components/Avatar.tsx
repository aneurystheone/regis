import React, { useMemo } from 'react';

interface AvatarProps {
    name: string;
    src?: string | null;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    status?: 'online' | 'offline';
}

const colors = [
    'bg-blue-700', 'bg-green-700', 'bg-red-700', 'bg-yellow-700',
    'bg-purple-700', 'bg-pink-700', 'bg-indigo-700', 'bg-teal-700',
    'bg-orange-700', 'bg-cyan-700'
];

export const Avatar: React.FC<AvatarProps> = ({ name, src, size = 'md', className = '', status }) => {
    const [imgError, setImgError] = React.useState(false);

    const initials = useMemo(() => {
        if (!name) return '??';
        const parts = name.trim().split(/\s+/).filter(p => p.length > 0);
        if (parts.length === 0) return '??';
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
        xs: 'w-6 h-6 text-[10px]',
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
