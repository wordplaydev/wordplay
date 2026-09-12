import type { KitResolver } from './resolveKits';
import { ParsedKits } from './builtins';

/**
 * A resolver over the kits Wordplay ships with (#8), for code that builds a project
 * without the database — which in practice means tests.
 *
 * Reads `ParsedKits` rather than parsing the manifest again: a borrow only needs the
 * source, not the description and kinds `getBuiltinKits` derives per locale.
 */
export const builtinKitResolver: KitResolver = {
    getByName: async (name) => {
        const found = ParsedKits.find((one) => one.name === name);
        return found === undefined ? null : { id: found.builtin.id };
    },
    getVersion: async (kit, version) => {
        const found = ParsedKits.find((one) => one.builtin.id === kit);
        const one = found?.versions[version - 1];
        return one === undefined
            ? null
            : { sourceName: one.names, code: one.code, public: true };
    },
};
