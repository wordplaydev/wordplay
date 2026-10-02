import Project from '#db/projects/Project.ts';
import DefaultLocale from '#locale/DefaultLocale.ts';
import type LocaleText from '#locale/LocaleText.ts';
import Bind from '#nodes/Bind.ts';
import Doc from '#nodes/Doc.ts';
import NameType from '#nodes/NameType.ts';
import Reference from '#nodes/Reference.ts';
import Source from '#nodes/Source.ts';
import StructureDefinition from '#nodes/StructureDefinition.ts';
import { readFileSync } from 'fs';
import { expect, test } from 'vitest';

const es: LocaleText = JSON.parse(
    readFileSync('static/locales/es-MX/es-MX.json', 'utf8'),
);

function contextFor(locale: LocaleText, code = '') {
    const source = new Source('start', code);
    const project = Project.make('p', 'p', source, [], [locale]);
    return { project, source, context: project.getContext(source) };
}

function stageContentType(locale: LocaleText) {
    const { context } = contextFor(locale);
    const stage = context
        .getBasis()
        .shares.all.find(
            (def): def is StructureDefinition =>
                def instanceof StructureDefinition &&
                def.names.hasName(DefaultLocale.output.Stage.names[1] ?? ''),
        );
    const content = stage?.inputs[0];
    return content instanceof Bind ? content.type?.toWordplay() : undefined;
}

test('Stage declares its content in the project language', () => {
    expect(stageContentType(es)).toBe(
        '[Frase|Figura|Imagen|Grupo|decir|Música]',
    );
});

test('en-US basis types are unchanged', () => {
    expect(stageContentType(DefaultLocale)).toBe(
        '[Phrase|Shape|Image|Group|Say|Music]',
    );
});

/**
 * Every type name a basis output or input writes, whether declared or
 * constructed, should be in the project's language, whenever that language has a word for
 * it. Catches the next hard-coded English type name in a basis source.
 */
test('no basis type or reference is written in English when Spanish has a word', () => {
    const { context } = contextFor(es);
    const english: string[] = [];
    for (const share of context.getBasis().shares.all) {
        // Docs carry every locale's examples, en-US's included, so their
        // names are the example's language, not the basis source's.
        const inDocs = new Set(
            share.nodes((n) => n instanceof Doc).flatMap((doc) => doc.nodes()),
        );
        for (const node of share.nodes()) {
            if (!(node instanceof NameType || node instanceof Reference))
                continue;
            if (inDocs.has(node)) continue;
            const def = node.resolve(context);
            // Only names of types: a function body's references to its own
            // inputs and methods are code, localized (or not) with the body.
            if (!(def instanceof StructureDefinition)) continue;
            const written = node.getName();
            const spanish = def.names.getNameInLanguage('es', false);
            if (
                spanish !== undefined &&
                spanish.getName() !== written &&
                def.names.getNameInLanguage('en', false)?.getName() === written
            )
                english.push(`${share.names.getNames()[0]}: ${written}`);
        }
    }
    expect(english).toEqual([]);
});

test('a written type name is described in the project language', () => {
    const { project, source, context } = contextFor(
        es,
        'x•Phrase: Phrase("hola")',
    );
    const type = source.nodes().find((n) => n instanceof NameType);
    expect(type).toBeDefined();
    expect(
        type?.getDescription(project.basis.locales, context).toText(),
    ).toContain('Frase');
});
