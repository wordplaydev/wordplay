import Structure from '@runtime/Structure';
import type Value from '@runtime/Value';
import Group from './Group';
import type { RenderContext } from './RenderContext';
import Phrase, { toFont } from './Phrase';
import Fonts, { SupportedFontsType } from '../native/Fonts';
import Color from './Color';
import Place, { toPlace } from './Place';
import toStructure from '../native/toStructure';
import Measurement from '@runtime/Measurement';
import Decimal from 'decimal.js';
import { toGroup, toGroups } from './toGroups';
import { toColor } from './Color';
import List from '@runtime/List';
import type LanguageCode from '@translation/LanguageCode';
import { getPreferredTranslation } from '@translation/getPreferredTranslation';
import { getBind } from '@translation/getBind';

export const VerseType = toStructure(`
    ${getBind((t) => t.output.verse.definition, '•')} Group(
        ${getBind((t) => t.output.verse.groups)}•Group|[Group]
        ${getBind(
            (t) => t.output.verse.font
        )}•${SupportedFontsType}: "Noto Sans"
        ${getBind((t) => t.output.verse.foreground)}•Color: Color(0 0 0°)
        ${getBind((t) => t.output.verse.background)}•Color: Color(100 0 0°)
        ${getBind((t) => t.output.verse.focus)}•Place|ø: ø
        ${getBind((t) => t.output.verse.tilt)}•#°: 0°
    )
`);

export default class Verse extends Group {
    readonly groups: Group[];
    readonly font: string;
    readonly background: Color;
    readonly foreground: Color;
    readonly focus: Place | undefined;
    readonly tilt: Decimal;

    constructor(
        value: Value,
        groups: Group[],
        font: string,
        background: Color,
        foreground: Color,
        focus: Place | undefined,
        tilt: Decimal
    ) {
        super(value);

        this.groups = groups;
        this.font = font;
        this.background = background;
        this.foreground = foreground;
        this.focus = focus;
        this.tilt = tilt;

        Fonts.loadFamily(this.font);
    }

    getBounds(context: RenderContext) {
        const places = this.getPlaces(context);
        const left = Math.min.apply(
            Math,
            places.map(([, place]) => place.x.toNumber())
        );
        const right = Math.max.apply(
            Math,
            places.map(([group, place]) =>
                place.x.add(group.getWidth(context)).toNumber()
            )
        );
        const top = Math.min.apply(
            Math,
            places.map(([, place]) => place.y.toNumber())
        );
        const bottom = Math.max.apply(
            Math,
            places.map(([group, place]) =>
                place.y.add(group.getHeight(context)).toNumber()
            )
        );
        return {
            left,
            top,
            width: right - left,
            height: bottom - top,
        };
    }

    /** A verse's width is the difference between it's left and right extents. */
    getWidth(context: RenderContext): Decimal {
        return new Decimal(this.getBounds(context).width);
    }

    /** A verse's height is the difference between it's highest and lowest extents. */
    getHeight(context: RenderContext): Decimal {
        return new Decimal(this.getBounds(context).height);
    }

    getGroups(): Group[] {
        return this.groups;
    }

    /**
     * A Verse is a Group that lays out a list of phrases according to their specified places,
     * or if the phrases */
    getPlaces(context: RenderContext): [Group, Place][] {
        return this.groups.map((group) => [
            group,
            group instanceof Phrase && group.place
                ? group.place
                : new Place(
                      this.value,
                      group.getWidth(context).div(2).neg(),
                      group.getHeight(context).div(2).neg(),
                      new Decimal(0)
                  ),
        ]);
    }

    getBackground(): Color | undefined {
        return undefined;
    }

    getDescription(languages: LanguageCode[]) {
        return getPreferredTranslation(languages).output.verse.description;
    }
}

export function toVerse(value: Value): Verse | undefined {
    if (!(value instanceof Structure)) return undefined;

    if (value.type === VerseType) {
        const possibleGroups = value.resolve('groups');
        const group =
            possibleGroups instanceof List
                ? toGroups(possibleGroups)
                : toGroup(possibleGroups);
        const font = toFont(value.resolve('font'));
        const background = toColor(value.resolve('background'));
        const foreground = toColor(value.resolve('foreground'));
        const focus = toPlace(value.resolve('focus'));
        const tilt = toDecimal(value.resolve('tilt'));
        return group && font && background && foreground && tilt
            ? new Verse(
                  value,
                  Array.isArray(group) ? group : [group],
                  font,
                  background,
                  foreground,
                  focus,
                  tilt
              )
            : undefined;
    }
    // Try converting it to a group and wrapping it in a Verse.
    else {
        const group = toGroup(value);
        return group === undefined
            ? undefined
            : new Verse(
                  value,
                  [group],
                  'Noto Sans',
                  new Color(
                      value,
                      new Decimal(100),
                      new Decimal(0),
                      new Decimal(0)
                  ),
                  new Color(
                      value,
                      new Decimal(0),
                      new Decimal(0),
                      new Decimal(0)
                  ),
                  undefined,
                  new Decimal(0)
              );
    }
}

export function toDecimal(value: Value | undefined): Decimal | undefined {
    return value instanceof Measurement ? value.num : undefined;
}
