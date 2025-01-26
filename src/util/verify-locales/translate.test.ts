import { test, expect } from 'vitest';
import { ConceptPattern, MentionPattern, restoreReferences } from './translate';

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
