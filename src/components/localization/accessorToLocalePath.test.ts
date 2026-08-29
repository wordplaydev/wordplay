import { accessorToLocalePath } from '@components/localization/accessorToLocalePath';
import { UnknownName } from '@conflicts/UnknownName';
import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import type { NodeText, DescriptiveNodeText } from '@locale/NodeTexts';
import { describe, expect, test } from 'vitest';

const dotted = (
    accessor: (locale: LocaleText) => unknown,
    ...trailing: (string | number)[]
) => accessorToLocalePath(accessor, ...trailing)?.toString();

/** A path is only right if it names something a translator can actually edit, so check that
 *  it resolves in en-US rather than string-comparing a path that may not exist. */
const resolves = (accessor: (locale: LocaleText) => unknown) =>
    accessorToLocalePath(accessor)?.resolve(DefaultLocale);

describe('literal accessors keep working', () => {
    test('a plain property path', () => {
        expect(dotted((l) => l.ui.localize.button.edit)).toBe(
            'ui.localize.button.edit',
        );
        expect(typeof resolves((l) => l.ui.localize.button.edit)).toBe(
            'string',
        );
    });

    test('a top-level field has an empty path and so a leading dot', () => {
        expect(dotted((l) => l.guidance)).toBe('.guidance');
    });

    test('trailing segments address a tuple element', () => {
        expect(dotted((l) => l.ui.page.localize.tabs, 'labels', 0)).toBe(
            'ui.page.localize.tabs.labels.0',
        );
        expect(
            accessorToLocalePath(
                (l) => l.ui.page.localize.tabs,
                'labels',
                0,
            )?.resolve(DefaultLocale),
        ).toBe('About');
    });
});

describe('accessors the source-text pattern could not reflect', () => {
    test('a conflict composed through its own LocalePath helper', () => {
        expect(dotted((l) => UnknownName.LocalePath(l).explanation)).toBe(
            'node.Reference.conflict.UnknownName.conflict.explanation',
        );
        expect(
            typeof resolves((l) => UnknownName.LocalePath(l).explanation),
        ).toBe('string');
    });

    test('an accessor invoked off an object, as the annotation row does', () => {
        const annotation = { conflict: UnknownName.LocalePath };
        expect(dotted((l) => annotation.conflict(l).name)).toBe(
            'node.Reference.conflict.UnknownName.conflict.name',
        );
    });

    test('an accessor held in a variable and passed as a parameter', () => {
        const relay = (path: (l: LocaleText) => unknown) => dotted(path);
        expect(relay((l) => l.ui.localize.button.edit)).toBe(
            'ui.localize.button.edit',
        );
    });

    test('a ternary records the branch it actually took', () => {
        const minor = (kind: string) => (l: LocaleText) =>
            kind === 'minor'
                ? l.ui.annotations.severity.minor
                : l.ui.annotations.severity.major;
        expect(dotted(minor('minor'))).toBe('ui.annotations.severity.minor');
        expect(dotted(minor('major'))).toBe('ui.annotations.severity.major');
    });
});

describe('computed keys resolve to the leaf, not its parent', () => {
    // The regression that matters most: the source pattern stopped at `[`, so this reflected
    // as `ui.dialog.locale.request` — the parent object — and an edit saved under that key
    // would have replaced the whole subtree with one string on submission.
    test('a bracket-accessed key', () => {
        const key = 'alreadyRequested';
        expect(dotted((l) => l.ui.dialog.locale.request[key])).toBe(
            'ui.dialog.locale.request.alreadyRequested',
        );
        expect(dotted((l) => l.ui.dialog.locale.request[key])).not.toBe(
            'ui.dialog.locale.request',
        );
        expect(typeof resolves((l) => l.ui.dialog.locale.request[key])).toBe(
            'string',
        );
    });

    test('a numeric index', () => {
        expect(dotted((l) => l.ui.page.localize.tabs.labels[2])).toBe(
            'ui.page.localize.tabs.labels.2',
        );
    });
});

describe('narrowing with `in` takes the written branch', () => {
    // Node.getDescription narrows NodeText | DescriptiveNodeText this way. A recorder answers
    // `in` as present, so the recorded path matches the branch such an accessor is used on.
    const describe_ = (text: NodeText | DescriptiveNodeText) =>
        'description' in text ? text.description : text.name;

    test('records the description, not the name', () => {
        expect(dotted((l) => describe_(l.node.Bind))).toBe(
            'node.Bind.description',
        );
        expect(typeof resolves((l) => describe_(l.node.Bind))).toBe('string');
    });
});

describe('accessors with no single place to edit are declined', () => {
    test('one that computes a value from locale text', () => {
        expect(
            dotted((l) => l.ui.localize.button.edit.toLocaleUpperCase()),
        ).toBeUndefined();
    });

    test('one that reads no locale at all', () => {
        expect(dotted(() => 'hello')).toBeUndefined();
    });

    test('one that returns the locale itself', () => {
        expect(dotted((l) => l)).toBeUndefined();
    });

    test('one that names an object rather than a string', () => {
        // Not a place to edit, and the shape the source pattern used to return for a
        // computed key — writing a string there would replace the whole subtree.
        expect(dotted((l) => l.ui.dialog.locale.request)).toBeUndefined();
    });

    test('one that walks past locale text into a method', () => {
        expect(
            dotted((l) => l.ui.localize.button.edit.toLocaleUpperCase()),
        ).toBeUndefined();
    });
});
