import React, { useState, useEffect } from 'react';
import { PlusIcon, XIcon, UserCircleIcon, HeartIcon, UserGroupIcon, WifiIcon, CameraIcon } from './icons';
import type { Student } from '../types';

interface AddStudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddStudent: (studentData: Omit<Student, 'id' | 'classId'>) => void;
}

type ActiveTab = 'general' | 'health' | 'family' | 'connectivity';

const TabButton: React.FC<{
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
    hasError?: boolean;
}> = ({ label, icon, isActive, onClick, hasError }) => (
    <button
        type="button"
        onClick={onClick}
        className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-2 px-2 py-3 text-sm font-medium border-b-2 transition-colors focus:outline-none ${isActive
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/10'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            } ${hasError ? 'text-red-500 dark:text-red-400' : ''}`}
    >
        {icon}
        <span className="hidden sm:inline">{label}</span>
    </button>
);

export const AddStudentModal: React.FC<AddStudentModalProps> = ({ isOpen, onClose, onAddStudent }) => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('general');

    // General State
    const [name, setName] = useState('');
    const [avatar, setAvatar] = useState('');
    const [orderNumber, setOrderNumber] = useState('');
    const [gender, setGender] = useState<'M' | 'F'>('M');
    const [birthDate, setBirthDate] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [isRepeater, setIsRepeater] = useState(false);

    // Health State
    const [bloodType, setBloodType] = useState('');
    const [allergies, setAllergies] = useState('');
    const [medications, setMedications] = useState('');
    const [emergencyName, setEmergencyName] = useState('');
    const [emergencyPhone, setEmergencyPhone] = useState('');

    // Family State
    const [motherName, setMotherName] = useState('');
    const [motherPhone, setMotherPhone] = useState('');
    const [fatherName, setFatherName] = useState('');
    const [fatherPhone, setFatherPhone] = useState('');
    const [guardianName, setGuardianName] = useState('');
    const [guardianPhone, setGuardianPhone] = useState('');
    const [address, setAddress] = useState('');

    // Connectivity State
    const [hasInternet, setHasInternet] = useState(false);
    const [deviceAccess, setDeviceAccess] = useState<string[]>([]); // e.g. ['Celular', 'Tablet']
    const [platformFamiliarity, setPlatformFamiliarity] = useState('');

    useEffect(() => {
        if (!isOpen) {
            // Reset state on close
            setActiveTab('general');
            setName('');
            setAvatar('');
            setOrderNumber('');
            setGender('M');
            setBirthDate('');
            setEmail('');
            setPhone('');
            setIsRepeater(false);
            setBloodType('');
            setAllergies('');
            setMedications('');
            setEmergencyName('');
            setEmergencyPhone('');
            setMotherName('');
            setMotherPhone('');
            setFatherName('');
            setFatherPhone('');
            setGuardianName('');
            setGuardianPhone('');
            setAddress('');
            setHasInternet(false);
            setDeviceAccess([]);
            setPlatformFamiliarity('');
        }
    }, [isOpen]);

    const handleDeviceChange = (device: string) => {
        setDeviceAccess(prev =>
            prev.includes(device) ? prev.filter(d => d !== device) : [...prev, device]
        );
    };

    const isNameValid = name.trim().split(/\s+/).filter(Boolean).length >= 2;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isNameValid) {
            const studentData: Omit<Student, 'id' | 'classId'> = {
                name: name.trim(),
                avatar: avatar || '',
                orderNumber: orderNumber ? parseInt(orderNumber, 10) : undefined,
                gender,
                birthDate,
                email,
                phone,
                isRepeater,
                healthInfo: {
                    bloodType,
                    allergies,
                    medications,
                    emergencyContactName: emergencyName,
                    emergencyContactPhone: emergencyPhone
                },
                familyInfo: {
                    motherName,
                    motherPhone,
                    fatherName,
                    fatherPhone,
                    guardianName,
                    guardianPhone,
                    address
                },
                connectivityInfo: {
                    hasInternet,
                    deviceAccess,
                    platformFamiliarity
                }
            };

            onAddStudent(studentData);
        }
    };

    if (!isOpen) return null;

    const inputClass = "w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500";
    const labelClass = "block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 backdrop-blur-sm" aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]" role="document">

                {/* Header */}
                <div className="flex-shrink-0 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Nuevo Estudiante</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Complete la información del alumno.</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex-shrink-0 flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <TabButton label="General" icon={<UserCircleIcon className="w-5 h-5" />} isActive={activeTab === 'general'} onClick={() => setActiveTab('general')} />
                    <TabButton label="Salud" icon={<HeartIcon className="w-5 h-5" />} isActive={activeTab === 'health'} onClick={() => setActiveTab('health')} />
                    <TabButton label="Familia" icon={<UserGroupIcon className="w-5 h-5" />} isActive={activeTab === 'family'} onClick={() => setActiveTab('family')} />
                    <TabButton label="Conexión" icon={<WifiIcon className="w-5 h-5" />} isActive={activeTab === 'connectivity'} onClick={() => setActiveTab('connectivity')} />
                </div>

                {/* Content (Scrollable) */}
                <div className="flex-grow overflow-y-auto p-6 custom-scrollbar">
                    <form id="add-student-form" onSubmit={handleSubmit} className="space-y-6">

                        {/* General Tab */}
                        {activeTab === 'general' && (
                            <div className="space-y-4 animate-fade-in">
                                <div className="flex items-center gap-6">
                                    <div className="flex-shrink-0 group relative">
                                        <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-500 overflow-hidden">
                                            {avatar ? (
                                                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <CameraIcon className="w-8 h-8 text-slate-400" />
                                            )}
                                        </div>
                                        <div className="mt-2 text-center">
                                            <label htmlFor="avatar-url" className="text-xs text-indigo-600 dark:text-indigo-400 font-medium cursor-pointer hover:underline">
                                                URL de Foto
                                            </label>
                                            <input
                                                type="text"
                                                id="avatar-url"
                                                className="sr-only" // Hidden for now, simplified to text input below
                                            // Keeping logic simple: user pastes URL in the input field below
                                            />
                                        </div>
                                    </div>
                                    <div className="flex-grow space-y-4">
                                        <div>
                                            <label htmlFor="name" className={labelClass}>Nombre Completo (Mínimo Nombre y Apellido) *</label>
                                            <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="Ej: Ana María Polanco" required autoFocus />
                                            {!isNameValid && name.trim().length > 0 && (
                                                <p className="text-[10px] text-red-500 mt-1">Por favor ingrese al menos un nombre y un apellido.</p>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="gender" className={labelClass}>Género</label>
                                                <select id="gender" value={gender} onChange={e => setGender(e.target.value as 'M' | 'F')} className={inputClass}>
                                                    <option value="M">Masculino</option>
                                                    <option value="F">Femenino</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label htmlFor="order" className={labelClass}>Nº Orden</label>
                                                <input id="order" type="number" value={orderNumber} onChange={e => setOrderNumber(e.target.value)} className={inputClass} placeholder="#" min="1" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="birthdate" className={labelClass}>Fecha de Nacimiento</label>
                                        <input id="birthdate" type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className={inputClass} />
                                    </div>
                                    <div>
                                        <label htmlFor="phone" className={labelClass}>Teléfono</label>
                                        <input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} placeholder="809-555-5555" />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="email" className={labelClass}>Correo Electrónico</label>
                                    <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="estudiante@ejemplo.com" />
                                </div>

                                <div>
                                    <label htmlFor="avatar-input" className={labelClass}>Enlace de Foto (Opcional)</label>
                                    <input id="avatar-input" type="url" value={avatar} onChange={e => setAvatar(e.target.value)} className={inputClass} placeholder="https://..." />
                                </div>

                                <div className="flex items-center gap-2 pt-2">
                                    <input id="repeater" type="checkbox" checked={isRepeater} onChange={e => setIsRepeater(e.target.checked)} className="h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                                    <label htmlFor="repeater" className="text-sm text-slate-700 dark:text-slate-300">Estudiante Repitente</label>
                                </div>
                            </div>
                        )}

                        {/* Health Tab */}
                        {activeTab === 'health' && (
                            <div className="space-y-4 animate-fade-in">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="blood" className={labelClass}>Tipo de Sangre</label>
                                        <select id="blood" value={bloodType} onChange={e => setBloodType(e.target.value)} className={inputClass}>
                                            <option value="">Seleccionar...</option>
                                            <option value="A+">A+</option><option value="A-">A-</option>
                                            <option value="B+">B+</option><option value="B-">B-</option>
                                            <option value="O+">O+</option><option value="O-">O-</option>
                                            <option value="AB+">AB+</option><option value="AB-">AB-</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="allergies" className={labelClass}>Alergias</label>
                                        <input id="allergies" type="text" value={allergies} onChange={e => setAllergies(e.target.value)} className={inputClass} placeholder="Ninguna" />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="meds" className={labelClass}>Medicamentos</label>
                                    <input id="meds" type="text" value={medications} onChange={e => setMedications(e.target.value)} className={inputClass} placeholder="Ninguno" />
                                </div>

                                <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30">
                                    <h4 className="text-sm font-bold text-red-800 dark:text-red-300 mb-3 uppercase">Contacto de Emergencia</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="emergency-name" className={labelClass}>Nombre</label>
                                            <input id="emergency-name" type="text" value={emergencyName} onChange={e => setEmergencyName(e.target.value)} className={inputClass} />
                                        </div>
                                        <div>
                                            <label htmlFor="emergency-phone" className={labelClass}>Teléfono</label>
                                            <input id="emergency-phone" type="tel" value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} className={inputClass} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Family Tab */}
                        {activeTab === 'family' && (
                            <div className="space-y-4 animate-fade-in">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>Nombre Madre</label>
                                        <input type="text" value={motherName} onChange={e => setMotherName(e.target.value)} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Teléfono Madre</label>
                                        <input type="tel" value={motherPhone} onChange={e => setMotherPhone(e.target.value)} className={inputClass} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>Nombre Padre</label>
                                        <input type="text" value={fatherName} onChange={e => setFatherName(e.target.value)} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Teléfono Padre</label>
                                        <input type="tel" value={fatherPhone} onChange={e => setFatherPhone(e.target.value)} className={inputClass} />
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelClass}>Tutor Legal (Si aplica)</label>
                                            <input type="text" value={guardianName} onChange={e => setGuardianName(e.target.value)} className={inputClass} />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Teléfono Tutor</label>
                                            <input type="tel" value={guardianPhone} onChange={e => setGuardianPhone(e.target.value)} className={inputClass} />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Dirección Residencial</label>
                                    <textarea rows={2} value={address} onChange={e => setAddress(e.target.value)} className={inputClass} placeholder="Calle, Número, Sector..."></textarea>
                                </div>
                            </div>
                        )}

                        {/* Connectivity Tab */}
                        {activeTab === 'connectivity' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                                    <div>
                                        <p className="font-semibold text-slate-800 dark:text-slate-100">Internet en Casa</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">¿El estudiante tiene acceso a red wifi o datos?</p>
                                    </div>
                                    <div className="flex items-center">
                                        <button type="button" onClick={() => setHasInternet(true)} className={`px-3 py-1.5 text-sm font-medium rounded-l-md border ${hasInternet ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600'}`}>Sí</button>
                                        <button type="button" onClick={() => setHasInternet(false)} className={`px-3 py-1.5 text-sm font-medium rounded-r-md border-t border-b border-r ${!hasInternet ? 'bg-red-500 text-white border-red-500' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600'}`}>No</button>
                                    </div>
                                </div>

                                <div>
                                    <label className={labelClass}>Dispositivos Disponibles</label>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        {['Celular', 'Tablet', 'Laptop', 'Computadora'].map(device => (
                                            <label key={device} className="flex items-center gap-2 p-3 border border-slate-200 dark:border-slate-600 rounded-md cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={deviceAccess.includes(device)}
                                                    onChange={() => handleDeviceChange(device)}
                                                    className="h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                                />
                                                <span className="text-sm text-slate-700 dark:text-slate-200">{device}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="platforms" className={labelClass}>Manejo de Plataformas</label>
                                    <select id="platforms" value={platformFamiliarity} onChange={e => setPlatformFamiliarity(e.target.value)} className={inputClass}>
                                        <option value="">Seleccionar nivel...</option>
                                        <option value="Nulo">Nulo</option>
                                        <option value="Básico">Básico</option>
                                        <option value="Intermedio">Intermedio</option>
                                        <option value="Avanzado">Avanzado</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </form>
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="add-student-form"
                        className="flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 dark:shadow-indigo-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!isNameValid}
                    >
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
};