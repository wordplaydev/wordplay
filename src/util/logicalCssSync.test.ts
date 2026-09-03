import {
    checkStyleSource,
    describePhysicalCSS,
    findPhysicalCSS,
} from '../../scripts/check-logical-css';
import { describe, expect, test } from 'vitest';

/**
 * The logical-CSS guard, run in the unit suite so physical CSS fails a test run
 * rather than waiting for someone to remember `npm run rtl`. It sat red on main
 * for some time precisely because nothing ran it.
 *
 * Imported and called rather than shelled out to, matching fontsSync /
 * logoSync / instrumentsSync — the failure then names the file and line
 * directly instead of arriving as captured stderr.
 */
test('every style block uses direction- and flow-relative CSS', () => {
    expect(findPhysicalCSS().map(describePhysicalCSS)).toEqual([]);
});

/** A file that is not on any list, so only the inline-axis rules apply. */
const Chrome = 'src/components/widgets/Nothing.svelte';
/** A file that carries a writing mode, so the block-axis rules apply too. */
const Text = 'src/components/app/Writing.svelte';

const style = (...declarations: string[]) =>
    `<style>\n    .x {\n${declarations.map((d) => `        ${d}`).join('\n')}\n    }\n</style>\n`;

describe('what the guard flags', () => {
    test('an inline-axis property is flagged anywhere', () => {
        expect(
            checkStyleSource(Chrome, style('margin-left: 1px;')).map(
                (p) => p.physical,
            ),
        ).toEqual(['margin-left']);
    });

    test('a block-axis property is flagged only on a text surface', () => {
        // Spatial chrome is legitimately physical on the block axis; flagging it
        // everywhere would bury the signal in hundreds of correct declarations.
        expect(checkStyleSource(Chrome, style('margin-top: 1px;'))).toEqual([]);
        expect(
            checkStyleSource(Text, style('margin-top: 1px;')).map(
                (p) => p.physical,
            ),
        ).toEqual(['margin-top']);
    });

    test('markup outside a style block is ignored', () => {
        // `left` in a template expression is not a stylesheet declaration.
        expect(
            checkStyleSource(Text, '<div style:margin-top="1px"></div>\n'),
        ).toEqual([]);
    });

    test('an allowlisted file is skipped entirely', () => {
        expect(
            checkStyleSource(
                'src/components/output/PhraseView.svelte',
                style('border-left: 1px solid red;'),
            ),
        ).toEqual([]);
    });

    test('the reported line is the one the declaration is on', () => {
        const found = checkStyleSource(Chrome, style('margin-left: 1px;'));
        expect(found[0].line).toBe(3);
    });
});

describe('the physical: escape hatch', () => {
    test('exempts the run of declarations it introduces', () => {
        expect(
            checkStyleSource(
                Text,
                style(
                    '/* physical: pinned to a screen corner. */',
                    'margin-top: 1px;',
                    'margin-bottom: 2px;',
                ),
            ),
        ).toEqual([]);
    });

    test('stops at a blank line, so it can not silence a whole file', () => {
        const source =
            '<style>\n' +
            '    .a {\n' +
            '        /* physical: a reason. */\n' +
            '        margin-top: 1px;\n' +
            '    }\n' +
            '\n' +
            '    .b {\n' +
            '        margin-bottom: 2px;\n' +
            '    }\n' +
            '</style>\n';
        expect(checkStyleSource(Text, source).map((p) => p.physical)).toEqual([
            'margin-bottom',
        ]);
    });

    test('a marker with no reason does not exempt anything', () => {
        // Requiring the reason is what keeps the hatch from becoming a habit.
        expect(
            checkStyleSource(
                Text,
                style('/* physical: */', 'margin-top: 1px;'),
            ).map((p) => p.physical),
        ).toEqual(['margin-top']);
    });
});
