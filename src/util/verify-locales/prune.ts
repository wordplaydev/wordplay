import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import * as prettier from 'prettier';
import ts from 'typescript';
import { findUnusedKeys } from '@util/verify-locales/findUnusedKeys';
import { DefaultLocale } from '@util/verify-locales/LocaleSchema';

/** Root file where the `LocaleText` type is defined. The path resolver starts
 *  here and follows imports outward. */
const ROOT_FILE = 'src/locale/LocaleText.ts';
const ROOT_TYPE = 'LocaleText';
const EN_US_JSON = 'src/locale/en-US.json';

/** Path-alias mapping mirrored from `svelte.config.js`. We resolve `@locale/X`
 *  to `src/locale/X.ts` so we can follow type imports without a full
 *  TypeChecker. Keep this in sync with the `alias` block in svelte.config.js. */
const PATH_ALIASES: ReadonlyArray<[string, string]> = [
    ['@components/', 'src/components/'],
    ['@nodes/', 'src/nodes/'],
    ['@runtime/', 'src/runtime/'],
    ['@values/', 'src/values/'],
    ['@conflicts/', 'src/conflicts/'],
    ['@locale/', 'src/locale/'],
    ['@concepts/', 'src/concepts/'],
    ['@parser/', 'src/parser/'],
    ['@input/', 'src/input/'],
    ['@output/', 'src/output/'],
    ['@basis/', 'src/basis/'],
    ['@edit/', 'src/edit/'],
    ['@db/', 'src/db/'],
    ['@unicode/', 'src/unicode/'],
    ['@util/', 'src/util/'],
];

/** Members of a type literal or interface — what we can search and splice. */
type Members = ts.NodeArray<ts.TypeElement>;

/** Result of resolving a dotted path to its TypeScript owner. */
interface Resolution {
    file: string;
    sourceText: string;
    property: ts.PropertySignature;
    members: Members;
    /** Name of the type alias / interface that owns the property, if any.
     *  Used by the shared-type safety check. Undefined when the property
     *  lives in an inline type literal (no name to count usages of). */
    owningTypeName: string | undefined;
}

function parseSource(file: string): ts.SourceFile {
    return ts.createSourceFile(
        file,
        fs.readFileSync(file, 'utf8'),
        ts.ScriptTarget.Latest,
        /* setParentNodes */ true,
    );
}

/** Find the type alias or interface declaration with the given name in `sf`. */
function findDeclaredType(
    sf: ts.SourceFile,
    name: string,
): ts.TypeAliasDeclaration | ts.InterfaceDeclaration | undefined {
    for (const stmt of sf.statements) {
        if (
            (ts.isTypeAliasDeclaration(stmt) ||
                ts.isInterfaceDeclaration(stmt)) &&
            stmt.name.text === name
        )
            return stmt;
    }
    return undefined;
}

/** Extract the members of a declared type. Refuses unions and other shapes
 *  the prune workflow can't safely edit. */
function membersOf(
    decl: ts.TypeAliasDeclaration | ts.InterfaceDeclaration,
): Members {
    if (ts.isInterfaceDeclaration(decl)) return decl.members;
    // TypeAliasDeclaration — the aliased type must be a literal we can search.
    if (!ts.isTypeLiteralNode(decl.type))
        throw new Error(
            `Type alias ${decl.name.text} isn't an object literal — prune doesn't handle unions, intersections, or generics.`,
        );
    return decl.type.members;
}

function findProperty(
    members: Members,
    name: string,
): ts.PropertySignature | undefined {
    for (const m of members) {
        if (
            ts.isPropertySignature(m) &&
            ts.isIdentifier(m.name) &&
            m.name.text === name
        )
            return m;
    }
    return undefined;
}

/** Resolve an `import type X from '<specifier>'` to an absolute file path. */
function resolveImportSpecifier(
    specifier: string,
    fromFile: string,
): string {
    for (const [alias, real] of PATH_ALIASES) {
        if (specifier.startsWith(alias))
            return path.resolve(real + specifier.slice(alias.length) + '.ts');
    }
    if (specifier.startsWith('.'))
        return (
            path.resolve(path.dirname(fromFile), specifier).replace(/\.ts$/, '') +
            '.ts'
        );
    throw new Error(`Cannot resolve non-alias non-relative import: ${specifier}`);
}

