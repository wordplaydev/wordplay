import { getBind } from '@locale/getBind';
import { TYPE_SYMBOL } from '@parser/Symbols';
import StructureValue from '@values/StructureValue';
import type Value from '@values/Value';
import Decimal from 'decimal.js';
import toStructure from '../basis/toStructure';
import type Project from '../db/projects/Project';
import type Locales from '../locale/Locales';
import Color from './Color';
import Output, { DefaultStyle } from './Output';
import { toText } from './Phrase';
import Place from './Place';
import { DefinitePose } from './Pose';
import type RenderContext from './RenderContext';
import type { NameGenerator } from './Stage';
import TextLang from './TextLang';
import { getOutputInput } from './Valued';

export function createSayType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Say, TYPE_SYMBOL)}(
        ${getBind(locales, (locale) => locale.output.Say.text)}•""
    )`);
}

export default class Say extends Output {
    readonly text: TextLang;

    private _description: string | undefined = undefined;

    constructor(value: Value, text: TextLang) {
        super(
            value,
            undefined,
            undefined,
            undefined,
            value.id.toString(),
            undefined,
            false,
            undefined,
            new DefinitePose(
                value,
                new Color(
                    value,
                    new Decimal(0),
                    new Decimal(0),
                    new Decimal(0),
                ),
                1,
                new Place(value, 0, 0, 0),
                0,
                1,
                false,
                false,
            ),
            undefined,
            undefined,
            undefined,
            undefined,
            0,
            DefaultStyle,
        );

        this.text = text;
    }

    getLayout(_context: RenderContext) {
        return {
            output: this,
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            width: 0,
            height: 0,
            ascent: 0,
            descent: 0,
            places: [],
        };
    }

    getOutput() {
        return [];
    }

    getBackground() {
        return undefined;
    }

    getShortDescription() {
        return this.text.text;
    }

    getDescription(locales: Locales) {
        if (this._description === undefined) {
            this._description = locales
                .concretize(
                    (l) => l.output.Say.defaultDescription,
                    this.text.text,
                )
                .toText()
                .trim();
        }
        return this._description;
    }

    getRepresentativeText() {
        return this.text.text;
    }

    getEntryAnimated() {
        return [];
    }

    isEmpty() {
        return true;
    }

    find(_check: (output: Output) => boolean) {
        return undefined;
    }

    gatherFaces(set: Set<import('../basis/Fonts').SupportedFace>) {
        return set;
    }
}

export function toSay(
    _project: Project,
    value: Value | undefined,
    _namer: NameGenerator,
): Say | undefined {
    if (!(value instanceof StructureValue)) return undefined;

    const textLang = toText(getOutputInput(value, 0));
    if (textLang === undefined) return undefined;

    return new Say(value, textLang);
}
