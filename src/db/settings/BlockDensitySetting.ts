import Setting from '@db/settings/Setting';
import { includesString } from '@util/nullable';

export type BlockDensity = 'compact' | 'normal' | 'spacious';

const Densities: BlockDensity[] = ['compact', 'normal', 'spacious'];

export const BlockDensitySetting = new Setting<BlockDensity>(
    'blockDensity',
    true,
    'normal',
    (value) =>
        typeof value === 'string' && includesString(Densities, value)
            ? value
            : 'normal',
    (current, value) => current === value,
);
