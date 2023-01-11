import toStructure from '../native/toStructure';
import type Value from '../runtime/Value';
import type Color from './Color';
import Group, { type RenderContext } from './Group';
import { toGroups } from './toGroups';
import Place from './Place';
import Decimal from 'decimal.js';
import type LanguageCode from '../translation/LanguageCode';
import { getPreferredTranslation } from '../translation/getPreferredTranslation';
import { getBind } from '../translation/getBind';

export const RowType = toStructure(`
    ${getBind((t) => t.output.row.definition, '•')} Group(
        ${getBind((t) => t.output.row.phrases)}…•Group
    )
`);

export class Row extends Group {
    readonly groups: Group[] = [];
    readonly padding = new Decimal(1);

    constructor(value: Value, phrases: Group[]) {
        super(value);

        this.groups = phrases;
    }

    // Width is the sum of widths plus padding
    getWidth(context: RenderContext): Decimal {
        return this.groups
            .reduce(
                (height, group) => height.add(group.getWidth(context)),
                new Decimal(0)
            )
            .add(this.padding.times(this.groups.length - 1));
    }

    // Height is the max height
    getHeight(context: RenderContext): Decimal {
        return this.groups.reduce(
            (max, group) => Decimal.max(max, group.getHeight(context)),
            new Decimal(0)
        );
    }

    getGroups(): Group[] {
        return this.groups;
    }

    getPlaces(context: RenderContext): [Group, Place][] {
        // Start at half the height, so we can center everything.
        let position = new Decimal(0);

        // Get the height of the container so we can center each phrase vertically.
        let height = this.getHeight(context);

        const positions: [Group, Place][] = [];
        for (const group of this.groups) {
            positions.push([
                group,
                new Place(
                    this.value,
                    position,
                    height.sub(group.getHeight(context)).div(2),
                    new Decimal(0)
                ),
            ]);
            position = position.add(group.getWidth(context));
            position = position.add(this.padding);
        }

        return positions;
    }

    getBackground(): Color | undefined {
        return undefined;
    }

    getDescription(languages: LanguageCode[]) {
        return getPreferredTranslation(languages).output.row.description;
    }
}

export function toRow(value: Value | undefined): Row | undefined {
    if (value === undefined) return undefined;
    const phrases = toGroups(
        value.resolve(RowType.inputs[0].names.getNames()[0])
    );
    return phrases ? new Row(value, phrases) : undefined;
}
