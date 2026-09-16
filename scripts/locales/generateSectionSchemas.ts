/**
 * A JSON Schema per locale section, so an editor validates a section file the
 * way it validated the single document.
 *
 * Each one is a handful of lines that `$ref` into the existing
 * `static/schemas/LocaleText.json` by JSON Pointer, rather than carrying its
 * own copy of the definitions: that file is 1.95MB, it is served from
 * `static/`, and eight copies would put 16MB on the site to say something the
 * one copy already says.
 */
import fs from 'fs';
import path from 'path';
import {
    LocaleSections,
    sectionFileFor,
    type LocaleSection,
} from '@util/verify-locales/localeFiles';

const SchemaDirectory = path.join('static', 'schemas', 'sections');
const Source = JSON.parse(
    fs.readFileSync(path.join('static', 'schemas', 'LocaleText.json'), 'utf8'),
);

function localeTextProperties(): Record<string, unknown> {
    const definitions: unknown = Reflect.get(Source, 'definitions');
    if (typeof definitions !== 'object' || definitions === null) return {};
    const localeText: unknown = Reflect.get(definitions, 'LocaleText');
    if (typeof localeText !== 'object' || localeText === null) return {};
    const properties: unknown = Reflect.get(localeText, 'properties');
    if (typeof properties !== 'object' || properties === null) return {};
    const record: Record<string, unknown> = {};
    for (const key of Object.keys(properties))
        record[key] = Reflect.get(properties, key);
    return record;
}

const pointer = (...keys: string[]) =>
    `../LocaleText.json#/definitions/LocaleText/properties/${keys.join('/properties/')}`;

const properties = localeTextProperties();
const uiProperties = (() => {
    const ui: unknown = properties['ui'];
    if (typeof ui !== 'object' || ui === null) return [];
    const nested: unknown = Reflect.get(ui, 'properties');
    return typeof nested === 'object' && nested !== null
        ? Object.keys(nested)
        : [];
})();

fs.mkdirSync(SchemaDirectory, { recursive: true });

for (const section of LocaleSections) {
    const schemaProperties: Record<string, unknown> = {
        $schema: { type: 'string' },
    };

    if (section === 'ui-page.json')
        schemaProperties['ui'] = {
            type: 'object',
            additionalProperties: false,
            properties: { page: { $ref: pointer('ui', 'page') } },
        };
    else if (section === 'ui.json')
        schemaProperties['ui'] = {
            type: 'object',
            additionalProperties: false,
            properties: Object.fromEntries(
                uiProperties
                    .filter((key) => key !== 'page')
                    .map((key) => [key, { $ref: pointer('ui', key) }]),
            ),
        };
    else
        for (const key of Object.keys(properties))
            if (key !== 'ui' && sectionFileFor([key]) === section)
                schemaProperties[key] = { $ref: pointer(key) };

    const file = path.join(
        SchemaDirectory,
        `${section.replace(/\.json$/, '')}.json`,
    );
    fs.writeFileSync(
        file,
        `${JSON.stringify(
            {
                $schema: 'http://json-schema.org/draft-07/schema#',
                type: 'object',
                additionalProperties: false,
                properties: schemaProperties,
            },
            null,
            4,
        )}\n`,
    );
}

console.log(
    `Wrote ${LocaleSections.length} section schemas to ${SchemaDirectory}.`,
);
// `LocaleSection` is referenced only through LocaleSections' element type.
export type { LocaleSection };
