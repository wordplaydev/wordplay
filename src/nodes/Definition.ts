import type Bind from "../nodes/Bind";
import type Value from "../runtime/Value";
import type Expression from "./Expression";
import type TypeVariable from "./TypeVariable";

type Definition = Bind | TypeVariable | Expression | Value | undefined;

export default Definition;
