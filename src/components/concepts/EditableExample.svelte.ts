import type Project from '#db/projects/Project.ts';
import {
    IdleKind,
    KeyboardIdleWaitTime,
    setConceptIndex,
    setKeyboardEditIdle,
    setResetKeyboardIdle,
} from '#components/project/Contexts.ts';
import ConceptIndex from '#concepts/ConceptIndex.ts';
import { Projects } from '#db/projects/Projects.ts';
import type Locales from '#locale/Locales.ts';
import { onDestroy, untrack } from 'svelte';
import { writable } from 'svelte/store';

/**
 * Give an editable example its own typing state, isolated from any surrounding
 * project, that returns to idle after a pause as ProjectView's does. An editor
 * marks itself typing on every edit and relies on this timer to say it stopped:
 * without it, conflicts stay hidden and a stage blurs for good after one keystroke.
 * Must be called during component initialization.
 */
export function setExampleKeyboardIdle() {
    const idle = writable<IdleKind>(IdleKind.Idle);
    let timeout: ReturnType<typeof setTimeout> | undefined = undefined;
    setKeyboardEditIdle(idle);
    setResetKeyboardIdle(() => {
        clearTimeout(timeout);
        timeout = setTimeout(
            () => idle.set(IdleKind.Idle),
            KeyboardIdleWaitTime,
        );
    });
    onDestroy(() => clearTimeout(timeout));
}

/**
 * Give an editable example a concept index of its own, which the editor needs to
 * build any menu, and which knows the example's own definitions. Derived values are
 * lazy, so it is built only when the editor first asks — opening a menu, or putting
 * the caret on a node — and an example nobody touches never pays for one.
 * Must be called during component initialization.
 */
export function setExampleConceptIndex(
    project: () => Project,
    locales: () => Locales,
) {
    const index = $derived(ConceptIndex.make(project(), locales(), [], []));
    setConceptIndex({
        get index() {
            return index;
        },
    });
}

/**
 * An example that can be edited in place. Once mounted it is tracked as an
 * ephemeral project, which gives it undo and redo without ever saving it or
 * listing it among anyone's projects. Tracked on mount rather than on the first
 * keystroke so the editor is editable from the start: until then it tells a screen
 * reader it is read only, and offers no menus.
 *
 * Must be constructed during component initialization, since it forgets its edits
 * when the original changes and when its host is destroyed.
 */
export default class EditableExample {
    readonly #original: () => Project | undefined;
    /** The ID of the tracked original, once something has asked to edit it. */
    #tracked = $state<string | undefined>(undefined);

    constructor(original: () => Project | undefined) {
        this.#original = original;
        $effect(() => {
            if (this.#original() !== undefined) untrack(this.edit);
            return () => this.revert();
        });
    }

    /** The current version: the latest edit, or the original if there is none. */
    get current(): Project | undefined {
        const original = this.#original();
        if (original === undefined || this.#tracked !== original.getID())
            return original;
        return Projects.getHistory(original.getID())?.getCurrent() ?? original;
    }

    /** Whether something has asked to edit the current original. */
    get editing(): boolean {
        const original = this.#original();
        return original !== undefined && this.#tracked === original.getID();
    }

    /** Whether the code differs from the original, so there is something to revert. */
    get edited(): boolean {
        const original = this.#original();
        const current = this.current;
        return (
            original !== undefined &&
            current !== undefined &&
            current.getMain().getCode().toString() !==
                original.getMain().getCode().toString()
        );
    }

    /** Make the example editable; also an Editor's `requestEditable`, for an edit before mount finishes. */
    readonly edit = (): boolean => {
        const original = this.#original();
        if (original === undefined) return false;
        if (this.#tracked !== original.getID()) {
            this.revert();
            Projects.trackEphemeral(original);
            this.#tracked = original.getID();
        }
        return true;
    };

    /** Discard every edit and return to the original. */
    readonly revert = () => {
        if (this.#tracked === undefined) return;
        Projects.forget(this.#tracked);
        this.#tracked = undefined;
    };
}
