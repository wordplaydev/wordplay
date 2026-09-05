import { canonicalOrigin } from './getPagePreview.js';

/**
 * The sign-in link email (#628).
 *
 * Sent by us rather than by Firebase Auth's built-in sender, so the mail can be
 * in the reader's language and look like Wordplay. The link itself still comes
 * from `generateSignInWithEmailLink`, so nothing about how sign-in works
 * changes — only who puts it in an envelope.
 *
 * The caller passes a locale *code* and never any copy. A callable that took
 * text and mailed it to an arbitrary address would be a phishing relay.
 */

/** Verified in Resend as a subdomain, so its reputation is independent of the
 *  Workspace mail sent from wordplay.dev. */
const From = process.env.SIGNIN_FROM ?? 'Wordplay <hi@mail.wordplay.dev>';
/** Replies go somewhere a person reads. A child who can't sign in will reply to
 *  this mail, and `no-reply@` would drop that on the floor. */
const ReplyTo = process.env.SIGNIN_REPLY_TO ?? 'hi@wordplay.dev';

const FetchTimeoutMs = 5000;
const CacheTtlMs = 10 * 60 * 1000;

/** Where the emailed link lands. `handleCodeInApp` is required for a sign-in
 *  link, and /login is where the client's isSignInWithEmailLink check runs. */
export function signinLinkSettings(): {
    url: string;
    handleCodeInApp: true;
} {
    return { url: `${canonicalOrigin()}/login`, handleCodeInApp: true };
}

export type SigninCopy = {
    subject: string;
    heading: string;
    body: string;
    button: string;
    disclaimer: string;
};

/** What ships when the locale can't be fetched or hasn't been translated yet.
 *  Deliberately complete rather than a template: a half-filled email is worse
 *  than an English one. */
export const DefaultCopy: SigninCopy = {
    subject: 'Your Wordplay sign-in link',
    heading: 'Sign in to Wordplay',
    body: 'Select the button below to sign in. The link works once, and only for a little while.',
    button: 'Sign in',
    disclaimer:
        "If you didn't ask to sign in, you can ignore this email — nobody can get into your account without this link.",
};

/** Strip a write-status marker off a locale value. `$?` means unwritten, `$!`
 *  revised, `$~` machine translated; none of them belongs in an email. */
export function withoutAnnotations(text: string): string {
    return text.replace(/^(\$[?!~])+/, '').trim();
}

const cache = new Map<string, { at: number; copy: SigninCopy }>();

/** The copy in one locale, falling back per field so a partly translated locale
 *  still sends. Cached per instance, since a cold fetch on every sign-in would
 *  add a round trip to the slowest moment in the flow. */
export async function signinCopy(locale?: string): Promise<SigninCopy> {
    if (locale === undefined || !/^[A-Za-z0-9-]{2,20}$/.test(locale))
        return DefaultCopy;
    // en-US has no file to fetch: it is bundled into the app rather than served
    // from /locales, which LocalesDatabase bails on for the same reason. Asking
    // for it lands on the SPA fallback below.
    if (locale === 'en-US') return DefaultCopy;
    const cached = cache.get(locale);
    if (cached !== undefined && Date.now() - cached.at < CacheTtlMs)
        return cached.copy;
    try {
        const response = await fetch(
            `${canonicalOrigin()}/locales/${locale}/${locale}.json`,
            { signal: AbortSignal.timeout(FetchTimeoutMs) },
        );
        if (!response.ok) return DefaultCopy;
        // Hosting rewrites anything it can't find to the SPA shell — with a 200,
        // so `ok` is true and the body is HTML. Parsing that throws, which is
        // how a missing locale used to look like a rendering error in the logs.
        if (
            !(response.headers.get('content-type') ?? '').includes(
                'application/json',
            )
        )
            return DefaultCopy;
        const json: unknown = await response.json();
        const found =
            typeof json === 'object' && json !== null && 'ui' in json
                ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ((json as Record<string, any>).ui?.email?.signin as
                      Record<string, unknown> | undefined)
                : undefined;
        const copy = { ...DefaultCopy };
        for (const field of Object.keys(DefaultCopy) as (keyof SigninCopy)[]) {
            const value = found?.[field];
            if (typeof value === 'string' && withoutAnnotations(value) !== '')
                copy[field] = withoutAnnotations(value);
        }
        cache.set(locale, { at: Date.now(), copy });
        return copy;
    } catch (error) {
        // Stale-on-error rather than failing the send: an unreachable hosting
        // origin must not stop someone signing in.
        console.error(
            `Could not read ${locale} copy for the sign-in email`,
            error,
        );
        return cached?.copy ?? DefaultCopy;
    }
}

