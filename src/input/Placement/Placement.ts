import { createInputs } from '@locale/createInputs';
import type Evaluation from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import BoolValue from '@values/BoolValue';
import SingletonStreamValue from '@values/SingletonStreamValue';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import type Locales from '@locale/Locales';
import BooleanLiteral from '@nodes/BooleanLiteral';
import BooleanType from '@nodes/BooleanType';
import type Context from '@nodes/Context';
import Evaluate from '@nodes/Evaluate';
import NameType from '@nodes/NameType';
import NumberLiteral from '@nodes/NumberLiteral';
import NumberType from '@nodes/NumberType';
import Reference from '@nodes/Reference';
import StreamDefinition from '@nodes/StreamDefinition';
import StreamType from '@nodes/StreamType';
import type StructureDefinition from '@nodes/StructureDefinition';
import StructureType from '@nodes/StructureType';
import TextType from '@nodes/TextType';
import type Type from '@nodes/Type';
import Unit from '@nodes/Unit';
import { createPlaceStructure } from '@output/Place/Place';
import NumberValue from '@values/NumberValue';
import StructureValue from '@values/StructureValue';
import createStreamEvaluator from '@input/createStreamEvaluator';
import type { StreamKind } from '@values/StreamValue';
import { first, must } from '@util/nullable';

type Direction = -1 | 0 | 1;
export type PlacementEvent = { x: Direction; y: Direction; z: Direction };

export default class Placement extends SingletonStreamValue<
    StructureValue,
    PlacementEvent
> {
    readonly kind: StreamKind = 'placement';

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
                // The basis always names its Place definition.
                must(
                    first(context.project.shares.output.Place.names.getNames()),
                    "the Place type's name",
                ),
            ),
        );
    }
}

export function createPlacementDefinition(
    locales: Locales,
    placeType: StructureDefinition,
) {
    // Take the name from the Place definition rather than from locale text: with several locales
    // chosen, locale text is joined for display ("📍 · Posición") and isn't a resolvable name.
    const PlaceName = locales.getName(placeType.names);
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

    // `createInputs` returns one bind per type, and five types are given above.
    const place = must(inputs[0], "Placement's place input");
    const distance = must(inputs[1], "Placement's distance input");
    const horizontal = must(inputs[2], "Placement's horizontal input");
    const vertical = must(inputs[3], "Placement's vertical input");
    const depth = must(inputs[4], "Placement's depth input");

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
                    evaluation.get(place.names, StructureValue) ??
                        createPlaceStructure(
                            evaluation.getEvaluator(),
                            0,
                            0,
                            0,
                        ),
                    evaluation.get(distance.names, NumberValue)?.toNumber() ??
                        1,
                    evaluation.get(horizontal.names, BoolValue)?.bool ?? true,
                    evaluation.get(vertical.names, BoolValue)?.bool ?? true,
                    evaluation.get(depth.names, BoolValue)?.bool ?? false,
                ),
            (stream, evaluation) =>
                stream.configure(
                    evaluation.get(distance.names, NumberValue)?.toNumber() ??
                        1,
                    evaluation.get(horizontal.names, BoolValue)?.bool ?? true,
                    evaluation.get(vertical.names, BoolValue)?.bool ?? true,
                    evaluation.get(depth.names, BoolValue)?.bool ?? false,
                ),
        ),
        new StructureType(placeType),
    );
}
