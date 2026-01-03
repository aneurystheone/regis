import { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onIdTokenChanged } from 'firebase/auth';

export const useAdmin = () => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAdmin = async (user: any) => {
            if (!user) {
                // Dev/Demo Fallback
                const isVirtual = localStorage.getItem('regis_virtual_demo') === 'true';
                if (isVirtual) {
                    // In virtual mode, check for specific hardcoded email or a stored flag
                    // For now, let's keep the hardcoded email check for the demo user if they input it
                    // Or simpy rely on a localStorage "simulate_admin" flag for devs.
                    // For strict demo consistency with previous code:
                    setIsAdmin(false);
                } else {
                    setIsAdmin(false);
                }
                setLoading(false);
                return;
            }

            try {
                // Force token refresh to get latest claims if needed
                const tokenResult = await user.getIdTokenResult();
                // Check custom claim 'admin' OR fallback to hardcoded email for current transition
                const hasClaim = !!tokenResult.claims.admin;
                const isSuperUser = user.email === 'aneurystheone@gmail.com';

                setIsAdmin(hasClaim || isSuperUser);
            } catch (error) {
                console.error("Error checking admin claim:", error);
                setIsAdmin(false);
            } finally {
                setLoading(false);
            }
        };

        const unsubscribe = onIdTokenChanged(auth, (user) => {
            checkAdmin(user);
        });

        return () => unsubscribe();
    }, []);

    return { isAdmin, loading };
};
