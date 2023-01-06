import type NodeLink from './NodeLink';
import type ValueLink from './ValueLink';

type Part = string | NodeLink | ValueLink;

export default class LinkedDescription {
    readonly parts: Part[];

    constructor(parts: Part[]) {
        this.parts = parts;
    }

    static with(...parts: Part[]) {
        return new LinkedDescription(parts);
    }
}
