export default class OutputPropertyRange {
    readonly min: number;
    readonly max: number;
    readonly step: number;
    readonly unit: string;
    constructor(min: number, max: number, step: number, unit: string) {
        this.min = min;
        this.max = max;
        this.step = step;
        this.unit = unit;
    }
}
