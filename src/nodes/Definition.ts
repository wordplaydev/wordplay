import type Source from './Source';
import type Bind from '@nodes/Bind';
import type FunctionDefinition from './FunctionDefinition';
import type StructureDefinition from './StructureDefinition';
import type TypeVariable from './TypeVariable';
import type StreamDefinition from './StreamDefinition';

type Definition =
    | Bind
    | TypeVariable
    | StructureDefinition
    | FunctionDefinition
    | StreamDefinition
    | Source;

export { type Definition as default };
