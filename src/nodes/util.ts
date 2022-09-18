import CaseSensitive from "../conflicts/CaseSensitive";
import DuplicateAliases from "../conflicts/DuplicateAliases";
import DuplicateLanguages from "../conflicts/DuplicateLanguages";
import DuplicateTypeVariables from "../conflicts/DuplicateTypeVariables";
import RequiredAfterOptional from "../conflicts/RequiredAfterOptional";
import VariableLengthArgumentMustBeLast from "../conflicts/VariableLengthArgumentMustBeLast";
import type Alias from "./Alias";
import Bind from "./Bind";
import type Context from "./Context";
import type Documentation from "./Documentation";
import type Language from "./Language";
import TypeVariable from "./TypeVariable";
import type Unparsable from "./Unparsable";
import type Node from "./Node";
import type Name from "./Name";

export function getDuplicateDocs(docs: Documentation[]): DuplicateLanguages | undefined {
    const duplicatesByLanguage = new Map<string, Language[]>();
    docs.forEach(doc => { 
        const language = doc.getLanguage();
        if(language !== undefined && doc.lang !== undefined) {
            let duplicates = duplicatesByLanguage.get(language);
            if(duplicates === undefined) { duplicates = []; duplicatesByLanguage.set(language, duplicates); }
            duplicates.push(doc.lang);
        }
    });
    duplicatesByLanguage.forEach((dupes, language) => {
        if(dupes.length === 1)
            duplicatesByLanguage.delete(language);
    });

    return duplicatesByLanguage.size > 0 ? new DuplicateLanguages(docs, duplicatesByLanguage) : undefined;

}

export function getDuplicateAliases(aliases: Alias[]): DuplicateAliases | undefined {
    const duplicatesByName = new Map<string, Alias[]>();
    aliases.forEach(alias => { 
        const name = alias.getName();
        if(name !== undefined) {
            let duplicates = duplicatesByName.get(name);
            if(duplicates === undefined) { duplicates = []; duplicatesByName.set(name, duplicates); }
            duplicates.push(alias);
        }
    });
    duplicatesByName.forEach((dupes, language) => {
        if(dupes.length === 1)
            duplicatesByName.delete(language);
    });
    return duplicatesByName.size > 0 ? new DuplicateAliases(duplicatesByName) : undefined;
}

export function typeVarsAreUnique(vars: (TypeVariable|Unparsable)[]): DuplicateTypeVariables | undefined {
    const typeVars = vars.filter(v => v instanceof TypeVariable) as TypeVariable[];
    const duplicatesByName = new Map<string, TypeVariable[]>();
    typeVars.forEach(variable => { 
        const language = variable.name.getText();
        if(language !== undefined && variable.name !== undefined) {
            let duplicates = duplicatesByName.get(language);
            if(duplicates === undefined) { duplicates = []; duplicatesByName.set(language, duplicates); }
            duplicates.push(variable);
        }
    });
    duplicatesByName.forEach((dupes, language) => {
        if(dupes.length === 1)
            duplicatesByName.delete(language);
    });

    return duplicatesByName.size > 0 ? new DuplicateTypeVariables(duplicatesByName) : undefined;

}

export function requiredBindAfterOptional(inputs: (Bind|Unparsable)[]): RequiredAfterOptional | undefined {

    const binds = inputs.filter(i => i instanceof Bind) as Bind[];
    let foundOptional = false;
    let requiredAfterOptional: Bind | undefined = undefined;
    binds.forEach(bind => {
        if(bind.value !== undefined) foundOptional = true;
        else if(bind.value === undefined && foundOptional && requiredAfterOptional === undefined)
            requiredAfterOptional = bind;
    })

    return inputs.length === binds.length && requiredAfterOptional !== undefined ?
        new RequiredAfterOptional(requiredAfterOptional) :
        undefined;

}

export function restIsNotLast(inputs: (Bind|Unparsable)[]) {

    const rest = inputs.find(i => i instanceof Bind && i.isVariableLength()) as Bind | undefined;
    return rest !== undefined && inputs.indexOf(rest) !== inputs.length - 1 ?
        new VariableLengthArgumentMustBeLast(rest) : undefined;

}

export function getEvaluationInputConflicts(inputs: (Bind|Unparsable)[]) {

    const conflicts = [];

    // Structure input names must be unique
    const duplicateInputs = getDuplicateAliases(inputs.map(i => i instanceof Bind ? i.names : []).flat());
    if(duplicateInputs) conflicts.push(duplicateInputs);
    
    // Required inputs can never follow an optional one.
    const requiredAfterOptional = requiredBindAfterOptional(inputs);
    if(requiredAfterOptional) conflicts.push(requiredAfterOptional);

    // Rest arguments must be last
    const restIsntLast = restIsNotLast(inputs);
    if(restIsntLast) conflicts.push(restIsntLast);
    
    return conflicts;

}

export function getCaseCollision(name: string, enclosure: Node | undefined, context: Context, node: Name | Alias): CaseSensitive | undefined {

    if(enclosure === undefined) return;

    const upper = name.toLocaleUpperCase();
    const lower = name.toLocaleLowerCase();
    const otherCase = upper === lower ? undefined : name === upper ? lower : upper;

    if(otherCase === undefined) return;

    const otherBind = enclosure.getDefinition(otherCase, context, node);
    if(otherBind instanceof Bind) {
        const alias = otherBind.names.find(n => n.getName() === otherCase);
        if(alias !== undefined)
            return new CaseSensitive(node, alias);
    }

}