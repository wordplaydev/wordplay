import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
// Through the relative path, not the `shared-types` specifier: that package's
// `main` points at an `index.js` that does not exist, so a *value* imported by
// name resolves at type-check time and fails at runtime. Type-only imports of
// it are fine, because they are erased.
import {
    EmailNotificationDefaults,
    type EmailNotificationSettings,
} from '../shared/index.js';
import { getHandles } from '../handles.js';
import { UsernameEmailDomain } from '../username.js';
import { renderEmail, type EmailMessage } from './layout.js';
import { sendEmails, type OutgoingEmail } from './send.js';
import { UnsubscribeTo } from './addresses.js';

/**
 * Who may be written to, and the one place that decides.
 *
 * Every step is a refusal, so silence is the default. The load-bearing one is
 * the synthesized address: a creator who is not yet old enough to hold an email
 * address signs in as `<username>@u.wordplay.dev`, which is not a mailbox — so
 * "never email a child" falls out of the data rather than out of a check
 * somebody has to remember. The age gate below is defence in depth, and it is
 * not redundant with a missing `emailEligibleOn`, which means "made before
 * #628, or a class student" rather than "adult".
 *
 * Addresses live only in Firebase Auth and never leave this module.
 */

/** Firebase Auth's ceiling for one `getUsers` call, as `getCreators` uses. */
const AuthBatchSize = 100;

export type Recipient = {
    uid: string;
    email: string;
    /** The reader's first chosen locale, for copy and for `<html lang>`. */
    locale: string | undefined;
};

export function preferenceOf(
    settings: unknown,
    group: keyof EmailNotificationSettings,
): boolean {
    if (typeof settings !== 'object' || settings === null)
        return EmailNotificationDefaults[group];
    const record: Record<string, unknown> = { ...settings };
    const emails = record.emailNotifications;
    if (typeof emails !== 'object' || emails === null)
        return EmailNotificationDefaults[group];
    const chosen: Record<string, unknown> = { ...emails };
    const value = chosen[group];
    return typeof value === 'boolean'
        ? value
        : EmailNotificationDefaults[group];
}

export function localeOf(settings: unknown): string | undefined {
    if (typeof settings !== 'object' || settings === null) return undefined;
    const record: Record<string, unknown> = { ...settings };
    const locales = record.locales;
    if (!Array.isArray(locales)) return undefined;
    const first = locales[0];
    return typeof first === 'string' ? first : undefined;
}

/** What is known about one possible recipient when deciding whether to write. */
export type Candidate = {
    /** Their Firebase Auth address, which is the only address of record. */
    email: string | undefined;
    emailVerified: boolean;
    /** `handles/{uid}.emailEligibleOn`. Absent means "made before #628, or a
     *  class student" — which is NOT the same as "old enough". */
    emailEligibleOn: number | undefined;
    /** Their `creators/{uid}` document, unparsed. */
    settings: unknown;
};

/**
 * Whether to write to this person, as one decision.
 *
 * Every step is a refusal, so silence is the default. The load-bearing one is
 * the synthesized address: a creator not yet old enough to hold an email
 * address signs in as `<username>@u.wordplay.dev`, which receives no mail — so
 * "never email a child" falls out of the data rather than out of a check
 * somebody has to remember. The age gate is defence in depth behind it.
 */
export function mayEmail(
    who: Candidate,
    group: keyof EmailNotificationSettings,
    now: number = Date.now(),
): boolean {
    const email = who.email ?? '';
    if (email === '') return false;
    if (email.endsWith(UsernameEmailDomain)) return false;
    if (!who.emailVerified) return false;
    if (who.emailEligibleOn !== undefined && who.emailEligibleOn > now)
        return false;
    return preferenceOf(who.settings, group);
}

/**
 * The subset of these creators who may and want to receive mail of this kind.
 *
 * Batched throughout — one Auth call per hundred, one `getAll` for settings,
 * one for handles. Reporting something notifies every curator of a gallery, so
 * a per-recipient round trip here would be thirty of each.
 */
export async function eligibleRecipients(
    uids: string[],
    group: keyof EmailNotificationSettings,
    now: number = Date.now(),
): Promise<Recipient[]> {
    const unique = [...new Set(uids)];
    if (unique.length === 0) return [];

    const db = getFirestore();
    const auth = getAuth();

    const users = new Map<string, { email: string; verified: boolean }>();
    for (let start = 0; start < unique.length; start += AuthBatchSize) {
        const chunk = unique.slice(start, start + AuthBatchSize);
        const found = await auth.getUsers(chunk.map((uid) => ({ uid })));
        // Kept whole here; `mayEmail` below is what decides. Filtering twice
        // would be two places to change the rule.
        for (const user of found.users)
            if (user.email !== undefined)
                users.set(user.uid, {
                    email: user.email,
                    verified: user.emailVerified,
                });
    }
    if (users.size === 0) return [];

    const addressed = [...users.keys()];
    const settings = await db.getAll(
        ...addressed.map((uid) => db.collection('creators').doc(uid)),
    );
    const handles = await getHandles(addressed);

    const recipients: Recipient[] = [];
    for (const [index, uid] of addressed.entries()) {
        const found = users.get(uid);
        if (found === undefined) continue;
        const data = settings[index]?.data();
        const who: Candidate = {
            email: found.email,
            emailVerified: found.verified,
            emailEligibleOn: handles.get(uid)?.emailEligibleOn,
            settings: data,
        };
        if (!mayEmail(who, group, now)) continue;
        recipients.push({ uid, email: found.email, locale: localeOf(data) });
    }
    return recipients;
}

/**
 * Write to everyone who may hear it. `build` runs per recipient, because the
 * language and the link are theirs; the send is one request per hundred.
 *
 * Returns how many were written to, so a caller can log a fan-out without
 * learning any address.
 */
export async function notifyByEmail(
    uids: string[],
    group: keyof EmailNotificationSettings,
    build: (recipient: Recipient) => Promise<EmailMessage>,
): Promise<number> {
    const recipients = await eligibleRecipients(uids, group);
    if (recipients.length === 0) return 0;

    const emails: OutgoingEmail[] = [];
    for (const recipient of recipients) {
        const { subject, html, text } = renderEmail(await build(recipient));
        emails.push({
            to: recipient.email,
            subject,
            html,
            text,
            // Optional mail, so a client may offer to stop it. The visible way
            // to choose is the profile page, which the footer links to.
            unsubscribe: UnsubscribeTo,
        });
    }
    await sendEmails(emails);
    return emails.length;
}
