import { Arrangement, type ArrangementType } from '#db/settings/Arrangement.ts';
import { isArrangement } from '#db/settings/Arrangement.ts';
import Setting from '#db/settings/Setting.ts';

export const ArrangementSetting = new Setting<ArrangementType>(
    'arrangement',
    true,
    Arrangement.Responsive,
    (value) =>
        typeof value === 'string' && isArrangement(value) ? value : undefined,
    (current, value) => current == value,
);
