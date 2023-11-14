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

const projects: SerializedProject[] = [];
readdirSync(path.join('static', 'examples'), { withFileTypes: true }).forEach(
    (file) => {
        if (file.isFile()) {
            const text = readFileSync(
                path.join('static', 'examples', file.name),
                'utf8'
            );
            const project = parseSerializedProject(
                text,
                file.name.split('.')[0]
            );
            projects.push(project);
        }
    }
);

test.each([...projects])(
    `Ensure $name has no conflicts`,
    async (example: SerializedProject) => {
        const project = await Project.deserializeProject(Locales, example);
        project.analyze();
        project.getAnalysis();
        const context = project.getContext(project.getMain());
        for (const conflict of Array.from(
            project.getPrimaryConflicts().values()
        ).flat()) {
            const conflictingNodes = conflict.getConflictingNodes();
            console.error(
                conflictingNodes.primary.explanation(DefaultLocales, context)
            );
        }
        expect(project.getPrimaryConflicts()).toHaveLength(0);
    }
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
            `${example.split('-')[1]}.wp`
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
        const project = await Project.deserializeProject(Locales, example);
        const evaluator = new Evaluator(project, DB, DefaultLocales, false);
        const value = evaluator.getInitialValue();
        evaluator.stop();
        expect(value).not.toBeInstanceOf(ExceptionValue);
    }
);
