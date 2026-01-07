
import { Class, Student, EvaluationInstrument, Competency, FundamentalCompetency, TeacherProfileData, AttendanceStatus } from '../types';

export const DEMO_TEMPLATE_UID = 'DEMO_PROFILE_TEMPLATE';

export const mockFundamentalCompetencies: FundamentalCompetency[] = [
    { id: 'FC1', name: 'Ética y Ciudadana', description: 'Actúa con autonomía, responsabilidad y respeto a los principios éticos y democráticos.', group: 'G3' },
    { id: 'FC2', name: 'Comunicativa', description: 'Expresa e interpreta conceptos, pensamientos, sentimientos y hechos de forma oral y escrita.', group: 'G1' },
    { id: 'FC3', name: 'Pensamiento Lógico, Creativo y Crítico', description: 'Elabora y argumenta sus juicios y opiniones, y aborda la realidad de forma reflexiva.', group: 'G2' },
    { id: 'FC4', name: 'Resolución de Problemas', description: 'Identifica y analiza problemas para generar soluciones efectivas y pertinentes.', group: 'G2' },
    { id: 'FC5', name: 'Científica y Tecnológica', description: 'Aplica el conocimiento científico y tecnológico para comprender y transformar la realidad.', group: 'G4' },
    { id: 'FC6', name: 'Ambiental y de la Salud', description: 'Adopta hábitos de vida saludable y actúa con responsabilidad ante el medio ambiente.', group: 'G4' },
    { id: 'FC7', name: 'Desarrollo Personal y Espiritual', description: 'Desarrolla una autoimagen equilibrada y una relación sana consigo mismo y con los demás.', group: 'G3' },
];

export const mockTeacherProfile: TeacherProfileData = {
    name: 'Prof. Ana Martínez',
    email: 'ana.martinez@ejemplo.com',
    phone: '809-555-0123',
    specialization: 'Lengua Española y Ciencias Sociales',
    experienceYears: 10,
    profilePictureUrl: 'https://ui-avatars.com/api/?name=Ana+Martinez&background=random'
};

export const mockClasses: Class[] = [
    {
        id: 'class_1',
        name: 'Lengua Española',
        grade: '5to',
        section: 'A',
        schoolYear: '2024-2025',
        schedule: 'Lunes a Viernes 8:00 AM - 9:30 AM',
        color: '#4f46e5',
        level: 'Nivel Primario'
    },
    {
        id: 'class_2',
        name: 'Ciencias Sociales',
        grade: '6to',
        section: 'B',
        schoolYear: '2024-2025',
        schedule: 'Martes y Jueves 10:00 AM - 11:30 AM',
        color: '#0891b2',
        level: 'Nivel Primario'
    }
];

