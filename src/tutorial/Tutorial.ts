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
                // // What programs are, how they are evaluated?
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
                // What are evaluations? , and examples of them using a phrase?
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
        {
            id: 'numbers',
            sources: ['1'],
            lessons: [
                {
                    concept: translation.node.MeasurementLiteral,
                    scenes: [
                        {
                            sources: [''],
                        },
                    ],
                },
            ],
        },
    ];
}

/*

SINGLE VALUES - Overview of data structures
TextLiteral, // Text and things to do with it
MeasurementLiteral, // Numbers and units and what to do with them
BooleanLiteral, // Booleans and things to do with them
NoneLiteral, // Nothing and what it's useful for
Convert, // Ways of converting values to other types
Template, // Ways to construct text out of other text values
BinaryOperation, // Special format for functions on values with one input
UnaryOperation, // Special format for functions with no inputs

MULTIPLE VALUES
ListLiteral
ListAccess
SetLiteral
MapLiteral
SetOrMapAccess
TableLiteral
Row
Delete
Insert
Update
Select

NAMES - What are they for, why
Bind, // Why not "variable", what they're used for
Language, // How to tag something with languages
Reference, // How to refer to them by different names
Block, // How to temporarily name values to compute complicated things

DECISIONS - Responding to change
Conditional
Random
Time
Keyboard
Button
Choice
Reaction
Changed
Initial
Previous

OUTPUT - How to render more than values
Phrase, // How to render and animate text
Sequence, // How to animate sequences
Group, // How to group multiple phrases together in a layout
Verse, // How to control the camera and frame

FUNCTIONS - What they're for (reuse), when to create them
FunctionDefinition

STRUCTURES - What they're for (composite data), when to create them
StructureDefinition
PropertyReference
PropertyBind

PROJECTS
Source
Borrow

DOCUMENTATION
Doc
Docs
DocumentedExpression
Words
Paragraph
WebLink
ConceptLink
Example

TYPES - What types are, how to use them to prevent defects
TextType
MeasurementType
BooleanType
NoneType
ListType
SetType
MapType
TableType
NameType
UnionType
AnyType
NeverType
FunctionType
StructureDefinitionType
TypeInputs
TypeVariable
StreamDefinitionType
Is

*/
