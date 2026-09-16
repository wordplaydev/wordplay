/**
 * Build step: rebuild each locale's assembled `<code>.json` from its sections.
 *
 * The assembled file is what the app fetches and what `DefaultLocale` imports,
 * so it has to exist before `vite build` and before `npm run dev`. It is
 * gitignored, because committing it would put the whole-file diff back into
 * every locale change — the thing the section layout exists to remove.
 */
import fs from 'fs';
import path from 'path';
import Log from '@util/verify-locales/Log';
import {
    hasSections,
    readLocale,
    writeAssembled,
} from '@util/verify-locales/localeFiles';

const log = new Log();
const locales = ['en-US', ...fs.readdirSync(path.join('static', 'locales'))]
    .filter((locale, index, all) => all.indexOf(locale) === index)
    .filter((locale) => hasSections(locale));

let wrote = 0;
for (const locale of locales) {
    const text = readLocale(log, locale);
    if (text === undefined) continue;
    if (await writeAssembled(log, locale, text)) wrote++;
}
console.log(
    `Assembled ${locales.length} locale(s) from sections; ${wrote} changed.`,
);
