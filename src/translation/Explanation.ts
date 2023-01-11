import type NodeLink from './NodeLink';
import type ValueLink from './ValueLink';

type Part = string | NodeLink | ValueLink;

export default class Explanation {
    readonly parts: Part[];

    constructor(parts: Part[]) {
        this.parts = parts;
    }

    static as(...parts: Part[]) {
        return new Explanation(parts);
    }
}
