export interface EducationDistrict {
    id: string;
    name: string;
}

export interface EducationRegional {
    id: string;
    name: string;
    districts: EducationDistrict[];
}

export const educationRegionals: EducationRegional[] = [
    {
        id: "01",
        name: "Barahona",
        districts: [
            { id: "01-01", name: "Pedernales" },
            { id: "01-02", name: "Enriquillo" },
            { id: "01-03", name: "Barahona" },
            { id: "01-04", name: "Cabral" },
            { id: "01-05", name: "Vicente Noble" },
        ]
    },
    {
        id: "02",
        name: "San Juan de la Maguana",
        districts: [
            { id: "02-01", name: "Comendador" },
            { id: "02-02", name: "Pedro Santana" },
            { id: "02-03", name: "Las Matas de Farfán" },
            { id: "02-04", name: "El Cercado" },
            { id: "02-05", name: "San Juan Este" },
            { id: "02-06", name: "San Juan Oeste" },
            { id: "02-07", name: "Hondo Valle" },
        ]
    },
    {
        id: "03",
        name: "Azua",
        districts: [
            { id: "03-01", name: "Azua" },
            { id: "03-02", name: "Padre de las Casas" },
            { id: "03-03", name: "San José de Ocoa" },
            { id: "03-04", name: "Baní" },
            { id: "03-05", name: "Nizao" },
        ]
    },
    {
        id: "04",
        name: "San Cristóbal",
        districts: [
            { id: "04-01", name: "Cambita Garabitos" },
            { id: "04-02", name: "San Cristóbal Norte" },
            { id: "04-03", name: "San Cristóbal Sur" },
            { id: "04-04", name: "Villa Altagracia" },
            { id: "04-05", name: "Yaguate" },
            { id: "04-06", name: "Haina" },
            { id: "04-07", name: "San Gregorio de Nigua" },
        ]
    },
    {
        id: "05",
        name: "San Pedro de Macorís",
        districts: [
            { id: "05-01", name: "San Pedro de Macorís Este" },
            { id: "05-02", name: "San Pedro de Macorís Oeste" },
            { id: "05-03", name: "La Romana" },
            { id: "05-04", name: "Hato Mayor" },
            { id: "05-05", name: "Sabana de la Mar" },
            { id: "05-06", name: "Consuelo" },
            { id: "05-07", name: "San José de los Llanos" },
            { id: "05-08", name: "Quisqueya" },
            { id: "05-09", name: "El Valle" },
            { id: "05-10", name: "Guaymate" },
            { id: "05-11", name: "Villa Hermosa" },
        ]
    },
    {
        id: "06",
        name: "La Vega",
        districts: [
            { id: "06-01", name: "José Contreras" },
            { id: "06-02", name: "Constanza" },
            { id: "06-03", name: "Jarabacoa" },
            { id: "06-04", name: "La Vega Oeste" },
            { id: "06-05", name: "La Vega Este" },
            { id: "06-06", name: "Moca" },
            { id: "06-07", name: "Gaspar Hernández" },
            { id: "06-08", name: "Jamao al Norte" },
            { id: "06-09", name: "San Víctor" },
            { id: "06-10", name: "Jima Abajo" },
        ]
    },
    {
        id: "07",
        name: "San Francisco de Macorís",
        districts: [
            { id: "07-01", name: "Tenares" },
            { id: "07-02", name: "Salcedo" },
            { id: "07-03", name: "Castillo" },
            { id: "07-04", name: "Villa Riva" },
            { id: "07-05", name: "San Francisco de Macorís Sur-E" },
            { id: "07-06", name: "San Francisco de Macorís Nor-O" },
            { id: "07-07", name: "Villa Tapia" },
        ]
    },
    {
        id: "08",
        name: "Santiago",
        districts: [
            { id: "08-01", name: "San José de las Matas" },
            { id: "08-02", name: "Jánico" },
            { id: "08-03", name: "Santiago Sur-Este" },
            { id: "08-04", name: "Santiago Noroeste" },
            { id: "08-05", name: "Santiago Centro-Oeste" },
            { id: "08-06", name: "Santiago Noreste" },
            { id: "08-07", name: "Villa Bisonó (Navarrete)" },
            { id: "08-08", name: "Licey al Medio" },
            { id: "08-09", name: "Tamboril" },
            { id: "08-10", name: "Villa González" },
        ]
    },
    {
        id: "09",
        name: "Mao",
        districts: [
            { id: "09-01", name: "Mao" },
            { id: "09-02", name: "Esperanza" },
            { id: "09-03", name: "San Ignacio de Sabaneta" },
            { id: "09-04", name: "Monción" },
            { id: "09-05", name: "Laguna Salada" },
            { id: "09-06", name: "Villa Los Almácigos" },
        ]
    },
    {
        id: "10",
        name: "Santo Domingo II",
        districts: [
            { id: "10-01", name: "Villa Mella" },
            { id: "10-02", name: "Sabana Perdida" },
            { id: "10-03", name: "Santo Domingo Noreste" },
            { id: "10-04", name: "Santo Domingo Oriental" },
            { id: "10-05", name: "Boca Chica" },
            { id: "10-06", name: "Mendoza" },
            { id: "10-07", name: "San Antonio de Guerra" },
        ]
    },
    {
        id: "11",
        name: "Puerto Plata",
        districts: [
            { id: "11-01", name: "Sosúa" },
            { id: "11-02", name: "Puerto Plata" },
            { id: "11-03", name: "Imbert" },
            { id: "11-04", name: "Luperón" },
            { id: "11-05", name: "Altamira" },
            { id: "11-06", name: "El Mamey" },
            { id: "11-07", name: "Villa Isabela" },
        ]
    },
    {
        id: "12",
        name: "Higüey",
        districts: [
            { id: "12-01", name: "Higüey" },
            { id: "12-02", name: "San Rafael del Yuma" },
            { id: "12-03", name: "El Seibo" },
            { id: "12-04", name: "Miches" },
        ]
    },
    {
        id: "13",
        name: "Monte Cristi",
        districts: [
            { id: "13-01", name: "Monte Cristi" },
            { id: "13-02", name: "Guayubín" },
            { id: "13-03", name: "Villa Vásquez" },
            { id: "13-04", name: "Dajabón" },
            { id: "13-05", name: "Loma de Cabrera" },
            { id: "13-06", name: "Restauración" },
        ]
    },
    {
        id: "14",
        name: "Nagua",
        districts: [
            { id: "14-01", name: "Nagua" },
            { id: "14-02", name: "Cabrera" },
            { id: "14-03", name: "Río San Juan" },
            { id: "14-04", name: "Samaná" },
            { id: "14-05", name: "Sánchez" },
            { id: "14-06", name: "El Factor" },
            { id: "14-07", name: "Las Terrenas" },
        ]
    },
    {
        id: "15",
        name: "Santo Domingo III",
        districts: [
            { id: "15-01", name: "Los Alcarrizos" },
            { id: "15-02", name: "Santo Domingo Centro" },
            { id: "15-03", name: "Santo Domingo Surcentral" },
            { id: "15-04", name: "Santo Domingo Noroeste" },
            { id: "15-05", name: "Herrera" },
            { id: "15-06", name: "Pedro Brand" },
        ]
    },
    {
        id: "16",
        name: "Cotuí",
        districts: [
            { id: "16-01", name: "Cotuí" },
            { id: "16-02", name: "Fantino" },
            { id: "16-03", name: "Cevicos" },
            { id: "16-04", name: "Bonao Suroeste" },
            { id: "16-05", name: "Piedra Blanca" },
            { id: "16-06", name: "Bonao Nordeste" },
            { id: "16-07", name: "Villa La Mata" },
        ]
    },
    {
        id: "17",
        name: "Monte Plata",
        districts: [
            { id: "17-01", name: "Yamasá" },
            { id: "17-02", name: "Monte Plata" },
            { id: "17-03", name: "Bayaguana" },
            { id: "17-04", name: "Sabana Grande de Boyá" },
            { id: "17-05", name: "Peralvillo" },
        ]
    },
    {
        id: "18",
        name: "Baoruco",
        districts: [
            { id: "18-01", name: "Neiba" },
            { id: "18-02", name: "Tamayo" },
            { id: "18-03", name: "Villa Jaragua" },
            { id: "18-04", name: "Jimaní" },
            { id: "18-05", name: "Duvergé" },
        ]
    },
];


