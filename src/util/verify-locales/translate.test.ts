import { describe, expect, test } from 'vitest';
import {
    ConceptPattern,
    MentionPattern,
    decodeHtmlEntities,
    repairMentionsPositional,
    restoreReferences,
    unwrapMentions,
    unwrapProtected,
    wrapMentions,
    wrapProtected,
} from '@util/verify-locales/translate';

test.each([
    ['Hello $blah', 'Hola $boo', 'Hola $blah', MentionPattern],
    [
        'Hello $blah, how are $boo?',
        'Hola $one, ¿cómo estás $two?',
        'Hola $blah, ¿cómo estás $boo?',
        MentionPattern,
    ],
    ['Hello @blah', 'Hola @boo', 'Hola @blah', ConceptPattern],
    [
        'Hello @blah, how are @boo?',
        'Hola @one, ¿cómo estás @two?',
        'Hola @blah, ¿cómo estás @boo?',
        ConceptPattern,
    ],
])(
    'restoreReferences(%s %s) => %s with %s',
    (before, after, expected, pattern) => {
        expect(restoreReferences(before, after, pattern)).toBe(expected);
    },
);

describe('wrapProtected / unwrapProtected', () => {
    test('wraps a whole code block, delimiters included', () => {
        expect(wrapProtected('\\1story\\')).toBe(
            '<span translate="no">\\1story\\</span>',
        );
    });

    test('wraps @Concept references in markup', () => {
        expect(wrapProtected('see @Doc for details')).toBe(
            'see <span translate="no">@Doc</span> for details',
        );
    });

    test('wraps $name mentions in markup', () => {
        expect(wrapProtected('hello $name')).toBe(
            'hello <span translate="no">$name</span>',
        );
    });

    test('mixes markup-side wraps with code-block wraps', () => {
        expect(wrapProtected('see @Doc: \\1 + 2\\')).toBe(
            'see <span translate="no">@Doc</span>: <span translate="no">\\1 + 2\\</span>',
        );
    });

    test('does not double-wrap @Concept inside a code block', () => {
        // The surrounding code-block wrap already protects the inner content.
        expect(wrapProtected('\\@Doc\\')).toBe(
            '<span translate="no">\\@Doc\\</span>',
        );
    });

    test('preserves an unclosed trailing code block', () => {
        // `splitMarkupAndCode` keeps the unclosed opener as a single code
        // segment so the rest survives the round-trip.
        expect(unwrapProtected(wrapProtected('intro \\open'))).toBe(
            'intro \\open',
        );
    });

    test('round-trips text containing < through unwrap', () => {
        // The unwrap regex must allow `<` inside spans for code like `2 < 3`.
        expect(unwrapProtected(wrapProtected('\\2 < 3\\'))).toBe('\\2 < 3\\');
    });

    test('round-trips a multi-construct doc string', () => {
        const original =
            "I'm a @Doc that names $name. For example: \\¶hi¶\n'hello'\\";
        expect(unwrapProtected(wrapProtected(original))).toBe(original);
    });

    test('does not touch $$ literal-dollar escapes', () => {
        expect(wrapProtected('costs $$20')).toBe('costs $$20');
    });

    test('leaves plain markup unchanged', () => {
        expect(wrapProtected('plain markup with nothing special')).toBe(
            'plain markup with nothing special',
        );
    });
});

describe('wrapMentions / unwrapMentions', () => {
    test('wraps every $name in a no-translate span', () => {
        expect(wrapMentions('I expected $expected, got $given')).toBe(
            'I expected <span translate="no">$expected</span>, got <span translate="no">$given</span>',
        );
    });

    test('round-trips through unwrap', () => {
        const original = 'I expected $expected, got $given';
        expect(unwrapMentions(wrapMentions(original))).toBe(original);
    });

    test('leaves text without mentions unchanged', () => {
        expect(wrapMentions('plain text')).toBe('plain text');
    });

    test('does not touch $$ escapes', () => {
        expect(wrapMentions('costs $$20')).toBe('costs $$20');
    });
});

describe('decodeHtmlEntities', () => {
    test('decodes common entities Google Translate emits in HTML mode', () => {
        expect(decodeHtmlEntities('I don&#39;t &amp; he doesn&#39;t')).toBe(
            "I don't & he doesn't",
        );
        expect(decodeHtmlEntities('&lt;tag&gt; &quot;text&quot;')).toBe(
            '<tag> "text"',
        );
    });

    test('decodes hex numeric entities', () => {
        expect(decodeHtmlEntities('&#x2014;')).toBe('—');
    });
});

describe('repairMentionsPositional', () => {
    test('rewrites transliterated mentions in source order', () => {
        const before = 'I expected $expected, got $given';
        // Translate transliterated both names to Arabic, kept the $ and order.
        const after = 'توقعتُ $المتوقع، لكنني تلقيتُ $المعطى';
        expect(repairMentionsPositional(before, after)).toBe(
            'توقعتُ $expected، لكنني تلقيتُ $given',
        );
    });

    test('passes through when names already match the source', () => {
        const before = 'I expected $expected, got $given';
        const after = 'توقعتُ $expected لكن $given';
        expect(repairMentionsPositional(before, after)).toBe(after);
    });

    test('leaves alone when counts disagree (translator dropped a $)', () => {
        const before = 'I expected $expected, got $given';
        const after = 'توقعتُ $المتوقع لكن لا شيء';
        expect(repairMentionsPositional(before, after)).toBe(after);
    });

    test('is a no-op when the source has no mentions', () => {
        expect(repairMentionsPositional('plain', 'plano')).toBe('plano');
    });
});
