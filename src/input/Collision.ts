import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import Bind from '@nodes/Bind';
import NoneType from '@nodes/NoneType';
import StreamDefinition from '@nodes/StreamDefinition';
import StreamType from '@nodes/StreamType';
import UnionType from '@nodes/UnionType';
import type Evaluation from '@runtime/Evaluation';
import StreamValue from '@values/StreamValue';
import type Locales from '../locale/Locales';
import NoneLiteral from '../nodes/NoneLiteral';
import type StructureDefinition from '../nodes/StructureDefinition';
import TextType from '../nodes/TextType';
import type Type from '../nodes/Type';
import { createReboundStructure } from '../output/Rebound';
import { PX_PER_METER } from '../output/outputToCSS';
import NoneValue from '../values/NoneValue';
import type StructureValue from '../values/StructureValue';
import TextValue from '../values/TextValue';
import createStreamEvaluator from './createStreamEvaluator';

export type ReboundEvent =
    | {
          subject: string;
          object: string;
          direction: { x: number; y: number };
          /** True if the collision is start, false if it just ended. */
          starting: boolean;
      }
    | undefined;

export default class Collision extends StreamValue<
    StructureValue | NoneValue,
    ReboundEvent
> {
    subject: string | undefined;
    object: string | undefined;

    constructor(
        evaluation: Evaluation,
        subject: string | undefined,
        object: string | undefined,
    ) {
        super(
            evaluation,
            evaluation.getEvaluator().project.shares.input.Button,
            new NoneValue(evaluation.getCreator()),
            undefined,
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
            const direction = {
                x: ((swap ? -1 : 1) * rebound.direction.x) / PX_PER_METER,
                y: ((swap ? -1 : 1) * rebound.direction.y) / PX_PER_METER,
            };

            // If starting, add a collision
            if (rebound.starting)
                this.add(
                    createReboundStructure(
                        this.evaluator,
                        this.evaluator.project.shares.input.Collision,
                        subject,
                        object,
                        direction,
                    ),
                    rebound,
                );
            // If ending, immediately add none, after processing the collision.
            else this.add(new NoneValue(this.creator), undefined);
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
            this.evaluator.project.shares.output.Rebound.getTypeReference(),
        );
    }
}

export function createCollisionDefinition(
    locales: Locales,
    ReboundType: StructureDefinition,
) {
    const NameBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Collision.subject.doc),
        getNameLocales(
            locales,
            (locale) => locale.input.Collision.subject.names,
        ),
        UnionType.make(TextType.make(), NoneType.make()),
        // Default to none
        NoneLiteral.make(),
    );

    const OtherBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Collision.object.doc),
        getNameLocales(
            locales,
            (locale) => locale.input.Collision.object.names,
        ),
        UnionType.make(TextType.make(), NoneType.make()),
        // Default to none
        NoneLiteral.make(),
    );

    return StreamDefinition.make(
        getDocLocales(locales, (locale) => locale.input.Collision.doc),
        getNameLocales(locales, (locale) => locale.input.Collision.names),
        [NameBind, OtherBind],
        createStreamEvaluator(
            ReboundType.getTypeReference(),
            Collision,
            (evaluation) =>
                new Collision(
                    evaluation,
                    evaluation.get(NameBind.names, TextValue)?.text,
                    evaluation.get(OtherBind.names, TextValue)?.text,
                ),
            (stream, evaluation) =>
                stream.update(
                    evaluation.get(NameBind.names, TextValue)?.text,
                    evaluation.get(OtherBind.names, TextValue)?.text,
                ),
        ),
        UnionType.make(ReboundType.getTypeReference(), NoneType.make()),
    );
}
