import toStructure from '../basis/toStructure';
import type Value from '../values/Value';
import { getBind } from '../locale/getBind';
import type Arrangement from './Arrangement';
import type Color from './Color';
import type Place from './Place';
import type Pose from './Pose';
import type RenderContext from './RenderContext';
import type Sequence from './Sequence';
import TextLang from './TextLang';
import Output, { DefaultStyle } from './Output';
import { getTypeStyle, toArrangement, toOutputList } from './toOutput';
import { GROUP_SYMBOL, TYPE_SYMBOL } from '../parser/Symbols';
import type { NameGenerator } from './Stage';
import type { DefinitePose } from './Pose';
import StructureValue from '@values/StructureValue';
import { getOutputInput } from './Valued';
import concretize from '../locale/concretize';
import { SupportedFontsFamiliesType, type SupportedFace } from '../basis/Fonts';
import Matter, { toMatter } from './Matter';
import type Evaluator from '../runtime/Evaluator';
import type Locales from '../locale/Locales';
import { getFirstName } from '../locale/Locale';

export function createGroupType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Group, TYPE_SYMBOL)} Output(
        ${getBind(locales, (locale) => locale.output.Group.layout)}•Arrangement
        ${getBind(
            locales,
            (locale) => locale.output.Group.content,
        )}•[Phrase|Group|ø]
        ${getBind(locales, (locale) => locale.output.Group.size)}•${'#m|ø: ø'}
    ${getBind(
        locales,
        (locale) => locale.output.Group.face,
    )}•${SupportedFontsFamiliesType}${'|ø: ø'}
    ${getBind(locales, (locale) => locale.output.Group.place)}•📍|ø: ø
    ${getBind(locales, (locale) => locale.output.Group.name)}•""|ø: ø
    ${getBind(locales, (locale) => locale.output.Group.selectable)}•?: ⊥
    ${getBind(locales, (locale) => locale.output.Group.color)}•🌈${'|ø: ø'}
    ${getBind(
        locales,
        (locale) => locale.output.Group.background,
    )}•Color${'|ø: ø'}
    ${getBind(locales, (locale) => locale.output.Group.opacity)}•%${'|ø: ø'}
    ${getBind(locales, (locale) => locale.output.Group.offset)}•📍|ø: ø
    ${getBind(locales, (locale) => locale.output.Group.rotation)}•#°${'|ø: ø'}
    ${getBind(locales, (locale) => locale.output.Group.scale)}•#${'|ø: ø'}
    ${getBind(locales, (locale) => locale.output.Group.flipx)}•?${'|ø: ø'}
    ${getBind(locales, (locale) => locale.output.Group.flipy)}•?${'|ø: ø'}
    ${getBind(locales, (locale) => locale.output.Group.entering)}•ø|🤪|💃: ø
    ${getBind(locales, (locale) => locale.output.Group.resting)}•ø|🤪|💃: ø
    ${getBind(locales, (locale) => locale.output.Group.moving)}•ø|🤪|💃: ø
    ${getBind(locales, (locale) => locale.output.Group.exiting)}•ø|🤪|💃: ø
    ${getBind(locales, (locale) => locale.output.Group.duration)}•#s: 0.25s
    ${getBind(locales, (locale) => locale.output.Group.style)}•${locales
        .getLocales()
        .map((locale) =>
            Object.values(locale.output.Easing).map((id) => `"${id}"`),
        )
        .flat()
        .join('|')}: "${DefaultStyle}"
    ${getBind(locales, (locale) => locale.output.Group.matter)}•Matter|ø: ø
    )`);
}

export default class Group extends Output {
    readonly content: (Output | null)[];
    readonly layout: Arrangement;
    readonly matter: Matter | undefined;

    private _description: string | undefined = undefined;

    constructor(
        value: Value,
        layout: Arrangement,
        content: (Output | null)[],
        matter: Matter | undefined,
        size: number | undefined = undefined,
        face: SupportedFace | undefined = undefined,
        place: Place | undefined = undefined,
        name: TextLang | string,
        selectable: boolean,
        background: Color | undefined,
        pose: DefinitePose,
        entering: Pose | Sequence | undefined = undefined,
        resting: Pose | Sequence | undefined = undefined,
        moving: Pose | Sequence | undefined = undefined,
        exiting: Pose | Sequence | undefined = undefined,
        duration: number,
        style: string,
    ) {
        super(
            value,
            size,
            face,
            place,
            name,
            selectable,
            background,
            pose,
            entering,
            resting,
            moving,
            exiting,
            duration,
            style,
        );

        this.content = content;
        this.layout = layout;
        this.matter = matter;
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
            ascent: layout.height,
            descent: 0,
            places: layout.places,
        };
    }

    getOutput() {
        return this.content;
    }

    find(check: (output: Output) => boolean): Output | undefined {
        for (const output of this.content) {
            if (output !== null) {
                if (check(output)) return output;
            }
        }
        return undefined;
    }

    getBackground(): Color | undefined {
        throw new Error('Method not implemented.');
    }

    getShortDescription(locales: Locales) {
        return this.name instanceof TextLang
            ? this.name.text
            : locales.get((l) => getFirstName(l.output.Group.names));
    }

    getDescription(locales: Locales) {
        if (this._description === undefined) {
            this._description = concretize(
                locales,
                locales.get((l) => l.output.Group.description),
                this.name instanceof TextLang ? this.name.text : undefined,
                this.layout.getDescription(this.content, locales),
                this.pose.getDescription(locales),
            ).toText();
        }
        return this._description;
    }

    getRepresentativeText(locales: Locales) {
        for (const output of this.content) {
            const text = output
                ? output.getRepresentativeText(locales)
                : undefined;
            if (text) return text;
        }
        // No text? Just give a stage symbol.
        return GROUP_SYMBOL;
    }

    isEmpty() {
        return this.content.every((c) => c === null || c.isEmpty());
    }

    getEntryAnimated(): Output[] {
        return [
            ...(this.entering !== undefined ? [this] : []),
            ...this.content.reduce((list: Output[], out) => {
                return [...list, ...(out ? out.getEntryAnimated() : [])];
            }, []),
        ];
    }
}

export function toGroup(
    evaluator: Evaluator,
    value: Value | undefined,
    namer: NameGenerator,
): Group | undefined {
    if (!(value instanceof StructureValue)) return undefined;

    const project = evaluator.project;
    const layout = toArrangement(project, getOutputInput(value, 0));
    const content = toOutputList(evaluator, getOutputInput(value, 1), namer);
    const matter = toMatter(getOutputInput(value, 21));

    const {
        size,
        face: font,
        place,
        name,
        selectable,
        background,
        pose,
        resting: rest,
        entering: enter,
        moving: move,
        exiting: exit,
        duration,
        style,
    } = getTypeStyle(project, value, 2);

    return layout &&
        content &&
        duration !== undefined &&
        style !== undefined &&
        pose &&
        selectable !== undefined
        ? new Group(
              value,
              layout,
              content,
              matter,
              size,
              font,
              place,
              namer?.getName(name?.text, value) ?? `${value.creator.id}`,
              selectable,
              background,
              pose,
              enter,
              rest,
              move,
              exit,
              duration,
              style,
          )
        : undefined;
}
