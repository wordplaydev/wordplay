import Arrangement from './Arrangement';
import Setting from './Setting';

export const ArrangementSetting = new Setting<Arrangement>(
    'arrangement',
    true,
    Arrangement.Responsive,
    (value) =>
        typeof value === 'string' &&
        Object.values<string>(Arrangement).includes(value)
            ? (value as Arrangement)
            : undefined,
    (current, value) => current == value
);
