import List from '../runtime/List';
import Structure from '../runtime/Structure';
import type Value from '../runtime/Value';
import type Arrangement from './Arrangement';
import { toGroup } from './Group';
import { toPhrase } from './Phrase';
import { toRow } from './Row';
import { toStack } from './Stack';
import type TypeOutput from './TypeOutput';
import { NameGenerator, toStage } from './Stage';
import { toGrid } from './Grid';
import None from '../runtime/None';
import { toFree } from './Free';
import type Project from '../models/Project';
import { toBoolean, toNumber } from './Stage';
import { toFont, toText } from './Phrase';
import Place, { toPlace } from './Place';
import { toColor } from './Color';
import type TextLang from './TextLang';
import { DefinitePose, toPose } from './Pose';
import type Pose from './Pose';
import type Sequence from './Sequence';
import { getOutputInputs } from './Output';
import { toSequence } from './Sequence';
import Text from '../runtime/Text';

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
            return toRow(value);
        case project.shares.output.stack:
            return toStack(value);
        case project.shares.output.grid:
            return toGrid(value);
        case project.shares.output.free:
            return toFree(value);
    }
    return undefined;
}

export function getStyle(
    project: Project,
    value: Structure,
    index: number
): {
    size: number | undefined;
    font: string | undefined;
    name: TextLang | undefined;
    selectable: boolean | undefined;
    place: Place | undefined;
    pose: DefinitePose | undefined;
    rest: Pose | Sequence | undefined;
    enter: Pose | Sequence | undefined;
    move: Pose | Sequence | undefined;
    exit: Pose | Sequence | undefined;
    duration: number | undefined;
    style: string | undefined;
} {
    const [
        sizeVal,
        familyVal,
        placeVal,
        nameVal,
        selectableVal,
        colorVal,
        opacityVal,
        offsetVal,
        rotationVal,
        scaleVal,
        flipxVal,
        flipyVal,
        enterVal,
        restVal,
        moveVal,
        exitVal,
        durationVal,
        styleVal,
    ] = getOutputInputs(value, index);

    const size = toNumber(sizeVal);
    const font = toFont(familyVal);
    const place = toPlace(placeVal);
    const name = toText(nameVal);
    const selectable = toBoolean(selectableVal);

    const color = toColor(colorVal);
    const opacity = toNumber(opacityVal);
    const offset = toPlace(offsetVal);
    const rotation = toNumber(rotationVal);
    const scale = toNumber(scaleVal);
    const flipx = toBoolean(flipxVal);
    const flipy = toBoolean(flipyVal);

    const pose =
        opacity !== undefined &&
        offset &&
        rotation !== undefined &&
        scale !== undefined &&
        flipx !== undefined &&
        flipy !== undefined
            ? new DefinitePose(
                  value,
                  color,
                  opacity,
                  offset,
                  rotation,
                  scale,
                  flipx,
                  flipy
              )
            : undefined;

    const rest = toPose(project, restVal) ?? toSequence(project, restVal);
    const enter = toPose(project, enterVal) ?? toSequence(project, enterVal);
    const move = toPose(project, moveVal) ?? toSequence(project, moveVal);
    const exit = toPose(project, exitVal) ?? toSequence(project, exitVal);
    const duration = toNumber(durationVal);

    return {
        size,
        font,
        place,
        name,
        selectable,
        pose,
        rest,
        enter,
        move,
        exit,
        duration,
        style: styleVal instanceof Text ? styleVal.text : undefined,
    };
}
