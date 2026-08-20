/**
 * useRemoteConfig
 *
 * Lee configuración remota desde Firestore (app_config/global_config).
 * Usa el valor local en config/phases.ts como fallback inmediato para
 * garantizar que la UI no espere a Firestore antes del primer render.
 *
 * Activar monetización sin deploy:
 *   Firestore Console → app_config/global_config → monetizationEnabled: true
 */
import { useEffect, useState } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase-firestore';
import { MONETIZATION_ENABLED_FALLBACK } from '../config/phases';

interface GlobalConfig {
    monetizationEnabled: boolean;
    maintenanceMode?: boolean;
}

const DEFAULT_CONFIG: GlobalConfig = {
    monetizationEnabled: MONETIZATION_ENABLED_FALLBACK,
    maintenanceMode: false,
};

export const useRemoteConfig = () => {
    const [config, setConfig] = useState<GlobalConfig>(DEFAULT_CONFIG);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!db) {
            setLoading(false);
            return;
        }

        const configRef = doc(db, 'app_config', 'global_config');

        // One-shot initial fetch for fast first render
        getDoc(configRef)
            .then((snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    setConfig({
                        monetizationEnabled: data.monetizationEnabled ?? MONETIZATION_ENABLED_FALLBACK,
                        maintenanceMode: data.maintenanceMode ?? false,
                    });
                }
            })
            .catch(() => {/* use fallback on error */})
            .finally(() => setLoading(false));

        // Real-time listener — reacts to admin changes without deploy
        const unsubscribe = onSnapshot(
            configRef,
            (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    setConfig({
                        monetizationEnabled: data.monetizationEnabled ?? MONETIZATION_ENABLED_FALLBACK,
                        maintenanceMode: data.maintenanceMode ?? false,
                    });
                }
            },
            () => {/* ignore errors — fallback already set */}
        );

        return () => unsubscribe();
    }, []);

    return {
        config,
        loading,
        /** Convenience shorthand */
        monetizationEnabled: config.monetizationEnabled,
        maintenanceMode: config.maintenanceMode ?? false,
    };
};
