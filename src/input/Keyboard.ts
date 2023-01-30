import Bool from '@runtime/Bool';
import Text from '@runtime/Text';
import Stream from '@runtime/Stream';
import Key from './Key';
import Structure, { createStructure } from '@runtime/Structure';
import StructureDefinitionType from '@nodes/StructureDefinitionType';
import StreamType from '@nodes/StreamType';
import type Value from '@runtime/Value';
import type Names from '@nodes/Names';
import type Evaluator from '@runtime/Evaluator';
import { getDocTranslations } from '@translation/getDocTranslations';
import { getNameTranslations } from '@translation/getNameTranslations';

export default class Keyboard extends Stream<Structure> {
    readonly evaluator: Evaluator;
    on: boolean = false;

    key: string | undefined;
    down: boolean | undefined;

    constructor(evaluator: Evaluator, key: string | undefined, down: boolean) {
        super(evaluator, Keyboard.create(evaluator, '', false));

        this.evaluator = evaluator;
        this.key = key;
        this.down = down;
    }

    configure(key: string | undefined, down: boolean | undefined) {
        this.key = key;
        this.down = down;
    }

    computeDocs() {
        return getDocTranslations((t) => t.input.keyboard.doc);
    }

    computeNames() {
        return getNameTranslations((t) => t.input.keyboard.name);
    }

    record(key: string, down: boolean) {
        // Only add the event if it mateches the requirements.
        if (
            this.on &&
            (this.key === undefined || this.key === key) &&
            (this.down === undefined || this.down === down)
        )
            this.add(Keyboard.create(this.evaluator, key, down));
    }

    static create(evaluator: Evaluator, key: string, down: boolean) {
        const bindings = new Map<Names, Value>();
        bindings.set(Key.inputs[0].names, new Text(evaluator.getMain(), key));
        bindings.set(Key.inputs[1].names, new Bool(evaluator.getMain(), down));
        return createStructure(evaluator, Key, bindings);
    }

    start() {
        this.on = true;
    }
    stop() {
        this.on = false;
    }

    getType() {
        return StreamType.make(new StructureDefinitionType(Key, []));
    }
}
