import type Project from "../models/Project";

export function getPossibleLanguages(project: Project): string[] {
    // Convert the project's sources into a list of languages, then get unique ones by converting to a set, then back to a list,
    // then map all of those to language nodes.
    return Array.from(new Set(
            project
            .getSources()
            .reduce((languages: string[], source) => [ ... languages, ... source.expression.getLanguagesUsed() ], [])
        ));
}