/**
 * The names a tutorial performance's `theme` may take.
 *
 * Kept in its own module, with no imports, for two reasons. `Tutorial.ts` is
 * the input to `npm run tutorial-schema`, so anything it reaches ends up in
 * the generated JSON schema; a name list generates a clean enum, while the
 * theme *sources* (which reach the whole music palette) would not. And the
 * enum is what makes a misspelled theme a schema failure in `npm run locales`,
 * in every locale at once.
 *
 * Act themes are named for their act. Each act's opening scene teaches no
 * concept and has its own theme named for the scene, so an act card and the
 * card right after it never play the same tune. The rest are named for
 * the `concept` they belong to, spelled exactly as the tutorial JSON spells it:
 * node names, not display names (`TextLiteral`, not Text).
 */
export type ThemeName =
    | 'Act1'
    | 'Act2'
    | 'Act3'
    | 'Act4'
    | 'Act5'
    | 'Act6'
    | 'Act7'
    | 'Act8'
    | 'Quick'
    | 'Silence'
    | 'Values'
    | 'Patterns'
    | 'Collections'
    | 'Detour'
    | 'Input'
    | 'Output'
    | 'Memories'
    | 'Codependency'
    | 'BinaryEvaluate'
    | 'Bind'
    | 'Block'
    | 'Boolean'
    | 'Button'
    | 'Chat'
    | 'Choice'
    | 'Conditional'
    | 'Convert'
    | 'Doc'
    | 'Evaluate'
    | 'ExpressionPlaceholder'
    | 'FunctionDefinition'
    | 'Group'
    | 'Key'
    | 'List'
    | 'Map'
    | 'Motion'
    | 'Music'
    | 'Number'
    | 'Phrase'
    | 'Placement'
    | 'Pointer'
    | 'Program'
    | 'Random'
    | 'Reaction'
    | 'Scene'
    | 'Sequence'
    | 'Set'
    | 'Stage'
    | 'StructureDefinition'
    | 'TextLiteral'
    | 'Time'
    | 'UnaryEvaluate'
    | 'UnparsableExpression'
    | 'Volume'
    | 'Webpage';

/**
 * The same names at runtime, for the coverage test. Declared separately from
 * the union above rather than derived from it because the JSON-schema
 * generator resolves an explicit union into an enum and an
 * `as const`-indexed type into nothing — and the enum is the whole point.
 * `Themes` is a `Record<ThemeName, …>`, so TypeScript keeps the two in step,
 * and `Themes.test.ts` checks this array against it.
 */
export const ThemeNames: readonly ThemeName[] = [
    // One per act, and one for the quick tutorial's single act.
    'Act1',
    'Act2',
    'Act3',
    'Act4',
    'Act5',
    'Act6',
    'Act7',
    'Act8',
    'Quick',
    'Silence',
    'Values',
    'Patterns',
    'Collections',
    'Detour',
    'Input',
    'Output',
    'Memories',
    'Codependency',
    // One per concept a scene teaches.
    'BinaryEvaluate',
    'Bind',
    'Block',
    'Boolean',
    'Button',
    'Chat',
    'Choice',
    'Conditional',
    'Convert',
    'Doc',
    'Evaluate',
    'ExpressionPlaceholder',
    'FunctionDefinition',
    'Group',
    'Key',
    'List',
    'Map',
    'Motion',
    'Music',
    'Number',
    'Phrase',
    'Placement',
    'Pointer',
    'Program',
    'Random',
    'Reaction',
    'Scene',
    'Sequence',
    'Set',
    'Stage',
    'StructureDefinition',
    'TextLiteral',
    'Time',
    'UnaryEvaluate',
    'UnparsableExpression',
    'Volume',
    'Webpage',
];
