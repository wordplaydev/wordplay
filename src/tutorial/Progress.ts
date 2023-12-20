import type { TutorialProgress } from '../db/TutorialProgressSetting';
import {
    PerformanceMode,
    type Act,
    type Scene,
    type PeformanceModeType,
    type Performance,
    type Dialog,
} from './Tutorial';
import type Tutorial from './Tutorial';

export default class Progress {
    readonly tutorial: Tutorial;
    /** The act number, 0-indexed, with 0 presenting the play title screen */
    readonly act: number;
    /** The scene number, 0-indexed, with 0 representing act title screen */
    readonly scene: number;
    /** The nth pause in the scene, but 0-indexed, with 0 representing the scene title screen */
    readonly pause: number;

    constructor(tutorial: Tutorial, act: number, scene: number, pause: number) {
        this.tutorial = tutorial;
        const acts = tutorial.acts;

        // Account for invalid acts, scenes, and pauses.
        act = act < 0 ? 0 : act >= acts.length ? acts.length : act;
        const scenes = act === 0 ? 0 : acts[act - 1].scenes.length;
        scene = scene < 0 ? 0 : scene > scenes ? scenes : scene;
        const pauses =
            act === 0 || scene === 0
                ? 0
                : acts[act - 1].scenes[scene - 1].lines.filter(
                      (line) => line === null,
                  ).length + 1;
        pause = pause < 0 ? 0 : pause > pauses ? pauses : pause;

        this.act = act;
        this.scene = scene;
        this.pause = pause;
    }

    getLocale() {
        return `${this.tutorial.language}-${this.tutorial.region}`;
    }

    getAct(): Act | undefined {
        return this.tutorial.acts[this.act - 1];
    }

    getScene(): Scene | undefined {
        const act = this.getAct();
        return act?.scenes[this.scene - 1];
    }

    /** Get the latest code before the current pause */
    getPerformanceLine(): number | undefined {
        const scene = this.getScene();
        if (scene === undefined) return undefined;

        let code: number | undefined = undefined;
        let pause = 0;
        for (let i = 0; i < scene.lines.length && pause < this.pause; i++) {
            const line = scene.lines[i];
            if (line === null) pause++;
            else if (
                line !== null &&
                PerformanceMode.includes(line[0] as PeformanceModeType)
            )
                code = i;
        }
        return code;
    }

    getPerformance(): Performance | undefined {
        const act = this.getAct();
        const scene = this.getScene();
        const line = this.getPerformanceLine();
        const code =
            scene && line !== undefined
                ? scene.lines[line]
                : scene?.performance ?? act?.performance ?? undefined;
        return Array.isArray(code) &&
            PerformanceMode.includes(code[0] as PeformanceModeType)
            ? (code as Performance)
            : undefined;
    }

    /** Get the dialog before the current pause */
    getDialog(): Dialog[] | undefined {
        const scene = this.getScene();
        if (scene === undefined) return undefined;
        if (this.pause === 0) return undefined;

        const dialog: Dialog[] = [];
        let pause = 1;
        for (let i = 0; i < scene.lines.length && pause <= this.pause; i++) {
            const line = scene.lines[i];
            if (line === null) pause++;

            if (
                pause === this.pause &&
                line !== null &&
                !PerformanceMode.includes(line[0] as PeformanceModeType)
            )
                dialog.push(line as Dialog);
        }
        return dialog;
    }

    /** Generate a project ID suitable for this point in the tutorial. We save code for each */
    getProjectID() {
        const line = this.getPerformanceLine();
        return `tutorial-${this.act}-${this.scene}${
            line !== undefined ? `-${this.getPerformanceLine()}` : ''
        }`;
    }

    serialize(): TutorialProgress {
        return {
            language: this.tutorial.language,
            region: this.tutorial.region,
            act: this.act,
            scene: this.scene,
            line: this.pause,
        };
    }

    previousScene(): Progress | undefined {
        return this.moveScene(-1) ?? this.moveAct(-1);
    }

    nextScene(): Progress | undefined {
        return this.moveScene(1) ?? this.moveAct(1);
    }

    previousPause(): Progress | undefined {
        return this.movePause(-1) ?? this.moveScene(-1) ?? this.moveAct(-1);
    }

    nextPause(): Progress | undefined {
        return this.movePause(1) ?? this.moveScene(1) ?? this.moveAct(1);
    }

    movePause(direction: -1 | 1): Progress | undefined {
        const scene = this.getScene();
        if (scene === undefined) return undefined;
        if (
            this.pause + direction >= 0 &&
            this.pause + direction <=
                scene.lines.filter((line) => line === null).length + 1
        )
            return new Progress(
                this.tutorial,
                this.act,
                this.scene,
                this.pause + direction,
            );
        else return undefined;
    }

    moveScene(direction: -1 | 1) {
        const act = this.getAct();
        if (act === undefined) return;
        const sceneIndex = this.scene - 1 + direction;
        if (sceneIndex >= 0 && sceneIndex < act.scenes.length) {
            const newScene = act.scenes[sceneIndex];
            return new Progress(
                this.tutorial,
                this.act,
                sceneIndex + 1,
                direction < 0
                    ? newScene.lines.filter((line) => line === null).length + 1
                    : 0,
            );
        } else if (sceneIndex === -1) {
            return new Progress(this.tutorial, this.act, 0, 0);
        } else return undefined;
    }

    moveAct(direction: -1 | 1): Progress | undefined {
        if (this.act + direction === 0)
            return new Progress(this.tutorial, 0, 0, 0);
        const actIndex = this.act - 1 + direction;
        const nextAct = this.tutorial.acts[actIndex];
        if (nextAct === undefined) return undefined;
        else
            return new Progress(
                this.tutorial,
                actIndex + 1,
                direction < 0 ? nextAct.scenes.length : 0,
                direction < 0
                    ? nextAct.scenes[nextAct.scenes.length - 1].lines.filter(
                          (line) => line === null,
                      ).length + 1
                    : 0,
            );
    }

    withLine(line: number) {
        return new Progress(this.tutorial, this.act, this.scene, line);
    }

    getURL(): string {
        return `/learn?locale=${this.getLocale()}&act=${this.act}&scene=${
            this.scene
        }&pause=${this.pause}`;
    }

    static fromURL(
        tutorial: Tutorial,
        params: URLSearchParams,
    ): Progress | undefined {
        // Figure out where we are in the tutorial.
        const act = params.get('act');
        const scene = params.get('scene');
        const pause = params.get('pause');
        if (
            tutorial &&
            act !== null &&
            isFinite(parseInt(act)) &&
            scene !== null &&
            isFinite(parseInt(scene)) &&
            pause !== null &&
            isFinite(parseInt(pause))
        )
            return new Progress(
                tutorial,
                parseInt(act),
                parseInt(scene),
                parseInt(pause),
            );
        else return undefined;
    }
}
