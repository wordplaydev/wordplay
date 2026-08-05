import type { AnnouncementKind } from '@components/project/announcerQueue';
import type Locales from '@locale/Locales';
import type { LocaleTextAccessor, TemplateInput } from '@locale/Locales';

/**
 * How a successful command invocation is heard by a screen reader user.
 *
 * Every command must guarantee some audible result — silence after a keystroke
 * is indistinguishable from a broken app (see the invariant in Commands.test.ts
 * and CLAUDE.md's Screen-reader announcements section). Commands that change
 * the caret or the code are already covered by the editor's caret and echo
 * announcements; the rest declare a confirmation here.
 *
 * There is deliberately no way to declare "no feedback", and no way to pass a
 * raw string: confirmations are localized like all other user-visible text.
 */
export type CommandFeedback =
    /** The resulting caret or edit announcement conveys it. */
    | 'caret'
    /** The character echo conveys it (typing commands). */
    | 'echo'
    /** Focus moves to a labeled element, which the screen reader reads. */
    | 'focus'
    /** The state layer this command drives announces it, so every entry point
     *  into that state (command, toolbar, settings) sounds the same. */
    | 'delegated'
    /** A confirmation to announce. */
    | FeedbackText
    /** A confirmation computed from the context at invocation time. */
    | ((context: FeedbackContext) => FeedbackText);

/** Localized confirmation text, plus which lane should carry it. */
export type FeedbackText = {
    /** The locale string to announce. */
    path: LocaleTextAccessor;
    /** Named inputs, when `path` is a template. */
    inputs?: Record<string, TemplateInput>;
    /** Defaults to 'command' (queued, never dropped). Use 'command-state' for
     *  feedback whose value changes as a key repeats (zoom, stepping), so only
     *  the latest is heard, and 'fold' to join existing fold announcements. */
    kind?: AnnouncementKind;
};

/** What a feedback function may read. Deliberately narrow: a confirmation
 *  describes what just happened, so it needs the state, not the machinery. */
export type FeedbackContext = {
    locales: Locales;
    zoom: number | undefined;
    blocks: boolean;
    getMode?: (() => string) | undefined;
    /** Text the command just copied, cut, or pasted, when applicable. */
    text?: string | undefined;
    /** How many items the command's result concerns (matches, suggestions). */
    count?: number | undefined;
    /** Which item of `count`, when the command selected one. */
    index?: number | undefined;
    /** Where an evaluation step command landed, when it stepped. */
    step?: { index: number; node: string } | undefined;
};

/** Resolve a command's declared feedback into an announcement, or undefined
 *  when the command's feedback comes from somewhere else (caret, echo, focus,
 *  or the state layer it drives). */
export function resolveFeedback(
    feedback: CommandFeedback | undefined,
    context: FeedbackContext,
): { kind: AnnouncementKind; text: string } | undefined {
    if (
        feedback === undefined ||
        feedback === 'caret' ||
        feedback === 'echo' ||
        feedback === 'focus' ||
        feedback === 'delegated'
    )
        return undefined;

    const result =
        typeof feedback === 'function' ? feedback(context) : feedback;
    return {
        kind: result.kind ?? 'command',
        text:
            result.inputs === undefined
                ? context.locales.getPrimaryPlainText(result.path)
                : context.locales
                      // Resolve the accessor to its raw template first: the
                      // typed concretize overload needs a literal Template
                      // path, which a generic accessor isn't.
                      .concretize(
                          context.locales.getTextStructure(result.path),
                          result.inputs,
                      )
                      .toText(),
    };
}
