import { expect, test } from 'vitest';
import {
    ConceptPattern,
    hasOutOfExampleBreak,
    hasUnclosedText,
    leadingAnnotations,
    mismatchedConceptLinks,
    mismatchedPluralBranch,
    restoreConceptLinks,
    restoreReferences,
    splitDocParagraphs,
    splitMarkupAndCode,
    unclosedInCode,
} from './protect';

test('hasUnclosedText flags an identifier that picked up a string delimiter', () => {
    // An apostrophe written as ASCII `'` opens a text literal that never closes.
    expect(hasUnclosedText("o'brien: 5")).toBe(true);
    expect(hasUnclosedText('a: "unclosed')).toBe(true);
});

test('hasUnclosedText accepts balanced literals and interpolations', () => {
    expect(hasUnclosedText('oʼbrien: 5')).toBe(false); // U+02BC is a letter, not a delimiter
    expect(hasUnclosedText('say("hi")')).toBe(false);
    expect(hasUnclosedText('joe,tess,amy: 5')).toBe(false);
    // A `\…\` inside a text literal is an embedded expression, not a close.
    expect(hasUnclosedText('"sums \\1 + 2\\ and \\2 + 3\\"')).toBe(false);
    expect(hasUnclosedText('“”')).toBe(false); // empty literal, matched pair
});

test('splitDocParagraphs splits at blank lines between paragraphs', () => {
    expect(splitDocParagraphs('one\n\ntwo\n\n\nthree')).toEqual([
        'one',
        'two',
        'three',
    ]);
    // Leading/trailing breaks and whitespace produce no empty paragraphs.
    expect(splitDocParagraphs('  \n\none\n\n')).toEqual(['one']);
    // A single newline is a soft break within a paragraph, not a split point.
    expect(splitDocParagraphs('one\ntwo')).toEqual(['one\ntwo']);
});

test('splitDocParagraphs never splits inside example code', () => {
    // The real en-US node.Paragraph.doc[4]: a doc literal with blank lines inside `\…\`.
    const example =
        "\\¶Paragraph 1.\n\nParagraph 2.\n\nParagraph 3.¶'three paragraphs'\\";
    expect(splitDocParagraphs(example)).toEqual([example]);
    expect(splitDocParagraphs(`intro:\n\n${example}\n\noutro`)).toEqual([
        'intro:',
        example,
        'outro',
    ]);
    // Embedded expressions inside a text literal don't end the example.
    const nested = '\\"sums \\1 + 2\\, \\2 + 3\\"\\';
    expect(splitDocParagraphs(`a\n\n${nested} b`)).toEqual([
        'a',
        `${nested} b`,
    ]);
});

test('splitDocParagraphs treats an unclosed trailing example as code', () => {
    // Corrupted input with an unbalanced `\` degrades to a protected code tail.
    expect(splitDocParagraphs('a\n\n\\code\n\nmore')).toEqual([
        'a',
        '\\code\n\nmore',
    ]);
});

test('hasOutOfExampleBreak only flags breaks outside examples', () => {
    expect(hasOutOfExampleBreak('one\n\ntwo')).toBe(true);
    expect(hasOutOfExampleBreak('\\¶P1.\n\nP2.¶\\')).toBe(false);
    expect(hasOutOfExampleBreak('single paragraph\nwith a soft break')).toBe(
        false,
    );
});

test('an apostrophe in a ¶doc¶ does not leave the example open', () => {
    // en-US `node.Doc.doc[8]`, which is where this was found: the `'` in
    // "people's" is inside the doc, so it is prose, not a delimiter. Counting it
    // makes the quotes odd, the example never closes, and every paragraph after
    // it is protected as code — which is how five English paragraphs shipped in
    // 29 locales while `npm run locales` stayed green.
    const doc =
        "\\¶I remember people's name and favorite fruit¶\n•Person(name•'' fruit•'')\\";
    expect(splitMarkupAndCode(`${doc}\n\nAnd prose after it.`)).toEqual([
        { kind: 'code', text: doc },
        { kind: 'markup', text: '\n\nAnd prose after it.' },
    ]);
    expect(hasOutOfExampleBreak(`${doc}\n\nAnd prose after it.`)).toBe(true);
    expect(splitDocParagraphs(`${doc}\n\nAnd prose after it.`)).toEqual([
        doc,
        'And prose after it.',
    ]);
});

