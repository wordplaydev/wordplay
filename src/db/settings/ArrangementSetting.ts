import { Arrangement, type ArrangementType } from '@db/settings/Arrangement';
import Setting from '@db/settings/Setting';

export const ArrangementSetting = new Setting<ArrangementType>(
    'arrangement',
    true,
    Arrangement.Responsive,
    (value) =>
        typeof value === 'string' &&
        Object.values<string>(Arrangement).includes(value)
            ? (value as ArrangementType)
            : undefined,
    (current, value) => current == value,
);
