import React, { useState, useEffect } from 'react';
import { getOfflineFileAsBlobURL } from '../services/offlineStorage';

interface OfflineImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt: string;
}

/**
 * Image component that handles both regular URLs and offline: URLs
 * Automatically converts offline: URLs to blob URLs for display
 */
export const OfflineImage: React.FC<OfflineImageProps> = ({ src, alt, ...props }) => {
    const [displaySrc, setDisplaySrc] = useState<string>(src);
    const [isLoading, setIsLoading] = useState(src.startsWith('offline:'));
    const [error, setError] = useState(false);

    useEffect(() => {
        let mounted = true;
        let blobUrl: string | null = null;

        const loadImage = async () => {
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
                console.error('Error loading offline image:', err);
                if (mounted) {
                    setError(true);
                    setIsLoading(false);
                }
            }
        };

        loadImage();

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
            <div className="flex items-center justify-center bg-slate-100 dark:bg-slate-700 animate-pulse min-h-40 w-full rounded-lg">
                <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-400 text-sm min-h-40 w-full rounded-lg">
                Error cargando imagen
            </div>
        );
    }

    return <img src={displaySrc} alt={alt} {...props} />;
};