/** Resolve a default export to the local type name it points at. Handles
 *  `export type { Foo as default }` and `export { Foo as default }` —
 *  common in the codebase (PageText.ts files use this pattern). Returns
 *  undefined if no default export is found or it points at a non-named source. */
function findDefaultExportedTypeName(sf: ts.SourceFile): string | undefined {
    for (const stmt of sf.statements) {
        if (!ts.isExportDeclaration(stmt) || !stmt.exportClause) continue;
        if (!ts.isNamedExports(stmt.exportClause)) continue;
        for (const elt of stmt.exportClause.elements) {
            if (elt.name.text === 'default' && elt.propertyName)
                return elt.propertyName.text;
        }
    }
    return undefined;
}

/** Given a SourceFile and a type-reference name, find the file that defines
 *  it. Looks at the file's import declarations; falls back to the same file
 *  if no import matches (the type is defined locally). For default imports,
 *  follows `export type { Foo as default }` re-exports so the imported alias
 *  resolves to the actual local declaration name in the target file. */
function locateTypeDefinition(
    sf: ts.SourceFile,
    typeName: string,
    file: string,
): { file: string; sf: ts.SourceFile; decl: ts.TypeAliasDeclaration | ts.InterfaceDeclaration } {
    function resolveInTargetFile(
        targetFile: string,
        isDefaultImport: boolean,
        moduleText: string,
    ) {
        const targetSf = parseSource(targetFile);
        // For default imports, the local declaration name may differ from the
        // alias used at the import site — follow the default-export indirection.
        let lookupName = typeName;
        if (isDefaultImport) {
            const defaultName = findDefaultExportedTypeName(targetSf);
            if (defaultName) lookupName = defaultName;
        }
        const decl = findDeclaredType(targetSf, lookupName);
        if (!decl)
            throw new Error(
                `Imported ${typeName} from ${moduleText} but no matching ${lookupName} declaration in ${targetFile}.`,
            );
        return { file: targetFile, sf: targetSf, decl };
    }

    for (const stmt of sf.statements) {
        if (!ts.isImportDeclaration(stmt)) continue;
        const clause = stmt.importClause;
        if (!clause) continue;
        const moduleText = (stmt.moduleSpecifier as ts.StringLiteral).text;
        // Default import: `import type X from 'mod'`
        if (clause.name && clause.name.text === typeName) {
            return resolveInTargetFile(
                resolveImportSpecifier(moduleText, file),
                /* isDefaultImport */ true,
                moduleText,
            );
        }
        // Named imports: `import { X } from 'mod'` or `import type { X } from 'mod'`
        if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
            for (const elt of clause.namedBindings.elements) {
                if (elt.name.text === typeName) {
                    return resolveInTargetFile(
                        resolveImportSpecifier(moduleText, file),
                        /* isDefaultImport */ false,
                        moduleText,
                    );
                }
            }
        }
    }
    // Not imported — must be defined locally.
    const decl = findDeclaredType(sf, typeName);
    if (!decl)
        throw new Error(
            `Type ${typeName} not found in ${file} and no import for it either.`,
        );
    return { file, sf, decl };
}

/** Resolve a dotted path (`['ui', 'edit', 'wrap']`) to the TypeScript file
 *  and property signature that owns the leaf. Follows type-reference imports
 *  outward from `LocaleText.ts`. Inline type literals (e.g. `system: { ... }`)
 *  are handled in-file. */
export function resolvePath(segments: string[]): Resolution {
    let file = path.resolve(ROOT_FILE);
    let sf = parseSource(file);
    let decl = findDeclaredType(sf, ROOT_TYPE);
    if (!decl) throw new Error(`Cannot find root type ${ROOT_TYPE} in ${file}`);
    let members = membersOf(decl);
    // Track the named type that owns the current `members` array. Becomes
    // `undefined` whenever we descend into an inline type literal (those are
    // never shared, so the safety check skips them).
    let owningTypeName: string | undefined = ROOT_TYPE;

    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const prop = findProperty(members, seg);
        if (!prop)
            throw new Error(
                `Cannot find property "${seg}" at depth ${i} (path: ${segments.slice(0, i + 1).join('.')}). Earlier segments may be unsupported (index signature, union, generic).`,
            );

        if (i === segments.length - 1) {
            return {
                file,
                sourceText: sf.getFullText(),
                property: prop,
                members,
                owningTypeName,
            };
        }

        // Follow the property's type to find the next set of members.
        const t = prop.type;
        if (!t) throw new Error(`Property "${seg}" has no type annotation.`);

        if (ts.isTypeLiteralNode(t)) {
            // Inline object literal — stay in the same file, no named owner.
            members = t.members;
            owningTypeName = undefined;
            continue;
        }
        if (ts.isTypeReferenceNode(t) && ts.isIdentifier(t.typeName)) {
            const next = locateTypeDefinition(sf, t.typeName.text, file);
            file = next.file;
            sf = next.sf;
            decl = next.decl;
            members = membersOf(decl);
            owningTypeName = t.typeName.text;
            continue;
        }
        throw new Error(
            `Property "${seg}" has an unsupported type shape (${ts.SyntaxKind[t.kind]}). Prune handles only inline literals and named type references.`,
        );
    }
    // Unreachable — the loop returns on the last segment.
    throw new Error('Path resolution exited the loop without returning.');
}

