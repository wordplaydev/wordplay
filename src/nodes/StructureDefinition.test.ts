import { DisallowedInputs } from '@conflicts/DisallowedInputs';
import DuplicateName from '@conflicts/DuplicateName';
import DuplicateTypeVariable from '@conflicts/DuplicateTypeVariable';
import { IncompleteImplementation } from '@conflicts/IncompleteImplementation';
import NotAnInterface from '@conflicts/NotAnInterface';
import RequiredAfterOptional from '@conflicts/RequiredAfterOptional';
import { testConflict } from '@conflicts/TestUtilities';
import { UnimplementedInterface } from '@conflicts/UnimplementedInterface';
import { DB } from '@db/Database';
import Project from '@db/projects/Project';
import Caret from '@edit/caret/Caret';
import { getEditsAt } from '@edit/menu/PossibleEdits';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import FunctionType from '@nodes/FunctionType';
import NumberType from '@nodes/NumberType';
import PropertyReference from '@nodes/PropertyReference';
import Reference from '@nodes/Reference';
import Source from '@nodes/Source';
import StructureDefinition from '@nodes/StructureDefinition';
import TypeVariables from '@nodes/TypeVariables';
import Evaluator from '@runtime/Evaluator';
import NumberValue from '@values/NumberValue';
import { expect, test } from 'vitest';

function makeProject(code: string): Project {
    const source = new Source('test', code);
    return Project.make(null, 'test', source, [], DefaultLocale);
}

function evaluateStatic(code: string) {
    const project = makeProject(code);
    const evaluator = new Evaluator(
        project,
        DB,
        DefaultLocales.getLocales(),
        false,
    );
    const value = evaluator.getInitialValue();
    evaluator.stop();
    return value;
}

test.each([
    ['•Cat(a b)', '•Cat(a a)', StructureDefinition, DuplicateName],
    ['•Cat⸨T U⸩ ()', '•Cat⸨T T⸩ ()', TypeVariables, DuplicateTypeVariable],
    [
        '•Cat(a•# b•#:1)',
        '•Cat(a•#:1 b•#)',
        StructureDefinition,
        RequiredAfterOptional,
    ],
    [
        '•Animal() ( ƒ sound()•"" _)\n•Cat Animal() ( ƒ sound() "meow" )',
        '•Animal() ( ƒ sound()•"" _)\n•Cat Animal() ( ƒ speak() "meow" )',
        StructureDefinition,
        UnimplementedInterface,
        1,
    ],
    [
        '•Animal() ( ƒ sound()•"" _ ƒ smell() _)',
        '•Animal() ( ƒ sound()•"" _ ƒ smell() 1)',
        StructureDefinition,
        IncompleteImplementation,
        0,
    ],
    [
        '•Animal() ( ƒ sound()•"" _ ƒ smell() _)',
        '•Animal(name•"") ( ƒ sound()•"" _ ƒ smell() _)',
        StructureDefinition,
        DisallowedInputs,
        0,
    ],
    [
        // Multiple levels of interface should work
        `
        •Form() (
            ƒ die()•"" _
        )
          
        •Animal Form() (
            ƒ poop()•"" _
        )
          
        •Cat Animal() (
            ƒ die() "mew"
            ƒ poop() "ploit"
            ƒ meow() "meow"
        )
        `,
        // Multiple levels of interface should work
        `
        •Form() (
            ƒ die()•"" _
        )
          
        •Animal Form() (
            ƒ poop()•"" _
        )
          
        •Cat Animal() (
            ƒ die() "mew"
            ƒ meow() "meow"
        )
        `,
        StructureDefinition,
        UnimplementedInterface,
        2,
    ],
    // Interfaces must be structure definitions
    [
        `
        •Cat() (
            ƒ poop() _
        )
        •Boomy Cat()
        `,
        `
        •Cat() (
            ƒ poop() _
        )
        A: 5
        •Boomy A()
        `,
        StructureDefinition,
        NotAnInterface,
        1,
    ],

    // Interfaces must be interfaces
    [
        `
        •Cat() (
            ƒ poop() _
        )
        •Boomy Cat()
        `,
        `
        •Cat() (
            ƒ poop() "psssst"
        )
        •Boomy Cat()
        `,
        StructureDefinition,
        NotAnInterface,
        1,
    ],
])(
    '%s => no conflict, %s => conflict',
    (good, bad, node, conflict, number?) => {
        testConflict(good, bad, node, conflict, number);
    },
);

