
import React, { useState, useMemo } from 'react';
import type { TeacherProfileData, Class, Student, JournalEntry, Resource } from '../types';
import { BookOpenIcon, PencilSquareIcon, LinkIcon, PlusIcon, UserGroupIcon, LogoutIcon, CameraIcon, CheckIcon, XIcon, TrashIcon } from './icons';
import { Avatar } from './Avatar';
import { uploadFile } from '../services/storageService';
import { authService } from '../services/authService';
import { educationRegionals, getSchoolsForDistrict, calculateDeterministicSchoolId } from '../constants/educationData';
import { School, Hash } from 'lucide-react';
import { useAlert } from '../contexts/ConfirmationContext';

export type ActiveTab = 'classes' | 'journal' | 'resources'; // Export needed for App.tsx

interface TeacherProfileProps {
    profile: TeacherProfileData;
    classes: Class[];
    students: Student[];
    journalEntries: JournalEntry[];
    resources: Resource[];
    onOpenJournalModal: (entry?: JournalEntry | null, classId?: string | null) => void;
    onDeleteJournalEntry: (entryId: string) => void;
    onAddResource: (title: string, url: string, description: string) => void;
    onClassClick: (cls: Class) => void;
    onLogout: () => void;
    onUpdateProfile: (updatedProfile: TeacherProfileData) => void;
    initialTab?: ActiveTab;
    autoFocusJournal?: boolean;
}

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

