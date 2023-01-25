import Structure from '@runtime/Structure';
import type Value from '@runtime/Value';
import Group, { type RenderContext } from './Group';
import { toFont } from './Phrase';
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

const BACKSET = -12;

export const VerseType = toStructure(`
    ${getBind((t) => t.output.verse.definition, '•')} Group(
        ${getBind((t) => t.output.verse.groups)}•Group|[Group]
        ${getBind(
            (t) => t.output.verse.font
        )}•${SupportedFontsType}: "Noto Sans"
        ${getBind((t) => t.output.verse.foreground)}•Color: Color(0 0 0°)
        ${getBind((t) => t.output.verse.background)}•Color: Color(100 0 0°)
        ${getBind((t) => t.output.verse.focus)}•Place: Place(0m 0m ${BACKSET}m)
        ${getBind((t) => t.output.verse.tilt)}•#°: 0°
    )
`);

export default class Verse extends Group {
    readonly groups: Group[];
    readonly font: string;
    readonly background: Color;
    readonly foreground: Color;
    readonly focus: Place;
    readonly tilt: Decimal;

    constructor(
        value: Value,
        groups: Group[],
        font: string,
        background: Color,
        foreground: Color,
        focus: Place,
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

    /** Nothing uses this, so we just return zero. */
    getWidth(): Decimal {
        return new Decimal(0);
    }
    getHeight(): Decimal {
        return new Decimal(0);
    }

    getGroups(): Group[] {
        return this.groups;
    }

    /**
     * A Verse is a Group that lays out a list of phrases according to their specified places,
     * or if the phrases */
    getPlaces(context: RenderContext): [Group, Place][] {
        // Center the group in the verse, and offset by the focus.
        return this.groups.map((group) => [
            group,
            new Place(
                this.value,
                group.getWidth(context).div(2).neg().sub(this.focus.x),
                group.getHeight(context).div(2).neg().sub(this.focus.y),
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
        return group && font && background && foreground && focus && tilt
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
                  new Place(
                      value,
                      new Decimal(0),
                      new Decimal(0),
                      new Decimal(BACKSET)
                  ),
                  new Decimal(0)
              );
    }
}

export function toDecimal(value: Value | undefined): Decimal | undefined {
    return value instanceof Measurement ? value.num : undefined;
}
