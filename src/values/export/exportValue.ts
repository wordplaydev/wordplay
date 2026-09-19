import type Locales from '@locale/Locales';
import type Value from '@values/Value';
import safeName from '@util/fileNames';
import { canExport } from '@values/export/canExport';
import toGrid, { gridToCSV } from '@values/export/grid';
import toJSON, { type JSONNotes } from '@values/export/json';

export { canExport };

export type ExportFormat = 'csv' | 'json';

export type Export = {
    format: ExportFormat;
    /** The file's text, with no byte order mark: `bytesOf` adds one where it
     *  belongs, and the clipboard must not have it. */
    text: string;
    notes: JSONNotes | undefined;
};

/** Which formats this value actually serializes to. Walks the value, so it
 *  belongs behind an open dialog and nowhere else. */
export function formatsFor(value: Value, locales: Locales): ExportFormat[] {
    if (!canExport(value)) return [];
    const formats: ExportFormat[] = [];
    if (toGrid(value, locales) !== undefined) formats.push('csv');
    if (toJSON(value, locales) !== undefined) formats.push('json');
    return formats;
}

/** The file's text, or undefined when this value has no such reading. */
export function serialize(
    value: Value,
    format: ExportFormat,
    locales: Locales,
): Export | undefined {
    if (format === 'csv') {
        const grid = toGrid(value, locales);
        return grid === undefined
            ? undefined
            : { format, text: gridToCSV(grid, locales), notes: undefined };
    }
    const json = toJSON(value, locales);
    return json === undefined
        ? undefined
        : { format, text: json.text, notes: json.notes };
}

/**
 * The bytes to hand a reader, which are not always the text.
 *
 * A CSV gets a byte order mark: Excel on Windows reads an unmarked UTF-8 file
 * in its legacy code page, and Wordplay content is very often not Latin. The
 * clipboard deliberately gets `text` instead — a mark pasted back into the
 * editor would land inside the first header cell.
 */
export function bytesOf(exported: Export): Uint8Array {
    const text =
        exported.format === 'csv' ? `﻿${exported.text}` : exported.text;
    return new TextEncoder().encode(text);
}

export function mimeTypeOf(format: ExportFormat): string {
    return format === 'csv'
        ? 'text/csv;charset=utf-8'
        : 'application/json;charset=utf-8';
}

export function extensionOf(format: ExportFormat): string {
    return format === 'csv' ? 'csv' : 'json';
}

/**
 * What the saved file is called: the project's name and what the value is,
 * e.g. `My survey-table.csv`.
 *
 * `getUnannotatedPrimaryText`, not `getPlainText`: with several locales chosen
 * the latter joins them, and `"table · tabla"` is not a file name (#1228). Run
 * through the same hygiene an account archive's paths use, so a project named
 * `cats/dogs` doesn't become a folder.
 */
export function fileNameFor(
    projectName: string,
    value: Value,
    format: ExportFormat,
    locales: Locales,
): string {
    const kind = safeName(
        locales.getUnannotatedPrimaryText(value.getDescription()),
    );
    const project = safeName(projectName);
    const stem = [project, kind].filter((part) => part.length > 0).join('-');
    return `${stem.length === 0 ? 'wordplay' : stem}.${extensionOf(format)}`;
}
