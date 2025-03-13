import Setting from './Setting';

export const BlocksSetting = new Setting<boolean>(
    'blocks',
    true,
    false,
    // Deactivating blocks mode for now; it's too unstable.
    (value) => false, //(typeof value === 'boolean' ? value : false),
    (current, value) => current === value,
);
