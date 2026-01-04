
import React, { useState, useMemo } from 'react';
import type { TeacherProfileData, Class, Student, JournalEntry, Resource } from '../types';
import { BookOpenIcon, PencilSquareIcon, LinkIcon, PlusIcon, UserGroupIcon, LogoutIcon, CameraIcon } from './icons';
import { uploadFile } from '../services/storageService';
import { authService } from '../services/authService';

interface TeacherProfileProps {
    profile: TeacherProfileData;
    classes: Class[];
    students: Student[];
    journalEntries: JournalEntry[];
    resources: Resource[];
    onAddJournalEntry: (content: string) => void;
    onAddResource: (title: string, url: string, description: string) => void;
    onClassClick: (cls: Class) => void;
    onLogout: () => void;
    onUpdateProfile: (updatedProfile: TeacherProfileData) => void;
}

type ActiveTab = 'classes' | 'journal' | 'resources';

const TabButton: React.FC<{ label: string; icon: React.ReactNode; isActive: boolean; onClick: () => void; }> = ({ label, icon, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center justify-center w-full px-4 py-3 font-semibold text-sm rounded-lg transition-colors duration-200 ${isActive
            ? 'bg-indigo-600 text-white shadow'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
            }`}
    >
        {icon}
        <span className="ml-2">{label}</span>
    </button>
);

export const TeacherProfile: React.FC<TeacherProfileProps> = ({ profile, classes, students, journalEntries, resources, onAddJournalEntry, onAddResource, onClassClick, onLogout, onUpdateProfile }) => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('classes');
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

    // State for Journal
    const [newJournalContent, setNewJournalContent] = useState('');

    // State for Resources
    const [newResourceTitle, setNewResourceTitle] = useState('');
    const [newResourceUrl, setNewResourceUrl] = useState('');
    const [newResourceDesc, setNewResourceDesc] = useState('');

    const studentCountByClass = useMemo(() => {
        return classes.reduce((acc, cls) => {
            acc[cls.id] = students.filter(s => s.classId === cls.id).length;
            return acc;
        }, {} as Record<string, number>);
    }, [classes, students]);

    const handleJournalSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newJournalContent.trim()) {
            onAddJournalEntry(newJournalContent.trim());
            setNewJournalContent('');
        }
    };

    const handleResourceSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newResourceTitle.trim() && newResourceUrl.trim()) {
            onAddResource(newResourceTitle.trim(), newResourceUrl.trim(), newResourceDesc.trim());
            setNewResourceTitle('');
            setNewResourceUrl('');
            setNewResourceDesc('');
        }
    };

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        e.target.value = '';

        setIsUploadingPhoto(true);
        try {
            const uid = authService.isDemoMode() ? 'DEMO_GUEST_USER' : (authService.getCurrentUser()?.id || 'unknown');
            const safeName = profile.name ? profile.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'user';
            const path = `users/${uid}/profile_photos/${safeName}_${Date.now()}`;

            const downloadUrl = await uploadFile(file, path);
            await authService.updatePhotoURL(downloadUrl);

            const updatedProfile = { ...profile, profilePictureUrl: downloadUrl };
            onUpdateProfile(updatedProfile);

        } catch (error: any) {
            console.error("Error updating profile picture:", error);
            const errorMessage = error.message || "Error al actualizar la foto de perfil. Por favor, intente nuevamente.";
            alert(errorMessage);
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    return (
        <div className="p-4 sm:p-8 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Profile Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md text-center">
                        <div className="relative inline-block mx-auto mb-4 group">
                            <img
                                src={profile.profilePictureUrl}
                                alt={profile.name}
                                className={`w-32 h-32 rounded-full object-cover border-4 border-indigo-200 dark:border-indigo-700 shadow-lg ${isUploadingPhoto ? 'opacity-50' : ''}`}
                            />
                            <label
                                htmlFor="profile-photo-upload"
                                className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                            >
                                <CameraIcon className="w-8 h-8" />
                                <input
                                    id="profile-photo-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoChange}
                                    className="hidden"
                                    disabled={isUploadingPhoto}
                                />
                            </label>
                            {isUploadingPhoto && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{profile.name}</h1>
                        <p className="text-slate-500 dark:text-slate-400">{profile.email}</p>

                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                            <a href="https://www.regis-app.com" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-indigo-500 hover:text-indigo-600 transition-colors uppercase tracking-widest">
                                www.regis-app.com
                            </a>
                        </div>

                        <button
                            onClick={onLogout}
                            className="mt-6 w-full flex items-center justify-center bg-red-50 text-red-600 font-semibold py-2 px-4 rounded-lg hover:bg-red-100 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60 transition-colors"
                        >
                            <LogoutIcon className="w-4 h-4 mr-2" />
                            Cerrar Sesión
                        </button>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
                        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b pb-2">Datos Personales</h3>
                        <div className="space-y-3 text-sm">
                            <div>
                                <p className="font-semibold text-slate-600 dark:text-slate-300">Especialización</p>
                                <p className="text-slate-500 dark:text-slate-400">{profile.specialization}</p>
                            </div>
                            <div>
                                <p className="font-semibold text-slate-600 dark:text-slate-300">Años de Experiencia</p>
                                <p className="text-slate-500 dark:text-slate-400">{profile.experienceYears} años</p>
                            </div>
                            <div>
                                <p className="font-semibold text-slate-600 dark:text-slate-300">Teléfono</p>
                                <p className="text-slate-500 dark:text-slate-400">{profile.phone}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Tabs */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
                    <div className="grid grid-cols-3 gap-2 mb-6">
                        <TabButton label="Clases" icon={<BookOpenIcon className="w-5 h-5" />} isActive={activeTab === 'classes'} onClick={() => setActiveTab('classes')} />
                        <TabButton label="Diario Reflexivo" icon={<PencilSquareIcon className="w-5 h-5" />} isActive={activeTab === 'journal'} onClick={() => setActiveTab('journal')} />
                        <TabButton label="Mis Recursos" icon={<LinkIcon className="w-5 h-5" />} isActive={activeTab === 'resources'} onClick={() => setActiveTab('resources')} />
                    </div>

                    <div className="min-h-[400px]">
                        {activeTab === 'classes' && (
                            <div className="space-y-4">
                                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Clases Asignadas</h3>
                                {classes.map(cls => (
                                    <button key={cls.id} onClick={() => onClassClick(cls)} className="w-full text-left bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg flex justify-between items-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                        <div>
                                            <p className="font-bold text-slate-700 dark:text-slate-200">{cls.grade.replace(' Grado', '')} {cls.section} - {cls.name}</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">{cls.schoolYear}</p>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 px-3 py-1 rounded-full">
                                            <UserGroupIcon className="w-4 h-4" />
                                            {studentCountByClass[cls.id] || 0}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                        {activeTab === 'journal' && (
                            <div className="space-y-4">
                                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Diario Reflexivo</h3>
                                <form onSubmit={handleJournalSubmit} className="space-y-2">
                                    <textarea value={newJournalContent} onChange={e => setNewJournalContent(e.target.value)} placeholder="Escriba aquí su reflexión del día..." rows={4}
                                        className="w-full p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500 transition" />
                                    <button type="submit" className="flex items-center justify-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:bg-slate-400" disabled={!newJournalContent.trim()}>
                                        <PlusIcon className="w-5 h-5 mr-2" />Guardar Entrada
                                    </button>
                                </form>
                                <div className="max-h-80 overflow-y-auto space-y-3 pr-2">
                                    {journalEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(entry => (
                                        <div key={entry.id} className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{new Date(entry.date).toLocaleString()}</p>
                                            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{entry.content}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {activeTab === 'resources' && (
                            <div className="space-y-4">
                                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Mis Recursos</h3>
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800 mb-4">
                                    <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase mb-2">Acceso Oficial</p>
                                    <a href="https://www.regis-app.com" target="_blank" rel="noopener noreferrer" className="flex items-center font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                                        Sitio Web del Proyecto <LinkIcon className="w-4 h-4 ml-2" />
                                    </a>
                                </div>

                                <form onSubmit={handleResourceSubmit} className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg space-y-3">
                                    <input type="text" value={newResourceTitle} onChange={e => setNewResourceTitle(e.target.value)} placeholder="Título del Recurso" required className="w-full p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-md" />
                                    <input type="url" value={newResourceUrl} onChange={e => setNewResourceUrl(e.target.value)} placeholder="https://ejemplo.com" required className="w-full p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-md" />
                                    <textarea value={newResourceDesc} onChange={e => setNewResourceDesc(e.target.value)} placeholder="Descripción breve (opcional)" rows={2} className="w-full p-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-md" />
                                    <button type="submit" className="flex items-center justify-center bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 shadow-sm disabled:bg-slate-400" disabled={!newResourceTitle.trim() || !newResourceUrl.trim()}>
                                        <PlusIcon className="w-5 h-5 mr-2" />Guardar Recurso
                                    </button>
                                </form>
                                <div className="max-h-72 overflow-y-auto space-y-3 pr-2">
                                    {resources.sort((a, b) => a.title.localeCompare(b.title)).map(resource => (
                                        <div key={resource.id} className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                                            <a href={resource.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center">
                                                {resource.title} <LinkIcon className="w-4 h-4 ml-2 flex-shrink-0" />
                                            </a>
                                            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{resource.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