test('an example still nests inside a ¶doc¶', () => {
    // A doc is prose, but `\…\` still opens an example inside it, so the whole
    // thing stays one code segment rather than closing at the inner delimiter.
    const doc = "\\¶Here's an example: \\1 + 2\\¶3 + 4\\";
    expect(splitMarkupAndCode(doc)).toEqual([{ kind: 'code', text: doc }]);
});

test('an external example is one segment, tags and all', () => {
    // `\py| a = 5\js| let a = 5;\` holds three `\` of its own, so toggling on
    // each one leaves it open and protects the prose after it as code. That is
    // why the one string in the corpus using an external example shipped its
    // trailing sentence in English in every locale.
    const external = '\\py| a = 5\\js| let a = 5;\\';
    expect(
        splitMarkupAndCode(`like ${external}. The reader sees one.`),
    ).toEqual([
        { kind: 'markup', text: 'like ' },
        { kind: 'code', text: external },
        { kind: 'markup', text: '. The reader sees one.' },
    ]);
});

test('a quote outside a ¶doc¶ still delimits', () => {
    // The doc rule must not disarm quotes in code generally: an identifier that
    // picked up an apostrophe still swallows what follows, which is what
    // `hasUnclosedText` reports.
    expect(splitMarkupAndCode("\\o'brien: 5\\ after")).toEqual([
        { kind: 'code', text: "\\o'brien: 5\\ after" },
    ]);
});

test('leadingAnnotations extracts the marker prefix', () => {
    expect(leadingAnnotations('$~foo')).toBe('$~');
    expect(leadingAnnotations('$?$~foo')).toBe('$?$~');
    expect(leadingAnnotations('plain')).toBe('');
    // A mid-string $name mention is not an annotation.
    expect(leadingAnnotations('the $value is')).toBe('');
});

test('restoring a link tidies the spacing the model padded it with', () => {
    // A masked link is a foreign object in the sentence and models pad it, which
    // restores to double spaces and a floating period.
    const links = ['@Sequence', '@Pose'];
    expect(restoreConceptLinks('वापरते  ⟦0⟧  प्रकारचे  ⟦1⟧  .', links)).toBe(
        'वापरते @Sequence प्रकारचे @Pose.',
    );
});

test('tidying a restored link leaves French punctuation spacing alone', () => {
    // French requires a space before ; : ! ?, so only . and , lose one.
    expect(
        restoreConceptLinks('Voir ⟦0⟧ ; et ⟦1⟧ !', ['@Sequence', '@Pose']),
    ).toBe('Voir @Sequence ; et @Pose !');
});

test('tidying a restored link never eats a line break', () => {
    expect(restoreConceptLinks('end ⟦0⟧\n  next', ['@Pose'])).toBe(
        'end @Pose\n  next',
    );
});

test('restoreReferences only restores links the translation lost', () => {
    // A doc whose example localizes `@Phrase` to the locale's own name. That name
    // isn't in the source, and the old code paired it with `beforeConcepts.shift()`
    // — the FIRST source link — then bulk-replaced, turning it into a third `@Doc`.
    // `mismatchedConceptLinks` refused the string, so it re-queued on every run.
    const source =
        'Markup lives in @Doc, like @Words.\n\nFind me in an @Doc:\n\n\\¶Refer to @Phrase.¶\n5\\';
    const renamed = source.replace('@Phrase', '@Satz');
    const repaired = restoreReferences(source, renamed, ConceptPattern);
    const count = (text: string, link: string) =>
        Array.from(text.matchAll(ConceptPattern)).filter(([m]) => m === link)
            .length;
    expect(count(repaired, '@Doc')).toBe(2);
    expect(count(repaired, '@Phrase')).toBe(1);
    expect(mismatchedConceptLinks(source, repaired)).toBeUndefined();
});

