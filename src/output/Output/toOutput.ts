import ListValue from '#values/ListValue.ts';
import NoneValue from '#values/NoneValue.ts';
import type { SupportedFace } from '#basis/faces/Fonts.ts';
import type Project from '#db/projects/Project.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import StructureValue from '#values/StructureValue.ts';
import TextValue from '#values/TextValue.ts';
import type Value from '#values/Value.ts';
import Arrangement from '#output/Arrangement/Arrangement.ts';
import Color, { toColor } from '#output/Color/Color.ts';
import { toFree } from '#output/Arrangement/Free.ts';
import { toGrid } from '#output/Arrangement/Grid.ts';
import { toGroup } from '#output/Output/Group.ts';
import type Output from '#output/Output/Output.ts';
import { toFont as toFace, toPhrase, toText } from '#output/Output/Phrase.ts';
import Place, { toPlace } from '#output/Place/Place.ts';
import type Pose from '#output/animation/Pose.ts';
import { DefinitePose, toPose } from '#output/animation/Pose.ts';
import { toRow } from '#output/Arrangement/Row.ts';
import type Sequence from '#output/animation/Sequence.ts';
import { toSequence } from '#output/animation/Sequence.ts';
import { toMusic } from '#output/Music/Music.ts';
import { toSay } from '#output/Output/Say.ts';
import { toImage } from '#output/Output/Image.ts';
import { toShape } from '#output/Output/Shape/Shape.ts';
import { toStack } from '#output/Arrangement/Stack.ts';
import {
    NameGenerator,
    toBoolean,
    toNumber,
    toStage,
} from '#output/Output/Stage.ts';
import { getOutputInputs } from '#output/Output/Valued.ts';

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
        case project.shares.output.Image:
            return toImage(project, value, namer);
        case project.shares.output.Say:
            return toSay(project, value, namer);
        case project.shares.output.Music:
            return toMusic(project, value, namer);
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
    includeChanging = false,
): {
    size: number | undefined;
    face: SupportedFace | undefined;
    name: TextValue | undefined;
    description: TextValue | undefined;
    selectable: boolean | undefined;
    place: Place | undefined;
    background: Color | undefined;
    pose: DefinitePose | undefined;
    resting: Pose | Sequence | undefined;
    entering: Pose | Sequence | undefined;
    moving: Pose | Sequence | undefined;
    exiting: Pose | Sequence | undefined;
    changing: string | undefined;
    duration: number | undefined;
    style: string | undefined;
} {
    const [sizeVal, faceVal, placeVal] = getOutputInputs(value, index);

    const size = toNumber(sizeVal);
    const face = toFace(faceVal);
    const place = toPlace(placeVal);

    const style = getStyle(project, value, index + 3, place, includeChanging);

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
        changing: style.changing,
        duration: style.duration,
        style: style.style,
    };
}

export function getStyle(
    project: Project,
    value: StructureValue,
    index: number,
    place?: Place | undefined,
    // Phrase only: its structure has a `changing` input between exiting and duration.
    includeChanging = false,
    /** False when the type declares its description outside this block, which `Image` does:
     *  its description is required, and a required input may not follow an optional one. */
    describedHere = true,
) {
    const given = getOutputInputs(value, index);
    // Put the missing slot back rather than shifting what follows, so every index below
    // reads the same in both shapes.
    const inputs = describedHere
        ? given
        : [given[0], undefined, ...given.slice(1)];
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
    ] = inputs;
    const changingVal = includeChanging ? inputs[15] : undefined;
    const after = includeChanging ? 16 : 15;
    const durationVal = inputs[after];
    const styleVal = inputs[after + 1];

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
        changing:
            changingVal instanceof TextValue ? changingVal.text : undefined,
        duration,
        style: styleVal instanceof TextValue ? styleVal.text : undefined,
    };
}
