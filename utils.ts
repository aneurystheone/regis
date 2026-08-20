import { EvaluationPeriod } from './types';

export const getNowGMT4 = (): Date => {
    // Returns a Date object where the UTC time represents the true GMT-4 time.
    // Use .getUTC... methods or .toISOString() on this object to get correct values.
    const now = new Date();
    // Shift by -4 hours strictly
    return new Date(now.getTime() - (4 * 60 * 60 * 1000));
};

export const getTodayStringGMT4 = (): string => {
    return getNowGMT4().toISOString().split('T')[0];
};

export const getCurrentEvaluationPeriod = (): EvaluationPeriod => {
    const now = getNowGMT4();
    const month = now.getUTCMonth(); // 0-11, Using UTC because we shifted the time
    // P1: Aug(7) - Oct(9)
    // P2: Nov(10) - Jan(0)
    // P3: Feb(1) - Mar(2)
    // P4: Apr(3) - Jun(5)

    // If it's July (6), we default to P4 (end of year) or P1 (next year). 
    // Usually admin stuff happens in July for the past year, so P4 makes sense, 
    // or setup for next. Let's stick to valid school months:

    if (month >= 7 && month <= 9) return 'P1';
    if (month >= 10 || month === 0) return 'P2';
    if (month >= 1 && month <= 2) return 'P3';

    // April, May, June, July
    if (month >= 3 && month <= 6) return 'P4';

    return 'P1';
};

export const normalizeText = (text: string): string => {
    if (!text) return '';
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

export const sortStudents = (students: any[], searchQuery?: string): any[] => {
    return [...students].sort((a, b) => {
        if (searchQuery) {
            const query = normalizeText(searchQuery).trim();
            if (query) {
                const aName = normalizeText(a.name || '');
                const bName = normalizeText(b.name || '');
                const aStarts = aName.startsWith(query);
                const bStarts = bName.startsWith(query);
                
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;
            }
        }

        const orderA = a.orderNumber || 999999;
        const orderB = b.orderNumber || 999999;

        if (orderA !== orderB) {
            return orderA - orderB;
        }

        return (a.name || '').localeCompare(b.name || '');
    });
};

export const generateUUID = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for older browsers or non-secure contexts
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

export const generateId = (prefix: string): string => {
    return `${prefix}${Date.now()}${Math.random().toString(36).substr(2, 5)}`;
};

// Filter students by class, respecting Shared Groups (groupId)
// Moving logic here to ensure consistency across the app
export const filterStudentsByClass = (students: any[], classId: string | null, classes: any[]): any[] => {
    if (!classId) return [];

    const selectedClass = classes.find(c => c.id === classId);
    if (!selectedClass) return [];

    const currentGroupId = selectedClass.groupId;

    return students.filter(s => {
        if (currentGroupId && s.groupId === currentGroupId) return true;
        return s.classId === classId;
    });
};

export const calculateAge = (birthDate: string | undefined): number | null => {
    if (!birthDate) return null;
    const today = getNowGMT4();
    const birth = new Date(birthDate);
    let age = today.getUTCFullYear() - birth.getUTCFullYear();
    const monthDiff = today.getUTCMonth() - birth.getUTCMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < birth.getUTCDate())) {
        age--;
    }
    return age;
};

export const isCurrentTimeInSlot = (timeRange: string): boolean => {
    if (!timeRange) return false;
    // Split by dash or en-dash
    const parts = timeRange.split(/[-–]/);
    if (parts.length !== 2) return false;

    const parsePart = (part: string) => {
        const clean = part.trim().toLowerCase();
        const m = clean.match(/(\d{1,2}):(\d{2})/);
        if (!m) return null;
        let h = parseInt(m[1]);
        const min = parseInt(m[2]);
        
        // If it includes pm, or it doesn't specify am/pm but hour is 1-7, treat as PM (13:00 to 19:00)
        const isPm = clean.includes('pm') || (!clean.includes('am') && h >= 1 && h <= 7);
        if (isPm && h < 12) h += 12;
        if (clean.includes('am') && h === 12) h = 0;
        
        return h * 60 + min;
    };

    const startMinutes = parsePart(parts[0]);
    const endMinutes = parsePart(parts[1]);

    if (startMinutes === null || endMinutes === null) return false;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};

