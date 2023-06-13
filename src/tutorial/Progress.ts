import type { TutorialProgress } from '../db/Creator';
import type { Act, Code, Dialog, Scene, Tutorial } from '../locale/Locale';

export default class Progress {
    readonly tutorial: Tutorial;
    /** The act number, 1-indexed */
    readonly act: number;
    /** The scene number, 1-indexed */
    readonly scene: number;
    /** The pause stopped at, 1-indexed, representing the nth pause in the scene */
    readonly pause: number;

    constructor(tutorial: Tutorial, act: number, scene: number, pause: number) {
        this.tutorial = tutorial;
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
        const scene = this.getScene();
        const line = this.getCodeLine();
        const code =
            scene && line !== undefined ? scene.lines[line] : undefined;
        return code !== null && typeof code === 'object' && 'sources' in code
            ? code
            : undefined;
    }

    /** Get the dialog before the current pause */
    getDialog(): Dialog[] | undefined {
        const scene = this.getScene();
        if (scene === undefined) return undefined;

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
        if (scene === undefined) return;
        if (
            this.pause + direction >= 1 &&
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
                direction < 0 ? newScene.lines.length : 0
            );
        } else return undefined;
    }

    moveAct(direction: -1 | 1): Progress | undefined {
        const actIndex = this.act + direction;
        const nextAct = this.tutorial[this.act + direction];
        if (nextAct === undefined) return undefined;
        return new Progress(
            this.tutorial,
            actIndex + 1,
            direction < 0 ? nextAct.scenes.length : 1,
            1
        );
    }
}
