import type Color from "./Color";
import type MoveState from "./MoveState";
import type Place from "./Place";
import type Pose from "./Pose";
import type Sequence from "./Sequence";
import type TextLang from "./TextLang";

type Animation = {
    kind: "entry" | "between" | "during" | "exit",
    sequence: Sequence,
    currentPose: Pose
    currentPoseStartTime: number | undefined,
    iterations: Map<Sequence, number>,
    moves: {
        text?: MoveState<TextLang[]>,
        size?: MoveState<number>,
        font?: MoveState<string>,
        color?: MoveState<Color>,
        opacity?: MoveState<number>,
        place?: MoveState<Place>,
        offset?: MoveState<Place>,
        rotation?: MoveState<number>,
        scalex?: MoveState<number>,
        scaley?: MoveState<number>
    }
}

export default Animation;