import type Bind from '@nodes/Bind';
import type FunctionDefinition from './FunctionDefinition';
import type Source from './Source';
import type StreamDefinition from './StreamDefinition';
import type StructureDefinition from './StructureDefinition';
import type TypeVariable from './TypeVariable';

type Definition =
    | Bind
    | TypeVariable
    | StructureDefinition
    | FunctionDefinition
    | StreamDefinition
    | Source;

export { type Definition as default };
