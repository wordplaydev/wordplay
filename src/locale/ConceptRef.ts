export default class ConceptRef {
    readonly concept: string;

    constructor(concept: string) {
        this.concept = concept;
    }

    getDescription() {
        return this.concept;
    }
}
