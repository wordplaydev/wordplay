import { getContext } from 'svelte';
import { type Class } from '@db/teachers/TeacherDatabase.svelte';

/** The class data for the teach routes, held in Svelte context.
 *
 * Lives here — not in teach/+layout.svelte — so the teach page routes don't
 * import `getTeachData` from a route component. A page node importing from a
 * layout node forms a route-node import cycle (the same shape that crashes
 * WebKit hydration once the graph goes async); keeping this in a plain module
 * severs that edge. */
export const TeachDataSymbol = 'teach';

export function getTeachData() {
    return getContext<TeachData>(TeachDataSymbol);
}

export class TeachData {
    /** Undefined means loading, null means not available, and otherwise a list */
    private classes: Class[] | undefined | null = $state(undefined);

    constructor() {}

    getClasses() {
        return this.classes;
    }

    getClass(id: string) {
        return this.classes === undefined
            ? undefined
            : this.classes === null
              ? null
              : (this.classes.find((c) => c.id === id) ?? null);
    }

    setClasses(classes: Class[] | null) {
        this.classes = classes;
    }
}
