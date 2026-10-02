import { withMonoEmoji } from '#unicode/emoji.ts';
import Setting from '#db/settings/Setting.ts';

export const NotificationsIcons = ['🔔', '🔕'].map((i) => withMonoEmoji(i));

export const HowToNotificationsSetting = new Setting<boolean>(
    'howToNotifications',
    false,
    true,
    (value) => (typeof value === 'boolean' ? value : false),
    (current, value) => current === value,
);
