import Program from "./Program";

export function tokenize(source: string): string[] {

    return source.split("");

}

export function parse(tokens: string[]): Program {

    return new Program(tokens.map(t => t.toUpperCase()).join(""));

}