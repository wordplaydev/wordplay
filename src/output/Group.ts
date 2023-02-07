import type Decimal from 'decimal.js';
import toStructure from '../native/toStructure';
import type Value from '../runtime/Value';
import { getBind } from '../translation/getBind';
import type Arrangement from './Arrangement';
import type Color from './Color';
import type Place from './Place';
import type Pose from './Pose';
import type { RenderContext } from './RenderContext';
import type Sequence from './Sequence';
import type TextLang from './TextLang';
import TypeOutput, { TypeOutputInputs } from './TypeOutput';
import type LanguageCode from '../translation/LanguageCode';
import { getStyle, toArrangement, toTypeOutputList } from './toTypeOutput';
import { TYPE_SYMBOL } from '../parser/Symbols';
import type { NameGenerator } from './Verse';

export const GroupType = toStructure(`
    ${getBind((t) => t.output.group.definition, TYPE_SYMBOL)} Type(
        ${getBind((t) => t.output.group.arrangement)}•Arrangement
        ${getBind((t) => t.output.group.content)}•[Type]
        ${TypeOutputInputs}
    )`);

export default class Group extends TypeOutput {
    readonly content: TypeOutput[];
    readonly arrangement: Arrangement;

    constructor(
        value: Value,
        arrangement: Arrangement,
        content: TypeOutput[],
        size: number,
        font: string | undefined = undefined,
        place: Place | undefined = undefined,
        name: TextLang | string,
        enter: Pose | Sequence | undefined = undefined,
        rest: Pose | Sequence,
        move: Pose | Sequence | undefined = undefined,
        exit: Pose | Sequence | undefined = undefined,
        duration: number,
        style: string
    ) {
        super(
            value,
            size,
            font,
            place,
            name,
            enter,
            rest,
            move,
            exit,
            duration,
            style
        );

        this.content = content;
        this.arrangement = arrangement;
    }

    getWidth(context: RenderContext): Decimal {
        return this.arrangement.getWidth(this.content, context);
    }

    getHeight(context: RenderContext): Decimal {
        return this.arrangement.getHeight(this.content, context);
    }

    getPlaces(context: RenderContext): [TypeOutput, Place][] {
        return this.arrangement.getPlaces(this.content, context);
    }

    getGroups(): TypeOutput[] {
        return this.content;
    }

    getBackground(): Color | undefined {
        throw new Error('Method not implemented.');
    }

    getDescription(languages: LanguageCode[]) {
        return this.arrangement.getDescription(this.content, languages);
    }
}

export function toGroup(
    value: Value | undefined,
    namer: NameGenerator
): Group | undefined {
    if (value === undefined) return undefined;

    const arrangement = toArrangement(value.resolve('arrangement'));
    const content = toTypeOutputList(value.resolve('content'), namer);

    const {
        size,
        font,
        place,
        name,
        rest,
        enter,
        move,
        exit,
        duration,
        style,
    } = getStyle(value);

    return arrangement &&
        content &&
        duration !== undefined &&
        style !== undefined &&
        rest
        ? new Group(
              value,
              arrangement,
              content,
              size,
              font,
              place,
              name ?? namer.getName(value),
              enter,
              rest,
              move,
              exit,
              duration,
              style
          )
        : undefined;
}
