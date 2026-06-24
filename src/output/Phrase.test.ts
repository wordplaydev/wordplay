import { test, expect } from 'vitest';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Locales from '@locale/Locales';
import concretize from '@locale/concretize';
import Source from '@nodes/Source';
import { getLanguageDirection } from '@locale/LanguageCode';
import { HorizontalLayout, VerticalLeftRightLayout } from '@locale/Scripts';
import evaluateCode from '@runtime/evaluate';
import MarkupValue from '@values/MarkupValue';
import TextValue from '@values/TextValue';
import { createPhraseType, toPhrase } from '@output/Phrase';
import { NameGenerator } from '@output/Stage';

/** Build a Phrase from a phrase-producing program. */
function phraseFrom(code: string) {
    const value = evaluateCode(code);
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    return value ? toPhrase(project, value, new NameGenerator()) : undefined;
}

test("a text phrase's locale reaches output as a BCP-47 tag and direction", () => {
    const phrase = phraseFrom("Phrase('سلام'/ar)");
    expect(phrase?.text).toBeInstanceOf(TextValue);
    const language = phrase?.text.language;
    expect(language?.getBCP47()).toBe('ar');
    // Arabic's dominant script is right-to-left.
    expect(getLanguageDirection(language!.getLanguageCode()!)).toBe('rtl');
});

test("a formatted phrase's locale also reaches output", () => {
    const phrase = phraseFrom('Phrase(`hi`/en-US)');
    expect(phrase?.text).toBeInstanceOf(MarkupValue);
    expect(phrase?.text.language?.getBCP47()).toBe('en-US');
});

test('an untagged phrase exposes no locale', () => {
    const phrase = phraseFrom("Phrase('hi')");
    expect(phrase?.text.language).toBeUndefined();
});

test("a Phrase's default writing layout follows the project locale", () => {
    // A horizontal locale keeps the horizontal default (the `:` marks the
    // default value, distinguishing it from the type's union of options).
    const horizontal = new Locales(concretize, [DefaultLocale], DefaultLocale);
    expect(createPhraseType(horizontal).toWordplay()).toContain(
        `:'${HorizontalLayout}'`,
    );

    // A locale whose dominant script is vertical defaults phrases to vertical.
    const vertical = new Locales(concretize, [DefaultLocale], DefaultLocale);
    vertical.getLayout = () => 'vertical-lr';
    expect(createPhraseType(vertical).toWordplay()).toContain(
        `:'${VerticalLeftRightLayout}'`,
    );
});
