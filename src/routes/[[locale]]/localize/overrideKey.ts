/**
 * How an override key in `LocalizationDexie` names the place in a locale file
 * it edits. `functions/` compiles with its own `rootDir`, so the submit
 * function keeps its own copy in `functions/src/localeEditPaths.ts`; the two
 * must agree, or a bundle the workspace composed lands somewhere else. The
 * cases in `overrideKey.test.ts` are mirrored there so a drift fails a test
 * rather than a contributor's submission.
 */

/** Split an override key into its locale path and optional tuple index. Override
 *  keys for single strings look like `ui.foo.bar`; tuple-element keys append the
 *  index, e.g. `ui.foo.labels.0`. A key whose value is a whole list — a glossary
 *  term's forms — has no tail, since the list is edited as one thing. */
export default function parseOverrideKey(key: string): {
    path: string;
    index: number | undefined;
} {
    const lastDot = key.lastIndexOf('.');
    const tail = lastDot === -1 ? '' : key.slice(lastDot + 1);
    if (lastDot !== -1 && /^\d+$/.test(tail)) {
        return { path: key.slice(0, lastDot), index: parseInt(tail, 10) };
    }
    return { path: key, index: undefined };
}
