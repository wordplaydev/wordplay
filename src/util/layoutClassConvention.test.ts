import { readFileSync } from 'fs';
import { resolve } from 'path';
import { expect, test } from 'vitest';
import { styleSource, svelteFiles } from '../../scripts/css/styleScan';

/**
 * The three layout primitives in `src/app.html` are the only place those three
 * shapes are written.
 *
 * Thirty-six components had declared them independently under thirty-odd class
 * names before #1419 — `.actions`, `.controls`, `.header`, `.title`, `.confirm`,
 * `.row`, and five names in one file for one rule. Collapsing them once only
 * helps until the next component declares its own; this is what makes it stick.
 *
 * It also does the job the type checker would if a class name were a type: a
 * primitive used in markup but never declared is a silent no-op, because Svelte's
 * unused-CSS pruning does not reach app.html.
 */

const Root = resolve(__dirname, '..');
const appHtml = readFileSync(resolve(Root, 'app.html'), 'utf-8');

/** The primitives, by the declarations that define them. */
const Primitives: Record<string, Set<string>> = {
    'control-row': new Set([
        'display: flex',
        'flex-direction: row',
        'flex-wrap: wrap',
        'align-items: center',
        'gap: var(--wordplay-spacing)',
    ]),
    stack: new Set([
        'display: flex',
        'flex-direction: column',
        'gap: var(--wordplay-spacing)',
    ]),
    'panel-column': new Set([
        'display: flex',
        'flex-direction: column',
        'align-items: start',
        'gap: var(--wordplay-spacing)',
        'inline-size: 100%',
    ]),
};

/**
 * A component's own scoped rule out-specifies the global one (0-2-0 beats
 * 0-1-0), so a site that genuinely differs is expected to keep its difference —
 * this only refuses an exact *copy* of a primitive, which by definition differs
 * in nothing at all.
 */
function rulesIn(
    source: string,
): { selector: string; declarations: Set<string> }[] {
    const styles = styleSource(source);
    if (styles === null) return [];
    const withoutComments = styles.replace(/\/\*[\s\S]*?\*\//g, ' ');
    return [...withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(
        (rule) => ({
            selector: (rule[1] ?? '').trim().replace(/\s+/g, ' '),
            declarations: new Set(
                (rule[2] ?? '')
                    .split(';')
                    .map((d) => d.trim().replace(/\s+/g, ' '))
                    .filter((d) => d.length > 0),
            ),
        }),
    );
}

function sameSet(a: Set<string>, b: Set<string>): boolean {
    return a.size === b.size && [...a].every((x) => b.has(x));
}

test('no component re-declares a layout primitive', () => {
    const copies: string[] = [];
    for (const file of svelteFiles(Root)) {
        const rel = file.slice(file.indexOf('src/'));
        for (const rule of rulesIn(readFileSync(file, 'utf8')))
            for (const [name, declarations] of Object.entries(Primitives))
                if (sameSet(rule.declarations, declarations))
                    copies.push(`${rel}  ${rule.selector}  → use .${name}`);
    }
    expect(
        copies,
        'These rulesets are exact copies of a layout primitive declared in src/app.html. Put the class on the element instead; if the site really differs, keep only the declaration that differs, so the difference shows in the diff.',
    ).toEqual([]);
});

test('every primitive used in markup is declared in app.html', () => {
    const undeclared = Object.keys(Primitives).filter(
        (name) => !new RegExp(`(?:^|\\n)\\s*\\.${name}\\s*\\{`).test(appHtml),
    );
    expect(
        undeclared,
        'A layout primitive is used in markup but not declared in app.html, where it would silently do nothing.',
    ).toEqual([]);
});
