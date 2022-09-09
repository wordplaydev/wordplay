import type Alias from "./Alias";
import type Bind from "./Bind";
import type Docs from "./Docs";
import type Language from "./Language";
import TypeVariable from "./TypeVariable";
import type Unparsable from "./Unparsable";

export function getDuplicateDocs(docs: Docs[]): Map<string, Language[]> {
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
    return duplicatesByLanguage;
}

export function getDuplicateAliases(aliases: Alias[]): Map<string,Alias[]> {
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
    return duplicatesByName;
}

export function typeVarsAreUnique(vars: (TypeVariable|Unparsable)[]): Map<string, TypeVariable[]> {
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
    return duplicatesByName;
}

export function requiredBindAfterOptional(binds: Bind[]): Bind | undefined {

    let foundOptional = false;
    let requiredAfterOptional: Bind | undefined = undefined;
    binds.forEach(bind => {
        if(bind.value !== undefined) foundOptional = true;
        else if(bind.value === undefined && foundOptional && requiredAfterOptional === undefined)
            requiredAfterOptional = bind;
    })
    return requiredAfterOptional;

}