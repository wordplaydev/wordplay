export default class ConceptLink {
    readonly concept: string;

    constructor(concept: string) {
        this.concept = concept;
    }

    getDescription() {
        return this.concept.toString();
    }
}
