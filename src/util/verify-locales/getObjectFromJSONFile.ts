import fs from 'fs';
import Log from '@util/verify-locales/Log';

/** Given a path, load a JSON file and ensure it's an object, not some other kind of value. */
export function getObjectFromJSONFile(
    log: Log,
    path: string,
): object | undefined {
    try {
        const localeText = fs.readFileSync(path, 'utf8');
        try {
            const localeObject = JSON.parse(localeText);
            if (
                typeof localeObject === 'object' &&
                !Array.isArray(localeObject) &&
                localeObject !== null
            )
                return localeObject;
            else {
                log.bad("Locale isn't an object");
                return undefined;
            }
        } catch (err) {
            // Exit non-zero: this reported an error and then exited 0, so a
            // locale file with a JSON parse error passed CI silently.
            log.bad(`Locale file ${path} has a parsing error: ${err}`);
            process.exit(1);
        }
    } catch (err) {
        return undefined;
    }
}