export const TeacherProfile: React.FC<TeacherProfileProps> = ({
    profile,
    classes,
    students,
    journalEntries,
    resources,
    onOpenJournalModal,
    onDeleteJournalEntry,
    onAddResource,
    onClassClick,
    onLogout,
    onUpdateProfile,
    initialTab = 'classes',
    autoFocusJournal = false
}) => {
    const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<TeacherProfileData>(profile);
    const alert = useAlert();

    const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);

    // Sync editData if profile changes externally
    React.useEffect(() => {
        setEditData(profile);
    }, [profile]);

    const selectedRegional = educationRegionals.find(r => r.id === editData.regional);
    const availableDistricts = selectedRegional ? selectedRegional.districts : [];

    const availableSchools = useMemo(() => {
        return editData.district ? getSchoolsForDistrict(editData.district) : [];
    }, [editData.district]);

    const filteredSchools = useMemo(() => {
        if (!editData.schoolName?.trim()) return availableSchools;
        return availableSchools.filter(s =>
            s.name.toLowerCase().includes(editData.schoolName!.toLowerCase())
        );
    }, [availableSchools, editData.schoolName]);

    const handleSaveProfile = () => {
        const schoolId = calculateDeterministicSchoolId(editData.district || '', editData.schoolName || '', editData.schoolCode || '');
        onUpdateProfile({
            ...editData,
            schoolId
        });
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setEditData(profile);
        setIsEditing(false);
    };

    const displayRegional = educationRegionals.find(r => r.id === profile.regional);
    const displayDistrict = displayRegional?.districts.find(d => d.id === profile.district);

    // State for Resources
    const [newResourceTitle, setNewResourceTitle] = useState('');
    const [newResourceUrl, setNewResourceUrl] = useState('');
    const [newResourceDesc, setNewResourceDesc] = useState('');

    // Effect to handle auto-focus on journal
    React.useEffect(() => {
        if (activeTab === 'journal' && autoFocusJournal) {
             onOpenJournalModal();
        }
    }, [activeTab, autoFocusJournal]);

    const studentCountByClass = useMemo(() => {
        return classes.reduce((acc, cls) => {
            acc[cls.id] = students.filter(s => s.classId === cls.id).length;
            return acc;
        }, {} as Record<string, number>);
    }, [classes, students]);


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
            await alert({ title: 'Error', message: errorMessage, type: 'danger' });
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
                            <Avatar
                                name={profile.name}
                                src={profile.profilePictureUrl || undefined}
                                size="xl"
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
                        {isEditing ? (
                            <div className="space-y-3 px-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nombre Completo</label>
                                    <input
                                        type="text"
                                        value={editData.name}
                                        onChange={e => setEditData({ ...editData, name: e.target.value })}
                                        className="w-full p-2 text-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                                    />
                                </div>
                                <p className="text-slate-500 dark:text-slate-400">{profile.email}</p>
                            </div>
                        ) : (
                            <>
                                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{profile.name}</h1>
                                <p className="text-slate-500 dark:text-slate-400">{profile.email}</p>
                            </>
                        )}

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
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 uppercase tracking-wide text-sm">Datos Personales</h3>
                            {!isEditing && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors p-1"
                                    title="Editar Perfil"
                                >
                                    <PencilSquareIcon className="w-5 h-5" />
                                </button>
                            )}
                        </div>

                        {isEditing ? (
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase block ml-1">Especialización</label>
                                    <input
                                        type="text"
                                        value={editData.specialization}
                                        onChange={e => setEditData({ ...editData, specialization: e.target.value })}
                                        placeholder="Ej. Matemáticas"
                                        className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase block ml-1">Años Exp.</label>
                                        <input
                                            type="number"
                                            value={editData.experienceYears}
                                            onChange={e => setEditData({ ...editData, experienceYears: parseInt(e.target.value) || 0 })}
                                            className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase block ml-1">Teléfono</label>
                                        <input
                                            type="tel"
                                            value={editData.phone}
                                            onChange={e => setEditData({ ...editData, phone: e.target.value })}
                                            className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase block ml-1">Regional</label>
                                    <select
                                        value={editData.regional}
                                        onChange={e => setEditData({ ...editData, regional: e.target.value, district: '' })}
                                        className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                    >
                                        <option value="">Selecciona Regional</option>
                                        {educationRegionals.map(r => (
                                            <option key={r.id} value={r.id}>{r.id} - {r.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase block ml-1">Distrito</label>
                                    <select
                                        value={editData.district}
                                        disabled={!editData.regional}
                                        onChange={e => setEditData({ ...editData, district: e.target.value })}
                                        className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none text-sm disabled:opacity-50"
                                    >
                                        <option value="">Selecciona Distrito</option>
                                        {availableDistricts.map(d => (
                                            <option key={d.id} value={d.id}>{d.id} - {d.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5 relative">
                                    <label className="text-xs font-bold text-slate-500 uppercase block ml-1">Centro Educativo</label>
                                    <div className="relative">
                                        <School className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            value={editData.schoolName || ''}
                                            onFocus={() => setShowSchoolDropdown(true)}
                                            onBlur={() => setTimeout(() => setShowSchoolDropdown(false), 200)}
                                            onChange={e => setEditData({ ...editData, schoolName: e.target.value })}
                                            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                                        />
                                    </div>

                                    {/* Dropdown suggestions */}
                                    {showSchoolDropdown && filteredSchools.length > 0 && (
                                        <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-40 overflow-y-auto z-50 py-1">
                                            {filteredSchools.map((s, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => setEditData({ ...editData, schoolName: s.name, schoolCode: s.code })}
                                                    className="px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer font-bold text-xs text-slate-700 dark:text-slate-200 transition-colors flex justify-between items-center"
                                                >
                                                    <span>{s.name}</span>
                                                    <span className="text-[10px] text-indigo-500 font-mono">Cod: {s.code}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase block ml-1">Código de Centro</label>
                                    <div className="relative">
                                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            value={editData.schoolCode || ''}
                                            onChange={e => setEditData({ ...editData, schoolCode: e.target.value })}
                                            placeholder="Código oficial de escuela"
                                            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={handleSaveProfile}
                                        className="flex-1 flex items-center justify-center bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-sm text-sm"
                                    >
                                        <CheckIcon className="w-4 h-4 mr-1.5" /> Guardar
                                    </button>
                                    <button
                                        onClick={handleCancelEdit}
                                        className="flex-1 flex items-center justify-center bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 py-2 rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm"
                                    >
                                        <XIcon className="w-4 h-4 mr-1.5" /> Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : (
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
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                                    <p className="font-semibold text-slate-600 dark:text-slate-300">Regional</p>
                                    <p className="text-slate-500 dark:text-slate-400">
                                        {displayRegional ? `${displayRegional.id} - ${displayRegional.name}` : (profile.regional || 'No especificada')}
                                    </p>
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-600 dark:text-slate-300">Distrito</p>
                                    <p className="text-slate-500 dark:text-slate-400">
                                        {displayDistrict ? `${displayDistrict.id} - ${displayDistrict.name}` : (profile.district || 'No especificado')}
                                    </p>
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-600 dark:text-slate-300">Centro Educativo</p>
                                    <p className="text-slate-500 dark:text-slate-400">{profile.schoolName || 'No especificado'}</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-600 dark:text-slate-300">Código de Centro</p>
                                    <p className="text-slate-500 dark:text-slate-400">{profile.schoolCode || 'No especificado'}</p>
                                </div>
                                {profile.schoolId && (
                                    <div>
                                        <p className="font-semibold text-slate-600 dark:text-slate-300">ID de Tenencia (Colegio)</p>
                                        <p className="text-xs text-indigo-500 font-mono select-all break-all">{profile.schoolId}</p>
                                    </div>
                                )}
                            </div>
                        )}
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
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 uppercase tracking-wide text-sm">Diario Reflexivo</h3>
                                    <button
                                        onClick={() => onOpenJournalModal()}
                                        className="flex items-center gap-1.5 text-sm font-bold text-white bg-slate-800 dark:bg-slate-700 px-4 py-2 rounded-xl hover:bg-slate-900 transition-colors shadow-md"
                                    >
                                        <PlusIcon className="w-4 h-4" /> Añadir Entrada
                                    </button>
                                </div>
                                <div className="max-h-[500px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                                    {journalEntries.length > 0 ? (
                                        journalEntries.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(entry => {
                                            const entryClass = classes.find(c => c.id === entry.classId);
                                            return (
                                                <div key={entry.id} className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                                                    {new Date(entry.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                                </p>
                                                                {entryClass && (
                                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600">
                                                                        {entryClass.grade} {entryClass.section}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-widest">
                                                                {new Date(entry.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                        </div>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => onOpenJournalModal(entry)}
                                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-xl transition-all"
                                                                title="Editar reflexión"
                                                            >
                                                                <PencilSquareIcon className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => onDeleteJournalEntry(entry.id)}
                                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-xl transition-all"
                                                                title="Eliminar reflexión"
                                                            >
                                                                <TrashIcon className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium italic">
                                                        "{entry.content}"
                                                    </p>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                            <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
                                                <BookOpenIcon className="w-8 h-8 text-slate-300" />
                                            </div>
                                            <p className="text-slate-500 font-bold mb-1">Tu diario está vacío</p>
                                            <p className="text-sm text-slate-400 px-10">Comienza a registrar tus reflexiones y anécdotas del día para mejorar tu práctica docente.</p>
                                        </div>
                                    )}
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
