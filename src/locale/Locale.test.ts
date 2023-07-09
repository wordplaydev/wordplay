import { test, expect } from 'vitest';
import SupportedLanguages from './SupportedLanguages';
import { getLocale } from './getDefaultLocale';
import { concretizeOrUndefined } from './concretize';
import type Locale from './Locale';
import { parseDoc, toTokens } from '../parser/Parser';
import Token from '../nodes/Token';
import TokenType from '../nodes/TokenType';
import ConceptLink from '../nodes/ConceptLink';

const locales = (
    await Promise.all(
        SupportedLanguages.map(async (lang) => getLocale(lang, true))
    )
).filter((locale): locale is Locale => locale !== undefined);

/** This converts the locale into a list of key/value pairs for verification. */
function getKeyTemplatePairs(
    path: string[],
    record: Record<any, any>,
    pairs: [string[], string, string][]
) {
    for (const key of Object.keys(record)) {
        const value = record[key];
        if (typeof value === 'string') pairs.push([path, key, value]);
        // Many docs are lists of strings that are intended to be joined together.
        // Account for these when finding strings for verification.
        else if (
            Array.isArray(value) &&
            value.every((v) => typeof v === 'string')
        )
            pairs.push([path, key, value.join('\n\n')]);
        else if (
            typeof value === 'object' &&
            value !== null &&
            !Array.isArray(value)
        )
            getKeyTemplatePairs([...path, key], value, pairs);
    }
}

function pathToString(locale: Locale, path: string[]) {
    return `${locale.language} -> ${path.join(' -> ')}`;
}

test.each([...locales])('Verify locale $language', (locale) => {
    // Get the key/value pairs
    const pairs: [string[], string, string][] = [];
    getKeyTemplatePairs([], locale, pairs);

    // Check each one.
    for (const [path, key, value] of pairs) {
        // If the key suggests that it's documentation, try to parse it as a doc and
        // see if it has any tokens of unknown type or unparsable expressions or types.
        if (key === 'doc') {
            const doc = parseDoc(toTokens('`' + value + '`'));
            const unknownTokens = doc
                .leaves()
                .filter(
                    (node) =>
                        node instanceof Token && node.is(TokenType.Unknown)
                );

            expect(
                unknownTokens.length,
                `Found invalid tokens in ${pathToString(
                    locale,
                    path
                )}: ${unknownTokens.join(', ')}`
            ).toBe(0);

            const missingConcepts = doc.nodes().filter((node) => {
                if (node instanceof ConceptLink) {
                    const name = node.getName();
                    return (
                        !Object.hasOwn(locale.node, name) &&
                        !Object.hasOwn(locale.input, name) &&
                        !Object.hasOwn(locale.output, name)
                    );
                } else return false;
            });

            expect(
                missingConcepts.length,
                `Found unknown concept name ${pathToString(
                    locale,
                    path
                )}: ${missingConcepts.map((u) => u.toWordplay()).join(', ')}`
            ).toBe(0);

            // const unparsables = doc
            //     .nodes()
            //     .filter(
            //         (node) =>
            //             node instanceof UnparsableExpression ||
            //             node instanceof UnparsableType
            //     );

            // expect(
            //     unparsables.length,
            //     `Found unparsables in code inside ${pathToString(
            //         locale,
            //         path
            //     )}: "${unparsables.map((u) => u.toWordplay()).join(', ')}"`
            // ).toBe(0);
        }
        // If it's not a doc, assume it's a template string and try to parse it as a template.
        // If we can't, complain.
        else {
            const description = concretizeOrUndefined(locale, value);
            expect(
                description,
                `String at ${pathToString(
                    locale,
                    path
                )} is has unparsable template string "${value}"`
            ).toBeDefined();
        }
    }

    let unwritten = pairs.filter(([, , value]) => value === '$?').length;

    expect(
        unwritten,
        `Locale has ${unwritten} unwritten "$?" strings. Keep writing!`
    ).toBe(0);
});
