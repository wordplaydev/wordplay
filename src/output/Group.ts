import toStructure from '../native/toStructure';
import type Value from '../runtime/Value';
import { getBind } from '../locale/getBind';
import type Arrangement from './Arrangement';
import type Color from './Color';
import type Place from './Place';
import type Pose from './Pose';
import type RenderContext from './RenderContext';
import type Sequence from './Sequence';
import type TextLang from './TextLang';
import TypeOutput, { TypeOutputInputs } from './TypeOutput';
import type LanguageCode from '@locale/LanguageCode';
import { getStyle, toArrangement, toTypeOutputList } from './toTypeOutput';
import { TYPE_SYMBOL } from '../parser/Symbols';
import type { NameGenerator } from './Verse';

export const GroupType = toStructure(`
    ${getBind((t) => t.output.group, TYPE_SYMBOL)} Type(
        ${getBind((t) => t.output.group.layout)}•Arrangement
        ${getBind((t) => t.output.group.content)}•[Type|ø]
        ${TypeOutputInputs}
    )`);

export default class Group extends TypeOutput {
    readonly content: (TypeOutput | null)[];
    readonly layout: Arrangement;

    constructor(
        value: Value,
        layout: Arrangement,
        content: (TypeOutput | null)[],
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

    getLayout(context: RenderContext) {
        const layout = this.layout.getLayout(this.content, context);
        return {
            output: this,
            left: layout.left,
            top: layout.top,
            right: layout.right,
            bottom: layout.bottom,
            width: layout.width,
            height: layout.height,
            places: layout.places,
        };
    }

    getOutput() {
        return this.content;
    }

    getBackground(): Color | undefined {
        throw new Error('Method not implemented.');
    }

    getDescription(languages: LanguageCode[]) {
        return this.layout.getDescription(this.content, languages);
    }

    isEmpty() {
        return this.content.every((c) => c === null || c.isEmpty());
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
              namer?.getName(name?.text, value) ?? `${value.creator.id}`,
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
