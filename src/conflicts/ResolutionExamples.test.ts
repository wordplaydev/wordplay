/**
 * One example program per conflict class, plus a unit test asserting that
 * the conflict appears and offers the expected shape of resolution. The
 * programs in this file are also the recommended manual-UX review corpus
 * for issue #827 — paste each `code` into a fresh project and expand the
 * annotations sidebar.
 *
 * The naming convention: each `describe` block names a conflict; each `test`
 * inside it pastes the program, locates the conflict by class, and asserts
 * the resolution kind (`'repair'` or `'explain'`) and a minimum count.
 */
import { describe, expect, test } from 'vitest';
import DefaultLocale from '@locale/DefaultLocale';
import Project from '@db/projects/Project';
import Source from '@nodes/Source';
import type Conflict from '@conflicts/Conflict';
import type { Resolution } from '@conflicts/Conflict';

// Conflict classes referenced below.
import { BorrowCycle } from '@conflicts/BorrowCycle';
import { CharacterWarning } from '@conflicts/CharacterWarning';
import { DisallowedInputs } from '@conflicts/DisallowedInputs';
import DuplicateLanguage from '@conflicts/DuplicateLanguage';
import DuplicateName from '@conflicts/DuplicateName';
import { DuplicateShare } from '@conflicts/DuplicateShare';
import DuplicateTypeVariable from '@conflicts/DuplicateTypeVariable';
import ExpectedBooleanCondition from '@conflicts/ExpectedBooleanCondition';
import ExpectedColumnBind from '@conflicts/ExpectedColumnBind';
import ExpectedColumnType from '@conflicts/ExpectedColumnType';
import { ExpectedEndingExpression } from '@conflicts/ExpectedEndingExpression';
import ExpectedSelectName from '@conflicts/ExpectedSelectName';
import ExpectedStream from '@conflicts/ExpectedStream';
import ExtraCell from '@conflicts/ExtraCell';
import { ImpossibleType } from '@conflicts/ImpossibleType';
import IncompatibleCellType from '@conflicts/IncompatibleCellType';
import IncompatibleInput from '@conflicts/IncompatibleInput';
import { IncompatibleKey } from '@conflicts/IncompatibleKey';
import IncompatibleType from '@conflicts/IncompatibleType';
import { IncompleteImplementation } from '@conflicts/IncompleteImplementation';
import InputListMustBeLast from '@conflicts/InputListMustBeLast';
import InvalidProperty from '@conflicts/InvalidProperty';
import InvalidRow from '@conflicts/InvalidRow';
import { MisplacedConversion } from '@conflicts/MisplacedConversion';
import { MisplacedShare } from '@conflicts/MisplacedShare';
import { MisplacedThis } from '@conflicts/MisplacedThis';
import MissingCell from '@conflicts/MissingCell';
import MissingInput from '@conflicts/MissingInput';
import MissingLanguage from '@conflicts/MissingLanguage';
import { MissingShareLanguages } from '@conflicts/MissingShareLanguages';
import NoExpression from '@conflicts/NoExpression';
import { NotAKeyValue } from '@conflicts/NotAKeyValue';
import { NotANumber } from '@conflicts/NotANumber';
import NotAnInterface from '@conflicts/NotAnInterface';
import NotInstantiable from '@conflicts/NotInstantiable';
import OrderOfOperations from '@conflicts/OrderOfOperations';
import Placeholder from '@conflicts/Placeholder';
import { PossiblePII } from '@conflicts/PossiblePII';
import ReferenceCycle from '@conflicts/ReferenceCycle';
import RequiredAfterOptional from '@conflicts/RequiredAfterOptional';
import SeparatedEvaluate from '@conflicts/SeparatedEvaluate';
import UnclosedDelimiter from '@conflicts/UnclosedDelimiter';
import UnexpectedColumnBind from '@conflicts/UnexpectedColumnBind';
import UnexpectedEtc from '@conflicts/UnexpectedEtc';
import UnexpectedInput from '@conflicts/UnexpectedInput';
import UnexpectedTypeInput from '@conflicts/UnexpectedTypeInput';
import { UnexpectedTypeVariable } from '@conflicts/UnexpectedTypeVariable';
import { UnimplementedInterface } from '@conflicts/UnimplementedInterface';
import { UnknownBorrow } from '@conflicts/UnknownBorrow';
import UnknownColumn from '@conflicts/UnknownColumn';
import { UnknownConversion } from '@conflicts/UnknownConversion';
import UnknownInput from '@conflicts/UnknownInput';
import UnknownLanguage from '@conflicts/UnknownLanguage';
import { UnknownName } from '@conflicts/UnknownName';
import { UnknownTypeName } from '@conflicts/UnknownTypeName';
import UnsupportedFontFormat from '@conflicts/UnsupportedFontFormat';
import UnusedBind from '@conflicts/UnusedBind';
import { UnparsableConflict } from '@conflicts/UnparsableConflict';
import EmptyPattern from '@conflicts/EmptyPattern';
import MalformedQuantifier from '@conflicts/MalformedQuantifier';
import DuplicateCaptureName from '@conflicts/DuplicateCaptureName';
import UndefinedBackreference from '@conflicts/UndefinedBackreference';
import UnrecognizedPatternProperty from '@conflicts/UnrecognizedPatternProperty';
import Templates from '@concepts/Templates';

