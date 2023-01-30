import MeasurementType from '@nodes/MeasurementType';
import StreamType from '@nodes/StreamType';
import Unit from '@nodes/Unit';
import type Evaluator from '@runtime/Evaluator';
import Measurement from '@runtime/Measurement';
import Stream from '@runtime/Stream';
import type Node from '@nodes/Node';
import { getDocTranslations } from '@translation/getDocTranslations';
import { getNameTranslations } from '@translation/getNameTranslations';

const DEFAULT_FREQUENCY = 33;

export default class Time extends Stream<Measurement> {
    running = false;
    firstTime: number | undefined = undefined;
    frequency: number = 33;

    constructor(evaluator: Evaluator, frequency: number = DEFAULT_FREQUENCY) {
        super(
            evaluator,
            new Measurement(evaluator.getMain(), 0, Unit.unit(['ms']))
        );
        this.frequency = frequency;
    }

    computeDocs() {
        return getDocTranslations((t) => t.input.time.doc);
    }

    computeNames() {
        return getNameTranslations((t) => t.input.time.name);
    }

    start() {
        if (this.running) return;
        this.running = true;
        if (typeof window !== 'undefined')
            window.requestAnimationFrame((time) => this.tick(time));
    }

    setFrequency(frequency: number | undefined) {
        this.frequency = frequency ?? DEFAULT_FREQUENCY;
    }

    tick(time: DOMHighResTimeStamp) {
        if (this.firstTime === undefined) this.firstTime = time;

        const elapsed = Math.round(time - this.firstTime);

        // If the elapsed time is greater than or equal to the desired frequency, add an event.
        if (elapsed - this.latest().toNumber() >= this.frequency) {
            this.add(
                Time.make(
                    this.creator,
                    this.firstTime === undefined ? 0 : elapsed
                )
            );
        }

        // If still running, check again in the next animation frame.
        if (this.running)
            window.requestAnimationFrame((time) => this.tick(time));
    }

    static make(creator: Node, time: number) {
        return new Measurement(creator, time, Unit.unit(['ms']));
    }

    stop() {
        this.running = false;
    }

    getType() {
        return StreamType.make(MeasurementType.make(Unit.unit(['ms'])));
    }
}
