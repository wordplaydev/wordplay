import { test, expect } from 'vitest';
import Project from '../models/Project';
import Source from '../nodes/Source';
import { parseDoc, toTokens } from '../parser/Parser';
import ConceptLink from '../nodes/ConceptLink';
import en from '../locale/locales/en';
import type { Dialog, Line, Performance } from './Tutorial';
import type Tutorial from './Tutorial';

const SupportedLanguages = ['en'];

const Tutorials = await Promise.all(
    SupportedLanguages.map(async (lang) => {
        const tut = await fetch(
            `http://localhost:5173/locales/${lang}/${lang}-tutorial.json`
        );
        const json = await tut.json();
        return json as Tutorial;
    })
);

function check(line: Line): boolean {
    return (
        line !== null &&
        ['fit', 'fix', 'edit'].includes((line as Performance)[0])
    );
}

// Build a list of all programs in the supported locales
const programs = Tutorials.map((tutorial) =>
    tutorial.acts
        .map((act) => {
            const programs = [
                // Verify act programs
                ...(check(act.performance)
                    ? [act.performance.slice(1).join('\n')]
                    : []),
                // Verify scene programs
                ...act.scenes
                    .filter((scene) => check(scene.performance))
                    .map((scene) => scene.performance.slice(1).join('\n'))
                    .flat(),
                // Verify all programs in the scenes
                ...act.scenes
                    // Map act's scenes to lines
                    .map((scene) => scene.lines)
                    // Flatten them into a list of lines
                    .flat()
                    // Filter out anything that's not code, that has an intentional conflict, or is an performance import
                    .filter((line): line is Performance => check(line))
                    // Map the code onto their start source code
                    .map((performance) => performance.slice(1).join('\n'))
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
const lines = Tutorials.map((tutorial) =>
    tutorial.acts
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
                    parseDoc(toTokens('`' + line.slice(2).join('\n\n') + '`'))
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
