import type { SerializedLayout } from '../../components/project/Layout';
import Setting from './Setting';

export const LayoutsSetting = new Setting<Record<string, SerializedLayout>>(
    'layouts',
    true,
    {},
    (value) =>
        value != null &&
        value.constructor.name === 'Object' &&
        Array.from(Object.keys(value)).every((key) => typeof key === 'string')
            ? (value as Record<string, SerializedLayout>)
            : undefined,
    (current, value) => current === value,
);
