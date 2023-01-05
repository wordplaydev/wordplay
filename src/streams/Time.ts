import MeasurementType from '../nodes/MeasurementType';
import StreamType from '../nodes/StreamType';
import Unit from '../nodes/Unit';
import type Evaluator from '../runtime/Evaluator';
import Measurement from '../runtime/Measurement';
import Stream from '../runtime/Stream';
import type Node from '../nodes/Node';
import { getDocTranslations } from '../translations/getDocTranslations';
import { getNameTranslations } from '../translations/getNameTranslations';

export const FREQUENCY = 33;

export default class Time extends Stream<Measurement> {
    timerID: NodeJS.Timer | undefined;
    startTime: number | undefined;

    constructor(evaluator: Evaluator) {
        super(
            evaluator,
            new Measurement(evaluator.getMain(), 0, Unit.unit(['ms']))
        );
    }

    computeDocs() {
        return getDocTranslations((t) => t.input.time.doc);
    }

    computeNames() {
        return getNameTranslations((t) => t.input.time.name);
    }

    start() {
        if (this.timerID !== undefined) return;

        // Remmember when time starts so that we can start counting from program start.
        this.startTime = Date.now();

        this.timerID = setInterval(
            // Add a time measurement on each tick.
            () => this.tick(),
            // Tick every 33 milliseconds, trying to achieve a 30 fps frame rate.
            FREQUENCY
        );
    }

    tick() {
        this.add(
            Time.make(this.creator, Date.now() - (this.startTime as number))
        );
    }

    static make(creator: Node, time: number) {
        return new Measurement(creator, time, Unit.unit(['ms']));
    }

    stop() {
        // Stop the timer.
        if (this.timerID !== undefined) clearInterval(this.timerID);
    }

    getType() {
        return StreamType.make(MeasurementType.make(Unit.unit(['ms'])));
    }
}
