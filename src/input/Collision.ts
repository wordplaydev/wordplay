import type Evaluator from '@runtime/Evaluator';
import StreamValue from '@values/StreamValue';
import StreamDefinition from '@nodes/StreamDefinition';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import Bind from '@nodes/Bind';
import UnionType from '@nodes/UnionType';
import NoneType from '@nodes/NoneType';
import StreamType from '@nodes/StreamType';
import createStreamEvaluator from './createStreamEvaluator';
import type Locale from '../locale/Locale';
import NoneLiteral from '../nodes/NoneLiteral';
import type StructureValue from '../values/StructureValue';
import TextType from '../nodes/TextType';
import type StructureDefinition from '../nodes/StructureDefinition';
import type Type from '../nodes/Type';
import NoneValue from '../values/NoneValue';
import TextValue from '../values/TextValue';
import { createReboundStructure } from '../output/Rebound';

export type ReboundEvent =
    | {
          subject: string;
          object: string;
          direction: {
              x: number;
              y: number;
          };
      }
    | undefined;

export default class Collision extends StreamValue<
    StructureValue | NoneValue,
    ReboundEvent
> {
    subject: string | undefined;
    object: string | undefined;

    constructor(
        evaluator: Evaluator,
        subject: string | undefined,
        object: string | undefined
    ) {
        super(
            evaluator,
            evaluator.project.shares.input.Button,
            new NoneValue(evaluator.getMain()),
            undefined
        );

        this.subject = subject;
        this.object = object;
    }

    update(subject: string | undefined, object: string | undefined) {
        this.subject = subject;
        this.object = object;
    }

    react(rebound: ReboundEvent) {
        // Does this rebound match the filter?
        if (rebound === undefined) {
            this.add(new NoneValue(this.creator), undefined);
        } else if (
            // Everything
            (this.subject === undefined && this.object === undefined) ||
            // A particular subject and anything
            (this.subject !== undefined &&
                this.object === undefined &&
                (this.subject === rebound.subject ||
                    this.subject === rebound.object)) ||
            // A particular object and any subject
            (this.subject === undefined &&
                this.object !== undefined &&
                (this.object === rebound.subject ||
                    this.object === rebound.object)) ||
            // A specific object and subject
            (this.subject !== undefined &&
                this.object !== undefined &&
                ((this.subject === rebound.subject &&
                    this.object === rebound.object) ||
                    (this.subject === rebound.object &&
                        this.object === rebound.subject)))
        ) {
            // Swap if the match is reversed
            const swap = this.subject === rebound.object;
            const subject = swap ? rebound.object : rebound.subject;
            const object = swap ? rebound.subject : rebound.object;
            const direction = swap
                ? { x: -rebound.direction.x, y: -rebound.direction.y }
                : rebound.direction;

            // Add a collision
            this.add(
                createReboundStructure(
                    this.evaluator,
                    this.evaluator.project.shares.input.Collision,
                    subject,
                    object,
                    direction
                ),
                rebound
            );

            // Then immediately add none, after processing the collision.
            this.add(new NoneValue(this.creator), undefined);
        }
    }

    start() {
        return;
    }
    stop() {
        return;
    }

    getType(): Type {
        return StreamType.make(
            this.evaluator.project.shares.output.Rebound.getReference()
        );
    }
}

export function createCollisionDefinition(
    locales: Locale[],
    ReboundType: StructureDefinition
) {
    const NameBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Collision.name.doc),
        getNameLocales(locales, (locale) => locale.input.Collision.name.names),
        UnionType.make(TextType.make(), NoneType.make()),
        // Default to none
        NoneLiteral.make()
    );

    const OtherBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Collision.other.doc),
        getNameLocales(locales, (locale) => locale.input.Collision.other.names),
        UnionType.make(TextType.make(), NoneType.make()),
        // Default to none
        NoneLiteral.make()
    );

    return StreamDefinition.make(
        getDocLocales(locales, (locale) => locale.input.Collision.doc),
        getNameLocales(locales, (locale) => locale.input.Collision.names),
        [NameBind, OtherBind],
        createStreamEvaluator(
            ReboundType.getReference(),
            Collision,
            (evaluation) =>
                new Collision(
                    evaluation.getEvaluator(),
                    evaluation.get(NameBind.names, TextValue)?.text,
                    evaluation.get(OtherBind.names, TextValue)?.text
                ),
            (stream, evaluation) =>
                stream.update(
                    evaluation.get(NameBind.names, TextValue)?.text,
                    evaluation.get(OtherBind.names, TextValue)?.text
                )
        ),
        UnionType.make(ReboundType.getReference(), NoneType.make())
    );
}