export const mockStudents: Student[] = [
    // Clase 1: Lengua Española (5to A)
    {
        id: 'ST-2024-0001', classId: 'class_1', name: 'Juan Pérez', orderNumber: 1,
        avatar: 'https://ui-avatars.com/api/?name=Juan+Perez&background=random',
        gender: 'M', birthDate: '2013-05-15', email: 'juan.perez@ejemplo.com',
        healthInfo: { bloodType: 'O+', allergies: 'Maní, Polvo' },
        familyInfo: { motherName: 'Elena Pérez', motherPhone: '809-555-0101', address: 'Calle Las Damas #12, Zona Colonial' }
    },
    {
        id: 'ST-2024-0002', classId: 'class_1', name: 'María García', orderNumber: 2,
        avatar: 'https://ui-avatars.com/api/?name=Maria+Garcia&background=random',
        gender: 'F', birthDate: '2013-08-22',
        familyInfo: { motherName: 'Elena García', motherPhone: '809-555-4433', fatherName: 'Roberto García' }
    },
    {
        id: 'ST-2024-0003', classId: 'class_1', name: 'Carlos Rodríguez', orderNumber: 3,
        avatar: 'https://ui-avatars.com/api/?name=Carlos+Rodriguez&background=random',
        gender: 'M', birthDate: '2013-02-10',
        connectivityInfo: { hasInternet: true, deviceAccess: ['Tablet', 'Celular'] }
    },
    {
        id: 'ST-2024-0006', classId: 'class_1', name: 'Ana Victoria López', orderNumber: 4,
        avatar: 'https://ui-avatars.com/api/?name=Ana+Lopez&background=random',
        gender: 'F', birthDate: '2013-04-12', isRepeater: false,
        healthInfo: { bloodType: 'A+', emergencyContactName: 'Pedro López', emergencyContactPhone: '829-555-9988' }
    },
    {
        id: 'ST-2024-0007', classId: 'class_1', name: 'Diego Armando Marte', orderNumber: 5,
        avatar: 'https://ui-avatars.com/api/?name=Diego+Marte&background=random',
        gender: 'M', birthDate: '2013-09-30',
        familyInfo: { guardianName: 'Abuela Rosa', guardianPhone: '809-444-1122' }
    },
    {
        id: 'ST-2024-0008', classId: 'class_1', name: 'Laura Sofía Jiménez', orderNumber: 6,
        avatar: 'https://ui-avatars.com/api/?name=Laura+Jimenez&background=random',
        gender: 'F', birthDate: '2013-12-05'
    },
    {
        id: 'ST-2024-0009', classId: 'class_1', name: 'José Manuel Santos', orderNumber: 7,
        avatar: 'https://ui-avatars.com/api/?name=Jose+Santos&background=random',
        gender: 'M', birthDate: '2013-01-20',
        healthInfo: { medications: 'Usa inhalador para asma' }
    },
    {
        id: 'ST-2024-0010', classId: 'class_1', name: 'Valentina Peralta', orderNumber: 8,
        avatar: 'https://ui-avatars.com/api/?name=Valentina+Peralta&background=random',
        gender: 'F', birthDate: '2013-07-08'
    },
    {
        id: 'ST-2024-0011', classId: 'class_1', name: 'Mateo De la Rosa', orderNumber: 9,
        avatar: 'https://ui-avatars.com/api/?name=Mateo+Rosa&background=random',
        gender: 'M', birthDate: '2013-03-25'
    },
    {
        id: 'ST-2024-0012', classId: 'class_1', name: 'Isabella Tavarez', orderNumber: 10,
        avatar: 'https://ui-avatars.com/api/?name=Isabella+Tavarez&background=random',
        gender: 'F', birthDate: '2013-06-14'
    },

    // Clase 2: Ciencias Sociales (6to B)
    {
        id: 'ST-2024-0004', classId: 'class_2', name: 'Lucía Méndez', orderNumber: 1,
        avatar: 'https://ui-avatars.com/api/?name=Lucia+Mendez&background=random',
        gender: 'F', birthDate: '2012-11-05',
        healthInfo: { bloodType: 'B+' }
    },
    {
        id: 'ST-2024-0005', classId: 'class_2', name: 'Pedro Sánchez', orderNumber: 2,
        avatar: 'https://ui-avatars.com/api/?name=Pedro+Sanchez&background=random',
        gender: 'M', birthDate: '2012-07-14',
        connectivityInfo: { hasInternet: false }
    },
    {
        id: 'ST-2024-0013', classId: 'class_2', name: 'Gabriela Almonte', orderNumber: 3,
        avatar: 'https://ui-avatars.com/api/?name=Gabriela+Almonte&background=random',
        gender: 'F', birthDate: '2012-05-30'
    },
    {
        id: 'ST-2024-0014', classId: 'class_2', name: 'Ricardo Montaner JR', orderNumber: 4,
        avatar: 'https://ui-avatars.com/api/?name=Ricardo+Montaner&background=random',
        gender: 'M', birthDate: '2012-09-12'
    },
    {
        id: 'ST-2024-0015', classId: 'class_2', name: 'Sofia Vergara', orderNumber: 5,
        avatar: 'https://ui-avatars.com/api/?name=Sofia+Vergara&background=random',
        gender: 'F', birthDate: '2012-11-20'
    },
    {
        id: 'ST-2024-0016', classId: 'class_2', name: 'Alejandro Sanz', orderNumber: 6,
        avatar: 'https://ui-avatars.com/api/?name=Alejandro+Sanz&background=random',
        gender: 'M', birthDate: '2012-02-14'
    },
    {
        id: 'ST-2024-0017', classId: 'class_2', name: 'Chayanne Figueroa', orderNumber: 7,
        avatar: 'https://ui-avatars.com/api/?name=Chayanne&background=random',
        gender: 'M', birthDate: '2012-06-28',
        familyInfo: { address: 'Av. Winston Churchill, Edf. 23' }
    },
    {
        id: 'ST-2024-0018', classId: 'class_2', name: 'Shakira Mebarak', orderNumber: 8,
        avatar: 'https://ui-avatars.com/api/?name=Shakira&background=random',
        gender: 'F', birthDate: '2012-02-02'
    },
    {
        id: 'ST-2024-0019', classId: 'class_2', name: 'Luis Miguel Gallego', orderNumber: 9,
        avatar: 'https://ui-avatars.com/api/?name=Luis+Miguel&background=random',
        gender: 'M', birthDate: '2012-04-19'
    },
    {
        id: 'ST-2024-0020', classId: 'class_2', name: 'Selena Quintanilla', orderNumber: 10,
        avatar: 'https://ui-avatars.com/api/?name=Selena&background=random',
        gender: 'F', birthDate: '2012-04-16'
    }
];

export const mockInstruments: EvaluationInstrument[] = [
    {
        id: 'inst_1',
        classId: 'class_1',
        name: 'Comprensión Lectora - El Principito',
        type: 'Examen',
        date: '2024-10-15',
        totalPoints: 20,
        competencyIds: ['FC2'],
        period: 'P1'
    },
    {
        id: 'inst_2',
        classId: 'class_1',
        name: 'Producción de Textos Narrativos',
        type: 'Proyecto',
        date: '2024-11-20',
        totalPoints: 30,
        competencyIds: ['FC2', 'FC3'],
        period: 'P1'
    },
    {
        id: 'inst_3',
        classId: 'class_2',
        name: 'Ubicación Geográfica de las Antillas',
        type: 'Prueba Corta',
        date: '2024-10-20',
        totalPoints: 15,
        competencyIds: ['FC5'],
        period: 'P1'
    }
];

export const mockCompetencies: Competency[] = [
    {
        id: 'comp_1',
        classId: 'class_1',
        fundamentalId: 'FC2',
        code: 'LE-P5-C1',
        name: 'Comprensión Oral',
        description: 'Comprende textos narrativos directos sobre temas de interés social.',
        indicators: [{ id: 'ind_1', text: 'Identifica la idea principal del texto escuchado.' }]
    },
    {
        id: 'comp_2',
        classId: 'class_2',
        fundamentalId: 'FC5',
        code: 'CS-P6-C1',
        name: 'Ubicación Espacial',
        description: 'Se ubica en el espacio y en el tiempo, y reconoce los elementos del relieve.',
        indicators: [{ id: 'ind_2', text: 'Localiza en el mapa los límites de la isla de Santo Domingo.' }]
    }
];
