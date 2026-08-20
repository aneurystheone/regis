import React, { useState, useEffect } from 'react';
import { getOfflineFileAsBlobURL } from '../services/offlineStorage';

interface OfflineAudioProps extends React.AudioHTMLAttributes<HTMLAudioElement> {
    src: string;
}

/**
 * Audio component that handles both regular URLs and offline: URLs
 * Automatically converts offline: URLs to blob URLs for playback
 */
export const OfflineAudio: React.FC<OfflineAudioProps> = ({ src, ...props }) => {
    const [displaySrc, setDisplaySrc] = useState<string>(src);
    const [isLoading, setIsLoading] = useState(src.startsWith('offline:'));
    const [error, setError] = useState(false);

    useEffect(() => {
        let mounted = true;
        let blobUrl: string | null = null;

        const loadAudio = async () => {
            if (!src.startsWith('offline:')) {
                setDisplaySrc(src);
                setIsLoading(false);
                return;
            }

            try {
                const url = await getOfflineFileAsBlobURL(src);
                if (mounted && url) {
                    blobUrl = url;
                    setDisplaySrc(url);
                    setIsLoading(false);
                } else if (mounted) {
                    setError(true);
                    setIsLoading(false);
                }
            } catch (err) {
                console.error('Error loading offline audio:', err);
                if (mounted) {
                    setError(true);
                    setIsLoading(false);
                }
            }
        };

        loadAudio();

        // Cleanup: revoke blob URL when component unmounts
        return () => {
            mounted = false;
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        };
    }, [src]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-8 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse text-slate-400 text-sm">
                Cargando audio...
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-8 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-400 text-sm">
                Error cargando audio
            </div>
        );
    }

    return <audio src={displaySrc} {...props} />;
};
