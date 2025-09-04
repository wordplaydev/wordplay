import fs from 'fs';
import Log from './Log';

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
                log.bad(2, "Locale isn't an object");
                return undefined;
            }
        } catch (err) {
            log.bad(2, `Locale file has a parsing error: ${err}`);
            process.exit();
        }
    } catch (err) {
        return undefined;
    }
}
