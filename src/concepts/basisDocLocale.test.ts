// Import Database first: it eagerly constructs the DB singleton, which must finish before
// ConceptIndex pulls in HowToDatabase (otherwise a circular import leaves it half-defined).
import '@db/Database';
import type { Basis } from '@basis/Basis';
import ConceptIndex from '@concepts/ConceptIndex';
import ConversionConcept from '@concepts/ConversionConcept';
import Project from '@db/projects/Project';
import concretize from '@locale/concretize';
import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import Locales from '@locale/Locales';
import Source from '@nodes/Source';
import { describe, expect, test } from 'vitest';

/** en-US with a French tag and French names for two units. The conversion template
 *  `"$from → $to"` is byte-identical in all 30 locales, so the unit names are the only
 *  thing that can distinguish a French conversion doc from an English one. */
const French: LocaleText = {
    ...DefaultLocale,
    language: 'fr',
    basis: {
        ...DefaultLocale.basis,
        Number: {
            ...DefaultLocale.basis.Number,
            unit: {
                ...DefaultLocale.basis.Number.unit,
                km: 'kilomètres',
                m: 'mètres',
            },
        },
    },
};

function localesOf(...preferred: LocaleText[]) {
    return new Locales(concretize, preferred, DefaultLocale);
}

/** A project declaring the given locales, whose basis is therefore built from them. */
function projectIn(declared: LocaleText | LocaleText[]) {
    return Project.make(null, 'test', new Source('test', '1km'), [], declared);
}

/** The `#km → #m` conversion in a basis. */
function kmToM(basis: Basis) {
    return basis
        .getAllConversions()
        .find(
            (c) =>
                c.input.toWordplay().trim() === '#km' &&
                c.output.toWordplay().trim() === '#m',
        );
}

describe('built-in docs follow the reader', () => {
    test('a French basis documents the conversion in French', () => {
        // Sanity: the names and the doc template do work when French is in the basis.
        const conversion = kmToM(projectIn([French, DefaultLocale]).basis);
        expect(conversion).toBeDefined();
        expect(
            conversion?.docs?.getMarkup(localesOf(French))[0]?.toText(),
        ).toBe('kilomètres → mètres');
    });

    test('an English project read in French documents it in French', () => {
        // The reported case: the project declares English, the reader chose French.
        const project = projectIn(DefaultLocale);
        const conversion = kmToM(project.basis);
        expect(conversion).toBeDefined();
        // Its own docs are English, because that is the language the project declares...
        expect(
            conversion?.docs?.getMarkup(localesOf(French))[0]?.toText(),
        ).toBe('kilometers → meters');
        // ...but the basis can find the French one.
        expect(
            conversion === undefined
                ? undefined
                : project.basis
                      .getLocalizedDocs(conversion, localesOf(French))
                      ?.getMarkup(localesOf(French))[0]
                      ?.toText(),
        ).toBe('kilomètres → mètres');
    });

    test('the concept a reader sees is documented in French', () => {
        const project = projectIn(DefaultLocale);
        const french = localesOf(French);
        const index = ConceptIndex.make(project, french, [], undefined);
        const concept = index.concepts.find(
            (c): c is ConversionConcept =>
                c instanceof ConversionConcept &&
                c.getIdentifier() === '#km → #m',
        );
        expect(concept).toBeDefined();
        expect(concept?.getDocs(french)[0]?.toText()).toBe(
            'kilomètres → mètres',
        );
    });

    test('a reader whose locales match the project builds no second basis', () => {
        const project = projectIn(DefaultLocale);
        const english = localesOf(DefaultLocale);
        const conversion = kmToM(project.basis);
        // No second basis is built when there is nothing to translate to.
        expect(
            conversion === undefined
                ? 'missing'
                : project.basis.getLocalizedDocs(conversion, english),
        ).toBeUndefined();
    });
});

describe('counterpart pairing', () => {
    /** Every built-in the pairing reaches, paired with its counterpart in a French basis.
     *  Both bases carry the en-US fallback, so a correctly paired counterpart says exactly
     *  the same thing in English — which is what proves the walk lines the two up rather
     *  than merely producing same-shaped lists. */
    test('a counterpart says the same thing in English', () => {
        const project = projectIn(DefaultLocale);
        const french = localesOf(French);
        const english = localesOf(DefaultLocale);

        const definitions = [
            ...project.basis.getAllStructureDefinitions(),
            ...project.basis.getAllConversions(),
            ...project.shares.all,
        ];
        expect(definitions.length).toBeGreaterThan(50);

        let paired = 0;
        for (const definition of definitions) {
            const docs = project.basis.getLocalizedDocs(definition, french);
            if (docs === undefined) continue;
            paired++;
            expect(
                docs.getMarkup(english)[0]?.toText(),
                definition.toWordplay().slice(0, 40),
            ).toBe(definition.docs.getMarkup(english)[0]?.toText());
        }
        // The walk has to actually reach these, or the assertion above proves nothing.
        expect(paired).toBe(definitions.length);
    });

    test('functions inside a structure are paired too', () => {
        const project = projectIn(DefaultLocale);
        const french = localesOf(French);
        const english = localesOf(DefaultLocale);
        const number = project.basis.getStructureDefinition('measurement');
        expect(number).toBeDefined();
        const functions = number?.getFunctions() ?? [];
        expect(functions.length).toBeGreaterThan(10);
        for (const fun of functions)
            expect(
                project.basis
                    .getLocalizedDocs(fun, french)
                    ?.getMarkup(english)[0]
                    ?.toText(),
                fun.names.getNames()[0],
            ).toBe(fun.docs.getMarkup(english)[0]?.toText());
    });
});
