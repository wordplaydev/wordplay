import { Arrangement, type ArrangementType } from '@db/settings/Arrangement';
import { isArrangement } from '@db/settings/Arrangement';
import Setting from '@db/settings/Setting';

export const ArrangementSetting = new Setting<ArrangementType>(
    'arrangement',
    true,
    Arrangement.Responsive,
    (value) =>
        typeof value === 'string' && isArrangement(value) ? value : undefined,
    (current, value) => current == value,
);
