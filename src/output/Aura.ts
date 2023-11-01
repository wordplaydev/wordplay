import toStructure from '@basis/toStructure';
import StructureValue from '@values/StructureValue';
import type Value from '@values/Value';
import type Color from './Color';
import Valued, { getOutputInputs } from './Valued';
import { toNumber } from './Stage';
import { toColor } from './Color';
import { getBind } from '@locale/getBind';
import Evaluate from '@nodes/Evaluate';
import Reference from '@nodes/Reference';
import type Locale from '../locale/Locale';
import type Project from '../models/Project';

export function createAuraType(locales: Locale[]) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Pose, '•')}(
        ${getBind(locales, (locale) => locale.output.Aura.color)}•Color|ø: ø
        ${getBind(locales, (locale) => locale.output.Aura.blur)}•%|ø: ø
        ${getBind(locales, (locale) => locale.output.Aura.offsetX)}•#|ø: ø
        ${getBind(locales, (locale) => locale.output.Aura.offsetY)}•#|ø: ø
        ${getBind(locales, (locale) => locale.output.Aura.spread)}•#|ø: ø
        ${getBind(locales, (locale) => locale.output.Aura.opacity)}•%|ø: ø
    )
`);
}

export default class Aura extends Valued {
  readonly color?: Color;
  readonly blur?: number;
  readonly offsetX?: number;
  readonly offsetY?: number;
  readonly spread?: number;
  readonly opacity?: boolean;

  private _description: string | undefined = undefined;

  constructor(
      value: Value,
      color?: Color,
      blur?: number,
      offsetX?: number,
      offsetY?: number,
      spread?: number,
      opacity?: number
  ) {
      super(value);
      this.color = color;
      this.blur = blur;
      this.offsetX = offsetX;
      this.offsetY = offsetY;
      this.spread = spread;
      // TODO: Opacity must be added to `color` property as rgbA - M.W 18/10/2023
      // this.opacity = 
  }
}

export class DefiniteAura extends Aura {
    constructor(
        value: Value,
        color: Color | undefined,
        blur: number | undefined,
        offsetX: number | undefined,
        offsetY: number | undefined,
        spread: number | undefined,
        opacity: number | undefined
    ) {
        super(value, color, blur, offsetX, offsetY, spread, opacity);
    }
}

export function toAura(
    project: Project,
    value: Value | undefined
): Aura | undefined {
    if (
        !(
            value instanceof StructureValue &&
            value.type === project.shares.output.Pose
        )
    )
        return undefined;

    const [color, blur, offsetX, offsetY, spread, opacity] =
        getOutputInputs(value);

    return new Aura(
        value,
        toColor(color),
        toNumber(blur),
        toNumber(offsetX),
        toNumber(offsetY),
        toNumber(spread),
        toNumber(opacity)
    );
}

export function createAuraLiteral(project: Project, locales: Locale[]) {
    const AuraType = project.shares.output.Aura;
    return Evaluate.make(
        Reference.make(
            AuraType.names.getPreferredNameString(locales),
            AuraType
        ),
        []
    );
}