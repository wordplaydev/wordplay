import toStructure from '@basis/toStructure';
import { getBind } from '@locale/getBind';
import type Locales from '@locale/Locales';
import Evaluate from '@nodes/Evaluate';
import Reference from '@nodes/Reference';
import StructureValue from '@values/StructureValue';
import type Value from '@values/Value';
import type Project from '../db/projects/Project';
import type LocaleText from '../locale/LocaleText';
import type Color from './Color';
import { toColor } from './Color';
import { toNumber } from './Stage';
import Valued, { getOutputInputs } from './Valued';

export function createAuraType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Aura, '•')}(
        ${getBind(locales, (locale) => locale.output.Aura.color)}•Color|ø: ø
        ${getBind(locales, (locale) => locale.output.Aura.blur)}•#m: 0.1m
        ${getBind(locales, (locale) => locale.output.Aura.offsetX)}•#m: 0m
        ${getBind(locales, (locale) => locale.output.Aura.offsetY)}•#m: 0m
    )
`);
}

export default class Aura extends Valued {
    readonly color: Color | undefined;
    readonly blur: number | undefined;
    readonly offsetX: number | undefined;
    readonly offsetY: number | undefined;

    constructor(
        value: Value,
        color?: Color,
        blur?: number,
        offsetX?: number,
        offsetY?: number,
    ) {
        super(value);
        this.color = color;
        this.blur = blur;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
    }
}

export class DefiniteAura extends Aura {
    constructor(
        value: Value,
        color: Color | undefined,
        blur: number | undefined,
        offsetX: number | undefined,
        offsetY: number | undefined,
    ) {
        super(value, color, blur, offsetX, offsetY);
    }
}

export function toAura(
    project: Project,
    value: Value | undefined,
): Aura | undefined {
    if (
        !(
            value instanceof StructureValue &&
            value.type === project.shares.output.Aura
        )
    )
        return undefined;
    const [color, blur, offsetX, offsetY] = getOutputInputs(value);

    return new Aura(
        value,
        toColor(color),
        toNumber(blur),
        toNumber(offsetX),
        toNumber(offsetY),
    );
}

export function createAuraLiteral(project: Project, locales: LocaleText[]) {
    const AuraType = project.shares.output.Aura;
    return Evaluate.make(
        Reference.make(
            AuraType.names.getPreferredNameString(locales),
            AuraType,
        ),
        [],
    );
}
