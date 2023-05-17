/** The tutorial for learning the programming language. */
import type Locale from '../locale/Locale';
import type Unit from './Unit';

/**
 * Tutorial design principles:
 * - Offer interesting interactive examples early and often
 * - Show a full example to be read before asking for writing
 * - Minimize syntactic concepts used
 * - When explaining a concept, explain syntax, then semantics
 * - All tutorial text is written from the perspective of ƒ
 */
export function getTutorial(translation: Locale): Unit[] {
    return [
        // WELCOME - Overview of key concepts of Wordplay programs
        {
            id: 'welcome',
            sources: [
                "Phrase('👋🏻' rest: Sequence({0%: Pose(tilt: -5°) 50%: Pose(tilt: 5°) 100%: Pose(tilt: -5°)} duration: 1s))",
            ],
            lessons: [
                // What programs are, how they are evaluated?
                {
                    concept: translation.node.Program,
                    scenes: [
                        {
                            sources: ['"$1"'],
                        },
                    ],
                },
                // What are placeholders for? How they can be used to construct incomplete programs, and to support drag and drop?
                {
                    concept: translation.node.ExpressionPlaceholder,
                    scenes: [
                        {
                            sources: ['_'],
                        },
                    ],
                },
                // What is parsing? What happens when it goes wrong? How can errors be fixed?
                {
                    concept: translation.node.UnparsableExpression,
                    scenes: [
                        {
                            sources: [''],
                        },
                    ],
                },
                // What are evaluations? And examples of them using a phrase.
                {
                    concept: translation.node.Evaluate,
                    scenes: [
                        {
                            sources: [''],
                        },
                    ],
                },
            ],
        },
        // Overview of primitive values and their functions
        {
            id: 'values',
            sources: ['1'],
            lessons: [
                // Text and things to do with it
                {
                    concept: translation.node.TextLiteral,
                    scenes: [
                        {
                            sources: [''],
                        },
                    ],
                },
                // Numbers and units and what to do with them
                {
                    concept: translation.node.MeasurementLiteral,
                    scenes: [
                        {
                            sources: [''],
                        },
                    ],
                },
                // Booleans and things to do with them
                {
                    concept: translation.node.BooleanLiteral,
                    scenes: [
                        {
                            sources: [''],
                        },
                    ],
                },
                // Nothing and what it's useful for
                {
                    concept: translation.node.NoneLiteral,
                    scenes: [
                        {
                            sources: [''],
                        },
                    ],
                },
                // Ways of converting values to other types
                {
                    concept: translation.node.Convert,
                    scenes: [
                        {
                            sources: [''],
                        },
                    ],
                },
                {
                    // Ways to construct text out of other text values
                    concept: translation.node.Template,
                    scenes: [
                        {
                            sources: [''],
                        },
                    ],
                },
            ],
        },
        {
            id: 'input',
            sources: [''],
            lessons: [
                {
                    concept: translation.node.Conditional,
                    scenes: [{ sources: [''] }],
                },
                {
                    concept: translation.input.random,
                    scenes: [{ sources: [''] }],
                },
                {
                    concept: translation.input.time,
                    scenes: [{ sources: [''] }],
                },
                {
                    concept: translation.input.key,
                    scenes: [{ sources: [''] }],
                },
                {
                    concept: translation.node.Reaction,
                    scenes: [{ sources: [''] }],
                },
                {
                    concept: translation.input.button,
                    scenes: [{ sources: [''] }],
                },
                {
                    concept: translation.input.choice,
                    scenes: [{ sources: [''] }],
                },
                // Changed
                // Initial
                // Previous
            ],
        },
        {
            id: 'collections',
            sources: [''],
            lessons: [
                {
                    concept: translation.node.ListLiteral,
                    scenes: [{ sources: [''] }],
                },
                {
                    concept: translation.node.ListAccess,
                    scenes: [{ sources: [''] }],
                },
                {
                    concept: translation.node.SetLiteral,
                    scenes: [{ sources: [''] }],
                },
                {
                    concept: translation.node.SetOrMapAccess,
                    scenes: [{ sources: [''] }],
                },
                {
                    concept: translation.node.MapLiteral,
                    scenes: [{ sources: [''] }],
                },
                // Add tables once implemented.
                // TableLiteral
                // Row
                // Delete
                // Insert
                // Update
                // Select
            ],
        },
        // NAMES - What are they for, why
        {
            id: 'names',
            sources: [''],
            lessons: [
                // Why not "variable", what they're used for
                {
                    concept: translation.node.Bind,
                    scenes: [{ sources: [''] }],
                },
                // How to tag something with languages
                {
                    concept: translation.node.Language,
                    scenes: [{ sources: [''] }],
                },
                // How to refer to them by different names
                {
                    concept: translation.node.Reference,
                    scenes: [{ sources: [''] }],
                },
                // How to temporarily name values to compute complicated things
                {
                    concept: translation.node.Block,
                    scenes: [{ sources: [''] }],
                },
            ],
        },
        // OUTPUT - How to render more than values
        {
            id: 'output',
            sources: [''],
            lessons: [
                // How to render and animate text
                {
                    concept: translation.output.phrase,
                    scenes: [{ sources: [''] }],
                },
                // How to animate sequences
                {
                    concept: translation.output.sequence,
                    scenes: [{ sources: [''] }],
                },
                // How to group multiple phrases together in a layout
                {
                    concept: translation.output.group,
                    scenes: [{ sources: [''] }],
                },
                // How to control the camera and frame
                {
                    concept: translation.output.verse,
                    scenes: [{ sources: [''] }],
                },
            ],
        },
        // FUNCTIONS - What they're for (reuse), when to create them
        {
            id: 'functions',
            sources: [''],
            lessons: [
                // Reusing code
                {
                    concept: translation.node.FunctionDefinition,
                    scenes: [{ sources: [''] }],
                },
                // Special format for functions on values with one input
                {
                    concept: translation.node.BinaryOperation,
                    scenes: [{ sources: [''] }],
                },
                // Special format for functions with no inputs
                {
                    concept: translation.node.UnaryOperation,
                    scenes: [{ sources: [''] }],
                },
                // Borrowing other people's code
                {
                    concept: translation.node.Borrow,
                    scenes: [{ sources: [''] }],
                },
                // Reusing code from other source files
                {
                    concept: translation.node.Borrow,
                    scenes: [{ sources: [''] }],
                },
            ],
        },
        // STRUCTURES - What they're for (composite data), when to create them
        {
            id: 'structures',
            sources: [''],
            lessons: [
                {
                    concept: translation.node.StructureDefinition,
                    scenes: [{ sources: [''] }],
                },
                {
                    concept: translation.node.PropertyReference,
                    scenes: [{ sources: [''] }],
                },
                {
                    concept: translation.node.PropertyBind,
                    scenes: [{ sources: [''] }],
                },
            ],
        },
        // TYPES
        {
            id: 'types',
            sources: [''],
            lessons: [
                {
                    concept: translation.node.TextType,
                    scenes: [{ sources: [''] }],
                },
                {
                    concept: translation.node.MeasurementType,
                    scenes: [{ sources: [''] }],
                },
                {
                    concept: translation.node.BooleanType,
                    scenes: [{ sources: [''] }],
                },
                {
                    concept: translation.node.NoneType,
                    scenes: [{ sources: [''] }],
                },
                {
                    concept: translation.node.ListType,
                    scenes: [{ sources: [''] }],
                },
                {
                    concept: translation.node.SetType,
                    scenes: [{ sources: [''] }],
                },
                {
                    concept: translation.node.MapType,
                    scenes: [{ sources: [''] }],
                },
                // {
                //     concept: translation.node.TableType,
                //     scenes: [{ sources: [''] }],
                // },
                {
                    concept: translation.node.NameType,
                    scenes: [{ sources: [''] }],
                },
                {
                    concept: translation.node.UnionType,
                    scenes: [{ sources: [''] }],
                },
                {
                    concept: translation.node.AnyType,
                    scenes: [{ sources: [''] }],
                },
                {
                    concept: translation.node.NeverType,
                    scenes: [{ sources: [''] }],
                },
                {
                    concept: translation.node.TypeVariable,
                    scenes: [{ sources: [''] }],
                },
                {
                    concept: translation.node.Is,
                    scenes: [{ sources: [''] }],
                },
            ],
        },
        {
            id: 'docs',
            sources: [''],
            lessons: [
                {
                    concept: translation.node.Doc,
                    scenes: [{ sources: [''] }],
                },
                {
                    concept: translation.node.Paragraph,
                    scenes: [{ sources: [''] }],
                },
                {
                    concept: translation.node.WebLink,
                    scenes: [{ sources: [''] }],
                },
                {
                    concept: translation.node.ConceptLink,
                    scenes: [{ sources: [''] }],
                },
                {
                    concept: translation.node.Example,
                    scenes: [{ sources: [''] }],
                },
            ],
        },
    ];
}
