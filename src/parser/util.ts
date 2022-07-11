import Bind from "./Bind";
import type Docs from "./Docs";
import TypeVariable from "./TypeVariable";
import type Unparsable from "./Unparsable";

export function docsAreUnique(docs: Docs[]): boolean {
    return docs.every(d1 => docs.find(d2 => d1 !== d2 && d1.lang?.text === d2.lang?.text) === undefined);
}

export function inputsAreUnique(inputs: (Bind | Unparsable)[]): boolean {
    // Inputs must have unique names
    const inputNames = inputs.reduce((previous: string[], current) => previous.concat(current instanceof Bind ? current.getNames() : []), []);
    return inputNames.every((d1, i1) => inputNames.find((d2, i2) => i1 !== i2 && d1 === d2) === undefined);
}

export function typeVarsAreUnique(vars: (TypeVariable|Unparsable)[]): boolean {
    const parsedVars = vars.filter(v => v instanceof TypeVariable) as TypeVariable[];
    return parsedVars.every(v1 => parsedVars.find(v2 => v1 !== v2 && v1.name.text === v2.name.text) === undefined);
}