test('restoreReferences still reports a link the translation dropped', () => {
    const source = 'Markup lives in @Doc, like @Words.';
    const dropped = 'Markup lives in @Doc, like nothing.';
    const repaired = restoreReferences(source, dropped, ConceptPattern);
    expect(mismatchedConceptLinks(source, repaired)).toBe('@Words');
});

test('unclosedInCode treats a ¶doc¶ inside an example as prose', () => {
    // A doc is prose wherever it sits, so its apostrophes are apostrophes — the
    // same reason this check looks only inside code. Before this, every English
    // doc example with a possessive read as an unclosed literal, which made the
    // doc permanently untranslatable: the translation was rejected every run and
    // the string was re-queued instead of landing.
    expect(unclosedInCode("\\¶I'm documentation.¶\n5\\")).toBe(false);
    // A real unclosed literal after the doc is still caught.
    expect(unclosedInCode("\\¶I'm a doc.¶\nPhrase('hello)\\")).toBe(true);
    // ...and a balanced one after a doc is still fine.
    expect(unclosedInCode("\\¶I'm a doc.¶\nPhrase('hello')\\")).toBe(false);
});

test('unclosedInCode looks only inside examples, and skips foreign ones', () => {
    // A translated identifier that swallowed an apostrophe leaves the literal
    // open, which swallows the rest of the doc when the example is re-embedded.
    expect(unclosedInCode("See how \\'cat\\ isn't in the list?")).toBe(true);
    // The same apostrophe in prose is just an apostrophe — `'` isn't markup.
    expect(unclosedInCode("Voici l'exemple.")).toBe(false);
    // An external example is another language, where `'` is that language's
    // delimiter and closes nothing of ours.
    expect(unclosedInCode("Compare: \\py|print('less')\\")).toBe(false);
    expect(unclosedInCode("Use \\'cat'\\ here.")).toBe(false);
});

/** The English source of the string this guard was written for. */
const Imported = 'added $#count[one pixel|$count pixels] from $x $y';

test("mismatchedPluralBranch accepts a translation with the locale's own arm count", () => {
    // Polish has four forms; the source has two. The target's count is what
    // matters, not English's.
    expect(
        mismatchedPluralBranch(
            Imported,
            'dodano $#count[jeden piksel|$count piksele|$count pikseli|$count piksela] z $x $y',
            4,
        ),
    ).toBeUndefined();
    // Japanese has one.
    expect(
        mismatchedPluralBranch(
            Imported,
            '$x $y から $#count[$count ピクセル] を追加',
            1,
        ),
    ).toBeUndefined();
});

test('mismatchedPluralBranch catches arms left behind without their $#name', () => {
    // What ar-SA actually shipped, twice: six correct arms, no `$#count` in
    // front of them, so the bracket group is literal text a screen reader
    // reads out bars and all. The other guards can't see it — each arm repeats
    // $x and $y, so the mention counts are nowhere near the source's and
    // positional repair declines to guess.
    const dropped =
        '[لم تُضَف أي بكسل من $x $y|أُضيف بكسل واحد من $x $y|أُضيف بكسلان من $x $y|أُضيفت $count بكسلات من $x $y|أُضيف $count بكسلًا من $x $y|أُضيف $count بكسل من $x $y]';
    expect(mismatchedPluralBranch(Imported, dropped, 6)).toBe('count');
});

test('mismatchedPluralBranch catches a branch with the wrong number of arms', () => {
    // Six forms asked for, English's two delivered.
    expect(
        mismatchedPluralBranch(
            Imported,
            'added $#count[one|many] from $x $y',
            6,
        ),
    ).toBe('count');
});

test('mismatchedPluralBranch ignores strings with no branch to lose', () => {
    expect(mismatchedPluralBranch('at $x $y', 'en $x $y', 6)).toBeUndefined();
});