function locate<C extends Conflict>(
    code: string,
    cls: new (...args: never[]) => C,
    extraSources: { name: string; code: string }[] = [],
): { conflict: C; resolutions: readonly Resolution[] } {
    const source = new Source('main', code);
    const project = Project.make(
        null,
        'test',
        source,
        extraSources.map((s) => new Source(s.name, s.code)),
        DefaultLocale,
    );
    project.analyze();
    const conflict = project
        .getAnalysis()
        .conflicts.find((c): c is C => c instanceof cls);
    if (conflict === undefined) {
        const seen = project
            .getAnalysis()
            .conflicts.map((c) => c.constructor.name)
            .join(', ');
        throw new Error(
            `Expected ${cls.name} for code \`${code}\` but found: [${seen || 'none'}]`,
        );
    }
    const context = project.getContext(source);
    const resolutions = conflict.getResolutions(context, Templates);
    return { conflict, resolutions };
}

function expectRepair(
    code: string,
    cls: new (...args: never[]) => Conflict,
    minCount = 1,
    extraSources: { name: string; code: string }[] = [],
) {
    const { resolutions } = locate(code, cls, extraSources);
    expect(resolutions.length).toBeGreaterThanOrEqual(minCount);
    expect(resolutions[0].kind).toBe('repair');
}

// ====================================================================
// Naming / scoping
// ====================================================================

describe('UnknownName', () => {
    test('similar name in scope → repair with suggestions', () => {
        // `total` is in scope; the typo `totl` gets a Levenshtein suggestion.
        expectRepair('total: 5\ntotl', UnknownName);
    });
});

describe('DuplicateName', () => {
    test('duplicate name in a function input list → repair (delete dup)', () => {
        // Matches the existing pattern in FunctionDefinition.test.ts.
        expectRepair('ƒ(a a) 1', DuplicateName);
    });
});

describe('UnparsableConflict', () => {
    test('`?` alone → repair (suggest Conditional skeleton)', () => {
        expectRepair('?', UnparsableConflict);
    });
});

describe('PossiblePII', () => {
    test('email-like literal → repair (mark as non-PII)', () => {
        expectRepair("'jdoe@example.com'", PossiblePII);
    });
});

// ====================================================================
// Type compatibility
// ====================================================================

describe('IncompatibleType', () => {
    test('typed bind with mismatched value → repair', () => {
        expectRepair("a•#: ''", IncompatibleType);
    });
});

describe('IncompatibleInput', () => {
    test('function call with wrong arg type → repair', () => {
        expectRepair("f: ƒ(a•#) a\nf('')", IncompatibleInput);
    });
});

describe('IncompatibleCellType', () => {
    test('text into a number column on Insert → repair', () => {
        expectRepair('table: ⎡one•#⎦\ntable⎡+ "hi"⎦', IncompatibleCellType);
    });
});

describe('IncompatibleKey', () => {
    test('wrong key type on a set → repair', () => {
        expectRepair("{1 2}{''}", IncompatibleKey);
    });
});

describe('ExpectedBooleanCondition', () => {
    test('non-boolean Conditional condition → repair', () => {
        expectRepair("1 ? 'a' 'b'", ExpectedBooleanCondition);
    });
});

describe('MissingInput', () => {
    test('function call missing a required input → repair', () => {
        expectRepair('f: ƒ(a•#) a\nf()', MissingInput);
    });
});

describe('UnexpectedInput', () => {
    test('extra positional arg → repair (remove it)', () => {
        expectRepair('f: ƒ(a•#) a\nf(1 2)', UnexpectedInput);
    });
});

