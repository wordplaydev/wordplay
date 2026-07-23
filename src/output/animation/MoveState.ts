export default class MoveState<Kind> {
    start: Kind;
    end: Kind;
    value: Kind;

    constructor(start: Kind, end: Kind) {
        this.start = start;
        this.end = end;
        this.value = start;
    }
}