function escape(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function renderSigninEmail(
    link: string,
    copy: SigninCopy,
): { subject: string; html: string; text: string } {
    // The URL appears as a button and as text. The button is what most people
    // use; the plain URL is what makes the paste-the-link flow possible when
    // the mail is read on another device or in an installed app, which opens
    // links in a browser whose storage is a separate container on iOS.
    const html = `<!doctype html><html><body style="margin:0;padding:24px;font-family:system-ui,sans-serif;line-height:1.5;color:#111">
<h1 style="font-size:1.25rem;margin:0 0 1rem">${escape(copy.heading)}</h1>
<p style="margin:0 0 1.5rem">${escape(copy.body)}</p>
<p style="margin:0 0 1.5rem"><a href="${escape(link)}" style="display:inline-block;padding:.6rem 1.2rem;background:#e06c00;color:#fff;border-radius:.4rem;text-decoration:none;font-weight:600">${escape(copy.button)}</a></p>
<p style="margin:0 0 1.5rem;font-size:.85rem;color:#555;word-break:break-all">${escape(link)}</p>
<p style="margin:0;font-size:.85rem;color:#555">${escape(copy.disclaimer)}</p>
</body></html>`;
    const text = `${copy.heading}\n\n${copy.body}\n\n${link}\n\n${copy.disclaimer}\n`;
    return { subject: copy.subject, html, text };
}

/** Send the link. Returns whether it went; a failure is logged and swallowed,
 *  because the caller must answer identically whether or not an account exists. */
export async function sendSigninEmail(
    email: string,
    link: string,
    locale: string | undefined,
    apiKey: string,
): Promise<boolean> {
    const copy = await signinCopy(locale);
    const { subject, html, text } = renderSigninEmail(link, copy);

    if (process.env.FUNCTIONS_EMULATOR === 'true') {
        // No key locally, and a test must never depend on outbound mail. The
        // link is printed rather than sent so the sign-in flow can actually be
        // followed by hand: paste it into the browser, or into the login page's
        // own paste field. Safe only because of the guard above — this is a
        // working credential, and it must never be logged in production, where
        // Cloud Logging would keep it.
        //
        // The Auth emulator has also recorded it at
        // /emulator/v1/projects/<project>/oobCodes, which is where
        // tests/end2end/login.spec.ts and join.spec.ts read it from.
        console.log(
            [
                '',
                `┌─ [emulator] sign-in link for ${email}`,
                `│  subject: ${subject}`,
                `│`,
                `│  ${link}`,
                '└─ (not sent; open it, or paste it into the login page)',
                '',
            ].join('\n'),
        );
        return true;
    }

    try {
        // Loaded here rather than at module scope so this module can be
        // imported — and its copy and rendering tested — without the mail SDK
        // present. The root `npm ci` does not install functions/node_modules,
        // so a top-level import fails every unit run in CI. It also keeps the
        // SDK out of the emulator path above, which never sends.
        const { Resend } = await import('resend');
        await new Resend(apiKey).emails.send({
            from: From,
            replyTo: ReplyTo,
            to: email,
            subject,
            html,
            text,
        });
        return true;
    } catch (error) {
        console.error('Could not send a sign-in link', error);
        return false;
    }
}
