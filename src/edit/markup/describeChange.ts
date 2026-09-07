import type Caret from '@edit/caret/Caret';
import { enclosingExample, spanOf } from '@edit/markup/formatOperations';
import type Locales from '@locale/Locales';
import type { LocaleTextAccessor } from '@locale/Locales';
import Paragraph from '@nodes/Paragraph';
import Words, { type Format } from '@nodes/Words';
import { FormatSymbols } from '@edit/markup/formatOperations';

/**
 * What to say after a markup editing command, derived by comparing the caret
 * before and after rather than declared per command.
 *
 * Two reasons it works this way. A toggle's announcement must name **which**
 * direction it went — "bold on" and "bold off" are different events, and a
 * constant "formatted" is heard once and then sounds broken (see CLAUDE.md's
 * varying-text rule). And deriving it from state rather than from the keystroke
 * means the toolbar button, the shortcut, and any future path all sound the same,
 * which is what `Command.feedback`'s `'delegated'` is for.
 */

/** The formats enclosing the caret, innermost first. */
export function formatsAt(caret: Caret): Format[] {
    const span = spanOf(caret);
    if (span === undefined) return [];
    const source = caret.source;
    const token =
        source.getTokenAt(span[0], false) ?? source.getTokenAt(span[0], true);
    if (token === undefined) return [];
    const enclosing = [token, ...source.root.getAncestors(token)]
        .filter((n): n is Words => n instanceof Words)
        .map((w) => w.getFormat())
        .filter((f): f is Format => f !== undefined);

    // A just-opened run reads as an escape, not a format: doubling a markup
    // symbol escapes it, so `**` with the caret between lexes as one `Sym.Words`
    // holding a literal asterisk. It becomes `*text*` the moment anything is
    // typed there, so to the creator the format is already on — and the
    // announcement has to say so, since turning bold on with nothing selected is
    // the ordinary way to use it.
    const nascent = nascentFormatAt(caret);
    return nascent === undefined ? enclosing : [nascent, ...enclosing];
}

/**
 * The format of an empty delimiter pair the caret sits inside, if any.
 *
 * Read from the graphemes on either side of the caret rather than from a token:
 * a doubled symbol is an escape, so `hello **world` is one `Sym.Words` token and
 * the pair has no node of its own to inspect.
 */
function nascentFormatAt(caret: Caret): Format | undefined {
    const span = spanOf(caret);
    if (span === undefined || span[0] !== span[1]) return undefined;
    const code = caret.source.getCode();
    const before = code.at(span[0] - 1);
    const after = code.at(span[0]);
    if (before === undefined || before !== after) return undefined;
    const entry = Object.entries(FormatSymbols).find(
        ([, symbol]) => before === symbol,
    );
    return entry === undefined ? undefined : (entry[0] as Format);
}

/** Whether the caret's paragraph is a bulleted one. */
export function bulletedAt(caret: Caret): boolean {
    const span = spanOf(caret);
    if (span === undefined) return false;
    const source = caret.source;
    const token =
        source.getTokenAt(span[0], false) ?? source.getTokenAt(span[0], true);
    if (token === undefined) return false;
    const paragraph = [token, ...source.root.getAncestors(token)].find(
        (n): n is Paragraph => n instanceof Paragraph,
    );
    return paragraph?.isBulleted() ?? false;
}

/** The word a locale uses for a format, for substitution into the feedback. */
function formatWord(format: Format): LocaleTextAccessor {
    return format === 'italic'
        ? (l) => l.token.Italic
        : format === 'bold'
          ? (l) => l.token.Bold
          : format === 'extra'
            ? (l) => l.token.Extra
            : format === 'underline'
              ? (l) => l.token.Underline
              : (l) => l.token.Light;
}

/**
 * The announcement for a markup edit, or undefined when nothing observable
 * changed — silence is the signal for no change, not for a broken app.
 */
export default function describeMarkupChange(
    before: Caret,
    after: Caret,
    locales: Locales,
): string | undefined {
    const was = new Set(formatsAt(before));
    const now = new Set(formatsAt(after));

    const added = [...now].find((f) => !was.has(f));
    if (added !== undefined)
        return locales
            .concretize((l) => l.ui.markup.feedback.formatOn, {
                format: locales.getPrimaryPlainText(formatWord(added)),
            })
            .toText();

    const removed = [...was].find((f) => !now.has(f));
    if (removed !== undefined)
        return locales
            .concretize((l) => l.ui.markup.feedback.formatOff, {
                format: locales.getPrimaryPlainText(formatWord(removed)),
            })
            .toText();

    const bulletWas = bulletedAt(before);
    const bulletNow = bulletedAt(after);
    if (bulletWas !== bulletNow)
        return locales.getPrimaryPlainText((l) =>
            bulletNow
                ? l.ui.markup.feedback.bulletOn
                : l.ui.markup.feedback.bulletOff,
        );

    const exampleBefore = enclosingExample(before);
    const exampleAfter = enclosingExample(after);

    // An example appeared where there was none: the code-example command.
    if (exampleBefore === undefined && exampleAfter !== undefined)
        return locales.getPrimaryPlainText((l) => l.ui.markup.feedback.example);

    if (exampleBefore !== undefined && exampleAfter !== undefined) {
        const starredWas = exampleBefore.highlight !== undefined;
        const starredNow = exampleAfter.highlight !== undefined;
        if (starredWas !== starredNow)
            return locales.getPrimaryPlainText((l) =>
                starredNow
                    ? l.ui.markup.feedback.highlightOn
                    : l.ui.markup.feedback.highlightOff,
            );
        const defectWas = exampleBefore.defect !== undefined;
        const defectNow = exampleAfter.defect !== undefined;
        if (defectWas !== defectNow)
            return locales.getPrimaryPlainText((l) =>
                defectNow
                    ? l.ui.markup.feedback.defectOn
                    : l.ui.markup.feedback.defectOff,
            );
    }

    return undefined;
}
