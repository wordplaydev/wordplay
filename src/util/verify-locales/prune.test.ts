import { describe, expect, test } from 'vitest';
import ts from 'typescript';
import { removeJsonKey, removeProperty } from '@util/verify-locales/prune';

/** Parse an inline TypeScript source and return the members of the first
 *  type alias / interface declaration. Lets tests call `removeProperty`
 *  without touching disk. */
function membersOfFirstType(source: string): {
    sf: ts.SourceFile;
    members: ts.NodeArray<ts.TypeElement>;
    findProp: (name: string) => ts.PropertySignature;
} {
    const sf = ts.createSourceFile(
        'fixture.ts',
        source,
        ts.ScriptTarget.Latest,
        true,
    );
    const decl = sf.statements.find(
        (s) => ts.isTypeAliasDeclaration(s) || ts.isInterfaceDeclaration(s),
    ) as ts.TypeAliasDeclaration | ts.InterfaceDeclaration | undefined;
    if (!decl) throw new Error('No declared type in fixture.');
    const members = ts.isInterfaceDeclaration(decl)
        ? decl.members
        : ts.isTypeLiteralNode(decl.type)
          ? decl.type.members
          : (() => {
                throw new Error('Fixture type alias is not an object literal.');
            })();
    const findProp = (name: string) => {
        const prop = members.find(
            (m): m is ts.PropertySignature =>
                ts.isPropertySignature(m) &&
                ts.isIdentifier(m.name) &&
                m.name.text === name,
        );
        if (!prop) throw new Error(`Property ${name} not in fixture.`);
        return prop;
    };
    return { sf, members, findProp };
}

describe('removeProperty', () => {
    test('removes a middle property cleanly', () => {
        const source = [
            'type Foo = {',
            '    a: string;',
            '    b: string;',
            '    c: string;',
            '};',
            '',
        ].join('\n');
        const { sf, members, findProp } = membersOfFirstType(source);
        const result = removeProperty(sf.getFullText(), findProp('b'), members);
        expect(result).toBe(
            ['type Foo = {', '    a: string;', '    c: string;', '};', ''].join(
                '\n',
            ),
        );
    });

    test('removes the leading TSDoc comment along with the property', () => {
        const source = [
            'type Foo = {',
            '    /** Keep me */',
            '    a: string;',
            '    /** Drop me */',
            '    b: string;',
            '};',
            '',
        ].join('\n');
        const { sf, members, findProp } = membersOfFirstType(source);
        const result = removeProperty(sf.getFullText(), findProp('b'), members);
        expect(result).not.toContain('Drop me');
        expect(result).toContain('Keep me');
        expect(result).toContain('a: string;');
        expect(result).not.toContain('b: string');
    });

    test('removes the last property without leaving a dangling trailing comma', () => {
        // Type literals use `;` separators in TS, so there's no trailing-comma
        // hazard. But we still verify the closing `};` survives.
        const source = [
            'type Foo = {',
            '    a: string;',
            '    last: string;',
            '};',
            '',
        ].join('\n');
        const { sf, members, findProp } = membersOfFirstType(source);
        const result = removeProperty(
            sf.getFullText(),
            findProp('last'),
            members,
        );
        expect(result).toContain('a: string;');
        expect(result).not.toContain('last:');
        expect(result.trim().endsWith('};')).toBe(true);
    });

    test('result is still parseable TypeScript', () => {
        const source = [
            'type Foo = {',
            '    /** A doc */',
            '    a: string;',
            '    /** Removed */',
            '    b: string;',
            '};',
        ].join('\n');
        const { sf, members, findProp } = membersOfFirstType(source);
        const result = removeProperty(sf.getFullText(), findProp('b'), members);
        // Re-parse and confirm we can still find a type with one property.
        const reparsed = ts.createSourceFile(
            'fixture.ts',
            result,
            ts.ScriptTarget.Latest,
            true,
        );
        const decl = reparsed.statements.find((s) =>
            ts.isTypeAliasDeclaration(s),
        ) as ts.TypeAliasDeclaration;
        const newMembers = (decl.type as ts.TypeLiteralNode).members;
        expect(newMembers.length).toBe(1);
        expect((newMembers[0] as ts.PropertySignature).name.getText(reparsed)).toBe(
            'a',
        );
    });
});

describe('removeJsonKey', () => {
    test('removes a leaf key', () => {
        const obj = { ui: { edit: { wrap: 'foo', bind: 'bar' } } };
        expect(removeJsonKey(obj, ['ui', 'edit', 'wrap'])).toBe(true);
        expect(obj).toEqual({ ui: { edit: { bind: 'bar' } } });
    });

    test('returns false when the path does not resolve', () => {
        const obj = { ui: { edit: { bind: 'bar' } } };
        expect(removeJsonKey(obj, ['ui', 'edit', 'wrap'])).toBe(false);
        expect(obj).toEqual({ ui: { edit: { bind: 'bar' } } });
    });

    test('returns false when an intermediate segment is missing', () => {
        const obj: Record<string, unknown> = { ui: {} };
        expect(removeJsonKey(obj, ['ui', 'edit', 'wrap'])).toBe(false);
    });
});
