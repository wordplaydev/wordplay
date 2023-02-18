import Structure from '@runtime/Structure';
import type Value from '@runtime/Value';
import TypeOutput, { TypeOutputInputs } from './TypeOutput';
import type RenderContext from './RenderContext';
import Phrase from './Phrase';
import Color from './Color';
import Place from './Place';
import toStructure from '../native/toStructure';
import Measurement from '@runtime/Measurement';
import Decimal from 'decimal.js';
import { toColor } from './Color';
import List from '@runtime/List';
import type LanguageCode from '@translation/LanguageCode';
import { getPreferredTranslation } from '@translation/getPreferredTranslation';
import { getBind } from '@translation/getBind';
import Bool from '../runtime/Bool';
import { getStyle, toTypeOutput, toTypeOutputList } from './toTypeOutput';
import type TextLang from './TextLang';
import Pose from './Pose';
import type Sequence from './Sequence';

export const DefaultFont = 'Noto Sans';
export const DefaultSize = 1;

export const VerseType = toStructure(`
    ${getBind((t) => t.output.verse.definition, '•')} Type(
        ${getBind((t) => t.output.verse.content)}•[Type]
        ${getBind((t) => t.output.verse.background)}•Color: Color(100 0 0°)
        ${TypeOutputInputs}
    )
`);

export default class Verse extends TypeOutput {
    readonly content: TypeOutput[];
    readonly background: Color;

    constructor(
        value: Value,
        content: TypeOutput[],
        background: Color,
        size: number,
        font: string,
        place: Place | undefined = undefined,
        rotation: number | undefined = undefined,
        name: TextLang | string,
        entry: Pose | Sequence | undefined = undefined,
        rest: Pose | Sequence,
        move: Pose | Sequence | undefined = undefined,
        exit: Pose | Sequence | undefined = undefined,
        duration: number = 0,
        style: string | undefined = 'zippy'
    ) {
        super(
            value,
            size,
            font,
            place,
            rotation,
            name,
            entry,
            rest,
            move,
            exit,
            duration,
            style
        );

        this.content = content;
        this.background = background;
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
        const bottom = Math.min.apply(
            Math,
            places.map(([, place]) => place.y.toNumber())
        );
        const top = Math.max.apply(
            Math,
            places.map(([group, place]) =>
                place.y.add(group.getHeight(context)).toNumber()
            )
        );
        return {
            left: Math.min(left, right),
            right: Math.max(left, right),
            top: Math.max(bottom, top),
            bottom: Math.min(bottom, bottom),
            width: Math.abs(right - left),
            height: Math.abs(top - bottom),
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

    getGroups(): TypeOutput[] {
        return this.content;
    }

    getPlaces(context: RenderContext): [TypeOutput, Place][] {
        return this.content.map((child) => [
            child,
            child instanceof Phrase && child.place
                ? child.place
                : new Place(
                      this.value,
                      // Place everything in the center
                      child.getWidth(context).div(2).neg(),
                      // We would normally not t negate the y because its in math coordinates, but we want to move it
                      // down the y-axis by half, so we subtract.
                      child.getHeight(context).div(2).neg(),
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

export class NameGenerator {
    /** Number visible phrases, giving them unique IDs to key off of. */
    readonly counter = new Map<number, number>();

    constructor() {}

    getName(value: Value) {
        const nodeID = value.creator.id;
        const count = (this.counter.get(nodeID) ?? 0) + 1;
        this.counter.set(nodeID, count);
        return `${nodeID}-${count}`;
    }
}

export function toVerse(value: Value): Verse | undefined {
    if (!(value instanceof Structure)) return undefined;

    // Create a name generator to guarantee unique default names for all TypeOutput.
    const namer = new NameGenerator();

    if (value.type === VerseType) {
        const possibleGroups = value.resolve('content');
        const content =
            possibleGroups instanceof List
                ? toTypeOutputList(possibleGroups, namer)
                : toTypeOutput(possibleGroups, namer);
        const background = toColor(value.resolve('background'));

        const {
            size,
            font,
            place,
            rotation,
            name,
            rest,
            enter,
            move,
            exit,
            duration,
            style,
        } = getStyle(value);

        return content !== undefined &&
            background !== undefined &&
            duration !== undefined &&
            style !== undefined
            ? new Verse(
                  value,
                  Array.isArray(content) ? content : [content],
                  background,
                  size ?? DefaultSize,
                  font ?? DefaultFont,
                  place,
                  rotation,
                  name ?? namer.getName(value),
                  enter,
                  rest ?? new Pose(value),
                  move,
                  exit,
                  duration,
                  style
              )
            : undefined;
    }
    // Try converting it to a group and wrapping it in a Verse.
    else {
        const type = toTypeOutput(value, namer);
        return type === undefined
            ? undefined
            : new Verse(
                  value,
                  [type],
                  new Color(
                      value,
                      new Decimal(100),
                      new Decimal(0),
                      new Decimal(0)
                  ),
                  DefaultSize,
                  DefaultFont,
                  undefined,
                  0,
                  namer.getName(value),
                  undefined,
                  new Pose(value),
                  undefined,
                  undefined,
                  0,
                  'zippy'
              );
    }
}

export function toDecimal(value: Value | undefined): Decimal | undefined {
    return value instanceof Measurement ? value.num : undefined;
}

export function toBoolean(value: Value | undefined): boolean | undefined {
    return value instanceof Bool ? value.bool : undefined;
}
