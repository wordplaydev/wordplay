/**
 * One-time: turn each locale's single document into section files.
 *
 * After this runs, the sections are the source and `<code>.json` is a generated
 * artifact rebuilt by `npm run locales-assemble`. Re-running is harmless — it
 * reads whichever shape is on disk and writes both.
 */
import fs from 'fs';
import path from 'path';
import Log from '@util/verify-locales/Log';
import {
    getMonolithPath,
    hasSections,
    readLocale,
    writeLocale,
} from '@util/verify-locales/localeFiles';

const log = new Log();
const locales = ['en-US', ...fs.readdirSync(path.join('static', 'locales'))]
    .filter(
        (locale) =>
            locale === 'en-US' || fs.existsSync(getMonolithPath(locale)),
    )
    .filter((locale, index, all) => all.indexOf(locale) === index);

let split = 0;
for (const locale of locales) {
    const before = hasSections(locale);
    const text = readLocale(log, locale);
    if (text === undefined) {
        console.log(`  ${locale}: no locale to split`);
        continue;
    }
    await writeLocale(log, locale, text);
    split++;
    console.log(`  ${locale}: ${before ? 'rewritten' : 'split'}`);
}
console.log(`\n${split} locale(s) written as sections.`);