/** Remove `prop` from `sourceText`. The deleted range starts at the
 *  property's full-start (which covers its leading TSDoc + indentation) and
 *  ends at the next sibling's full-start (or the property's end if it's the
 *  last sibling), which cleanly absorbs trailing whitespace. */
export function removeProperty(
    sourceText: string,
    prop: ts.PropertySignature,
    members: Members,
): string {
    const start = prop.getFullStart();
    const index = members.indexOf(prop);
    const end =
        index >= 0 && index < members.length - 1
            ? members[index + 1].getFullStart()
            : prop.getEnd();
    return sourceText.slice(0, start) + sourceText.slice(end);
}

/** Walk `path` into `obj` and `delete` the leaf key. Returns true if a key
 *  was actually deleted (the path resolved to an existing leaf). */
export function removeJsonKey(
    obj: Record<string, unknown>,
    segments: string[],
): boolean {
    let cur: Record<string, unknown> = obj;
    for (let i = 0; i < segments.length - 1; i++) {
        const next = cur[segments[i]];
        if (typeof next !== 'object' || next === null) return false;
        cur = next as Record<string, unknown>;
    }
    const last = segments[segments.length - 1];
    if (!(last in cur)) return false;
    delete cur[last];
    return true;
}

/** Confirm the requested path is in the current unused-keys set. Refusing
 *  paths that aren't currently flagged is the main safety gate — if someone
 *  added a new accessor recently, this prevents accidental removal of a
 *  newly-referenced key. */
function assertFlaggedUnused(dotted: string): void {
    const unused = findUnusedKeys(DefaultLocale, 'src');
    const match = unused.find((p) => {
        const s = p.toString();
        return s === dotted || s === '.' + dotted;
    });
    if (!match) {
        console.error(
            `Refusing to prune "${dotted}": findUnusedKeys does not currently flag it as unused. Either a static accessor exists, or the path doesn't resolve. Check with \`npm run locales\` to see what's flagged.`,
        );
        process.exit(1);
    }
}

/** Walk every `.ts` file under `src/locale/` and count occurrences of
 *  `TypeReferenceNode`s with the given identifier name. Returns the total
 *  including the type's own declaration occurrence isn't counted (declarations
 *  use `TypeAliasDeclaration` / `InterfaceDeclaration`, not `TypeReferenceNode`).
 *  So a count > 1 means the type is referenced from more than one site — i.e.
 *  shared, and not safe to edit by removing a single property. */
function countTypeUsages(typeName: string): number {
    let count = 0;
    function visit(node: ts.Node) {
        if (
            ts.isTypeReferenceNode(node) &&
            ts.isIdentifier(node.typeName) &&
            node.typeName.text === typeName
        )
            count++;
        ts.forEachChild(node, visit);
    }
    function walk(dir: string) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.isFile() && entry.name.endsWith('.ts'))
                visit(parseSource(full));
        }
    }
    walk(path.resolve('src/locale'));
    return count;
}

/** Apply the TS + en-US edits for a single path. Throws on resolver failures
 *  and on the empty-parent and shared-type guards so the caller can decide
 *  whether to bail (single-path mode) or skip-and-continue (batch mode). */
