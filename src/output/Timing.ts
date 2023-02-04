import toStructure from '../native/toStructure';
import Structure from '@runtime/Structure';
import type Value from '@runtime/Value';
import Output from './Output';
import { toDecimal } from './Verse';
import { getBind } from '@translation/getBind';
import en from '@translation/translations/en';
import Text from '@runtime/Text';
import type Translation from '../translation/Translation';

export const TimingType = toStructure(`
    ${getBind((t) => t.output.timing.definition, '•')}(
        ${getBind((t) => t.output.timing.duration)}•#s: 0.25s
        ${getBind((t) => t.output.timing.style)}•${Object.values(
    en.output.easing
)
    .map((id) => `"${id}"`)
    .join('|')}: "zippy"
    )
`);

export type Easing = keyof Translation['output']['easing'];

export default class Timing extends Output {
    readonly duration: number;
    readonly style: string | undefined;

    constructor(value: Value, duration: number, style: string | undefined) {
        super(value);

        this.duration = duration;
        this.style = style;
    }
}

export function toTiming(value: Value | undefined): Timing | undefined {
    if (!(value instanceof Structure && value.type === TimingType))
        return undefined;

    const duration = toDecimal(value.resolve('duration'));
    const style = toText(value.resolve('style'));

    return duration && style
        ? new Timing(value, duration.toNumber(), style)
        : undefined;
}

function toText(value: Value | undefined) {
    if (value instanceof Text) return value.text;
    else return undefined;
}