test('Passing a structure definition where a structure instance is expected is a type error', () => {
    // Regression: `StructureType.acceptsAll` used to silently unwrap
    // `StructureDefinitionType` into its inner `StructureType`, accepting
    // a bare definition reference as if it were an instance. The natural
    // example: `Phrase('hi' color: Color)` should not type-check because
    // `Color` (the definition) isn't a `Color` value — you'd write
    // `Color(50% 100 0°)` (or `Color.red`) to get an instance.
    const project = makeProject("Phrase('hi' color: Color)");
    project.analyze();
    const conflicted = Array.from(project.getConflictedNodes().keys());
    expect(conflicted.length).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// Static functions and binds (`↑` modifier inside a structure block).
// ---------------------------------------------------------------------------

test('static bind and static function parse without conflicts', () => {
    const project = makeProject(
        '•Math() (\n\t↑ pi: 3.14\n\t↑ ƒ square(n•#) n · n\n)\n',
    );
    project.analyze();
    expect(Array.from(project.getConflictedNodes().keys())).toEqual([]);
});

test('static bind value type-checks via the definition reference', () => {
    const project = makeProject('•Math() (\n\t↑ pi: 3.14\n)\nMath.pi');
    project.analyze();
    const source = project.getMain();
    const context = project.getContext(source);
    const prop = source
        .nodes()
        .find(
            (n): n is PropertyReference =>
                n instanceof PropertyReference && n.name?.getName() === 'pi',
        );
    expect(prop).toBeDefined();
    if (!prop) return;
    expect(prop.getType(context)).toBeInstanceOf(NumberType);
});

test('static function reference has function type', () => {
    const project = makeProject(
        '•Math() (\n\t↑ ƒ square(n•#) n · n\n)\nMath.square',
    );
    project.analyze();
    const source = project.getMain();
    const context = project.getContext(source);
    const prop = source
        .nodes()
        .find(
            (n): n is PropertyReference =>
                n instanceof PropertyReference &&
                n.name?.getName() === 'square',
        );
    expect(prop).toBeDefined();
    if (!prop) return;
    expect(prop.getType(context)).toBeInstanceOf(FunctionType);
});

test('static function referencing an instance input fails as UnknownName', () => {
    // `action` is an instance input — a static function shouldn't see it.
    const project = makeProject(
        "•State(action•'') (\n\t↑ ƒ shout() action\n)\n",
    );
    project.analyze();
    const conflicts = Array.from(project.getConflictedNodes().keys()).filter(
        (node): node is Reference =>
            node instanceof Reference && node.name.getText() === 'action',
    );
    expect(conflicts.length).toBeGreaterThan(0);
});

test('static bind evaluates and is reachable through the definition', () => {
    const value = evaluateStatic('•Math() (\n\t↑ pi: 3.14\n)\nMath.pi');
    expect(value).toBeInstanceOf(NumberValue);
    expect((value as NumberValue).toNumber()).toBeCloseTo(3.14);
});

test('static function evaluates through the definition', () => {
    const value = evaluateStatic(
        '•Math() (\n\t↑ ƒ square(n•#) n · n\n)\nMath.square(5)',
    );
    expect(value).toBeInstanceOf(NumberValue);
    expect((value as NumberValue).toNumber()).toBe(25);
});

test('static function is also reachable through an instance', () => {
    const value = evaluateStatic(
        '•Math() (\n\t↑ ƒ square(n•#) n · n\n)\nm: Math()\nm.square(5)',
    );
    expect(value).toBeInstanceOf(NumberValue);
    expect((value as NumberValue).toNumber()).toBe(25);
});

test('autocomplete on Definition.| suggests static members only', () => {
    const code = '•Math() (\n\t↑ pi: 3.14\n)\nMath.';
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const caret = new Caret(
        source,
        code.length,
        undefined,
        undefined,
    );
    const transforms = getEditsAt(project, caret, undefined, DefaultLocales);
    const suggested = transforms
        .map((t) => t.getNewNode(DefaultLocales)?.toWordplay() ?? '')
        .filter((s) => s.length > 0);
    expect(suggested).toContain('pi');
});

test('autocomplete on instance.| also suggests static members', () => {
    const code = '•Math() (\n\t↑ pi: 3.14\n)\nm: Math()\nm.';
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const caret = new Caret(
        source,
        code.length,
        undefined,
        undefined,
    );
    const transforms = getEditsAt(project, caret, undefined, DefaultLocales);
    const suggested = transforms
        .map((t) => t.getNewNode(DefaultLocales)?.toWordplay() ?? '')
        .filter((s) => s.length > 0);
    expect(suggested).toContain('pi');
});

test('autocomplete on Definition.| does not suggest a non-static instance bind', () => {
    // `pi` here is an INSTANCE bind (no ↑). `Math.pi` should not be a
    // suggestion — instance members aren't reachable from the definition.
    const code = '•Math() (\n\tpi: 3.14\n)\nMath.';
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const caret = new Caret(
        source,
        code.length,
        undefined,
        undefined,
    );
    const transforms = getEditsAt(project, caret, undefined, DefaultLocales);
    const suggested = transforms
        .map((t) => t.getNewNode(DefaultLocales)?.toWordplay() ?? '')
        .filter((s) => s.length > 0);
    expect(suggested).not.toContain('pi');
});
