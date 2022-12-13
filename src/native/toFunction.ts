import FunctionDefinition from "../nodes/FunctionDefinition";
import { parseFunction, toTokens } from "../parser/Parser";

export default function toFunction(wordplay: string): FunctionDefinition {
    const fun = parseFunction(toTokens(wordplay));
    if(fun instanceof FunctionDefinition) return fun;
    throw Error(`Couldn't parse function: ${fun.toWordplay()}`);
}