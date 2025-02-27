import ListValue from '@values/ListValue';
import NoneValue from '@values/NoneValue';
import type { SupportedFace } from '../basis/Fonts';
import type Project from '../db/projects/Project';
import type Evaluator from '../runtime/Evaluator';
import StructureValue from '../values/StructureValue';
import TextValue from '../values/TextValue';
import type Value from '../values/Value';
import type Arrangement from './Arrangement';
import type Aura from './Aura';
import { toAura } from './Aura';
import Color, { toColor } from './Color';
import { toFree } from './Free';
import { toGrid } from './Grid';
import { toGroup } from './Group';
import type Output from './Output';
import { toFont as toFace, toPhrase, toText } from './Phrase';
import Place, { toPlace } from './Place';
import type Pose from './Pose';
import { DefinitePose, toPose } from './Pose';
import { toRow } from './Row';
import type Sequence from './Sequence';
import { toSequence } from './Sequence';
import { toShape } from './Shape';
import { toStack } from './Stack';
import { NameGenerator, toBoolean, toNumber, toStage } from './Stage';
import type TextLang from './TextLang';
import { getOutputInputs } from './Valued';

export function toOutput(
    evaluator: Evaluator,
    value: Value | undefined,
    namer: NameGenerator,
): Output | undefined {
    if (!(value instanceof StructureValue)) return undefined;
    const project = evaluator.project;
    switch (value.type) {
        case project.shares.output.Phrase:
            return toPhrase(project, value, namer);
        case project.shares.output.Group:
            return toGroup(evaluator, value, namer);
        case project.shares.output.Stage:
            return toStage(evaluator, value, namer);
        case project.shares.output.Shape:
            return toShape(project, value, namer);
    }
    return undefined;
}

export function toOutputList(
    evaluator: Evaluator,
    value: Value | undefined,
    namer: NameGenerator,
): (Output | null)[] | undefined {
    if (value === undefined || !(value instanceof ListValue)) return undefined;

    const phrases: (Output | null)[] = [];

    for (const val of value.values) {
        if (!(val instanceof StructureValue || val instanceof NoneValue))
            return undefined;
        const phrase =
            val instanceof NoneValue ? null : toOutput(evaluator, val, namer);
        if (phrase === undefined) return undefined;
        phrases.push(phrase);
    }
    return phrases;
}

export function toArrangement(
    project: Project,
    value: Value | undefined,
): Arrangement | undefined {
    if (!(value instanceof StructureValue)) return undefined;
    switch (value.type) {
        case project.shares.output.Row:
            return toRow(value);
        case project.shares.output.Stack:
            return toStack(value);
        case project.shares.output.Grid:
            return toGrid(value);
        case project.shares.output.Free:
            return toFree(value);
    }
    return undefined;
}

export function getTypeStyle(
    project: Project,
    value: StructureValue,
    index: number,
): {
    size: number | undefined;
    face: SupportedFace | undefined;
    name: TextLang | undefined;
    description: TextLang | undefined;
    selectable: boolean | undefined;
    place: Place | undefined;
    background: Color | undefined;
    pose: DefinitePose | undefined;
    resting: Pose | Sequence | undefined;
    entering: Pose | Sequence | undefined;
    moving: Pose | Sequence | undefined;
    exiting: Pose | Sequence | undefined;
    duration: number | undefined;
    style: string | undefined;
    shadow: Aura | undefined;
} {
    const [sizeVal, faceVal, placeVal] = getOutputInputs(value, index);

    const size = toNumber(sizeVal);
    const face = toFace(faceVal) as SupportedFace;
    const place = toPlace(placeVal);

    const style = getStyle(project, value, index + 3, place);

    return {
        size,
        face,
        place,
        name: style.name,
        description: style.description,
        selectable: style.selectable,
        background: style.background,
        pose: style.pose,
        resting: style.resting,
        entering: style.entering,
        moving: style.moving,
        exiting: style.exiting,
        duration: style.duration,
        style: style.style,
        shadow: style.shadow,
    };
}

export function getStyle(
    project: Project,
    value: StructureValue,
    index: number,
    place?: Place | undefined,
) {
    const [
        nameVal,
        descriptionVal,
        selectableVal,
        colorVal,
        backgroundVal,
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
        shadowVal,
    ] = getOutputInputs(value, index);

    const name = toText(nameVal);
    const description = toText(descriptionVal);
    const selectable = toBoolean(selectableVal);
    const background = toColor(backgroundVal);
    const color = toColor(colorVal);
    const opacity = toNumber(opacityVal);
    const offset = toPlace(offsetVal);
    const rotation = toNumber(rotationVal);
    const scale = toNumber(scaleVal);
    const flipx = toBoolean(flipxVal);
    const flipy = toBoolean(flipyVal);

    const pose = new DefinitePose(
        value,
        color,
        opacity,
        offset,
        // Default to place rotation if it has one
        place?.rotation ?? rotation,
        scale,
        flipx,
        flipy,
    );

    const rest = toPose(project, restVal) ?? toSequence(project, restVal);
    const enter = toPose(project, enterVal) ?? toSequence(project, enterVal);
    const move = toPose(project, moveVal) ?? toSequence(project, moveVal);
    const exit = toPose(project, exitVal) ?? toSequence(project, exitVal);
    const duration = toNumber(durationVal);
    const shadow = toAura(project, shadowVal);

    return {
        name,
        description,
        selectable,
        background,
        pose,
        resting: rest,
        entering: enter,
        moving: move,
        exiting: exit,
        duration,
        style: styleVal instanceof TextValue ? styleVal.text : undefined,
        shadow: shadow,
    };
}
