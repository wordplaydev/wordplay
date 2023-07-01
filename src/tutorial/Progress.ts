import type { TutorialProgress } from '../db/Creator';
import type { Act, Code, Dialog, Scene, Tutorial } from '../locale/Locale';

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

        // Account for invalid acts, scenes, and pauses.
        act = act < 0 ? 0 : act >= tutorial.length ? tutorial.length : act;
        const scenes = act === 0 ? 0 : tutorial[act - 1].scenes.length;
        scene = scene < 0 ? 0 : scene > scenes ? scenes : scene;
        const pauses =
            act === 0 || scene === 0
                ? 0
                : tutorial[act - 1].scenes[scene - 1].lines.filter(
                      (line) => line === null
                  ).length + 1;
        pause = pause < 0 ? 0 : pause > pauses ? pauses : pause;

        this.act = act;
        this.scene = scene;
        this.pause = pause;
    }

    getAct(): Act | undefined {
        return this.tutorial[this.act - 1];
    }

    getScene(): Scene | undefined {
        const act = this.getAct();
        return act?.scenes[this.scene - 1];
    }

    /** Get the latest code before the current pause */
    getCodeLine(): number | undefined {
        const scene = this.getScene();
        if (scene === undefined) return undefined;

        let code: number | undefined = undefined;
        let pause = 0;
        for (let i = 0; i < scene.lines.length && pause < this.pause; i++) {
            const line = scene.lines[i];
            if (line === null) pause++;
            else if (typeof line === 'object' && 'sources' in line) code = i;
        }
        return code;
    }

    getCode(): Code | undefined {
        const act = this.getAct();
        const scene = this.getScene();
        const line = this.getCodeLine();
        const code =
            scene && line !== undefined
                ? scene.lines[line]
                : scene?.program ?? act?.program ?? undefined;
        return code !== null && typeof code === 'object' && 'sources' in code
            ? code
            : undefined;
    }

    /** Get the dialog before the current pause */
    getDialog(): Dialog[] | undefined {
        const scene = this.getScene();
        if (scene === undefined) return undefined;
        if (this.pause === 0) return undefined;

        let dialog: Dialog[] = [];
        let pause = 1;
        for (let i = 0; i < scene.lines.length && pause <= this.pause; i++) {
            const line = scene.lines[i];
            if (line === null) pause++;

            if (
                pause === this.pause &&
                typeof line === 'object' &&
                line !== null &&
                'text' in line
            )
                dialog.push(line);
        }
        return dialog;
    }

    /** Generate a project ID suitable for this point in the tutorial. We save code for each */
    getProjectID() {
        return `${this.act}-${this.scene}-${this.getCodeLine()}`;
    }

    toObject(): TutorialProgress {
        return {
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
                this.pause + direction
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
                    : 0
            );
        } else if (sceneIndex === -1) {
            return new Progress(this.tutorial, this.act, 0, 0);
        } else return undefined;
    }

    moveAct(direction: -1 | 1): Progress | undefined {
        if (this.act + direction === 0)
            return new Progress(this.tutorial, 0, 0, 0);
        const actIndex = this.act - 1 + direction;
        const nextAct = this.tutorial[actIndex];
        if (nextAct === undefined) return undefined;
        else
            return new Progress(
                this.tutorial,
                actIndex + 1,
                direction < 0 ? nextAct.scenes.length : 0,
                direction < 0
                    ? nextAct.scenes[nextAct.scenes.length - 1].lines.filter(
                          (line) => line === null
                      ).length + 1
                    : 0
            );
    }
}
