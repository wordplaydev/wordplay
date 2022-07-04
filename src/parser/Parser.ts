import Program from "./Program";

export function tokenize(source: string): string[] {

    return source.split("");

}

export function parse(source: string): Program {

    return new Program();

}