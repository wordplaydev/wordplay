import {
    checkGlossaryForm,
    getGlossaryWordIndex,
    getReservedFormNames,
    type GlossaryFormProblem,
} from '@locale/glossaryFormProblem';
import { expect, test } from 'vitest';

/** A small glossary standing in for a locale's, so the cases read plainly. */
const glossary = {
    parameter: { word: 'parameter' },
    value: { word: 'value' },
};

const words = getGlossaryWordIndex(glossary);
const reserved = getReservedFormNames(['Phrase']);

/** Check one form against the fixture, with whatever is already claimed. */
function check(form: string, claimed: [string, string][] = []) {
    return checkGlossaryForm('parameter', form, {
        words,
        reserved,
        claimed: new Map(claimed),
    });
}

function kinds(form: string, claimed: [string, string][] = []) {
    return check(form, claimed).problems.map(
        (p: GlossaryFormProblem) => p.kind,
    );
}

test('a plural form has no problems', () => {
    expect(kinds('parameters')).toEqual([]);
});

test('the term’s own word or id is dead', () => {
    expect(kinds('parameter')).toEqual(['own']);
    // The id resolves as well as the word.
    expect(kinds('Parameter')).toEqual(['own']);
});

test('another term’s word names that term', () => {
    const problems = check('values').problems;
    expect(problems).toEqual([]);
    expect(check('value').problems).toEqual([
        { kind: 'other', owner: 'value' },
    ]);
});

test('a name a reference resolves first is dead', () => {
    expect(kinds('Phrase')).toEqual(['concept']);
    // The reserved namespaces come along with the concept ids.
    for (const namespace of ['ui', 'how', 'u'])
        expect(kinds(namespace)).toEqual(['concept']);
});

test('a form another term already claimed names that term', () => {
    expect(check('args', [['args', 'argument']]).problems).toEqual([
        { kind: 'claimed', owner: 'argument' },
    ]);
});

test('a form a reference can’t contain only warns', () => {
    expect(kinds('parameters!')).toEqual(['unreferenceable']);
    // A space or hyphen ends a reference, so a form containing one can only
    // help search — but it is tolerated rather than flagged, since that still
    // earns its place.
    expect(kinds('parameter lists')).toEqual([]);
    expect(kinds('parameter-lists')).toEqual([]);
});

test('an annotation is a problem on top of whatever else is wrong', () => {
    // The annotation check is separate from the chain, so one form has two.
    expect(kinds('$~parameter')).toEqual(['annotated', 'own']);
    expect(kinds('$~parameters')).toEqual(['annotated']);
});

test('an empty form is dropped, and reports nothing else', () => {
    const empty = check('  ');
    expect(empty.problems.map((p) => p.kind)).toEqual(['empty']);
    expect(empty.drop).toBe(true);
    // A form that is nothing but an annotation is empty too, and still reports
    // the annotation, since that says tooling touched a locale-owned field.
    expect(kinds('$?')).toEqual(['annotated', 'empty']);
});

test('a kept form is trimmed and annotation-free, and folds for claiming', () => {
    const checked = check(' $~Parameters ');
    expect(checked.word).toBe('Parameters');
    expect(checked.folded).toBe('parameters');
    expect(checked.drop).toBe(false);
});

test('matching ignores case and composition', () => {
    // A decomposed é folds onto the composed one, so a form can't sneak past a
    // collision by being typed differently.
    const accented = getGlossaryWordIndex({ ref: { word: 'référence' } });
    expect(
        checkGlossaryForm('other', 'Référence', {
            words: accented,
            reserved,
            claimed: new Map(),
        }).problems,
    ).toEqual([{ kind: 'other', owner: 'ref' }]);
});