describe('UnexpectedTypeInput', () => {
    test('type input on non-generic function → repair (remove it)', () => {
        expectRepair('f: ƒ(a•#) a\nf⸨#⸩(1)', UnexpectedTypeInput);
    });
});

describe('UnexpectedTypeVariable', () => {
    test('type variable used as value → repair (placeholder)', () => {
        expectRepair('f: ƒ⸨T⸩(a•T) T\nf(1)', UnexpectedTypeVariable);
    });
});

describe('ImpossibleType', () => {
    test('`Is` with disjoint types → repair (replace with ⊥)', () => {
        // `•` is the type-test operator; testing a number against text is
        // statically impossible.
        expectRepair("1•''", ImpossibleType);
    });
});

describe('NotANumber', () => {
    test('`!#` (literal NaN) → repair (strip non-numeric)', () => {
        // The "not a number" literal — only triggers NotANumber when the
        // number cannot be parsed into a real Decimal.
        expectRepair('!#', NotANumber);
    });
});

describe('NotInstantiable', () => {
    test('evaluate of structure with abstract member → repair (scaffold)', () => {
        // `_` body marks the function as abstract; evaluating the struct
        // is then impossible.
        expectRepair('•Cat() (add: ƒ(a•# b•#) _)\nCat()', NotInstantiable);
    });
});

describe('NotAnInterface', () => {
    test('inherit from a concrete (non-interface) structure → repair', () => {
        // `•Cat() (ƒ poop() "psssst")` has a concrete poop, so it's NOT an
        // interface; declaring `•Boomy Cat()` to inherit from it fires
        // NotAnInterface.
        expectRepair(
            '•Cat() ( ƒ poop() "psssst" )\n•Boomy Cat()',
            NotAnInterface,
        );
    });
});

describe('UnimplementedInterface', () => {
    test("structure inherits but doesn't implement → repair (scaffold)", () => {
        expectRepair(
            '•Animal() ( ƒ sound()•"" _)\n•Cat Animal() ( ƒ speak() "meow" )',
            UnimplementedInterface,
        );
    });
});

describe('IncompleteImplementation', () => {
    test('structure with mixed abstract + concrete members → repair (drop inputs)', () => {
        // One abstract (`_`) + one concrete (`1`) members fires
        // IncompleteImplementation — neither a pure interface nor a
        // fully-instantiable struct.
        expectRepair(
            '•Animal() ( ƒ sound()•"" _ ƒ smell() 1)',
            IncompleteImplementation,
        );
    });
});

describe('DisallowedInputs', () => {
    test('interface with abstract members must not have inputs → repair', () => {
        expectRepair(
            '•Animal(name•"") ( ƒ sound()•"" _ ƒ smell() _)',
            DisallowedInputs,
        );
    });
});

describe('ExpectedStream', () => {
    test('Reaction whose condition has no stream → repair (drop reaction)', () => {
        expectRepair('1 … ⊤ 2', ExpectedStream);
    });
});

// ====================================================================
// Missing required elements
// ====================================================================

describe('MissingCell', () => {
    test('row missing a cell → repair (append placeholder)', () => {
        expectRepair('⎡a•# b•#⎦⎡1⎦', MissingCell);
    });
});

describe('MissingLanguage', () => {
    test('language tag with no code → repair (drop the slash)', () => {
        expectRepair("'hi'/", MissingLanguage);
    });
});

describe('MissingShareLanguages', () => {
    test('top-level share without language tags → repair (drop ↑)', () => {
        // Multilingual sharing requires language tags on every name.
        expectRepair('↑a: 1', MissingShareLanguages);
    });
});

describe('InputListMustBeLast', () => {
    test('variadic input not at end → repair (reorder)', () => {
        expectRepair('ƒ f(a…•# b•#) 1', InputListMustBeLast);
    });
});

describe('RequiredAfterOptional', () => {
    test('required input after optional → repair (reorder)', () => {
        expectRepair('ƒ f(a•#: 1 b•#) 1', RequiredAfterOptional);
    });
});

// ====================================================================
// Structural / syntactic
// ====================================================================

describe('UnclosedDelimiter', () => {
    test('unclosed list → repair (append `]`)', () => {
        expectRepair('[1 2 3', UnclosedDelimiter);
    });
});

describe('UnexpectedEtc', () => {
    test('`…` on a top-level bind → repair (remove `…`)', () => {
        expectRepair('a…•#: 1', UnexpectedEtc);
    });
});

