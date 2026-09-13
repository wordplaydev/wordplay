import { canonicalOrigin } from '../../origin.js';
import { renderEmail, type EmailMessage } from '../layout.js';

/**
 * Feedback, mailed to whoever reads `hi@`.
 *
 * English only, deliberately: it has exactly one reader, and a locale section
 * for it would buy thirty machine translations nobody will ever see.
 *
 * The old version interpolated the creator's title and description straight
 * into HTML. Anyone signed in can create a feedback document, so that was live
 * HTML injection into the maintainer's inbox; `renderEmail` escapes every
 * block, and the caps below bound what one report can weigh.
 */

/** Long enough for a real description, short enough that a paste of a whole
 *  console log doesn't arrive as a wall. */
const MaxFieldLength = 4000;

function clip(value: unknown, max = MaxFieldLength): string | undefined {
    if (typeof value !== 'string') return undefined;
    const text = value.trim();
    if (text === '') return undefined;
    return text.length > max ? `${text.slice(0, max)}…` : text;
}

/**
 * Where to read this feedback in the app.
 *
 * `?dialog=feedback` opens the dialog; `&feedback=<id>` picks the entry out of
 * the list it holds and opens it. Locale-less, like every other link we send:
 * the app resolves the reader's own language on arrival.
 */
export function feedbackURL(id: string): string {
    return `${canonicalOrigin()}/?dialog=feedback&feedback=${encodeURIComponent(id)}`;
}

export function feedbackMessage(
    feedback: {
        title?: unknown;
        description?: unknown;
        type?: unknown;
        url?: unknown;
        browser?: unknown;
    },
    /** The document's own id, which the trigger always has as
     *  `event.params.id`. Required rather than optional: when it was optional,
     *  the contact sheet's sample quietly left it out and rendered a version of
     *  this email with no link in it — which is not a version anyone is sent. */
    id: string,
): EmailMessage {
    const title = clip(feedback.title, 200) ?? 'Untitled';
    const description = clip(feedback.description) ?? '';
    // Read defensively off the raw document: `Feedback` is a zod type in
    // `src/`, which `functions/` cannot import.
    const kind = clip(feedback.type, 40);
    const url = clip(feedback.url, 500);
    const browser = clip(feedback.browser, 500);

    return {
        subject: `New feedback: ${title}`,
        language: 'en-US',
        preheader: description,
        blocks: [
            // A category, then the report. The title can be a whole sentence,
            // and a tilted heading is the wrong place for one.
            { kind: 'heading', text: 'New feedback' },
            { kind: 'field', label: 'About', value: title },
            { kind: 'paragraph', text: description },
            ...(kind === undefined
                ? []
                : ([{ kind: 'field', label: 'Kind', value: kind }] as const)),
            ...(url === undefined
                ? []
                : ([{ kind: 'field', label: 'Where', value: url }] as const)),
            ...(browser === undefined
                ? []
                : ([
                      { kind: 'field', label: 'Browser', value: browser },
                  ] as const)),
            // Straight to the entry, rather than to the list: whoever reads
            // hi@ is going to reply to it or act on it.
            {
                kind: 'button',
                label: 'Read it in Wordplay',
                url: feedbackURL(id),
            },
            { kind: 'url', url: feedbackURL(id) },
        ],
        manageURL: undefined,
        manageLabel: undefined,
    };
}

export function renderFeedbackEmail(
    feedback: {
        title?: unknown;
        description?: unknown;
        type?: unknown;
        url?: unknown;
        browser?: unknown;
    },
    id: string,
): { subject: string; html: string; text: string } {
    return renderEmail(feedbackMessage(feedback, id));
}
