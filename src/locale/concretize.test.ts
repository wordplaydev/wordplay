import { test, expect } from 'vitest';
import concretize, { type TemplateInput } from './concretize';
import getDefaultLocale from './getDefaultLocale';

const locale = await getDefaultLocale(true);

test.each([
    ['', 'TBD', []],
    ['Hello, my name is $1.', 'Hello, my name is Amy.', ['Amy']],
    ['To create a new $blah, click here.', '-', []],
    [
        'To create a new $project, click here.',
        'To create a new performance, click here.',
        [],
    ],
    ['I am $1 ??', '-', []],
    ['I received $1[$1|nothing]', 'I received nothing', [undefined]],
    ['I received $1[$1|nothing]', 'I received 1', [1]],
    [
        'I received $1[$2[$2|oops]|nothing]',
        'I received nothing',
        [undefined, 1],
    ],
])('%s => %s', (template: string, result: string, inputs: TemplateInput[]) => {
    expect(concretize(locale, template, ...inputs).toText()).toBe(result);
});
