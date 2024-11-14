import { describe, it, expect } from 'vitest';
import translateProject from './translate';
import type { Functions } from 'firebase/functions';
import type Project from './Project';

describe('translateProject', () => {
    it('should append a number to duplicate names to prevent conflicts', async () => {
        const mockFunctions = {} as Functions;
        const mockProject = {
            getPrimaryLanguage: () => 'es',
            getSources: () => [
                {
                    nodes: () => [
                        {
                            instanceof: (type: any) => type === Names,
                            names: [
                                {
                                    isLanguage: (lang: string) => lang === 'es',
                                    hasLanguage: () => false,
                                    getName: () => 'hola',
                                },
                            ],
                            getNameInLanguage: (lang: string) => ({
                                getName: () => (lang === 'en' ? 'hi' : undefined),
                            }),
                            withName: (name: string, lang: string) => ({
                                name,
                                lang,
                            }),
                        },
                    ],
                },
            ],
            withPrimaryLocale: (locale: any) => mockProject,
            withRevisedNodes: (nodes: any) => mockProject,
            getContext: (source: any) => ({}),
            getRoot: (reference: any) => ({
                getParent: (ref: any) => undefined,
            }),
        } as unknown as Project;

        const result = await translateProject(mockFunctions, mockProject, 'en-US');

        expect(result).not.toBeNull();
        expect(result).toBe(mockProject);
    });

    it('should handle no duplicate names correctly', async () => {
        const mockFunctions = {} as Functions;
        const mockProject = {
            getPrimaryLanguage: () => 'es',
            getSources: () => [
                {
                    nodes: () => [
                        {
                            instanceof: (type: any) => type === Names,
                            names: [
                                {
                                    isLanguage: (lang: string) => lang === 'es',
                                    hasLanguage: () => false,
                                    getName: () => 'adios',
                                },
                            ],
                            getNameInLanguage: (lang: string) => ({
                                getName: () => (lang === 'en' ? 'goodbye' : undefined),
                            }),
                            withName: (name: string, lang: string) => ({
                                name,
                                lang,
                            }),
                        },
                    ],
                },
            ],
            withPrimaryLocale: (locale: any) => mockProject,
            withRevisedNodes: (nodes: any) => mockProject,
            getContext: (source: any) => ({}),
            getRoot: (reference: any) => ({
                getParent: (ref: any) => undefined,
            }),
        } as unknown as Project;

        const result = await translateProject(mockFunctions, mockProject, 'en-US');

        expect(result).not.toBeNull();
        expect(result).toBe(mockProject);
    });
});