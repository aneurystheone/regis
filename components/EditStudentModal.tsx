import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlusIcon, XIcon, UserCircleIcon, HeartIcon, UserGroupIcon, WifiIcon, CameraIcon, PencilIcon } from './icons';
import type { Student } from '../types';

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onSave: (studentId: string, updatedData: Partial<Student>) => void;
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

export const EditStudentModal: React.FC<EditStudentModalProps> = ({ isOpen, onClose, student, onSave }) => {
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
  const [deviceAccess, setDeviceAccess] = useState<string[]>([]);
  const [platformFamiliarity, setPlatformFamiliarity] = useState('');

  useEffect(() => {
    if (student && isOpen) {
      // General
      if (student.firstName && student.lastName) {
        setFirstName(student.firstName);
        setLastName(student.lastName);
      } else {
        const parts = student.name.split(' ');
        if (parts.length === 1) {
          setFirstName(parts[0]);
          setLastName('');
        } else if (parts.length > 1) {
          setFirstName(parts[0]);
          setLastName(parts.slice(1).join(' '));
        } else {
          setFirstName('');
          setLastName('');
        }
      }
      setAvatar(student.avatar || '');
      setOrderNumber(student.orderNumber?.toString() ?? '');
      setEnrollmentId(student.enrollmentId || '');
      setGender(student.gender || 'M');
      setBirthDate(student.birthDate || '');
      setEmail(student.email || '');
      setPhone(student.phone || '');
      setIsRepeater(student.isRepeater || false);

      // Health
      if (student.healthInfo) {
        setBloodType(student.healthInfo.bloodType || '');
        setAllergies(student.healthInfo.allergies || '');
        setMedications(student.healthInfo.medications || '');
        setEmergencyName(student.healthInfo.emergencyContactName || '');
        setEmergencyPhone(student.healthInfo.emergencyContactPhone || '');
      } else {
        setBloodType(''); setAllergies(''); setMedications(''); setEmergencyName(''); setEmergencyPhone('');
      }

      // Family
      if (student.familyInfo) {
        setMotherName(student.familyInfo.motherName || '');
        setMotherPhone(student.familyInfo.motherPhone || '');
        setFatherName(student.familyInfo.fatherName || '');
        setFatherPhone(student.familyInfo.fatherPhone || '');
        setGuardianName(student.familyInfo.guardianName || '');
        setGuardianPhone(student.familyInfo.guardianPhone || '');
        setAddress(student.familyInfo.address || '');
      } else {
        setMotherName(''); setMotherPhone(''); setFatherName(''); setFatherPhone(''); setGuardianName(''); setGuardianPhone(''); setAddress('');
      }

      // Connectivity
      if (student.connectivityInfo) {
        setHasInternet(student.connectivityInfo.hasInternet || false);
        setDeviceAccess(student.connectivityInfo.deviceAccess || []);
        setPlatformFamiliarity(student.connectivityInfo.platformFamiliarity || '');
      } else {
        setHasInternet(false); setDeviceAccess([]); setPlatformFamiliarity('');
      }

    } else if (!isOpen) {
      // Reset state
      setActiveTab('general');
      setIsSubmitting(false);
    }
  }, [student, isOpen]);

  const handleDeviceChange = (device: string) => {
    setDeviceAccess(prev =>
      prev.includes(device) ? prev.filter(d => d !== device) : [...prev, device]
    );
  };

  const isNameValid = firstName.trim().length > 0 && lastName.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (student && isNameValid && !isSubmitting) {
      setIsSubmitting(true);
      const fullName = `${firstName.trim()} ${lastName.trim()}`;

      const updatedData: Partial<Student> = {
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

      onSave(student.id, updatedData);
      // Parent handles closing or we can wait, keeping simple
      setIsSubmitting(false);
      onClose();
    }
  };

  const inputClass = "w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500";
  const labelClass = "block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1";

  return (
    <AnimatePresence>
      {isOpen && student && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] relative z-10 overflow-hidden"
            role="dialog"
            aria-modal="true"
          >

        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Editar Estudiante</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Actualice la información del alumno.</p>
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
          <form id="edit-student-form" onSubmit={handleSubmit} className="space-y-6">

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
                      <label htmlFor="avatar-url-edit" className="text-xs text-indigo-600 dark:text-indigo-400 font-medium cursor-pointer hover:underline">
                        URL de Foto
                      </label>
                    </div>
                  </div>
                  <div className="flex-grow space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="firstNameEdit" className={labelClass}>Nombres *</label>
                        <input id="firstNameEdit" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className={inputClass} placeholder="Ej: Ana María" required />
                      </div>
                      <div>
                        <label htmlFor="lastNameEdit" className={labelClass}>Apellidos *</label>
                        <input id="lastNameEdit" type="text" value={lastName} onChange={e => setLastName(e.target.value)} className={inputClass} placeholder="Ej: Polanco" required />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="genderEdit" className={labelClass}>Género</label>
                        <select id="genderEdit" value={gender} onChange={e => setGender(e.target.value as 'M' | 'F')} className={inputClass}>
                          <option value="M">Masculino</option>
                          <option value="F">Femenino</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="orderEdit" className={labelClass}>Nº Orden</label>
                        <input id="orderEdit" type="number" value={orderNumber} onChange={e => setOrderNumber(e.target.value)} className={inputClass} placeholder="#" min="1" />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="enrollmentIdEdit" className={labelClass}>Matrícula</label>
                      <input id="enrollmentIdEdit" type="text" value={enrollmentId} onChange={e => setEnrollmentId(e.target.value)} className={inputClass} placeholder="ID Estudiante" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="birthdateEdit" className={labelClass}>Fecha de Nacimiento</label>
                    <input id="birthdateEdit" type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="phoneEdit" className={labelClass}>Teléfono</label>
                    <input id="phoneEdit" type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} placeholder="809-555-5555" />
                  </div>
                </div>

                <div>
                  <label htmlFor="emailEdit" className={labelClass}>Correo Electrónico</label>
                  <input id="emailEdit" type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="estudiante@ejemplo.com" />
                </div>

                <div>
                  <label htmlFor="avatar-input-edit" className={labelClass}>Enlace de Foto (Opcional)</label>
                  <input id="avatar-input-edit" type="url" value={avatar} onChange={e => setAvatar(e.target.value)} className={inputClass} placeholder="https://..." />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input id="repeaterEdit" type="checkbox" checked={isRepeater} onChange={e => setIsRepeater(e.target.checked)} className="h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                  <label htmlFor="repeaterEdit" className="text-sm text-slate-700 dark:text-slate-300">Estudiante Repitente</label>
                </div>
              </div>
            )}

            {/* Health Tab */}
            {activeTab === 'health' && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="bloodEdit" className={labelClass}>Tipo de Sangre</label>
                    <select id="bloodEdit" value={bloodType} onChange={e => setBloodType(e.target.value)} className={inputClass}>
                      <option value="">Seleccionar...</option>
                      <option value="A+">A+</option><option value="A-">A-</option>
                      <option value="B+">B+</option><option value="B-">B-</option>
                      <option value="O+">O+</option><option value="O-">O-</option>
                      <option value="AB+">AB+</option><option value="AB-">AB-</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="allergiesEdit" className={labelClass}>Alergias</label>
                    <input id="allergiesEdit" type="text" value={allergies} onChange={e => setAllergies(e.target.value)} className={inputClass} placeholder="Ninguna" />
                  </div>
                </div>
                <div>
                  <label htmlFor="medsEdit" className={labelClass}>Medicamentos</label>
                  <input id="medsEdit" type="text" value={medications} onChange={e => setMedications(e.target.value)} className={inputClass} placeholder="Ninguno" />
                </div>

                <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30">
                  <h4 className="text-sm font-bold text-red-800 dark:text-red-300 mb-3 uppercase">Contacto de Emergencia</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="emergency-name-edit" className={labelClass}>Nombre</label>
                      <input id="emergency-name-edit" type="text" value={emergencyName} onChange={e => setEmergencyName(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label htmlFor="emergency-phone-edit" className={labelClass}>Teléfono</label>
                      <input id="emergency-phone-edit" type="tel" value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} className={inputClass} />
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
                  <label htmlFor="platformsEdit" className={labelClass}>Manejo de Plataformas</label>
                  <select id="platformsEdit" value={platformFamiliarity} onChange={e => setPlatformFamiliarity(e.target.value)} className={inputClass}>
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
            className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-all focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!firstName.trim() || !lastName.trim() || isSubmitting}
            className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30 flex items-center disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            {isSubmitting ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div> Guardando...</>
            ) : (
              <><PencilIcon className="w-4 h-4 mr-2" /> Guardar Cambios</>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
  );
};