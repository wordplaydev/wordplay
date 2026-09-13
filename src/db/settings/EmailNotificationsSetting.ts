import Setting from '@db/settings/Setting';
import type { EmailNotificationSettings } from 'shared-types';

/**
 * Which kinds of email a creator wants.
 *
 * Three groups rather than a switch per notice kind, because the question
 * someone is really answering is "why would you write to me", and there are
 * three honest answers: a decision about their own work, work waiting for them
 * to review, and other people being active. Mirrors
 * `EmailNotificationSettings` in functions/src/shared/index.ts, which the
 * server reads off `creators/{uid}`; `emailNotificationsSync.test.ts` holds the
 * two to one shape.
 *
 * A preference rather than server state, which is why it may live here at all:
 * `creators/{uid}` is client-writable and overwritten wholesale on every
 * settings change, so anything the *server* had to trust would be both
 * forgeable and clobbered. Forging this only changes your own inbox.
 */
export const EmailNotificationDefaults: Required<EmailNotificationSettings> = {
    decisions: true,
    reviews: true,
    activity: false,
};

function validate(value: unknown): EmailNotificationSettings | undefined {
    if (typeof value !== 'object' || value === null) return undefined;
    const record: Record<string, unknown> = { ...value };
    const chosen: EmailNotificationSettings = {};
    for (const group of ['decisions', 'reviews', 'activity'] as const) {
        const setting = record[group];
        if (typeof setting === 'boolean') chosen[group] = setting;
    }
    return chosen;
}

export const EmailNotificationsSetting = new Setting<EmailNotificationSettings>(
    'emailNotifications',
    // Not device-specific: whether Wordplay writes to you is true of you, not
    // of the laptop you happened to choose it on.
    false,
    {},
    (value) => validate(value) ?? {},
    (current, value) =>
        (['decisions', 'reviews', 'activity'] as const).every(
            // Read through an optional chain: `Setting.set` compares before
            // validating, so either side can be whatever was stored.
            (group) => current?.[group] === value?.[group],
        ),
);

/** What a group does when a creator has never chosen. */
export function wants(
    settings: EmailNotificationSettings,
    group: keyof EmailNotificationSettings,
): boolean {
    return settings[group] ?? EmailNotificationDefaults[group];
}
