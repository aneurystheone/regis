/**
 * Phase Control Flags
 * Based on ROADMAP_REGIS
 */

/**
 * MONETIZATION_ENABLED_FALLBACK
 *
 * Valor local de fallback para cuando Firestore no está disponible (offline/Electron).
 * El valor real se lee desde app_config/global_config en Firestore via useRemoteConfig().
 *
 * Para activar monetización sin deploy:
 *   → Firestore Console: app_config/global_config → { monetizationEnabled: true }
 *
 * Phase 0: false - Beta cerrada, focus on stability
 * Phase 1 (Current): true - Beta ampliada, inicio año escolar 2026-2027
 * Phase 2 (Future): true  - Public launch with paid plans
 */
export const MONETIZATION_ENABLED_FALLBACK = true;

/**
 * Alias de compatibilidad para código que todavía importa MONETIZATION_ENABLED directamente.
 * Estos sitios deben migrarse a useRemoteConfig() progresivamente.
 * @deprecated Usar useRemoteConfig().monetizationEnabled
 */
export const MONETIZATION_ENABLED = MONETIZATION_ENABLED_FALLBACK;

/**
 * PHASE_NAME
 * For diagnostic/analytics purposes
 */
export const CURRENT_PHASE = 'PHASE_1_BETA_AMPLIADA' as const;
