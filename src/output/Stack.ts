import toStructure from '../native/toStructure';
import type Translations from '../nodes/Translations';
import { TRANSLATE, WRITE_DOCS } from '../nodes/Translations';
import type Value from '../runtime/Value';
import type Color from './Color';
import Group, { type RenderContext } from './Group';
import { toGroups } from './toGroups';
import Place from './Place';
import Decimal from 'decimal.js';

export const StackType = toStructure(`
    •Stack/eng,⬇/😀 Group(
        phrases/eng,${TRANSLATE}phrases/😀…•Group
    )
`);

export class Stack extends Group {
    readonly groups: Group[] = [];
    readonly padding = new Decimal(1);

    constructor(value: Value, phrases: Group[]) {
        super(value);

        this.groups = phrases;
    }

    // Width is the max width
    getWidth(context: RenderContext): Decimal {
        return this.groups.reduce(
            (max, group) => Decimal.max(max, group.getWidth(context)),
            new Decimal(0)
        );
    }

    // Height is the sum of heights plus padding
    getHeight(context: RenderContext): Decimal {
        return this.groups
            .reduce(
                (height, group) => height.add(group.getHeight(context)),
                new Decimal(0)
            )
            .add(this.padding.times(this.groups.length - 1));
    }

    getGroups(): Group[] {
        return this.groups;
    }

    getPlaces(context: RenderContext): [Group, Place][] {
        // Start at half the height, so we can center everything.
        let position = new Decimal(0);

        // Get the width of the container so we can center each phrase.
        let width = this.getWidth(context);

        const positions: [Group, Place][] = [];
        for (const group of this.groups) {
            positions.push([
                group,
                new Place(
                    this.value,
                    width.sub(group.getWidth(context)).div(2),
                    position,
                    new Decimal(0)
                ),
            ]);
            position = position.add(group.getHeight(context));
            position = position.add(this.padding);
        }

        return positions;
    }

    getBackground(): Color | undefined {
        return undefined;
    }

    getDescriptions(): Translations {
        return WRITE_DOCS;
    }
}

export function toStack(value: Value | undefined): Stack | undefined {
    if (value === undefined) return undefined;
    const phrases = toGroups(
        value.resolve(StackType.inputs[0].names.getNames()[0])
    );
    return phrases ? new Stack(value, phrases) : undefined;
}
