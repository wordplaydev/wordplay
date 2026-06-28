import { expect, test } from 'vitest';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import type { TemplateInput } from '@locale/Locales';

test.each([
    ['', 'TBD', {}],
    ['Hello, my name is $name.', 'Hello, my name is Amy.', { name: 'Amy' }],
    [
        'To create a new $blah, click here.',
        DefaultLocale.ui.template.unparsable +
            ': To create a new $blah, click here.',
        {},
    ],
    [
        // Glossary terms are referenced with `@term` (resolved by ConceptLink to
        // the localized word), not `$term`.
        'To create a new @project, click here.',
        'To create a new project, click here.',
        {},
    ],
    ['I am $1 ??', DefaultLocale.ui.template.unparsable + ': I am $1 ??', {}],
    ['I received $a[$a|nothing]', 'I received nothing', { a: undefined }],
    ['I received $a[$a|nothing]', 'I received 1', { a: 1 }],
    [
        'I received $a[$b[$b|oops]|nothing]',
        'I received nothing',
        { a: undefined, b: 1 },
    ],
])(
    '%s => %s',
    (
        template: string,
        result: string,
        inputs: Record<string, TemplateInput>,
    ) => {
        expect(DefaultLocales.concretize(template, inputs).toText()).toBe(
            result,
        );
    },
);
