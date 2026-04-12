import Fuse from 'fuse.js';
import { beforeEach, describe, expect, it } from 'vitest';
import { FUSE_OPTIONS, type SearchableProject } from './search';

// Mock project data for testing
const mockProjects: SearchableProject[] = [
    {
        project: { getName: () => 'Object Oriented Programming' } as any,
        name: 'Object Oriented Programming',
        sources: [],
    },
    {
        project: { getName: () => 'Data Structures & Algorithms' } as any,
        name: 'Data Structures & Algorithms',
        sources: [],
    },
    {
        project: { getName: () => 'Test Project' } as any,
        name: 'Test Project',
        sources: [],
    },
    {
        project: { getName: () => 'Main Project' } as any,
        name: 'Main Project',
        sources: [
            { name: 'main.wp', code: '' },
            { name: 'utils.wp', code: '' },
        ],
    },
    {
        project: { getName: () => 'Archived Math Project' } as any,
        name: 'Archived Math Project',
        sources: [],
    },
    {
        project: { getName: () => 'Old Science Experiment' } as any,
        name: 'Old Science Experiment',
        sources: [],
    },
    // Projects with searchable source code
    {
        project: { getName: () => 'Greeting Card' } as any,
        name: 'Greeting Card',
        sources: [
            { name: 'main.wp', code: 'Happy Birthday wonderful friend' },
        ],
    },
    {
        project: { getName: () => 'Weather App' } as any,
        name: 'Weather App',
        sources: [
            {
                name: 'main.wp',
                code: 'temperature humidity precipitation forecast',
            },
        ],
    },
    {
        project: { getName: () => 'Documented Library' } as any,
        name: 'Documented Library',
        sources: [
            {
                name: 'lib.wp',
                code: 'Computes the average of a list of numbers',
            },
        ],
    },
];

describe('Search Functionality', () => {
    let fuse: Fuse<SearchableProject>;

    beforeEach(() => {
        fuse = new Fuse(mockProjects, FUSE_OPTIONS);
    });

    describe('Exact Matches', () => {
        it('should find exact project name matches', () => {
            const results = fuse.search('Object Oriented Programming');
            expect(results).toHaveLength(1);
            expect(results[0].item.name).toBe('Object Oriented Programming');
        });

        it('should find exact source file name matches', () => {
            const results = fuse.search('main.wp');
            expect(results).toHaveLength(2);
            expect(results[0].item.name).toBe('Main Project');
        });
    });

    describe('Fuzzy Matches', () => {
        it('should find projects with typos', () => {
            const results = fuse.search('Objct');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].item.name).toBe('Object Oriented Programming');
        });

        it('should find projects with missing characters', () => {
            const results = fuse.search('algoritm');
            expect(results).toHaveLength(1);
            expect(results[0].item.name).toBe('Data Structures & Algorithms');
        });

        it('should find projects with extra characters', () => {
            const results = fuse.search('Testt');
            expect(results).toHaveLength(1);
            expect(results[0].item.name).toBe('Test Project');
        });
    });

    describe('Partial Matches', () => {
        it('should find partial project name matches', () => {
            const results = fuse.search('Object');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].item.name).toBe('Object Oriented Programming');
        });

        it('should find partial file name matches', () => {
            const results = fuse.search('main');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].item.name).toBe('Main Project');
        });
    });

    describe('Case Insensitive', () => {
        it('should find matches regardless of case', () => {
            const results = fuse.search('object');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].item.name).toBe('Object Oriented Programming');
        });

        it('should find file matches regardless of case', () => {
            const results = fuse.search('MAIN');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].item.name).toBe('Main Project');
        });
    });

    describe('Archived Projects', () => {
        it('should find archived projects in search results', () => {
            const results = fuse.search('Archived');
            expect(results).toHaveLength(1);
            expect(results[0].item.name).toBe('Archived Math Project');
        });

        it('should find archived projects by partial name', () => {
            const results = fuse.search('Math');
            expect(results).toHaveLength(1);
            expect(results[0].item.name).toBe('Archived Math Project');
        });
    });

    describe('Source Code Search', () => {
        it('should find projects by text literal content', () => {
            const results = fuse.search('Birthday');
            expect(results).toHaveLength(1);
            expect(results[0].item.name).toBe('Greeting Card');
        });

        it('should find projects by formatted literal content', () => {
            const results = fuse.search('precipitation');
            expect(results).toHaveLength(1);
            expect(results[0].item.name).toBe('Weather App');
        });

        it('should find projects by documentation text', () => {
            const results = fuse.search('average');
            expect(results).toHaveLength(1);
            expect(results[0].item.name).toBe('Documented Library');
        });

        it('should find projects by partial source code match', () => {
            const results = fuse.search('forecast');
            expect(results).toHaveLength(1);
            expect(results[0].item.name).toBe('Weather App');
        });
    });

    describe('No Matches', () => {
        it('should return empty results for non-matching terms', () => {
            const results = fuse.search('nonexistent');
            expect(results).toHaveLength(0);
        });
    });

    describe('Multiple Matches', () => {
        it('should rank results by match quality', () => {
            const results = fuse.search('project');
            expect(results.length).toBeGreaterThan(0);
            // Test Project should rank higher than Main Project for "project"
            const names = results.map((r) => r.item.name);
            expect(names[0]).toBe('Test Project');
        });
    });

    describe('Threshold Behavior', () => {
        it('should respect threshold setting', () => {
            const strictFuse = new Fuse(mockProjects, {
                ...FUSE_OPTIONS,
                threshold: 0.2,
            });
            const results = strictFuse.search('Objct');
            expect(results.length).toBeLessThanOrEqual(1);
        });
    });
});