async function editOnePath(dotted: string): Promise<void> {
    const segments = dotted.split('.');
    const resolution = resolvePath(segments);
    if (resolution.members.length <= 1)
        throw new Error(
            `removing it would leave its parent type empty (only one member remaining)`,
        );
    // Shared-type guard: if the owning type is referenced more than once in
    // the locale TS tree, removing the property would damage every other site
    // that uses the type. The fix is path-specific (give that path its own
    // type) and beyond what the prune script can safely do automatically.
    if (
        resolution.owningTypeName !== undefined &&
        countTypeUsages(resolution.owningTypeName) > 1
    )
        throw new Error(
            `owning type "${resolution.owningTypeName}" is shared across multiple paths — removing this property would break the other sites. Give this path its own type before pruning.`,
        );

    const newSource = removeProperty(
        resolution.sourceText,
        resolution.property,
        resolution.members,
    );
    fs.writeFileSync(resolution.file, newSource);

    const enUS = JSON.parse(fs.readFileSync(EN_US_JSON, 'utf8'));
    if (removeJsonKey(enUS, segments)) {
        const prettierOptions = await prettier.resolveConfig(EN_US_JSON);
        const formatted = await prettier.format(JSON.stringify(enUS), {
            ...prettierOptions,
            parser: 'json',
        });
        fs.writeFileSync(EN_US_JSON, formatted);
    }
}

/** Run the chained cleanup commands. Called once after all edits so we don't
 *  pay for schema regen + locales-fix once per pruned key in batch mode. */
function runChain(): void {
    const steps: Array<[string, string]> = [
        ['npm run create-schemas', 'regenerate schema'],
        ['npm run locales-fix', 'remove key from all locale JSONs'],
        ['npm run check:now', 'sanity TypeScript check'],
    ];
    for (const [cmd, label] of steps) {
        console.log(`\n→ ${label}: ${cmd}`);
        try {
            execSync(cmd, { stdio: 'inherit' });
        } catch (err) {
            console.error(
                `\n${label} failed. Inspect the output above. Roll back with \`git checkout -- src/locale static/locales static/schemas\` if needed.`,
            );
            throw err;
        }
    }
}

export async function prune(dotted: string): Promise<void> {
    if (!dotted || !dotted.includes('.'))
        throw new Error(`Path must be a dotted leaf path (e.g. ui.edit.wrap).`);
    assertFlaggedUnused(dotted);

    try {
        await editOnePath(dotted);
    } catch (err) {
        console.error(`Refusing to prune "${dotted}": ${(err as Error).message}`);
        process.exit(1);
    }
    console.log(`Removed ${dotted} from TS type + en-US.json.`);

    runChain();

    console.log(`\nDone. Pruned ${dotted}.`);
}

/** Batch mode: prune every leaf flagged by `findUnusedKeys`. Each per-path
 *  failure is reported and skipped rather than aborting the whole run — that
 *  way one tricky path (e.g. one whose parent type would become empty) doesn't
 *  block the easy wins. Chain cleanup runs once at the end. */
export async function pruneAll(): Promise<void> {
    const unused = findUnusedKeys(DefaultLocale, 'src');
    if (unused.length === 0) {
        console.log('No unused locale keys to prune.');
        return;
    }
    const dotted = unused.map((p) => p.toString().replace(/^\./, ''));
    console.log(
        `Pruning ${dotted.length} unused locale key${dotted.length === 1 ? '' : 's'}:`,
    );
    for (const d of dotted) console.log(`  - ${d}`);
    console.log();

    let pruned = 0;
    const skipped: Array<{ path: string; reason: string }> = [];
    for (const d of dotted) {
        try {
            await editOnePath(d);
            pruned++;
            console.log(`  ✓ ${d}`);
        } catch (err) {
            skipped.push({ path: d, reason: (err as Error).message });
            console.log(`  ✗ ${d} — ${(err as Error).message}`);
        }
    }

    console.log(`\nPruned ${pruned}/${dotted.length} keys.`);
    if (skipped.length > 0) {
        console.log(`Skipped ${skipped.length}:`);
        for (const s of skipped) console.log(`  - ${s.path}: ${s.reason}`);
    }

    if (pruned === 0) {
        console.log(
            '\nNo edits made — skipping schema regeneration and locales-fix.',
        );
        return;
    }

    runChain();

    console.log(`\nDone.`);
}

// CLI entry point. Detect via argv[1] ending in this file so importers (e.g.
// the test file) don't auto-execute.
const argv1 = process.argv[1] ?? '';
if (argv1.endsWith('prune.ts') || argv1.endsWith('prune.js')) {
    const target = process.argv[2];
    const action = target ? prune(target) : pruneAll();
    action.catch((err: Error) => {
        console.error(err.message);
        process.exit(1);
    });
}
