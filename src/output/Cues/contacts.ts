/**
 * Physics contacts, on their way to becoming a sound.
 *
 * Audible cues otherwise name *re-evaluations*, which means a program that
 * doesn't evaluate `Collision()` bounces in silence — `Physics.report()` hands
 * every contact to the Collision streams and there are none, so nothing is
 * heard however much is happening on stage. Contacts are reported here as
 * well, independently of whether a stream is watching.
 *
 * Deliberately free of `@db` and of Web Audio, so Physics can keep being tested
 * under Node, and keyed by evaluator so a docs page full of previews can never
 * cue a creator's project.
 */

/** One contact worth hearing. */
export type Contact = {
    /** How hard it was, 0-1, from the solver's own contact impulse. */
    strength: number;
};

type Listener = (contacts: Contact[]) => void;

/** Weak, since evaluators are replaced on every revision and must not be held
 * alive by a listener that outlived its view. */
const listeners = new WeakMap<object, Listener>();

/** Listen to one evaluator's contacts. Returns the unsubscribe. */
export function onContacts(evaluator: object, listen: Listener): () => void {
    listeners.set(evaluator, listen);
    return () => {
        if (listeners.get(evaluator) === listen) listeners.delete(evaluator);
    };
}

/** Report contacts from one evaluator's physics. A no-op when nothing is
 * listening, which is the common case — nothing is computed for a stage no one
 * is cueing. */
export function reportContacts(evaluator: object, contacts: Contact[]): void {
    if (contacts.length === 0) return;
    listeners.get(evaluator)?.(contacts);
}

/** Whether anything is listening to this evaluator, so Physics can skip the
 * impulse arithmetic entirely when no one is. */
export function listeningForContacts(evaluator: object): boolean {
    return listeners.has(evaluator);
}