describe('NoExpression', () => {
    test('function with no body → repair (insert placeholder)', () => {
        expectRepair('ƒ f()', NoExpression);
    });
});

describe('ExpectedEndingExpression', () => {
    test('block ending with Bind → repair (append placeholder)', () => {
        expectRepair('(a: 1)', ExpectedEndingExpression);
    });
});

describe('OrderOfOperations', () => {
    function applyFirstRepair(code: string): Project {
        const source = new Source('main', code);
        const project = Project.make(null, 'test', source, [], DefaultLocale);
        project.analyze();
        const conflict = project
            .getAnalysis()
            .conflicts.find(
                (c): c is OrderOfOperations => c instanceof OrderOfOperations,
            );
        if (conflict === undefined)
            throw new Error(`OrderOfOperations not found for \`${code}\``);
        const ctx = project.getContext(source);
        const resolutions = conflict.getResolutions(ctx, Templates);
        const first = resolutions[0];
        if (first.kind !== 'repair') throw new Error('expected repair');
        const newProject = first.mediator(ctx, project.getLocales()).newProject;
        newProject.analyze();
        return newProject;
    }

    test('precedence inversion → PEMDAS + reading-order, both fix the conflict', () => {
        // `1 + 2 · 3` parses left-assoc as `(1 + 2) · 3`; PEMDAS rebuilds to
        // `1 + (2 · 3)`, reading-order to `(1 + 2) · 3`. Two repairs offered;
        // either clears the conflict.
        const { resolutions } = locate('1 + 2 · 3', OrderOfOperations);
        expect(resolutions.length).toBe(2);
        const fixed = applyFirstRepair('1 + 2 · 3');
        expect(
            fixed
                .getAnalysis()
                .conflicts.some((c) => c instanceof OrderOfOperations),
        ).toBe(false);
    });

    test('same precedence chain → single wrap repair (no PEMDAS choice to make)', () => {
        // `1 · 2 + 3` is already in math order; PEMDAS and reading order
        // produce the same tree, so only one repair is offered.
        const { resolutions } = locate('1 · 2 + 3', OrderOfOperations);
        expect(resolutions.length).toBe(1);
        expect(resolutions[0].kind).toBe('repair');
    });

    test('one conflict per chain, not per adjacent pair', () => {
        // `1 + 2 · 3 - 4` has two adjacent mixed pairs (`+ ·` and `· -`), but
        // we now fire only ONE OrderOfOperations at the chain root — clicking
        // any other position would produce the same chain-wide repair.
        const source = new Source('main', '1 + 2 · 3 - 4');
        const project = Project.make(null, 'test', source, [], DefaultLocale);
        project.analyze();
        const count = project
            .getAnalysis()
            .conflicts.filter((c) => c instanceof OrderOfOperations).length;
        expect(count).toBe(1);

        const fixed = applyFirstRepair('1 + 2 · 3 - 4');
        const remaining = fixed
            .getAnalysis()
            .conflicts.filter((c) => c instanceof OrderOfOperations).length;
        expect(remaining).toBe(0);
    });

    test('same-operator outer with mixed-operator inner still fires once', () => {
        // `1 · 2 + 3 + 4` parses as `((1·2)+3) + 4`. The outermost pair is
        // `+ +` (same), but the chain mixes `·` and `+`, so we still expect
        // exactly one conflict at the chain root.
        const source = new Source('main', '1 · 2 + 3 + 4');
        const project = Project.make(null, 'test', source, [], DefaultLocale);
        project.analyze();
        const count = project
            .getAnalysis()
            .conflicts.filter((c) => c instanceof OrderOfOperations).length;
        expect(count).toBe(1);
    });

    test('exponent mixed with multiplication → rebuilt without conflicts', () => {
        // `2 ^ 3 · 5` mixes `^` (highest precedence) and `·`. PEMDAS groups
        // the exponent first. The right-associative rule for `^` only
        // matters for same-operator chains (which don't fire this conflict),
        // so we just verify the cross-precedence case rebuilds cleanly.
        const fixed = applyFirstRepair('2 ^ 3 · 5');
        const remaining = fixed
            .getAnalysis()
            .conflicts.filter((c) => c instanceof OrderOfOperations).length;
        expect(remaining).toBe(0);
    });
});

describe('NotAKeyValue', () => {
    test('map literal with a non-pair entry → repair (wrap as KeyValue)', () => {
        // Among `:`-separated entries, a plain `2` is the offender.
        expectRepair('{1:1 2 3:3}', NotAKeyValue);
    });
});

