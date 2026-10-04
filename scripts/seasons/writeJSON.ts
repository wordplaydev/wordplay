import { renameSync, writeFileSync } from 'fs';

/** Write JSON through a temp file and rename, so an interrupted run can't
 *  leave a truncated file behind. */
export function writeFormatted(path: string, value: unknown) {
    const temp = `${path}.tmp`;
    writeFileSync(temp, JSON.stringify(value) + '\n');
    renameSync(temp, path);
}
