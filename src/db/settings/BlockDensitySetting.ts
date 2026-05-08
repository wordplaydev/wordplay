import Setting from '@db/settings/Setting';

export type BlockDensity = 'compact' | 'normal' | 'spacious';

const Densities: BlockDensity[] = ['compact', 'normal', 'spacious'];

export const BlockDensitySetting = new Setting<BlockDensity>(
    'blockDensity',
    true,
    'normal',
    (value) =>
        typeof value === 'string' && (Densities as string[]).includes(value)
            ? (value as BlockDensity)
            : 'normal',
    (current, value) => current === value,
);
