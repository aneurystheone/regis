/**
 * Unit Tests for curriculumService.ts
 * 
 * Tests curriculum data retrieval from Firestore and local JSON fallback.
 * All Firebase operations are mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mock Firebase ---
const mockGetDocs = vi.fn();
const mockGetDoc = vi.fn();

vi.mock('../firebase-firestore', () => ({
    db: { type: 'mock-firestore' },
}));

vi.mock('../firebase', () => ({
    db: { type: 'mock-firestore' },
}));

vi.mock('firebase/firestore', () => ({
    doc: vi.fn(),
    writeBatch: vi.fn(() => ({
        set: vi.fn(),
        commit: vi.fn(() => Promise.resolve()),
    })),
    collection: vi.fn(),
    getDocs: (...args: any[]) => mockGetDocs(...args),
    query: vi.fn(),
    where: vi.fn(),
    getDoc: (...args: any[]) => mockGetDoc(...args),
}));

import {
    getCurriculumsFromFirestore,
    getCompetencyDetail,
    getCurriculumByGradeAndSubject,
} from './curriculumService';

beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock
    global.fetch = vi.fn();
});

// ============================================================
// 1. getCurriculumsFromFirestore
// ============================================================

describe('getCurriculumsFromFirestore', () => {
    it('returns list of curriculums from Firestore', async () => {
        const mockCurriculums = [
            { id: 'curr-1', subject: 'Matemáticas', grade: '1ro' },
            { id: 'curr-2', subject: 'Lengua Española', grade: '1ro' },
        ];

        mockGetDocs.mockResolvedValue({
            docs: mockCurriculums.map(c => ({
                data: () => c,
            })),
        });

        const result = await getCurriculumsFromFirestore();

        expect(result.length).toBe(2);
        expect(result[0].subject).toBe('Matemáticas');
        expect(result[1].subject).toBe('Lengua Española');
    });

    it('returns empty array on error', async () => {
        mockGetDocs.mockRejectedValue(new Error('permission-denied'));

        const result = await getCurriculumsFromFirestore();
        expect(result).toEqual([]);
    });
});

// ============================================================
// 2. getCompetencyDetail
// ============================================================

describe('getCompetencyDetail', () => {
    it('returns competency when found', async () => {
        const mockCompetency = {
            id: 'comp-1',
            name: 'Comunicativa',
            description: 'Test',
        };

        mockGetDoc.mockResolvedValue({
            exists: () => true,
            data: () => mockCompetency,
        });

        const result = await getCompetencyDetail('comp-1');

        expect(result).not.toBeNull();
        expect(result!.name).toBe('Comunicativa');
    });

    it('returns null when not found', async () => {
        mockGetDoc.mockResolvedValue({
            exists: () => false,
            data: () => null,
        });

        const result = await getCompetencyDetail('nonexistent');
        expect(result).toBeNull();
    });

    it('returns null on error', async () => {
        mockGetDoc.mockRejectedValue(new Error('network-error'));

        const result = await getCompetencyDetail('comp-1');
        expect(result).toBeNull();
    });
});

// ============================================================
// 3. getCurriculumByGradeAndSubject
// ============================================================

describe('getCurriculumByGradeAndSubject', () => {
    it('returns curriculum on exact match', async () => {
        const mockCurriculum = {
            id: 'curr-1',
            subject: 'Matemáticas',
            grade: '1ro Grado',
        };

        mockGetDocs.mockResolvedValue({
            empty: false,
            docs: [{
                data: () => mockCurriculum,
            }],
        });

        const result = await getCurriculumByGradeAndSubject('1ro Grado', 'Matemáticas');

        expect(result).not.toBeNull();
        expect(result!.subject).toBe('Matemáticas');
    });

    it('retries with "Grado" suffix when grade doesn\'t include it', async () => {
        // First call (exact match) returns empty
        mockGetDocs
            .mockResolvedValueOnce({ empty: true, docs: [] })
            // Second call (with "Grado" added) returns result
            .mockResolvedValueOnce({
                empty: false,
                docs: [{
                    data: () => ({ id: 'curr-1', subject: 'Matemáticas', grade: '1ro Grado' }),
                }],
            });

        const result = await getCurriculumByGradeAndSubject('1ro', 'Matemáticas');

        expect(result).not.toBeNull();
        expect(result!.grade).toBe('1ro Grado');
        expect(mockGetDocs).toHaveBeenCalledTimes(2);
    });

    it('returns null when no match found', async () => {
        mockGetDocs.mockResolvedValue({ empty: true, docs: [] });

        // Mock fetch for local fallback
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ curriculums: [] }),
        });

        const result = await getCurriculumByGradeAndSubject('99th', 'NonExistent');
        expect(result).toBeNull();
    });

    it('falls back to local search on Firestore error', async () => {
        mockGetDocs.mockRejectedValue(new Error('network-error'));

        // Mock local fallback: fetch index and then individual files
        (global.fetch as any)
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ curriculums: ['nivel_secundario/1ro/mat.json'] }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    id: 'local-curr',
                    subject: 'Matemáticas',
                    grade: '1ro',
                }),
            });

        const result = await getCurriculumByGradeAndSubject('1ro', 'Matemáticas');

        expect(result).not.toBeNull();
        expect(result!.id).toBe('local-curr');
    });
});
