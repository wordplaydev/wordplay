import fs from 'fs';
import path from 'path';
import type Tutorial from '../../tutorial/Tutorial';
import {
    DEFAULT_TUTORIAL_MODE,
    type TutorialMode,
} from '../../tutorial/TutorialMode';
import { getObjectFromJSONFile } from '@util/verify-locales/getObjectFromJSONFile';
import Log from '@util/verify-locales/Log';

// Read the tutorial schema.
const TutorialSchema = JSON.parse(
    fs.readFileSync('static/schemas/Tutorial.json', 'utf8'),
);
export default TutorialSchema;

/** Get a tutorial path from a locale name and mode. Mirrors the runtime filename convention in
 * LocalesDatabase.getTutorialURL: the default ("complete") mode keeps the original filename for
 * back-compat; other modes get a suffix (e.g. en-US-tutorial-quick.json). */
export function getTutorialPath(
    locale: string,
    mode: TutorialMode = DEFAULT_TUTORIAL_MODE,
) {
    const suffix = mode === DEFAULT_TUTORIAL_MODE ? '' : `-${mode}`;
    return path.join(
        'static',
        'locales',
        locale,
        `${locale}-tutorial${suffix}.json`,
    );
}

/** Get the tutorial JSON for the given locale and mode. */
export function getTutorialJSON(
    log: Log,
    locale: string,
    mode: TutorialMode = DEFAULT_TUTORIAL_MODE,
): Tutorial | undefined {
    return getObjectFromJSONFile(log, getTutorialPath(locale, mode)) as Tutorial;
}

/** Get the default (en-US) tutorial for a mode. We use this as the source for translation. */
export function getDefaultTutorial(
    mode: TutorialMode = DEFAULT_TUTORIAL_MODE,
): Tutorial {
    return getTutorialJSON(new Log(false), 'en-US', mode) as Tutorial;
}
