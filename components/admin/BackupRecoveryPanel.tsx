import React, { useState, useEffect } from 'react';
import { getAllBackups, type BackupSnapshot } from '../../services/dataBackup';
import { useAlert, useConfirm } from '../../contexts/ConfirmationContext';

interface BackupRecoveryPanelProps {
    userId: string;
}

export const BackupRecoveryPanel: React.FC<BackupRecoveryPanelProps> = ({ userId }) => {
    const [backups, setBackups] = useState<BackupSnapshot[]>([]);
    const [selectedBackup, setSelectedBackup] = useState<BackupSnapshot | null>(null);
    const [isViewingDetails, setIsViewingDetails] = useState(false);
    const alert = useAlert();
    const confirm = useConfirm();

    useEffect(() => {
        loadBackups();
    }, [userId]);

    const loadBackups = () => {
        console.log('🔍 BackupRecoveryPanel: Loading backups for userId:', userId);
        const allBackups = getAllBackups(userId);
        console.log('📊 BackupRecoveryPanel: Found', allBackups.length, 'backups');
        if (allBackups.length > 0) {
            console.log('📦 First backup:', allBackups[0]);
        }
        setBackups(allBackups);
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleString('es-DO', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const formatTimeAgo = (timestamp: string) => {
        const now = new Date();
        const then = new Date(timestamp);
        const diffMs = now.getTime() - then.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Justo ahora';
        if (diffMins < 60) return `Hace ${diffMins} min`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;

        const diffDays = Math.floor(diffHours / 24);
        return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    };

    const handleViewDetails = (backup: BackupSnapshot) => {
        setSelectedBackup(backup);
        setIsViewingDetails(true);
    };

    const handleRestore = async (backup: BackupSnapshot) => {
        if (!await confirm({ title: 'Restaurar Backup', message: '⚠️ ADVERTENCIA: Restaurar este backup reemplazará todos los datos actuales en localStorage. ¿Continuar?', type: 'danger' })) {
            return;
        }

        try {
            // Restore data to localStorage
            Object.entries(backup.data).forEach(([key, value]) => {
                localStorage.setItem(key, JSON.stringify(value));
            });

            await alert({ title: 'Éxito', message: '✅ Backup restaurado exitosamente. Recarga la página para aplicar cambios.', type: 'success' });
            window.location.reload();
        } catch (error) {
            console.error('Error restoring backup:', error);
            await alert({ title: 'Error', message: '❌ Error al restaurar backup. Ver consola para detalles.', type: 'danger' });
        }
    };

    const handleDownload = (backup: BackupSnapshot) => {
        const dataStr = JSON.stringify(backup, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `regis-backup-${backup.timestamp}.json`;
        link.click();

        URL.revokeObjectURL(url);
    };

    if (backups.length === 0) {
        return (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                    🛡️ Sistema de Backup de Emergencia
                </h3>
                <p className="text-yellow-700 dark:text-yellow-300 mb-4">
                    No hay backups disponibles todavía. El sistema crea snapshots automáticos cada 5 minutos.
                </p>
                <button
                    onClick={loadBackups}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                >
                    🔄 Recargar
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-1">
                            🛡️ Backups de Emergencia
                        </h3>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                            {backups.length} snapshot{backups.length !== 1 ? 's' : ''} disponible{backups.length !== 1 ? 's' : ''} •
                            Último: {formatTimeAgo(backups[0].timestamp)}
                        </p>
                    </div>
                    <button
                        onClick={loadBackups}
                        className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                    >
                        🔄 Actualizar
                    </button>
                </div>
            </div>

            {/* Backup List */}
            <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Fecha/Hora
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Edad
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Tamaño
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {backups.map((backup, index) => (
                            <tr key={backup.timestamp} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                    {formatTimestamp(backup.timestamp)}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                    {formatTimeAgo(backup.timestamp)}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                    ~{Math.round(JSON.stringify(backup.data).length / 1024)} KB
                                </td>
                                <td className="px-4 py-3 text-sm text-right space-x-2">
                                    <button
                                        onClick={() => handleViewDetails(backup)}
                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                                    >
                                        👁️ Ver
                                    </button>
                                    <button
                                        onClick={() => handleDownload(backup)}
                                        className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                                    >
                                        💾 Descargar
                                    </button>
                                    <button
                                        onClick={() => handleRestore(backup)}
                                        className="text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 font-semibold"
                                    >
                                        ↩️ Restaurar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Details Modal */}
            {isViewingDetails && selectedBackup && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                        Detalles del Backup
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        {formatTimestamp(selectedBackup.timestamp)} • {formatTimeAgo(selectedBackup.timestamp)}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsViewingDetails(false)}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="space-y-4">
                                {Object.entries(selectedBackup.data).map(([key, value]) => (
                                    <div key={key} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                                            {key}
                                        </h4>
                                        <div className="bg-gray-50 dark:bg-gray-900 rounded p-3 overflow-x-auto">
                                            <pre className="text-xs text-gray-700 dark:text-gray-300">
                                                {JSON.stringify(value, null, 2)}
                                            </pre>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                            {Array.isArray(value) ? `${value.length} items` : typeof value}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                            <button
                                onClick={() => setIsViewingDetails(false)}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Cerrar
                            </button>
                            <button
                                onClick={() => {
                                    handleDownload(selectedBackup);
                                    setIsViewingDetails(false);
                                }}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                            >
                                💾 Descargar JSON
                            </button>
                            <button
                                onClick={() => {
                                    handleRestore(selectedBackup);
                                    setIsViewingDetails(false);
                                }}
                                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold"
                            >
                                ↩️ Restaurar Este Backup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Warning */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>⚠️ Importante:</strong> Los backups se almacenan localmente en este navegador.
                    Si limpias los datos del navegador, los backups se perderán.
                    Descarga copias importantes en formato JSON.
                </p>
            </div>
        </div>
    );
};
