import type Bind from "../nodes/Bind";
import type Stream from "../runtime/Stream";
import type FunctionDefinition from "./FunctionDefinition";
import type Program from "./Program";
import type StructureDefinition from "./StructureDefinition";
import type TypeVariable from "./TypeVariable";

type Definition = Bind | TypeVariable | StructureDefinition | FunctionDefinition | Stream | Program;

export default Definition;
