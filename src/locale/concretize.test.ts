import { test, expect } from 'vitest';
import DefaultLocale from './DefaultLocale';
import DefaultLocales from './DefaultLocales';
import type { TemplateInput } from './Locales';

test.each([
    ['', 'TBD', []],
    ['Hello, my name is $1.', 'Hello, my name is Amy.', ['Amy']],
    [
        'To create a new $blah, click here.',
        DefaultLocale.ui.template.unparsable +
            ': To create a new $blah, click here.',
        [],
    ],
    [
        'To create a new $project, click here.',
        'To create a new project, click here.',
        [],
    ],
    ['I am $1 ??', DefaultLocale.ui.template.unparsable + ': I am $1 ??', []],
    ['I received $1[$1|nothing]', 'I received nothing', [undefined]],
    ['I received $1[$1|nothing]', 'I received 1', [1]],
    [
        'I received $1[$2[$2|oops]|nothing]',
        'I received nothing',
        [undefined, 1],
    ],
])('%s => %s', (template: string, result: string, inputs: TemplateInput[]) => {
    expect(DefaultLocales.concretize(template, ...inputs).toText()).toBe(
        result,
    );
});
