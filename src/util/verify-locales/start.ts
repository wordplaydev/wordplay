import fs from 'fs';
import path from 'path';
import * as prettier from 'prettier';
import type LocaleText from '../../locale/LocaleText';
import Log from './Log';
import { createUnwrittenLocale, verifyLocale } from './verifyLocale';
import { createUnwrittenTutorial, verifyTutorial } from './verifyTutorial';
import {
    DefaultLocale,
    getLocaleJSON,
    getLocalePath,
    LocaleValidator,
} from './LocaleSchema';
import { getTutorialJSON, getTutorialPath } from './TutorialSchema';
import { getLocaleLanguage, getLocaleRegion } from '../../locale/LocaleText';
import type { RegionCode } from '@locale/Regions';

// Make a logger so we can pretty print feedback.
const log = new Log();

// Now that we've defined all of the functionality, let's process requests.
if (process.argv.length < 3) {
    log.exit(0, 'Please provide either "verify" or "translate" command');
}

// If there are problems in the default locale, we can't verify or translate anything.
if (!LocaleValidator(DefaultLocale)) {
    log.bad(
        0,
        'Default locale is invalid. It needs to be repaired before we can proceed.',
    );
    if (LocaleValidator.errors)
        for (const error of LocaleValidator.errors) {
            if (error.message)
                log.bad(1, 'x ' + `${error.instancePath}: ${error.message}`);
        }
    process.exit(0);
}

// We're we asked to translate? Let's see if there was a specific locale we're focusing on.
const TranslationRequested = process.argv.includes('translate');
const FocalLocale = process.argv[3] ?? null;

const FocalLanguage = FocalLocale ? getLocaleLanguage(FocalLocale) : null;
const FocalRegion = FocalLocale
    ? (getLocaleRegion(FocalLocale) as RegionCode)
    : null;

if (FocalLanguage === undefined)
    log.exit(0, 'Please provide a valid locale language code to translate');

log.say(
    0,
    TranslationRequested
        ? 'Verifying and translating ' + (FocalLocale ?? 'all locales')
        : 'Checking all locale files for problems...',
);

// Go through all of the locale directors and check the locale and tutorial files, repairing and optionally translating them.
const localeFolders = Array.from(
    fs.readdirSync(path.join('static', 'locales'), { withFileTypes: true }),
);

async function handleLocale(locale: string) {
    log.say(1, `Checking ${locale}...`);

    // Find prettier configuration options so we can format the locale.
    const localePath = getLocalePath(locale);
    const prettierOptions = await prettier.resolveConfig(localePath);

    // Remember whether we created a new one
    let localeIsNew = false;

    // Get the currrent locale file in this directory.
    let localeText = getLocaleJSON(log, locale) as LocaleText;
    if (localeText === undefined) {
        // Not verifying a specific locale? Warn.
        if (FocalLocale === null) {
            log.bad(
                2,
                "Couldn't find locale file. Can't validate it, or it's tutorial.",
            );
            return;
        }
        // If there is a specific locale we're looking for, and we can't find it, create a new one.
        else if (FocalLanguage && FocalRegion) {
            log.good(2, 'No locale found, creating one based on English.');
            localeText = createUnwrittenLocale();
            localeText.language = FocalLanguage;
            localeText.region = FocalRegion;
            localeText['$schema'] = '../../schemas/LocaleText.json';
            localeIsNew = true;
        }
    }

    // Validate, repair, and translate the locale file.
    const [revisedLocale, localeChanged] = await verifyLocale(
        log,
        locale,
        localeText as LocaleText,
        TranslationRequested,
    );

    // If the locale was revised, write the results.
    if (localeChanged || localeIsNew) {
        // Write a formatted version of the revised locale file.
        const prettyLocale = await prettier.format(
            JSON.stringify(revisedLocale, null, 4),
            { ...prettierOptions, parser: 'json' },
        );

        log.good(1, 'Saving repairs to ' + locale);
        fs.writeFileSync(getLocalePath(locale), prettyLocale);
    }

    if (locale !== 'example') {
        // If there's a locale, let's see if there's a tutorial.
        let currentTutorial = getTutorialJSON(log, locale);

        // Remember whether we created one so we can write it below.
        let tutorialIsNew = false;

        // Validate, repair, and optionally translate the tutorial file.
        if (currentTutorial === undefined) {
            // No translation requested? Just warn.
            if (!TranslationRequested)
                log.bad(1, "This locale doesn't have a tutorial file.");
            // If a translation was requested and it was a valid langauge and region,
            // copy the default tutorial, mark all of its text unwritten, and then translate it.
            else if (FocalLanguage && FocalRegion) {
                log.say(
                    1,
                    'Creating a new tutorial for this locale based on en-US...',
                );
                currentTutorial = createUnwrittenTutorial();
                currentTutorial.region = FocalRegion;
                currentTutorial.language = FocalLanguage;
                tutorialIsNew = true;
            }
        }

        // If there is a tutorial file, verify it, and optionally translate it.
        if (currentTutorial) {
            const revisedTutorial = await verifyTutorial(
                log,
                revisedLocale,
                currentTutorial,
                TranslationRequested,
            );

            // If the tutorial was revised, write the results.
            if (
                tutorialIsNew ||
                (revisedTutorial &&
                    JSON.stringify(currentTutorial) !==
                        JSON.stringify(revisedTutorial))
            ) {
                // Write a formatted version of the revised tutorial file.
                const prettyTutorial = await prettier.format(
                    JSON.stringify(revisedTutorial, null, 4),
                    { ...prettierOptions, parser: 'json' },
                );

                if (JSON.stringify(revisedTutorial) !== prettyTutorial) {
                    log.good(1, 'Writing revised ' + locale + ' tutorial');
                    fs.writeFileSync(getTutorialPath(locale), prettyTutorial);
                }
            }
        }
    }
}

// Go through each locale, or the specific one of interest, and verify, repair, and optionally translate it.
for (const file of localeFolders) {
    if (
        file.isDirectory() &&
        (FocalLocale === null || file.name === FocalLocale)
    )
        await handleLocale(file.name);
}

// If the user asked for a specific locale, and a folder doesn't exist for it yet, create one.
if (FocalLocale && !localeFolders.find((f) => f.name === FocalLocale)) {
    log.say(0, 'Creating a new locale folder for ' + FocalLocale);
    fs.mkdirSync(path.join('static', 'locales', FocalLocale));
    handleLocale(FocalLocale);
}