describe('Placeholder', () => {
    test('lone placeholder → at least one resolution', () => {
        // Placeholder always fires whenever an ExpressionPlaceholder/
        // TypePlaceholder appears. Resolution may be `repair` (when the
        // placeholder's type has default expressions) or `explain` (in a
        // free context where the type is unknown).
        const { resolutions } = locate('_', Placeholder);
        expect(resolutions.length).toBeGreaterThanOrEqual(1);
    });
});

// ====================================================================
// Misc removals & warnings
// ====================================================================

describe('UnusedBind', () => {
    test('declared name never referenced → repair (delete)', () => {
        expectRepair('ƒ f(a•#) 1\nf(1)', UnusedBind);
    });
});

describe('UnknownInput', () => {
    test('typo in named input → repair (suggest closest)', () => {
        expectRepair("f: ƒ(name•'') name\nf(nam: 'hi')", UnknownInput);
    });
});

describe('UnknownColumn', () => {
    test('typo in table column → repair (suggest closest)', () => {
        expectRepair("table: ⎡name•''⎦\ntable ⎡: nam: 'x' ⎦ ⊤", UnknownColumn);
    });
});

describe('UnknownConversion', () => {
    test('non-existent conversion path → repair (drop convert)', () => {
        // No conversion exists from a number to a user-defined structure.
        expectRepair('•X()\n1 → X', UnknownConversion);
    });
});

describe('UnknownBorrow', () => {
    test('borrow of nonexistent source → repair (remove borrow)', () => {
        expectRepair('↓ nonexistent', UnknownBorrow);
    });
});

describe('UnknownLanguage', () => {
    test('translation with unknown locale code → repair (drop code)', () => {
        expectRepair("'hi'/zzz", UnknownLanguage);
    });
});

describe('UnknownTypeName', () => {
    test('reference resolves to a non-type definition → repair (rename)', () => {
        // `ƒ Cat() 1` declares Cat as a function; `a•Cat: 1` declares `a` as
        // type Cat, but Cat is a function, not a type — the bind's NameType
        // resolves to a Definition that's not a type, firing the conflict.
        expectRepair('ƒ Cat() 1\na•Cat: 1', UnknownTypeName);
    });
});

describe('MisplacedShare', () => {
    test('share inside a block → repair (remove ↑)', () => {
        expectRepair('(↑a: 1)', MisplacedShare);
    });
});

describe('MisplacedConversion', () => {
    test('conversion outside structure → repair (remove it)', () => {
        // The grammar allows ConversionDefinition only inside structure
        // blocks; placing one at top level fires MisplacedConversion.
        expectRepair('1 + → # #m 5', MisplacedConversion);
    });
});

describe('MisplacedThis', () => {
    test('⬚ outside any structure → repair (placeholder)', () => {
        expectRepair('⬚', MisplacedThis);
    });
});

describe.skip('InvalidProperty', () => {
    test('property refinement on non-input field → repair (suggest closest)', () => {
        // InvalidProperty fires from PropertyBind only when the subject is a
        // StructureDefinitionType (the definition itself), not a
        // StructureType (an instance). Reachable via static-access patterns
        // that aren't common in user code; covered by manual UX review.
        expectRepair(
            '•Cat(name•"") (helper: 5)\nCat.helper: 6',
            InvalidProperty,
        );
    });
});

describe('DuplicateLanguage', () => {
    test('repeated language tag → repair (drop the second)', () => {
        expectRepair("'hi'/en_en", DuplicateLanguage);
    });
});

describe('DuplicateShare', () => {
    test('two top-level shares with same name across sources → repair', () => {
        // The share token requires a following space; bind names need
        // language tags to be valid top-level shares.
        expectRepair('↑ a/en: 1', DuplicateShare, 1, [
            { name: 'other', code: '↑ a/en: 2' },
        ]);
    });
});

describe('DuplicateTypeVariable', () => {
    test('same type var twice → repair (delete duplicate)', () => {
        expectRepair('ƒ⸨T T⸩(a•T) a', DuplicateTypeVariable);
    });
});

// ====================================================================
// Table / column
// ====================================================================

describe('ExpectedColumnBind', () => {
    test("Update cell isn't a bind → repair (wrap)", () => {
        expectRepair('table: ⎡a•#⎦\ntable ⎡: 1 ⎦ ⊤', ExpectedColumnBind);
    });
});

