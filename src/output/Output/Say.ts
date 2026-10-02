import { getBind } from '#locale/getBind.ts';
import { TYPE_SYMBOL } from '#parser/Symbols.ts';
import StructureValue from '#values/StructureValue.ts';
import type Value from '#values/Value.ts';
import Decimal from 'decimal.js';
import toStructure from '#basis/toStructure.ts';
import type Project from '#db/projects/Project.ts';
import type Locales from '#locale/Locales.ts';
import Color from '#output/Color/Color.ts';
import Output, { DefaultStyle } from '#output/Output/Output.ts';
import { toText } from '#output/Output/Phrase.ts';
import Place from '#output/Place/Place.ts';
import { DefinitePose } from '#output/animation/Pose.ts';
import type RenderContext from '#output/RenderContext.ts';
import type { NameGenerator } from '#output/Output/Stage.ts';
import type TextValue from '#values/TextValue.ts';
import { getOutputInput } from '#output/Output/Valued.ts';

export function createSayType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Say, TYPE_SYMBOL)}(
        ${getBind(locales, (locale) => locale.output.Say.text)}•""
    )`);
}

export default class Say extends Output {
    readonly text: TextValue;

    private _description: string | undefined = undefined;

    constructor(value: Value, text: TextValue) {
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
            // A leaf has nothing of its own to report: its z lives in the place its
            // parent gave it, and Infinity loses every Math.min on the way up.
            nearest: Infinity,
        };
    }

    occupiesSpace() {
        return false;
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
                .concretize((l) => l.output.Say.defaultDescription, {
                    text: this.text.text,
                })
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

    gatherFaces(set: Set<import('#basis/faces/Fonts.ts').SupportedFace>) {
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
