import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '@conflicts/Conflict';
import { SHARING_DIALOG_SYMBOL } from '@parser/Symbols';
import { ShareDialogID } from '@components/widgets/dialogIDs';
import type LocaleText from '@locale/LocaleText';
import type { Template } from '@locale/LocaleText';
import type Locales from '@locale/Locales';
import type { ConflictText } from '@locale/NodeTexts';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';

/** What all of these say: what is missing, and where to put it. */
type PublishedShareLocaleAccessor = (
    locale: LocaleText,
) => ConflictText & { resolution: Template<[]> };

/**
 * Something a source owes its readers, once other people can read it (#8).
 *
 * All `Minor`, deliberately: an error-level conflict would make the project count as
 * broken and block blocks-mode edits, for code that runs perfectly — `UnusedBind` is the
 * right company. And all explain rather than repair, since no repair can write someone's
 * explanation for them, so each points at where the words go and at the dialog, which is
 * where the one fix outside the code lives.
 */
export default abstract class PublishedShareConflict extends Conflict {
    /** What the annotation speaks from, and what the resolution focuses. */
    readonly subject: Node;

    constructor(subject: Node) {
        super(ConflictSeverity.Minor);
        this.subject = subject;
    }

    abstract getLocalePath(): PublishedShareLocaleAccessor;

    getMessage() {
        const path = this.getLocalePath();
        return {
            node: this.subject,
            explanation: (locales: Locales) =>
                locales.concretize((l) => path(l).explanation),
        };
    }

    override getResolutions(_context: Context, _concepts: Node[]): Resolutions {
        const path = this.getLocalePath();
        return [
            {
                kind: 'explain',
                description: (locales: Locales) =>
                    locales.concretize((l) => path(l).resolution),
                focusNode: this.subject,
                openDialog: ShareDialogID,
                openDialogIcon: SHARING_DIALOG_SYMBOL,
                openDialogLabel: (l) => l.ui.dialog.share.header,
            },
        ];
    }
}
