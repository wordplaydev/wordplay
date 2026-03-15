import { createInputs } from '@locale/createInputs';
import type Evaluation from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import BoolValue from '@values/BoolValue';
import SingletonStreamValue from '@values/SingletonStreamValue';
import { getDocLocales } from '../locale/getDocLocales';
import { getNameLocales } from '../locale/getNameLocales';
import type Locales from '../locale/Locales';
import { getFirstText } from '../locale/LocaleText';
import BooleanLiteral from '../nodes/BooleanLiteral';
import BooleanType from '../nodes/BooleanType';
import type Context from '../nodes/Context';
import Evaluate from '../nodes/Evaluate';
import NameType from '../nodes/NameType';
import NumberLiteral from '../nodes/NumberLiteral';
import NumberType from '../nodes/NumberType';
import Reference from '../nodes/Reference';
import StreamDefinition from '../nodes/StreamDefinition';
import StreamType from '../nodes/StreamType';
import type StructureDefinition from '../nodes/StructureDefinition';
import StructureType from '../nodes/StructureType';
import TextType from '../nodes/TextType';
import type Type from '../nodes/Type';
import Unit from '../nodes/Unit';
import { createPlaceStructure } from '../output/Place';
import NumberValue from '../values/NumberValue';
import StructureValue from '../values/StructureValue';
import createStreamEvaluator from './createStreamEvaluator';

type Direction = -1 | 0 | 1;
export type PlacementEvent = { x: Direction; y: Direction; z: Direction };

export default class Placement extends SingletonStreamValue<
    StructureValue,
    PlacementEvent
> {
    readonly evaluator: Evaluator;

    on = false;

    x: number;
    y: number;
    z: number;
    distance: number;
    horizontal: boolean;
    vertical: boolean;
    depth: boolean;

    constructor(
        evaluation: Evaluation,
        start: StructureValue,
        distance: number,
        horizontal: boolean,
        vertical: boolean,
        depth: boolean,
    ) {
        super(
            evaluation,
            evaluation.getEvaluator().project.shares.input.Placement,
            start,
            { x: 0, y: 0, z: 0 },
        );

        this.evaluator = evaluation.getEvaluator();
        this.x = start.getNumber(0) ?? 0;
        this.y = start.getNumber(1) ?? 0;
        this.z = start.getNumber(2) ?? 0;
        this.distance = distance;
        this.horizontal = horizontal;
        this.vertical = vertical;
        this.depth = depth;
    }

    configure(
        distance: number,
        horizontal: boolean,
        vertical: boolean,
        depth: boolean,
    ) {
        this.distance = distance;
        this.horizontal = horizontal;
        this.vertical = vertical;
        this.depth = depth;
    }

    react(event: PlacementEvent) {
        // Transform the current position based on the requested movement.

        this.x += (this.horizontal ? 1 : 0) * event.x * this.distance;
        this.y += (this.vertical ? 1 : 0) * event.y * this.distance;
        this.z += (this.depth ? 1 : 0) * event.z * this.distance;

        this.add(
            createPlaceStructure(this.evaluator, this.x, this.y, this.z),
            event,
        );
    }

    start() {
        this.on = true;
    }
    stop() {
        this.on = false;
    }

    getType(context: Context): Type {
        return StreamType.make(
            NameType.make(
                context.project.shares.output.Place.names.getNames()[0],
            ),
        );
    }
}

export function createPlacementDefinition(
    locales: Locales,
    placeType: StructureDefinition,
) {
    const PlaceName = locales.get((l) => getFirstText(l.output.Place.names));
    const inputs = createInputs(locales, (l) => l.input.Placement.inputs, [
        [
            NameType.make(PlaceName),
            Evaluate.make(Reference.make(PlaceName), [
                NumberLiteral.make(0, Unit.meters()),
                NumberLiteral.make(0, Unit.meters()),
                NumberLiteral.make(0, Unit.meters()),
            ]),
        ],
        [NumberType.make(Unit.meters()), NumberLiteral.make(1, Unit.meters())],
        [BooleanType.make(), BooleanLiteral.make(true)],
        [BooleanType.make(), BooleanLiteral.make(true)],
        [BooleanType.make(), BooleanLiteral.make(false)],
    ]);

    return StreamDefinition.make(
        getDocLocales(locales, (locale) => locale.input.Placement.doc),
        getNameLocales(locales, (locale) => locale.input.Placement.names),
        inputs,
        createStreamEvaluator(
            TextType.make(),
            Placement,
            (evaluation) =>
                new Placement(
                    evaluation,
                    evaluation.get(inputs[0].names, StructureValue) ??
                        createPlaceStructure(
                            evaluation.getEvaluator(),
                            0,
                            0,
                            0,
                        ),
                    evaluation.get(inputs[1].names, NumberValue)?.toNumber() ??
                        1,
                    evaluation.get(inputs[2].names, BoolValue)?.bool ?? true,
                    evaluation.get(inputs[3].names, BoolValue)?.bool ?? true,
                    evaluation.get(inputs[4].names, BoolValue)?.bool ?? false,
                ),
            (stream, evaluation) =>
                stream.configure(
                    evaluation.get(inputs[1].names, NumberValue)?.toNumber() ??
                        1,
                    evaluation.get(inputs[2].names, BoolValue)?.bool ?? true,
                    evaluation.get(inputs[3].names, BoolValue)?.bool ?? true,
                    evaluation.get(inputs[4].names, BoolValue)?.bool ?? false,
                ),
        ),
        new StructureType(placeType),
    );
}
