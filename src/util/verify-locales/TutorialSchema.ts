import fs from 'fs';
import path from 'path';
import type Tutorial from '../../tutorial/Tutorial';
import { getObjectFromJSONFile } from './getObjectFromJSONFile';
import Log from './Log';

// Read the tutorial schema.
const TutorialSchema = JSON.parse(
    fs.readFileSync('static/schemas/Tutorial.json', 'utf8'),
);
export default TutorialSchema;

/** Get a tutorial path from a locale name. */
export function getTutorialPath(locale: string) {
    return path.join('static', 'locales', locale, `${locale}-tutorial.json`);
}

/** Get the tutorial JSON fro the given locale. */
export function getTutorialJSON(
    log: Log,
    locale: string,
): Tutorial | undefined {
    return getObjectFromJSONFile(log, getTutorialPath(locale)) as Tutorial;
}

// Get the default tutorial. We use this for translation.
export const DefaultTutorial = getTutorialJSON(new Log(), 'en-US') as Tutorial;
