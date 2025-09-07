import Fuse from 'fuse.js';
import { beforeEach, describe, expect, it } from 'vitest';

// Mock project data for testing
const mockProjects = [
    {
        project: { getName: () => 'Object Oriented Programming', getSources: () => [] },
        name: 'Object Oriented Programming',
        files: []
    },
    {
        project: { getName: () => 'Data Structures & Algorithms', getSources: () => [] },
        name: 'Data Structures & Algorithms',
        files: []
    },
    {
        project: { getName: () => 'Test Project', getSources: () => [] },
        name: 'Test Project',
        files: []
    },
    {
        project: {
            getName: () => 'Main Project',
            getSources: () => [
                { getPreferredName: () => 'main.wp' },
                { getPreferredName: () => 'utils.js' }
            ]
        },
        name: 'Main Project',
        files: [
            { name: 'main.wp' },
            { name: 'utils.js' }
        ]
    },
    // Add archived projects for testing
    {
        project: { getName: () => 'Archived Math Project', getSources: () => [] },
        name: 'Archived Math Project',
        files: []
    },
    {
        project: { getName: () => 'Old Science Experiment', getSources: () => [] },
        name: 'Old Science Experiment',
        files: []
    }
];

describe('Search Functionality', () => {
    let fuse: Fuse<any>;

    beforeEach(() => {
        const fuseOptions = {
            includeScore: true,
            threshold: 0.4,
            ignoreLocation: true,
            keys: ['name', 'files.name']
        };
        fuse = new Fuse(mockProjects, fuseOptions);
    });

    describe('Exact Matches', () => {
        it('should find exact project name matches', () => {
            const results = fuse.search('Object Oriented Programming');
            expect(results).toHaveLength(1);
            expect(results[0].item.name).toBe('Object Oriented Programming');
        });

        it('should find exact file name matches', () => {
            const results = fuse.search('main.wp');
            expect(results).toHaveLength(1);
            expect(results[0].item.name).toBe('Main Project');
        });
    });

    describe('Fuzzy Matches', () => {
        it('should find projects with typos', () => {
            const results = fuse.search('Objct');
            expect(results).toHaveLength(4);
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
            expect(results).toHaveLength(4);
            expect(results[0].item.name).toBe('Object Oriented Programming');
        });

        it('should find partial file name matches', () => {
            const results = fuse.search('main');
            expect(results).toHaveLength(2);
            expect(results[0].item.name).toBe('Main Project');
        });
    });

    describe('Case Insensitive', () => {
        it('should find matches regardless of case', () => {
            const results = fuse.search('object');
            expect(results).toHaveLength(4);
            expect(results[0].item.name).toBe('Object Oriented Programming');
        });

        it('should find file matches regardless of case', () => {
            const results = fuse.search('MAIN');
            expect(results).toHaveLength(2);
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

        it('should find archived projects by content keywords', () => {
            const results = fuse.search('Science');
            expect(results).toHaveLength(1);
            expect(results[0].item.name).toBe('Old Science Experiment');
        });
    });

    describe('No Matches', () => {
        it('should return empty results for non-matching terms', () => {
            const results = fuse.search('nonexistent');
            expect(results).toHaveLength(0);
        });

        it('should return empty results for empty search', () => {
            const results = fuse.search('');
            expect(results).toHaveLength(0);
        });
    });

    describe('Multiple Matches', () => {
        it('should rank results by match quality', () => {
            const results = fuse.search('project');
            expect(results).toHaveLength(3);
            // Test Project should rank higher than Main Project for "project"
            expect(results[0].item.name).toBe('Test Project');
            expect(results[1].item.name).toBe('Main Project');
            expect(results[2].item.name).toBe('Archived Math Project');
        });
    });

    describe('Threshold Behavior', () => {
        it('should respect threshold setting', () => {
            // Create a more strict fuse instance
            const strictFuse = new Fuse(mockProjects, {
                includeScore: true,
                threshold: 0.2, // More strict
                ignoreLocation: true,
                keys: ['name', 'files.name']
            });

            const results = strictFuse.search('Objct');
            // With stricter threshold, this might not match
            expect(results.length).toBeLessThanOrEqual(1);
        });
    });
}); 