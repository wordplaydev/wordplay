import { readdirSync, readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const Sections = 'src/locale/en-US/sections';

/** Every web link target in a section file's raw text. */
function targetsIn(text: string): string[] {
    return Array.from(
        text.matchAll(/<([^<>@]*)@([^<>\s]+)>/gu),
        (match) => match[2] ?? '',
    );
}

/** A link to a page of this site is written `<label@://route>`. Written `@/route`,
 *  it is not a link: the target renders as text and the rest of the sentence is
 *  lost. Translations copy en-US's target, so the mistake ships in every locale,
 *  and nothing comparing a translation to en-US can notice it. */
test.each(readdirSync(Sections).filter((file) => file.endsWith('.json')))(
    'en-US %s writes every site link as @://route',
    (file) => {
        const text = readFileSync(`${Sections}/${file}`, 'utf8');
        expect(
            targetsIn(text).filter((target) => /^\/(?!\/)/.test(target)),
        ).toEqual([]);
    },
);
