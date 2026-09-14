import type { SerializedProject } from '@db/projects/ProjectSchemas';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseSerializedProject } from './examples';
import { must } from '@util/nullable';

export function readProjects(dir: string): SerializedProject[] {
    const proj: SerializedProject[] = [];
    readdirSync(path.join('static', dir), { withFileTypes: true }).forEach(
        (file) => {
            if (file.isFile() && file.name.endsWith('.wp')) {
                const text = readFileSync(
                    path.join('static', dir, file.name),
                    'utf8',
                );
                const project = parseSerializedProject(
                    text,
                    // A split of a non-empty name always has a first part.
                    must(file.name.split('.')[0], 'a file name stem'),
                );
                proj.push(project);
            }
        },
    );
    return proj;
}