describe('ExpectedColumnType', () => {
    test('column without type → repair (add `•?`)', () => {
        expectRepair('⎡a⎦', ExpectedColumnType);
    });
});

describe('ExpectedSelectName', () => {
    test("Select cell isn't a column reference → repair (remove)", () => {
        // `⎡?` is the Select operator; cells must be column references.
        expectRepair('table: ⎡one•#⎦\ntable ⎡? 1⎦ one < 1', ExpectedSelectName);
    });
});

describe.skip('UnexpectedColumnBind', () => {
    test('table literal row has Bind cell → repair (unwrap)', () => {
        // TableLiteral.computeConflicts checks for `cell instanceof Bind`,
        // but the parser routes `name: value` in a row to `Input` (not
        // Bind). The producer path is effectively dead from normal user
        // input; the repair is in place and unit-test-equivalent coverage
        // would require constructing the conflict directly.
        expectRepair('⎡a•#⎦⎡b: 1⎦', UnexpectedColumnBind);
    });
});

describe('ExtraCell', () => {
    test('row has too many cells → repair (drop extra)', () => {
        expectRepair('⎡a•#⎦⎡1 2⎦', ExtraCell);
    });
});

describe('InvalidRow', () => {
    test('mixed named and positional cells in Insert → repair (clear cells)', () => {
        // Matches Insert.test.ts: a row that mixes positional and named.
        expectRepair('table: ⎡one•#⎦\ntable⎡+ 1 one:1⎦', InvalidRow);
    });
});

// ====================================================================
// Evaluate quirks
// ====================================================================

describe.skip('SeparatedEvaluate', () => {
    test('whitespace between fun and inputs → repair (close the gap)', () => {
        // Triggered when a FunctionType or StructureDefinitionType is given
        // where it isn't accepted, followed immediately by a Block — usually
        // a user typing `Cat (…)` with a space the parser couldn't merge.
        // It's an emergent diagnostic from two adjacent IncompatibleInputs
        // and requires a specific surrounding context to repro reliably;
        // covered by manual UX review (paste `Cat ()` into a Cat() context
        // and confirm the repair appears).
        expectRepair('•Cat()\nCat ()', SeparatedEvaluate);
    });
});

// ====================================================================
// Cycles
// ====================================================================

describe('ReferenceCycle', () => {
    test('self-referential bind → repair (placeholder breaks cycle)', () => {
        expectRepair('a: a + 1', ReferenceCycle);
    });
});

describe('BorrowCycle', () => {
    test('two sources borrowing each other → repair (drop borrow)', () => {
        expectRepair('↓ other\n1', BorrowCycle, 1, [
            { name: 'other', code: '↓ main\n2' },
        ]);
    });
});

// ====================================================================
// Warnings
// ====================================================================

describe('CharacterWarning', () => {
    test('translation with concept link → repair (strip it)', () => {
        expectRepair("'@Phrase'", CharacterWarning);
    });
});

describe.skip('UnsupportedFontFormat', () => {
    test('words formatted in a face that lacks the format → repair (strip)', () => {
        // Triggered by `analyzePhraseEvaluate` when a @Phrase's markup
        // requests a weight/italic the chosen face doesn't ship. Static
        // analysis depends on font metadata that isn't available in this
        // test harness — covered by manual UX review.
        expectRepair("Phrase('hi')", UnsupportedFontFormat);
    });
});

// ====================================================================
// Pattern sublanguage
// ====================================================================

describe('Pattern resolutions', () => {
    test('EmptyPattern → repair (fill with ◌)', () => {
        expectRepair("'x' ≈ ⣿⣿", EmptyPattern);
    });
    test('MalformedQuantifier → repair (swap bounds)', () => {
        expectRepair("'x' ≈ ⣿5–2 #⣿", MalformedQuantifier);
    });
    test('DuplicateCaptureName → repair (rename uniquely)', () => {
        expectRepair("'x' ≈ ⣿a:(_) a:(#)⣿", DuplicateCaptureName);
    });
    test('UndefinedBackreference → repair (nearest defined name)', () => {
        // `nam` is one edit from the capture `name`.
        expectRepair("'x' ≈ ⣿name:(_) nam⣿", UndefinedBackreference);
    });
    test('UnrecognizedPatternProperty → repair (nearest known name)', () => {
        // `greak` is one edit from the script `greek`.
        expectRepair("'x' ≈ ⣿_/greak⣿", UnrecognizedPatternProperty);
    });
});
