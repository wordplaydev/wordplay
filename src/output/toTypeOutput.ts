import List from '../runtime/List';
import Structure from '../runtime/Structure';
import type Value from '../runtime/Value';
import type Arrangement from './Arrangement';
import { toGroup } from './Group';
import { toFont, toPhrase, toText } from './Phrase';
import { toRow } from './Row';
import { toStack } from './Stack';
import type TypeOutput from './TypeOutput';
import type TextLang from './TextLang';
import type Place from './Place';
import type Pose from './Pose';
import type Sequence from './Sequence';
import { NameGenerator, toBoolean, toDecimal, toStage } from './Stage';
import { toPlace } from './Place';
import { toPose } from './Pose';
import { toSequence } from './Sequence';
import Number from '../runtime/Number';
import Text from '../runtime/Text';
import { toGrid } from './Grid';
import None from '../runtime/None';
import { toFree } from './Free';
import type Project from '../models/Project';

export function toTypeOutput(
    project: Project,
    value: Value | undefined,
    namer?: NameGenerator
): TypeOutput | undefined {
    if (!(value instanceof Structure)) return undefined;
    switch (value.type) {
        case project.shares.output.phrase:
            return toPhrase(project, value, namer);
        case project.shares.output.group:
            return toGroup(project, value, namer);
        case project.shares.output.stage:
            return toStage(project, value);
    }
    return undefined;
}

export function toTypeOutputList(
    project: Project,
    value: Value | undefined,
    namer?: NameGenerator
): (TypeOutput | null)[] | undefined {
    if (value === undefined || !(value instanceof List)) return undefined;

    const phrases: (TypeOutput | null)[] = [];
    for (const val of value.values) {
        if (!(val instanceof Structure || val instanceof None))
            return undefined;
        const phrase =
            val instanceof None ? null : toTypeOutput(project, val, namer);
        if (phrase === undefined) return undefined;
        phrases.push(phrase);
    }
    return phrases;
}

export function toArrangement(
    project: Project,
    value: Value | undefined
): Arrangement | undefined {
    if (!(value instanceof Structure)) return undefined;
    switch (value.type) {
        case project.shares.output.row:
            return toRow(project, value);
        case project.shares.output.stack:
            return toStack(project, value);
        case project.shares.output.grid:
            return toGrid(project, value);
        case project.shares.output.free:
            return toFree(value);
    }
    return undefined;
}

export function getStyle(
    project: Project,
    value: Value
): {
    size: number | undefined;
    font: string | undefined;
    name: TextLang | undefined;
    selectable: boolean;
    place: Place | undefined;
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
    const name = toText(value.resolve('name'));
    const selectable = toBoolean(value.resolve('selectable')) ?? false;
    const rest =
        toPose(project, value.resolve('rest')) ??
        toSequence(project, value.resolve('rest'));
    const enter =
        toPose(project, value.resolve('enter')) ??
        toSequence(project, value.resolve('enter'));
    const move =
        toPose(project, value.resolve('move')) ??
        toSequence(project, value.resolve('move'));
    const exit =
        toPose(project, value.resolve('exit')) ??
        toSequence(project, value.resolve('exit'));
    const duration = value.resolve('duration');
    const style = value.resolve('style');

    return {
        size,
        font,
        name,
        selectable,
        place,
        rest,
        enter,
        move,
        exit,
        duration: duration instanceof Number ? duration.toNumber() : undefined,
        style: style instanceof Text ? style.text : undefined,
    };
}
