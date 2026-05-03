import Setting from '@db/settings/Setting';

export const AnnotationsSetting = new Setting<boolean>(
    'annotations',
    false,
    true,
    (value) => (typeof value === 'boolean' ? value : undefined),
    (current, value) => current === value,
);
