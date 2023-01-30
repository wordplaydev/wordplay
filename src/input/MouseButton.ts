import BooleanType from '@nodes/BooleanType';
import StreamType from '@nodes/StreamType';
import Bool from '@runtime/Bool';
import type Evaluator from '@runtime/Evaluator';
import Stream from '@runtime/Stream';
import { getDocTranslations } from '@translation/getDocTranslations';
import { getNameTranslations } from '@translation/getNameTranslations';

export default class MouseButton extends Stream<Bool> {
    on: boolean = false;
    down: boolean | undefined;

    constructor(evaluator: Evaluator, down: boolean | undefined) {
        super(evaluator, new Bool(evaluator.getMain(), true));

        this.down = down;
    }

    setDown(down: boolean | undefined) {
        this.down = down;
    }

    computeDocs() {
        return getDocTranslations((t) => t.input.mousebutton.doc);
    }

    computeNames() {
        return getNameTranslations((t) => t.input.mousebutton.name);
    }

    record(down: boolean) {
        if (this.on && (this.down === undefined || this.down === down))
            this.add(new Bool(this.creator, down));
    }

    start() {
        this.on = true;
    }
    stop() {
        this.on = false;
    }

    getType() {
        return StreamType.make(BooleanType.make());
    }
}
