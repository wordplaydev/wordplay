import Setting from '@db/settings/Setting';

/** When true, pressing Tab in the editor inserts a tab character instead of
 *  switching keyboard focus. Device-local, like the other editor display
 *  preferences. Defaults to false to preserve WCAG keyboard navigation. */
export const TabSetting = new Setting<boolean>(
    'tab',
    true,
    false,
    (value) => (typeof value === 'boolean' ? value : undefined),
    (current, value) => current === value,
);
