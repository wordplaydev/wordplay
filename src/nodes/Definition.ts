import type Source from './Source';
import type Bind from '../nodes/Bind';
import type Stream from '../runtime/Stream';
import type FunctionDefinition from './FunctionDefinition';
import type StructureDefinition from './StructureDefinition';
import type TypeVariable from './TypeVariable';

type Definition =
    | Bind
    | TypeVariable
    | StructureDefinition
    | FunctionDefinition
    | Stream
    | Source;

export default Definition;
