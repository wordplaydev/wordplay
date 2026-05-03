import type Bind from '@nodes/Bind';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import type Source from '@nodes/Source';
import type StreamDefinition from '@nodes/StreamDefinition';
import type StructureDefinition from '@nodes/StructureDefinition';
import type TypeVariable from '@nodes/TypeVariable';

type Definition =
    | Bind
    | TypeVariable
    | StructureDefinition
    | FunctionDefinition
    | StreamDefinition
    | Source;

export { type Definition as default };
