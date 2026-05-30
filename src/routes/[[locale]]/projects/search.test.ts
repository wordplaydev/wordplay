import { describe, expect, it } from 'vitest';
import { projectSearchFields } from './search';
import { searchItems, type Searchable } from '@util/search';

const L = 'en';

// Mock project records keyed by name. We test the search policy over the field
// tiers (name > file names > source code) that searchProjects builds, without
// needing a full Project/AST — searchProjects' Project→fields glue is thin.
type Mock = { name: string; files?: string[]; code?: string[] };

function record(m: Mock): Searchable<string> {
    return {
        ref: m.name,
        fields: projectSearchFields(m.name, m.files ?? [], m.code ?? [], L),
    };
}

const projects: Searchable<string>[] = [
    record({ name: 'Object Oriented Programming' }),
    record({ name: 'Data Structures & Algorithms' }),
    record({ name: 'Test Project' }),
    record({ name: 'Main Project', files: ['main.wp', 'utils.wp'] }),
    record({ name: 'Archived Math Project' }),
    record({ name: 'Old Science Experiment' }),
    record({
        name: 'Greeting Card',
        code: ['Happy Birthday wonderful friend'],
    }),
    record({
        name: 'Weather App',
        code: ['temperature humidity precipitation forecast'],
    }),
    record({
        name: 'Documented Library',
        code: ['Computes the average of a list of numbers'],
    }),
];

const search = (q: string) => searchItems(projects, q, L);
const names = (q: string) => search(q).map((r) => r[0]);

describe('project search', () => {
    describe('exact matches', () => {
        it('finds an exact project name', () => {
            expect(names('Object Oriented Programming')).toContain(
                'Object Oriented Programming',
            );
        });

        it('finds an exact source file name', () => {
            const results = names('main.wp');
            expect(results).toContain('Main Project');
        });

        it('finds a file name by any of its language variants', () => {
            // A multilingual source name contributes every variant (Source.getNames()).
            const recs = [
                record({ name: 'Bilingual', files: ['main', 'principal'] }),
            ];
            expect(
                searchItems(recs, 'principal', L).map((r) => r[0]),
            ).toContain('Bilingual');
            expect(searchItems(recs, 'main', L).map((r) => r[0])).toContain(
                'Bilingual',
            );
        });
    });

    describe('fuzzy matches (within ~2 edits)', () => {
        it('finds a project with a typo', () => {
            expect(names('Objct')).toContain('Object Oriented Programming');
        });

        it('finds a project with a missing character', () => {
            expect(names('algoritms')).toContain(
                'Data Structures & Algorithms',
            );
        });

        it('finds a project with an extra character', () => {
            expect(names('Testt')).toContain('Test Project');
        });
    });

    describe('partial matches', () => {
        it('finds a partial project name', () => {
            expect(names('Object')[0]).toBe('Object Oriented Programming');
        });

        it('finds a partial file name', () => {
            expect(names('main')).toContain('Main Project');
        });
    });

    describe('case insensitive', () => {
        it('matches regardless of case', () => {
            expect(names('object')[0]).toBe('Object Oriented Programming');
        });

        it('matches file names regardless of case', () => {
            expect(names('MAIN')).toContain('Main Project');
        });
    });

    describe('source code search (priority 3, with snippet)', () => {
        it('finds a project by text-literal content', () => {
            const [ref, match] = search('Birthday')[0];
            expect(ref).toBe('Greeting Card');
            expect(match[3]).toBe(3); // code-tier match → searchProjects adds a snippet
        });

        it('finds a project by formatted-literal content', () => {
            expect(names('precipitation')).toContain('Weather App');
        });

        it('finds a project by documentation text', () => {
            expect(names('average')).toContain('Documented Library');
        });
    });

    describe('ranking', () => {
        it('ranks a name match above a file/code match', () => {
            // "project" is in several names; Test Project / Main Project match by name.
            expect(names('project')[0]).not.toBe('Main Project');
        });
    });

    describe('no matches', () => {
        it('returns nothing for a non-matching term', () => {
            expect(search('nonexistentxyz')).toHaveLength(0);
        });
    });
});
