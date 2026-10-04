import { readFileSync } from 'fs';
import { format, resolveConfig } from 'prettier';
import { expect, test } from 'vitest';
import { readNormals, toZoneTable, ZoneTablePath } from './zoneTable.ts';

/**
 * The zone table Auto resolves seasons from (#108) is derived from the
 * committed climate normals by classify.ts. A hand edit, or a change to the
 * rules without regenerating, would make what ships disagree with what the
 * rules say — so this regenerates it and compares. Fix with
 * `npm run seasons-build`.
 */
test('src/seasons/zoneSeasons.generated.ts matches the climate normals', async () => {
    const config = (await resolveConfig(ZoneTablePath)) ?? {};
    const expected = await format(toZoneTable(readNormals()), {
        ...config,
        filepath: ZoneTablePath,
    });
    expect(readFileSync(ZoneTablePath, 'utf-8')).toBe(expected);
});
