import { test, expect } from 'vitest';
import SupportedLocales from '../locales';
import Project from '../../models/Project';
import Source from '../../nodes/Source';
import type { Code } from '../Locale';

// Build a list of all programs in the supported locales
const programs = SupportedLocales.map((locale) =>
    locale.tutorial
        .map((act) => {
            const programs = [
                // Verify act programs
                act.program.sources[0],
                // Verify scene programs
                ...act.scenes.map((scene) => scene.program.sources[0]).flat(),
                // Verify all programs in the scenes
                ...act.scenes
                    // Map act's scenes to lines
                    .map((scene) => scene.lines)
                    // Flatten them into a list of lines
                    .flat()
                    // Filter out anything that's not code
                    .filter(
                        (line): line is Code =>
                            line !== null &&
                            Object.hasOwn(line, 'sources') &&
                            (line as Code).conflicted === false
                    )
                    // Map the code onto their start source code
                    .map((code) => code.sources[0])
                    .flat(),
            ];
            return programs;
        })
        .flat()
).flat();

test.each(programs.map((code) => [code]))(
    `Ensure no conflict in %s`,
    (code: string) => {
        const project = new Project(
            null,
            'test',
            new Source('start', code),
            []
        );
        project.analyze();
        project.getAnalysis();
        // const context = project.getContext(project.main);
        // for (const conflict of Array.from(
        //     project.getPrimaryConflicts().values()
        // ).flat()) {
        //     const conflictingNodes = conflict.getConflictingNodes();
        //     console.error(
        //         conflictingNodes.primary.explanation(
        //             SupportedLocales[0],
        //             context
        //         )
        //     );
        // }
        expect(project.getPrimaryConflicts()).toHaveLength(0);
    }
);
