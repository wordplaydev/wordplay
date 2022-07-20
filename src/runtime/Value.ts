export default abstract class Value {

    constructor() {}

    abstract toString(): string;

    isEqualTo(value: Value): boolean {
        return this.toString() === value.toString();
    }

}