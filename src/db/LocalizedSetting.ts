import Setting from './Setting';

export type LocalizedValue = 'actual' | 'localized' | 'symbolic';

export const LocalizedSetting = new Setting<LocalizedValue>(
    'localized',
    true,
    'localized',
    (value) =>
        // An old boolean value? Convert to one of the three states.
        typeof value === 'boolean'
            ? value
                ? 'localized'
                : 'actual'
            : // A string value? Check if it's one of the three states, and default to localized if not.
              typeof value === 'string' &&
                (value === 'actual' ||
                    value === 'localized' ||
                    value === 'symbolic')
              ? undefined
              : // Some other mystery type? Default to localized.
                'localized',
    (current, value) => current === value,
);
