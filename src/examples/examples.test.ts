import { test, expect } from 'vitest';
import Project from '../models/Project';
import { DB, Locales } from '../db/Database';
import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { getExampleGalleries, parseSerializedProject } from './examples';
import { DefaultLocales } from '../locale/DefaultLocale';
import type { SerializedProject } from '../models/ProjectSchemas';
import Evaluator from '@runtime/Evaluator';
import ExceptionValue from '@values/ExceptionValue';
import Docs from '@nodes/Docs';
import { SupportedLocales, getLocaleLanguage } from '@locale/Locale';
import type LanguageCode from '@locale/LanguageCode';
import Names from '@nodes/Names';
import Evaluate from '@nodes/Evaluate';

function readProjects(dir: string): SerializedProject[] {
    const proj: SerializedProject[] = [];
    readdirSync(path.join('static', dir), { withFileTypes: true }).forEach(
        (file) => {
            if (file.isFile()) {
                const text = readFileSync(
                    path.join('static', dir, file.name),
                    'utf8',
                );
                const project = parseSerializedProject(
                    text,
                    file.name.split('.')[0],
                );
                proj.push(project);
            }
        },
    );
    return proj;
}

const projects: SerializedProject[] = readProjects('examples');
const templates: SerializedProject[] = readProjects('templates');

test.each([...projects, ...templates])(
    `Ensure $name has no conflicts`,
    async (example: SerializedProject) => {
        const project = await Project.deserialize(Locales, example);
        project.analyze();
        project.getAnalysis();
        const context = project.getContext(project.getMain());
        const conflicts = Array.from(
            project.getPrimaryConflicts().values(),
        ).flat();
        const messages: string[] = [];
        for (const conflict of conflicts) {
            const conflictingNodes = conflict.getConflictingNodes();
            messages.push(
                conflictingNodes.primary
                    .explanation(DefaultLocales, context)
                    .toText(),
            );
        }
        expect(
            conflicts,
            'Unexpected conflicts: \n' + messages.join('\n'),
        ).toHaveLength(0);
    },
);

test.each([...templates])(
    'Ensure template names are localized',
    async (template: SerializedProject) => {
        const project = await Project.deserialize(Locales, template);

        // Find all names, except the binds that are inputs to an evaluae
        const names = project.getSources().reduce((binds: Names[], source) => {
            return [
                ...binds,
                ...source.expression.nodes().filter(
                    (node): node is Names =>
                        node instanceof Names &&
                        // Exclude names that are in bind in an evaluate, since those are not definitions
                        !(
                            project
                                .getRoot(node)
                                ?.getAncestors(node)[1] instanceof Evaluate
                        ),
                ),
            ];
        }, []);

        const supportedLanguages = SupportedLocales.map((locale) =>
            getLocaleLanguage(locale),
        ).filter((lang): lang is LanguageCode => lang !== undefined);

        // Ensure all binds are localized
        const incompleteNames = names.filter(
            (name) =>
                !supportedLanguages.every((lang) =>
                    name.containsLanguage(lang),
                ),
        );

        expect(
            incompleteNames,
            `Names in template '${template.name}' ${incompleteNames
                .map((bind) => `'${bind.getNames()[0].toLowerCase()}'`)
                .join(
                    ', ',
                )} are missing translations for one or more supported languages ${supportedLanguages.join(
                ', ',
            )}`,
        ).toHaveLength(0);
    },
);

test.each([...templates])(
    'Ensure template docs are localized',
    async (template: SerializedProject) => {
        const project = await Project.deserialize(Locales, template);

        const supportedLanguages = SupportedLocales.map((locale) =>
            getLocaleLanguage(locale),
        ).filter((lang): lang is LanguageCode => lang !== undefined);

        // Find all docs
        const docs = project.getSources().reduce((docs: Docs[], source) => {
            return [
                ...docs,
                ...source.expression
                    .nodes()
                    .filter((node): node is Docs => node instanceof Docs),
            ];
        }, []);

        const incompleteDocs = docs.filter(
            (doc) =>
                !supportedLanguages.every((lang) => doc.containsLanguage(lang)),
        );

        expect(
            incompleteDocs,
            `Docs in template '${template.name}' ${incompleteDocs
                .map((doc) => doc.toWordplay())
                .join(
                    ', ',
                )} are missing translations for one or more supported languages ${supportedLanguages.join(
                ', ',
            )}`,
        ).toHaveLength(0);
    },
);

test.each([
    ...getExampleGalleries(DefaultLocales)
        .map((gallery) => gallery.getProjects())
        .flat(),
])(`Ensure /static/examples/%s.wp exists`, (example: string) => {
    try {
        const file = path.join(
            'static',
            'examples',
            `${example.split('-')[1]}.wp`,
        );
        readFileSync(file, 'utf8');
        expect(true).toBe(true);
    } catch (_) {
        expect(true).toBe(false);
    }
});

test.each([...projects])(
    `Ensure $name doesn't evaluate to exception`,
    async (example: SerializedProject) => {
        const project = await Project.deserialize(Locales, example);
        const evaluator = new Evaluator(project, DB, DefaultLocales, false);
        const value = evaluator.getInitialValue();
        evaluator.stop();
        expect(value).not.toBeInstanceOf(ExceptionValue);
    },
);
