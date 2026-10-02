import type Bind from '#nodes/Bind.ts';
import type FunctionDefinition from '#nodes/FunctionDefinition.ts';
import type Source from '#nodes/Source.ts';
import type StreamDefinition from '#nodes/StreamDefinition.ts';
import type StructureDefinition from '#nodes/StructureDefinition.ts';
import type TypeVariable from '#nodes/TypeVariable.ts';

type Definition =
    | Bind
    | TypeVariable
    | StructureDefinition
    | FunctionDefinition
    | StreamDefinition
    | Source;

export { type Definition as default };