export interface RegisteredSchool {
    name: string;
    code: string;
}

export const schoolsByDistrict: Record<string, RegisteredSchool[]> = {
    "01-01": [
        { name: "Liceo Secundario Gerardo Jansen", code: "0101001" },
        { name: "Escuela Primaria Hernando Gorjón", code: "0101002" },
        { name: "Colegio Fe y Alegría Pedernales", code: "0101003" },
        { name: "Liceo Técnico Profesional Las Mercedes", code: "0101004" }
    ],
    "01-03": [
        { name: "Liceo Leonor Feltz", code: "0103001" },
        { name: "Escuela Maria Auxiliadora", code: "0103002" },
        { name: "Colegio Barney N. Morgan", code: "0103003" },
        { name: "Liceo Católico Barahona", code: "0103004" },
        { name: "Escuela Básica Club de Leones", code: "0103005" }
    ],
    "08-03": [
        { name: "Liceo Politécnico Femenino Nuestra Señora de las Mercedes", code: "0803001" },
        { name: "Escuela República de Venezuela", code: "0803002" },
        { name: "Colegio De La Salle Santiago", code: "0803003" },
        { name: "Liceo Secundario Ulises Francisco Espaillat", code: "0803004" },
        { name: "Escuela Básica Emilio Prud'Homme", code: "0803005" }
    ],
    "10-01": [
        { name: "Liceo Emma Balaguer", code: "1001001" },
        { name: "Escuela Primaria Leoncio Manzueta", code: "1001002" },
        { name: "Politécnico Cardenal Sancha", code: "1001003" },
        { name: "Liceo Vespertino Villa Mella", code: "1001004" }
    ],
    "15-02": [
        { name: "Liceo Unión Panamericana", code: "1502001" },
        { name: "Escuela Primaria Republica de Chile", code: "1502002" },
        { name: "Colegio Don Bosco", code: "1502003" },
        { name: "Liceo Fidel Ferrer", code: "1502004" },
        { name: "Politécnico Virgen de la Altagracia", code: "1502005" }
    ]
};

export const getSchoolsForDistrict = (districtId: string): RegisteredSchool[] => {
    if (!districtId) return [];
    if (schoolsByDistrict[districtId]) {
        return schoolsByDistrict[districtId];
    }
    
    const district = educationRegionals
        .flatMap(r => r.districts)
        .find(d => d.id === districtId);
        
    if (!district) return [];
    
    const baseCode = districtId.replace("-", "");
    return [
        { name: `Liceo Secundario ${district.name}`, code: `${baseCode}001` },
        { name: `Escuela Primaria ${district.name}`, code: `${baseCode}002` },
        { name: `Colegio Juan Pablo Duarte (${district.name})`, code: `${baseCode}003` },
        { name: `Politécnico Estatal de ${district.name}`, code: `${baseCode}004` }
    ];
};

export const calculateDeterministicSchoolId = (districtId: string, schoolName: string, schoolCode?: string): string => {
    if (!districtId) return "";
    const cleanDistrict = districtId.replace("-", "");
    const codePart = schoolCode && schoolCode.trim() ? schoolCode.trim() : schoolName.trim();
    const cleanCodePart = codePart.toLowerCase().replace(/[^a-z0-9]/g, "_");
    return `school_${cleanDistrict}_${cleanCodePart}`;
};
