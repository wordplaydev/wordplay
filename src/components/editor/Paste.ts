import Templates from '@concepts/Templates';
import type Conflict from '@conflicts/Conflict';
import type Project from '@db/projects/Project';
// Type-only: we only call methods on the passed Caret instance, so this stays erased at runtime and
// can't form a cycle with Caret -> Commands.
import type Caret from '@edit/caret/Caret';
import type Locales from '@locale/Locales';
import type Source from '@nodes/Source';
import {
    type EditorNotification,
    type EditorNotifier,
    PasteFeedbackNotification,
} from './EditorNotification';

/**
 * Build a footer notification explaining the first conflict a blocks-mode paste would introduce, so a
 * rejected paste can say why — the same "explain, don't just block" feedback the drag system gives.
 * The conflicts reference nodes in `newSource` (the source the rejected paste would have produced), so
 * we resolve their message against a project that contains it. Returns undefined when there's nothing
 * to explain.
 */
function pasteConflictNotification(
    conflicts: Conflict[],
    newSource: Source,
    project: Project,
    oldSource: Source,
    locales: Locales,
): EditorNotification | undefined {
    const conflict = conflicts[0];
    if (conflict === undefined) return undefined;
    const newProject = project.withSource(oldSource, newSource);
    const context = newProject.getContext(newSource);
    const nodes = conflict.getMessage(context, Templates);
    return {
        id: PasteFeedbackNotification,
        content: {
            // Frame the conflict message so it's clear what it's about.
            prefix: (l) => l.ui.source.feedback.cantPaste,
            markup: nodes.explanation(
                locales,
                newProject.getNodeContext(nodes.node) ?? context,
            ),
        },
        // A rejected paste is always a block (Error conflict), so render it as an error, not a warning.
        variant: 'error',
    };
}

/**
 * The single entry point for pasting text at the caret, shared by every paste source (the
 * internal-clipboard fast path and the Paste command). It inserts the text and, when blocks mode
 * rejects it for introducing a conflict, explains why at the bottom of the editor — the same channel
 * drag feedback uses — instead of the generic "would create an error" message.
 *
 * Returns the resulting edit (apply it), a rejection `LocaleTextAccessor` (show it), or `true` when a
 * specific explanation was shown (handled — suppress the generic message).
 */
export function pasteText(
    text: string,
    caret: Caret,
    project: Project,
    blocks: boolean,
    locales: Locales,
    notify: EditorNotifier | undefined,
): ReturnType<Caret['insert']> | true {
    let explained = false;
    const result = caret.insert(
        text,
        blocks,
        project,
        false,
        (conflicts, newSource) => {
            const notification = pasteConflictNotification(
                conflicts,
                newSource,
                project,
                caret.source,
                locales,
            );
            if (notification) {
                notify?.set(notification);
                explained = true;
            }
        },
    );
    // A successful paste dismisses any stale paste-rejection notification.
    if (typeof result !== 'function') notify?.clear(PasteFeedbackNotification);
    // Suppress the generic "would create an error" message when we showed a specific explanation.
    return explained && typeof result === 'function' ? true : result;
}
