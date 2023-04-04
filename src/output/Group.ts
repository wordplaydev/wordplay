import toStructure from '../native/toStructure';
import type Value from '../runtime/Value';
import { getBind } from '../translation/getBind';
import type Layout from './Layout';
import type Color from './Color';
import type Place from './Place';
import type Pose from './Pose';
import type RenderContext from './RenderContext';
import type Sequence from './Sequence';
import type TextLang from './TextLang';
import TypeOutput, { TypeOutputInputs } from './TypeOutput';
import type LanguageCode from '@translation/LanguageCode';
import { getStyle, toArrangement, toTypeOutputList } from './toTypeOutput';
import { TYPE_SYMBOL } from '../parser/Symbols';
import type { NameGenerator } from './Verse';

export const GroupType = toStructure(`
    ${getBind((t) => t.output.group.definition, TYPE_SYMBOL)} Type(
        ${getBind((t) => t.output.group.layout)}•Arrangement
        ${getBind((t) => t.output.group.content)}•[Type]
        ${TypeOutputInputs}
    )`);

export default class Group extends TypeOutput {
    readonly content: TypeOutput[];
    readonly layout: Layout;

    constructor(
        value: Value,
        layout: Layout,
        content: TypeOutput[],
        size: number | undefined = undefined,
        font: string | undefined = undefined,
        place: Place | undefined = undefined,
        rotation: number | undefined = undefined,
        name: TextLang | string,
        selectable: boolean,
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
            rotation,
            name,
            selectable,
            enter,
            rest,
            move,
            exit,
            duration,
            style
        );

        this.content = content;
        this.layout = layout;
    }

    getWidth(context: RenderContext): number {
        return this.layout.getWidth(this.content, context);
    }

    getHeight(context: RenderContext): number {
        return this.layout.getHeight(this.content, context);
    }

    getPlaces(context: RenderContext): [TypeOutput, Place][] {
        return this.layout.getPlaces(this.content, context);
    }

    getGroups(): TypeOutput[] {
        return this.content;
    }

    getBackground(): Color | undefined {
        throw new Error('Method not implemented.');
    }

    getDescription(languages: LanguageCode[]) {
        return this.layout.getDescription(this.content, languages);
    }

    isEmpty() {
        return this.content.every((c) => c.isEmpty());
    }
}

export function toGroup(
    value: Value | undefined,
    namer?: NameGenerator
): Group | undefined {
    if (value === undefined) return undefined;

    const layout = toArrangement(value.resolve('layout'));
    const content = toTypeOutputList(value.resolve('content'), namer);

    const {
        size,
        font,
        place,
        rotation,
        name,
        selectable,
        rest,
        enter,
        move,
        exit,
        duration,
        style,
    } = getStyle(value);

    return layout &&
        content &&
        duration !== undefined &&
        style !== undefined &&
        rest
        ? new Group(
              value,
              layout,
              content,
              size,
              font,
              place,
              rotation,
              name ?? namer?.getName(value) ?? `${value.creator.id}`,
              selectable,
              enter,
              rest,
              move,
              exit,
              duration,
              style
          )
        : undefined;
}
