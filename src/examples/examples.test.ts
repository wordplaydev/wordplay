import { test, expect } from 'vitest';
import type { SerializedProject } from '../models/Project';
import Project from '../models/Project';
import { Locales } from '../db/Database';
import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { parseSerializedProject } from './examples';
import { DefaultLocales } from '../locale/DefaultLocale';

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
