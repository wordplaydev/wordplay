import Setting from '@db/settings/Setting';

/**
 * The language a reader has chosen to read chats in, or null for none (#1214).
 *
 * One choice for every conversation rather than one per chat: someone who reads
 * in English wants every chat in English, and a per-chat map would grow without
 * bound and mean nothing on a chat they have not opened yet.
 *
 * Device-specific, like the camera and microphone: it says how this machine
 * should show things, and it costs nothing to make again elsewhere. Persisting
 * it at all is the point — the translations themselves are cached and cost
 * nothing to show again, so losing only the choice made a reload look like the
 * translations had been thrown away.
 */
export const ChatLanguageSetting = new Setting<string | null>(
    'chatLanguage',
    true,
    null,
    (value) => (typeof value === 'string' ? value : null),
    (current, value) => current === value,
);
