export default class OutputPropertyRange {
    readonly min: number;
    readonly max: number;
    readonly step: number;
    readonly unit: string;
    readonly precision: number = 0;
    constructor(
        min: number,
        max: number,
        step: number,
        unit: string,
        precision = 0
    ) {
        this.min = min;
        this.max = max;
        this.step = step;
        this.unit = unit;
        this.precision = precision;
    }
}
