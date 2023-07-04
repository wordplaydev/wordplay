import { test, expect } from 'vitest';
import SupportedLocales from '../locales';
import Project from '../../models/Project';
import Source from '../../nodes/Source';
import type { Code, Dialog } from '../Locale';
import { parseDoc, toTokens } from '../../parser/Parser';
import ConceptLink from '../../nodes/ConceptLink';
import en from './en';

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

// Build a list of all concept links
const lines = SupportedLocales.map((locale) =>
    locale.tutorial
        .map((act) => [
            // Across all scenes
            ...act.scenes
                // Across all lines
                .map((scene) => scene.lines)
                // Flatten them into a list of lines
                .flat()
                // Keep all dialog
                .filter(
                    (line): line is Dialog =>
                        line !== null && Object.hasOwn(line, 'concept')
                )
                // Map each line of dialog to a flat list of concepts in the dialog
                .map((line) =>
                    parseDoc(toTokens('`' + line.text + '`'))
                        .nodes()
                        .filter(
                            (node): node is ConceptLink =>
                                node instanceof ConceptLink
                        )
                        .map(
                            (link) =>
                                link.concept
                                    .getText()
                                    .substring(1)
                                    .split('/')[0]
                        )
                        .flat()
                )
                .flat(2),
        ])
        .flat()
).flat();

test.each(lines)(`Verify concepts in @%s`, (id: string) => {
    expect(
        Object.hasOwn(en.node, id) ||
            Object.hasOwn(en.input, id) ||
            Object.hasOwn(en.output, id) ||
            id === 'UI'
    ).toBeTruthy();
});
