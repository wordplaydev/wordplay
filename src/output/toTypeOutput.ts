import List from '../runtime/List';
import Structure from '../runtime/Structure';
import type Value from '../runtime/Value';
import type Layout from './Layout';
import { toGroup } from './Group';
import { PhraseType, toFont, toPhrase, toText } from './Phrase';
import { RowType, toRow } from './Row';
import { StackType, toStack } from './Stack';
import type TypeOutput from './TypeOutput';
import { GroupType } from './Group';
import type TextLang from './TextLang';
import type Place from './Place';
import type Pose from './Pose';
import type Sequence from './Sequence';
import {
    NameGenerator,
    toBoolean,
    toDecimal,
    toVerse,
    VerseType,
} from './Verse';
import { toPlace } from './Place';
import { toPose } from './Pose';
import { toSequence } from './Sequence';
import Measurement from '../runtime/Measurement';
import Text from '../runtime/Text';

export function toTypeOutput(
    value: Value | undefined,
    namer?: NameGenerator
): TypeOutput | undefined {
    if (!(value instanceof Structure)) return undefined;
    switch (value.type) {
        case PhraseType:
            return toPhrase(
                value,
                namer?.getName(value) ?? `${value.creator.id}`
            );
        case GroupType:
            return toGroup(value, namer);
        case VerseType:
            return toVerse(value);
    }
    return undefined;
}

export function toTypeOutputList(
    value: Value | undefined,
    namer?: NameGenerator
): TypeOutput[] | undefined {
    if (value === undefined || !(value instanceof List)) return undefined;

    const phrases: TypeOutput[] = [];
    for (const val of value.values) {
        if (!(val instanceof Structure)) return undefined;
        const phrase = toTypeOutput(val, namer);
        if (phrase === undefined) return undefined;
        phrases.push(phrase);
    }
    return phrases;
}

export function toArrangement(value: Value | undefined): Layout | undefined {
    if (!(value instanceof Structure)) return undefined;
    switch (value.type) {
        case RowType:
            return toRow(value);
        case StackType:
            return toStack(value);
    }
    return undefined;
}

export function getStyle(value: Value): {
    size: number | undefined;
    font: string | undefined;
    name: TextLang | undefined;
    selectable: boolean;
    place: Place | undefined;
    rotation: number | undefined;
    rest: Pose | Sequence | undefined;
    enter: Pose | Sequence | undefined;
    move: Pose | Sequence | undefined;
    exit: Pose | Sequence | undefined;
    duration: number | undefined;
    style: string | undefined;
} {
    const size = toDecimal(value.resolve('size'))?.toNumber();
    const font = toFont(value.resolve('font'));
    const place = toPlace(value.resolve('place'));
    const rotation = toDecimal(value.resolve('rotation'))?.toNumber();
    const name = toText(value.resolve('name'));
    const selectable = toBoolean(value.resolve('selectable')) ?? false;
    const rest =
        toPose(value.resolve('rest')) ?? toSequence(value.resolve('rest'));
    const enter =
        toPose(value.resolve('enter')) ?? toSequence(value.resolve('enter'));
    const move =
        toPose(value.resolve('move')) ?? toSequence(value.resolve('move'));
    const exit =
        toPose(value.resolve('exit')) ?? toSequence(value.resolve('exit'));
    const duration = value.resolve('duration');
    const style = value.resolve('style');

    return {
        size,
        font,
        name,
        selectable,
        place,
        rotation,
        rest,
        enter,
        move,
        exit,
        duration:
            duration instanceof Measurement ? duration.toNumber() : undefined,
        style: style instanceof Text ? style.text : undefined,
    };
}
