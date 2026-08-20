import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    User,
    Heart,
    Users,
    Wifi,
    Camera,
    X,
    Plus,
    Info,
    Phone,
    Mail,
    Calendar,
    MapPin,
    AlertCircle,
    Activity,
    Shield,
    CheckCircle2,
    Loader2
} from 'lucide-react';
import { Tooltip } from './shared/Tooltip';
import type { Student } from '../types';
import { useUsageSession } from '../services/usageService';

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
        className={`flex-1 relative flex flex-col sm:flex-row items-center justify-center gap-2 px-2 py-4 text-sm font-semibold transition-all focus:outline-none ${isActive
            ? 'text-indigo-600 dark:text-indigo-400'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            } ${hasError ? 'text-red-500 dark:text-red-400' : ''}`}
    >
        <span className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100 opacity-70'}`}>
            {icon}
        </span>
        <span className="hidden sm:inline">{label}</span>
        {isActive && (
            <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-t-full"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
        )}
    </button>
);

export const AddStudentModal: React.FC<AddStudentModalProps> = ({ isOpen, onClose, onAddStudent }) => {
    const { logSession } = useUsageSession();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<ActiveTab>('general');

    // General State
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [avatar, setAvatar] = useState('');
    const [orderNumber, setOrderNumber] = useState('');
    const [enrollmentId, setEnrollmentId] = useState('');
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
            setIsSubmitting(false);
            setActiveTab('general');
            setFirstName('');
            setLastName('');
            setAvatar('');
            setOrderNumber('');
            setEnrollmentId('');
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

    const isNameValid = firstName.trim().length > 0 && lastName.trim().length > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isNameValid && !isSubmitting) {
            setIsSubmitting(true);
            try {
                const fullName = `${firstName.trim()} ${lastName.trim()}`;
                const studentData: Omit<Student, 'id' | 'classId'> = {
                    name: fullName,
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    avatar: avatar || '',
                    orderNumber: orderNumber ? parseInt(orderNumber, 10) : undefined,
                    enrollmentId,
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

                await onAddStudent(studentData);
                // Track student creation
                logSession('students');
                // Modal normally closes via prop or parent state change, but reset flag if it stays
                setIsSubmitting(false);
            } catch (error) {
                console.error("Error adding student:", error);
                setIsSubmitting(false);
            }
        }
    };

    const inputClass = "w-full px-4 py-2.5 text-sm border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/30 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400";
    const labelClass = "block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1";

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] relative z-10 overflow-hidden border border-white/20 dark:border-slate-700"
                        role="dialog"
                        aria-modal="true"
                    >
                        {/* Header */}
                        <div className="flex-shrink-0 px-8 py-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl">
                                        <Plus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    Nuevo Estudiante
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Complete el perfil pedagógico y personal.</p>
                            </div>
                            <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex-shrink-0 flex px-4 border-b border-slate-100 dark:border-slate-700 bg-white/50 dark:bg-slate-800/30">
                            <TabButton label="General" icon={<User className="w-5 h-5" />} isActive={activeTab === 'general'} onClick={() => setActiveTab('general')} />
                            <TabButton label="Salud" icon={<Heart className="w-5 h-5" />} isActive={activeTab === 'health'} onClick={() => setActiveTab('health')} />
                            <TabButton label="Familia" icon={<Users className="w-5 h-5" />} isActive={activeTab === 'family'} onClick={() => setActiveTab('family')} />
                            <TabButton label="Conexión" icon={<Wifi className="w-5 h-5" />} isActive={activeTab === 'connectivity'} onClick={() => setActiveTab('connectivity')} />
                        </div>

                        {/* Content (Scrollable) */}
                        <div className="flex-grow overflow-y-auto custom-scrollbar">
                            <form id="add-student-form" onSubmit={handleSubmit} className="p-8">
                                <AnimatePresence mode="wait">
                                    {/* General Tab */}
                                    {activeTab === 'general' && (
                                        <motion.div
                                            key="general"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="space-y-6"
                                        >
                                            <div className="flex flex-col sm:flex-row gap-8 items-start">
                                                <div className="w-full sm:w-32 flex flex-col items-center gap-3">
                                                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden group hover:border-indigo-400 transition-colors relative">
                                                        {avatar ? (
                                                            <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="text-center p-4">
                                                                <Camera className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <label htmlFor="avatar-url" className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline uppercase tracking-widest cursor-pointer">
                                                        URL de Foto
                                                    </label>
                                                    <input type="text" id="avatar-url" value={avatar} onChange={e => setAvatar(e.target.value)} className="sr-only" />
                                                </div>

                                                <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                                                    <div className="sm:col-span-1">
                                                        <label htmlFor="firstName" className={labelClass}>Nombres *</label>
                                                        <input id="firstName" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className={inputClass} placeholder="Ej: Ana María" required autoFocus />
                                                    </div>
                                                    <div className="sm:col-span-1">
                                                        <label htmlFor="lastName" className={labelClass}>Apellidos *</label>
                                                        <input id="lastName" type="text" value={lastName} onChange={e => setLastName(e.target.value)} className={inputClass} placeholder="Ej: Polanco" required />
                                                    </div>
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

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-50 dark:border-slate-700/50">
                                                <div>
                                                    <label htmlFor="enrollmentId" className={labelClass}>Matrícula</label>
                                                    <div className="relative">
                                                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                        <input id="enrollmentId" type="text" value={enrollmentId} onChange={e => setEnrollmentId(e.target.value)} className={`${inputClass} pl-10`} placeholder="ID Estudiante" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label htmlFor="birthdate" className={labelClass}>Fecha de Nacimiento</label>
                                                    <div className="relative">
                                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                        <input id="birthdate" type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className={`${inputClass} pl-10`} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label htmlFor="email" className={labelClass}>Correo Electrónico</label>
                                                    <div className="relative">
                                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                        <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} className={`${inputClass} pl-10`} placeholder="estudiante@ejemplo.com" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label htmlFor="phone" className={labelClass}>Teléfono</label>
                                                    <div className="relative">
                                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                        <input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={`${inputClass} pl-10`} placeholder="809-555-5555" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 p-4 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100/50 dark:border-indigo-800/30">
                                                <div className="flex items-center h-5">
                                                    <input id="repeater" type="checkbox" checked={isRepeater} onChange={e => setIsRepeater(e.target.checked)} className="h-5 w-5 text-indigo-600 rounded-lg border-slate-300 focus:ring-indigo-500 transition-all cursor-pointer" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <label htmlFor="repeater" className="text-sm font-bold text-slate-700 dark:text-slate-200 cursor-pointer">Estudiante Repitente</label>
                                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Marque esta casilla si el alumno está cursando el grado nuevamente.</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Health Tab */}
                                    {activeTab === 'health' && (
                                        <motion.div
                                            key="health"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="space-y-6"
                                        >
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label htmlFor="blood" className={labelClass}>Tipo de Sangre</label>
                                                    <div className="relative">
                                                        <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                        <select id="blood" value={bloodType} onChange={e => setBloodType(e.target.value)} className={`${inputClass} pl-10`}>
                                                            <option value="">Seleccionar...</option>
                                                            <option value="A+">A+</option><option value="A-">A-</option>
                                                            <option value="B+">B+</option><option value="B-">B-</option>
                                                            <option value="O+">O+</option><option value="O-">O-</option>
                                                            <option value="AB+">AB+</option><option value="AB-">AB-</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label htmlFor="allergies" className={labelClass}>Alergias</label>
                                                    <div className="relative">
                                                        <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                        <input id="allergies" type="text" value={allergies} onChange={e => setAllergies(e.target.value)} className={`${inputClass} pl-10`} placeholder="Ninguna" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <label htmlFor="meds" className={labelClass}>Medicamentos</label>
                                                <input id="meds" type="text" value={medications} onChange={e => setMedications(e.target.value)} className={inputClass} placeholder="Nombre de medicamentos o frecuencia" />
                                            </div>

                                            <div className="p-6 bg-red-50/50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/30 space-y-4">
                                                <h4 className="text-xs font-black text-red-600 dark:text-red-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                                    Contacto de Emergencia
                                                </h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <label htmlFor="emergency-name" className={labelClass}>Nombre Completo</label>
                                                        <input id="emergency-name" type="text" value={emergencyName} onChange={e => setEmergencyName(e.target.value)} className={inputClass} />
                                                    </div>
                                                    <div>
                                                        <label htmlFor="emergency-phone" className={labelClass}>Teléfono Directo</label>
                                                        <input id="emergency-phone" type="tel" value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} className={inputClass} />
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Family Tab */}
                                    {activeTab === 'family' && (
                                        <motion.div
                                            key="family"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="space-y-6"
                                        >
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                <div className="space-y-4">
                                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Información Materna</h4>
                                                    <div className="space-y-3">
                                                        <input type="text" placeholder="Nombre de la madre" value={motherName} onChange={e => setMotherName(e.target.value)} className={inputClass} />
                                                        <div className="relative">
                                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                            <input type="tel" placeholder="Teléfono" value={motherPhone} onChange={e => setMotherPhone(e.target.value)} className={`${inputClass} pl-10`} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Información Paterna</h4>
                                                    <div className="space-y-3">
                                                        <input type="text" placeholder="Nombre del padre" value={fatherName} onChange={e => setFatherName(e.target.value)} className={inputClass} />
                                                        <div className="relative">
                                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                            <input type="tel" placeholder="Teléfono" value={fatherPhone} onChange={e => setFatherPhone(e.target.value)} className={`${inputClass} pl-10`} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-6 border-t border-slate-50 dark:border-slate-700/50">
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-4">Residencia y Tutoría</h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <input type="text" placeholder="Tutor Legal (opcional)" value={guardianName} onChange={e => setGuardianName(e.target.value)} className={inputClass} />
                                                    <input type="tel" placeholder="Teléfono Tutor" value={guardianPhone} onChange={e => setGuardianPhone(e.target.value)} className={inputClass} />
                                                </div>
                                                <div className="mt-4 relative">
                                                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                                    <textarea rows={2} value={address} onChange={e => setAddress(e.target.value)} className={`${inputClass} pl-10 resize-none`} placeholder="Dirección completa del hogar..."></textarea>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Connectivity Tab */}
                                    {activeTab === 'connectivity' && (
                                        <motion.div
                                            key="connectivity"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="space-y-6"
                                        >
                                            <div className="flex items-center justify-between p-6 bg-slate-50/80 dark:bg-slate-900/40 rounded-3xl border border-slate-200/50 dark:border-slate-700/50">
                                                <div className="flex gap-4 items-center">
                                                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-sm">
                                                        <Wifi className={`w-6 h-6 ${hasInternet ? 'text-indigo-600' : 'text-slate-400'}`} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 dark:text-slate-100">Internet en Casa</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">¿Tiene acceso a red wifi o datos?</p>
                                                    </div>
                                                </div>
                                                <div className="flex p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                                    <button type="button" onClick={() => setHasInternet(true)} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${hasInternet ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none' : 'text-slate-500'}`}>SÍ</button>
                                                    <button type="button" onClick={() => setHasInternet(false)} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${!hasInternet ? 'bg-red-500 text-white shadow-md shadow-red-200 dark:shadow-none' : 'text-slate-500'}`}>NO</button>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <label className={labelClass}>Dispositivos Disponibles</label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {['Celular', 'Tablet', 'Laptop', 'Computadora'].map(device => (
                                                        <div key={device} onClick={() => handleDeviceChange(device)} className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer ${deviceAccess.includes(device) ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200 overflow-hidden text-slate-600 dark:text-slate-400'}`}>
                                                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${deviceAccess.includes(device) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-600'}`}>
                                                                {deviceAccess.includes(device) && <CheckCircle2 className="w-4 h-4 text-white" />}
                                                            </div>
                                                            <span className="text-sm font-semibold">{device}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <label htmlFor="platforms" className={labelClass}>Manejo de Plataformas</label>
                                                <div className="relative">
                                                    <Info className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <select id="platforms" value={platformFamiliarity} onChange={e => setPlatformFamiliarity(e.target.value)} className={`${inputClass} pl-10`}>
                                                        <option value="">Seleccionar nivel...</option>
                                                        <option value="Nulo">Nulo (Desconocimiento total)</option>
                                                        <option value="Básico">Básico (Uso guiado)</option>
                                                        <option value="Intermedio">Intermedio (Autónomo)</option>
                                                        <option value="Avanzado">Avanzado (Dominio alto)</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </form>
                        </div>

                        {/* Footer */}
                        <div className="flex-shrink-0 px-8 py-6 bg-slate-50/80 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-4 rounded-b-3xl relative">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-3 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold rounded-2xl border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-all shadow-sm active:scale-95"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                form="add-student-form"
                                className="relative flex items-center justify-center min-w-[140px] px-8 py-3 bg-indigo-600 text-white text-sm font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 dark:shadow-indigo-900/40 disabled:opacity-50 disabled:scale-100 active:scale-95 group overflow-hidden"
                                disabled={!isNameValid || isSubmitting}
                            >
                                <AnimatePresence mode="wait">
                                    {isSubmitting ? (
                                        <motion.div
                                            key="submitting"
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            className="flex items-center gap-2"
                                        >
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Guardando...</span>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="idle"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="flex items-center gap-2"
                                        >
                                            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                                            <span>Guardar Perfil</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};