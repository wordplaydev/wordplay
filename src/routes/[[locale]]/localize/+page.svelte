<script lang="ts">
    import Header from '@components/app/Header.svelte';
    import Link from '@components/app/Link.svelte';
    import Notice from '@components/app/Notice.svelte';
    import Writing from '@components/app/Writing.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import TemplateInputsPanel from '@components/localization/TemplateInputsPanel.svelte';
    import { getUser, isAuthenticated } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import Checkbox from '@components/widgets/Checkbox.svelte';
    import ConfirmButton from '@components/widgets/ConfirmButton.svelte';
    import FormattedEditor from '@components/widgets/FormattedEditor.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import Note from '@components/widgets/Note.svelte';
    import Options, {
        type Group,
        type Option,
    } from '@components/widgets/Options.svelte';
    import TextBox from '@components/widgets/TextBox.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { locales } from '@db/Database';
    import { functions } from '@db/firebase';
    import {
        deleteLocaleEdit,
        localeEdits,
        saveLocaleEdit,
    } from '@db/locales/LocalizationDexie';
    import DefaultLocale from '@locale/DefaultLocale';
    import {
        isMachineTranslated,
        isUnwritten,
        toLocaleString,
    } from '@locale/LocaleText';
    import { checkTemplateInputs } from '@locale/templateInputs';
    import { withoutAnnotations } from '@locale/withoutAnnotations';
    import {
        CANCEL_SYMBOL,
        CONFIRM_SYMBOL,
        MACHINE_TRANSLATED_SYMBOL,
        REVERT_SYMBOL,
    } from '@parser/Symbols';
    import { isName } from '@parser/Tokenizer';
    import { getKeyTemplatePairs } from '@util/verify-locales/LocalePath';
    import { httpsCallable } from 'firebase/functions';
    import { onMount } from 'svelte';
    import { Emotion } from '../../../lore/Emotion';
    import { isTutorialKey } from '../../../tutorial/TutorialPath';

    /** qualityChoice value meaning "show only unwritten or machine-translated strings". */
    const QUALITY_NEEDS_WORK = 1;

    /** Result of the last submit attempt. */
    let submitResult = $state<'success' | 'error' | undefined>(undefined);

    /** URL of the GitHub pull request opened by the most recent successful
     *  submit. Shown as a clickable link in the success Notice so contributors
     *  can comment on or follow their PR. Emulator runs return a
     *  `emulator://dry-run/...` URL; we don't render it (no real PR exists). */
    let submittedPrUrl = $state<string | undefined>(undefined);

    /** Free-text description of the current batch of edits the contributor is preparing. */
    let bundleDescription = $state('');

    /** Whether the contributor has confirmed the batch is not spam. */
    let notSpamConfirmed = $state(false);

    /** Authenticated user (or null/undefined when not logged in). */
    let user = getUser();

    /** Index of the bundle item the contributor is currently reviewing in the submit section. */
    let bundleViewIndex = $state(0);

    /** Anchor element at the top of the workspace; scrolled into view when the
     *  contributor clicks a bundle item to jump back to the editor. */
    let workspaceTop = $state<HTMLElement | undefined>(undefined);

    /** Narrows an unknown JSON value to a non-null record, returning undefined if it
     *  isn't an object. Lets us walk the lazily-fetched JSON Schema without sprinkling
     *  `as Record<string, unknown>` everywhere. */
    function asRecord(value: unknown): Record<string, unknown> | undefined {
        return typeof value === 'object' &&
            value !== null &&
            !Array.isArray(value)
            ? (value as Record<string, unknown>)
            : undefined;
    }

    /** Lazily fetched JSON Schema for the LocaleText type. Used to look up the
     *  per-field [plain]/[formatted]/[name]/[emotion] tag (which decides the editor
     *  to use) and the human description shown beside each dropdown option. */
    let schema = $state<Record<string, unknown> | undefined>(undefined);
    onMount(async () => {
        const response = await fetch('/schemas/LocaleText.json');
        if (response.ok) schema = await response.json();
    });

    /** Follow a JSON Schema `$ref` (e.g. `#/definitions/Foo`) within `s` and return
     *  the referenced subschema, or undefined if the path doesn't resolve. */
    function resolveRef(
        s: Record<string, unknown>,
        ref: string,
    ): Record<string, unknown> | undefined {
        const parts = ref.replace('#/', '').split('/');
        let node: unknown = s;
        for (const part of parts) {
            const record = asRecord(node);
            if (!record) return undefined;
            node = record[decodeURIComponent(part)];
        }
        return asRecord(node);
    }

    /** Resolve the TSDoc description string for a dotted locale path by walking the
     *  JSON Schema. Handles three subtleties:
     *   1. Paths from `getKeyTemplatePairs` for top-level string fields have a
     *      leading dot (e.g. `.wordplay`); empty segments are skipped.
     *   2. `Record<K, V>` types emit `additionalProperties` instead of enumerated
     *      properties; the walker falls back to that so paths like `token.SOMENAME`
     *      resolve.
     *   3. Leaves with no description of their own (e.g. each Record-value entry)
     *      inherit the nearest ancestor's description that has a recognized tag. */
    function getDescription(pathStr: string): string | undefined {
        if (!schema) return undefined;
        const parts = pathStr.split('.').filter((p) => p.length > 0);
        let node: Record<string, unknown> | undefined = asRecord(
            asRecord(schema.definitions)?.['LocaleText'],
        );
        let inheritedDescription: string | undefined;
        for (const part of parts) {
            if (!node) return undefined;
            const ref = node['$ref'];
            if (typeof ref === 'string') node = resolveRef(schema, ref);
            if (!node) return undefined;
            const desc = node['description'];
            if (typeof desc === 'string' && getEditorType(desc) !== undefined)
                inheritedDescription = desc;
            const props = asRecord(node['properties']);
            const next = asRecord(props?.[part]);
            if (next === undefined) {
                const additional = asRecord(node['additionalProperties']);
                if (additional !== undefined) {
                    node = additional;
                    continue;
                }
                return undefined;
            }
            node = next;
        }
        if (!node) return inheritedDescription;
        const desc = node['description'];
        if (typeof desc === 'string') return desc;
        const ref = node['$ref'];
        if (typeof ref === 'string') {
            const resolved = resolveRef(schema, ref);
            const resolvedDesc = resolved?.['description'];
            if (typeof resolvedDesc === 'string') return resolvedDesc;
        }
        return inheritedDescription;
    }

    type EditorType = 'plain' | 'formatted' | 'name' | 'emotion';

    /** Extract the editor type tag (e.g. `[plain]`) from a TSDoc description string.
     *  Returns undefined if the description has no recognized tag — which is the
     *  signal that this locale key isn't translator-facing and should be skipped. */
    function getEditorType(
        description: string | undefined,
    ): EditorType | undefined {
        if (!description) return undefined;
        if (description.includes('[emotion]')) return 'emotion';
        if (description.includes('[name]')) return 'name';
        if (description.includes('[formatted]')) return 'formatted';
        if (description.includes('[plain]')) return 'plain';
        return undefined;
    }

    /** Every leaf path/value pair in the currently active locale, produced by the
     *  shared `getKeyTemplatePairs` walker from `@util/verify-locales/LocalePath`. */
    const allPaths = $derived.by(() => {
        const locale = $locales.getLocale();
        // The walker accepts a generic record; LocaleText satisfies that shape but
        // the type system can't see through `Record<keyof typeof Sym, string>`, etc.
        return getKeyTemplatePairs(
            locale as unknown as Record<string, unknown>,
        );
    });

    /** True if any string in this pair carries the machine-translation annotation. */
    function isMT(pair: (typeof allPaths)[number]) {
        const val = pair.value;
        if (typeof val === 'string') return isMachineTranslated(val);
        if (Array.isArray(val)) return val.some((v) => isMachineTranslated(v));
        return false;
    }

    /** True if a pair needs translator attention — i.e. any of its strings are
     *  unwritten or machine-translated. Used by the quality filter and counts. */
    function needsWork(pair: (typeof allPaths)[number]) {
        const val = pair.value;
        if (typeof val === 'string')
            return isMachineTranslated(val) || isUnwritten(val);
        if (Array.isArray(val))
            return val.some((v) => isMachineTranslated(v) || isUnwritten(v));
        return false;
    }

    let filterQuery = $state('');

    /** Top-level locale keys, in the order they appear as section options. */
    const sectionOrder = [
        'wordplay',
        'term',
        'token',
        'node',
        'basis',
        'input',
        'output',
        'ui',
        'gallery',
        'moderation',
    ] as const;

    /** The full section key list including the leading "all" pseudo-section.
     *  Indexed by `qualityChoice`-style 0..N values. */
    const sectionKeys = ['all', ...sectionOrder] as const;

    type SectionKey = (typeof sectionOrder)[number];

    /** Type guard for the SectionKey union; lets `sectionOf` narrow without an `as`. */
    function isSectionKey(s: string | undefined): s is SectionKey {
        return (
            s !== undefined && (sectionOrder as readonly string[]).includes(s)
        );
    }

    /** Map a leaf locale path to its section. Top-level string fields (e.g. `wordplay`)
     *  serialize as `.wordplay` from LocalePath.toString(), so the first non-empty
     *  segment is the section key. Anything unrecognized falls back to `ui`. */
    function sectionOf(path: string): SectionKey {
        const head = path.split('.').find((p) => p.length > 0);
        return isSectionKey(head) ? head : 'ui';
    }

    /** Builds a LocaleTextAccessor that resolves to the localized label for a
     *  section, used as the group heading in the dropdown when no section is active. */
    function sectionLabelAccessor(s: SectionKey) {
        return (l: {
            ui: { page: { localize: { section: Record<SectionKey, string> } } };
        }) => l.ui.page.localize.section[s];
    }

    /** Quality mode choice: 0 = all strings, 1 = only machine-translated. Defaults
     *  to machine-translated since that's the most likely thing a contributor
     *  wants to review when opening the workspace. */
    let qualityChoice = $state(1);

    /** Section mode choice: 0 = all, 1..N = sectionOrder[index - 1]. */
    let sectionChoice = $state(0);

    const activeSection = $derived(
        sectionChoice === 0 ? undefined : sectionOrder[sectionChoice - 1],
    );

    /** All paths that have a recognized editor type (i.e., editable here),
     *  pre-decorated with the data each filter step needs. */
    const editablePaths = $derived.by(() => {
        const paths = allPaths.filter(
            (p) =>
                schema === undefined ||
                getEditorType(getDescription(p.toString())) !== undefined,
        );
        return paths.map((p) => {
            const pathStr = p.toString();
            return {
                pair: p,
                pathStr,
                pathLower: pathStr.toLowerCase(),
                description: getDescription(pathStr),
                descLower: getDescription(pathStr)?.toLowerCase() ?? '',
                section: sectionOf(pathStr),
                needsWork: needsWork(p),
                isMT: isMT(p),
            };
        });
    });

    type EditableEntry = (typeof editablePaths)[number];

    /** Lowercased trimmed search query. */
    const queryLower = $derived(filterQuery.trim().toLowerCase());

    /** True if the entry matches the current text filter (or no filter is set). */
    function matchesQuery(e: EditableEntry): boolean {
        return (
            queryLower === '' ||
            e.pathLower.includes(queryLower) ||
            e.descLower.includes(queryLower)
        );
    }

    /** True if the entry passes the current quality filter. */
    function matchesQuality(e: EditableEntry): boolean {
        return qualityChoice !== QUALITY_NEEDS_WORK || e.needsWork;
    }

    /** True if the entry belongs to the currently-active section (or no
     *  section is restricted). */
    function matchesSection(e: EditableEntry): boolean {
        return activeSection === undefined || e.section === activeSection;
    }

    /** Total count of unwritten or machine-translated strings across the whole locale. */
    const totalWorkCount = $derived(
        editablePaths.filter((e) => e.needsWork).length,
    );

    /** Count of editable strings per section ('all' is the union). Reflects the
     *  current quality + text filters but varies the section dimension so each
     *  tab shows what *that* tab would contain if selected. */
    const workCountBySection = $derived.by(() => {
        const counts = new Map<SectionKey | 'all', number>();
        for (const s of sectionKeys) counts.set(s, 0);
        for (const e of editablePaths) {
            if (!matchesQuality(e) || !matchesQuery(e)) continue;
            counts.set('all', (counts.get('all') ?? 0) + 1);
            counts.set(e.section, (counts.get(e.section) ?? 0) + 1);
        }
        return counts;
    });

    /** Per-button annotations for the section <Mode>: one count per button. */
    const sectionAnnotations = $derived(
        sectionKeys.map((s) => `(${workCountBySection.get(s) ?? 0})`),
    );

    /** Per-button annotations for the quality <Mode>. Same filter chain minus
     *  the quality step. */
    const qualityAnnotations = $derived.by(() => {
        let allCount = 0;
        let workCount = 0;
        for (const e of editablePaths) {
            if (!matchesSection(e) || !matchesQuery(e)) continue;
            allCount += 1;
            if (e.needsWork) workCount += 1;
        }
        return [`(${allCount})`, `(${workCount})`];
    });

    /** The full filter chain: quality → section → text, applied to editable
     *  paths and sorted MT-first. The dropdown and the navigation arrows both
     *  draw from this list. */
    const filteredOptions = $derived.by(() => {
        return editablePaths
            .filter(
                (e) =>
                    matchesQuality(e) && matchesSection(e) && matchesQuery(e),
            )
            .sort((a, b) => {
                if (a.isMT === b.isMT) return 0;
                return a.isMT ? -1 : 1;
            })
            .map((e) => ({
                value: e.pathStr,
                label: e.pathStr,
                description: e.description,
            }));
    });

    /** Either grouped (when no section filter) or flat (when one section is active). */
    const dropdownOptions = $derived.by<Group<Option>[] | Option[]>(() => {
        if (activeSection !== undefined) return filteredOptions;
        const buckets = new Map<SectionKey, Option[]>();
        for (const opt of filteredOptions) {
            const s = sectionOf(opt.value);
            const arr = buckets.get(s);
            if (arr) arr.push(opt);
            else buckets.set(s, [opt]);
        }
        return sectionOrder
            .filter((s) => buckets.has(s))
            .map((s) => ({
                label: sectionLabelAccessor(s),
                options: buckets.get(s)!,
            }));
    });

    const editorTypePrefix: Record<EditorType, string> = {
        plain: '[T]',
        formatted: '[*T*]',
        name: '[N]',
        emotion: '[🙂]',
    };

    let selectedPath = $state<string | undefined>(undefined);

    /** The underlying input/textarea of the currently shown editor, bound
     *  separately per editor type because `bind:view` is invariant. The
     *  template-inputs panel reads whichever is currently rendered. */
    let textInputView = $state<HTMLInputElement | undefined>(undefined);
    let textAreaView = $state<HTMLTextAreaElement | undefined>(undefined);

    // Drop the selection if filter changes push it out of the visible list, so
    // the editor doesn't keep targeting an orphaned entry the contributor can't
    // see in the dropdown.
    $effect(() => {
        if (
            selectedPath !== undefined &&
            !filteredOptions.some((o) => o.value === selectedPath)
        )
            selectedPath = undefined;
    });

    const selectedPair = $derived(
        allPaths.find((p) => p.toString() === selectedPath),
    );
    const selectedDescription = $derived(
        selectedPath !== undefined ? getDescription(selectedPath) : undefined,
    );
    const editorType = $derived(getEditorType(selectedDescription));

    /** Which underlying editor element to feed to the TemplateInputsPanel. */
    const editorView = $derived<
        HTMLInputElement | HTMLTextAreaElement | undefined
    >(editorType === 'formatted' ? textAreaView : textInputView);

    /** True if every declared input is referenced, no legacy `$N` refs
     *  remain, and no unknown `$name` typos exist. Non-templated fields
     *  are always clean. */
    const templateInputsClean = $derived.by(() => {
        if (selectedPath === undefined) return true;
        const check = checkTemplateInputs(selectedPath, editedText);
        if (check === undefined) return true;
        return (
            check.unused.length === 0 &&
            check.numeric.length === 0 &&
            check.unknown.length === 0
        );
    });

    /** Tuple index explicitly set by the contributor (via tuple-nav or a deep-link
     *  from the bundle viewer). When undefined, `selectedIndex` derives a default
     *  from the selected pair's shape. Cleared whenever `selectedPath` changes,
     *  so a fresh selection starts at its natural default. */
    let manualIndex = $state<number | undefined>(undefined);

    // Reset the manual index on every path change so the next selection picks up
    // its natural default (0 for tuples, undefined for plain strings).
    let lastSelectedPath: string | undefined = undefined;
    $effect(() => {
        if (selectedPath !== lastSelectedPath) {
            manualIndex = undefined;
            lastSelectedPath = selectedPath;
        }
    });

    const selectedIndex = $derived(
        manualIndex !== undefined
            ? manualIndex
            : selectedPair && Array.isArray(selectedPair.value)
              ? 0
              : undefined,
    );
    const arrayLength = $derived(
        selectedPair && Array.isArray(selectedPair.value)
            ? selectedPair.value.length
            : 0,
    );

    const currentSourceText = $derived.by(() => {
        if (!selectedPair) return '';
        const val = selectedPair.value;
        if (typeof val === 'string') return withoutAnnotations(val);
        if (Array.isArray(val) && selectedIndex !== undefined)
            return withoutAnnotations(val[selectedIndex] ?? '');
        return '';
    });

    /** Lowercased word frequencies across every editable string in the active locale.
     *  Used to spot words in a draft that occur only once anywhere, hinting at typos
     *  or inconsistent vocabulary. */
    const localeWordCounts = $derived.by(() => {
        const counts = new Map<string, number>();
        function add(s: string) {
            const text = withoutAnnotations(s);
            const matches = text.toLowerCase().match(/\p{L}+/gu);
            if (!matches) return;
            for (const w of matches) counts.set(w, (counts.get(w) ?? 0) + 1);
        }
        for (const p of allPaths) {
            const val = p.value;
            if (typeof val === 'string') add(val);
            else if (Array.isArray(val))
                for (const v of val) if (typeof v === 'string') add(v);
        }
        return counts;
    });

    /** Words in the current draft that appear at most once across the locale.
     *  Populated on a typing dwell and cleared when the contributor picks a
     *  different string. */
    let singletonWords = $state<string[]>([]);

    /** Tokenize a draft into Unicode letters (works across scripts) and return the
     *  unique words whose locale frequency is at most one. */
    function computeSingletons(text: string): string[] {
        const matches = text.toLowerCase().match(/\p{L}+/gu);
        if (!matches) return [];
        const seen = new Set<string>();
        const result: string[] = [];
        for (const w of matches) {
            if (seen.has(w)) continue;
            seen.add(w);
            if ((localeWordCounts.get(w) ?? 0) <= 1) result.push(w);
        }
        return result.sort();
    }

    // Debounced singleton check: recompute ~1s after the contributor stops typing.
    // Skipped when the editor is showing the saved value (no draft delta) so we
    // don't flag every word in the source text after the contributor navigates
    // to a new entry.
    $effect(() => {
        const text = editedText;
        const baseline = currentOverride ?? currentSourceText;
        if (text === baseline) {
            singletonWords = [];
            return;
        }
        const timer = setTimeout(() => {
            singletonWords = computeSingletons(text);
        }, 1000);
        return () => clearTimeout(timer);
    });

    // Clear stale singleton results when the targeted cell changes.
    $effect(() => {
        selectedPath;
        selectedIndex;
        singletonWords = [];
    });

    /** Walk a record (the active locale or DefaultLocale) along a dotted path and
     *  return the resolved annotation-free string. Returns `''` when any segment is
     *  missing or the leaf isn't a string / tuple element. Used by both the source-
     *  text resolver for bundle items and the English reference renderer. */
    function resolveLocaleString(
        root: unknown,
        path: string,
        index: number | undefined,
    ): string {
        let node: unknown = root;
        for (const seg of path.split('.').filter((p) => p.length > 0)) {
            const record = asRecord(node);
            if (!record) return '';
            node = record[seg];
        }
        if (typeof node === 'string') return withoutAnnotations(node);
        if (Array.isArray(node) && index !== undefined) {
            const item = node[index];
            if (typeof item === 'string') return withoutAnnotations(item);
        }
        return '';
    }

    /** Split an override key into its locale path and optional tuple index. Override
     *  keys for single strings look like `ui.foo.bar`; tuple-element keys append the
     *  index, e.g. `ui.foo.labels.0`. */
    function parseOverrideKey(key: string): {
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

    /** The English (DefaultLocale) text for the currently-selected cell. Shown below
     *  the editor as a reference, so translators can see the source they're translating. */
    const currentEnglishText = $derived(
        selectedPath === undefined
            ? ''
            : resolveLocaleString(DefaultLocale, selectedPath, selectedIndex),
    );

    const currentKey = $derived.by(() => {
        if (selectedPath === undefined) return undefined;
        return selectedIndex !== undefined
            ? `${selectedPath}.${selectedIndex}`
            : selectedPath;
    });

    /** BCP-47 string for the locale the contributor is currently editing.
     *  Used as the scoping key for all reads/writes to LocalizationDexie so
     *  edits made under one locale don't surface under another. */
    const activeLocaleString = $derived(toLocaleString($locales.getLocale()));

    /** Pending edits for just the active locale (path → revised text). */
    const activeLocaleEdits = $derived(
        $localeEdits.get(activeLocaleString) ?? new Map<string, string>(),
    );

    const currentOverride = $derived(
        currentKey !== undefined
            ? activeLocaleEdits.get(currentKey)
            : undefined,
    );

    let editedText = $state('');
    $effect(() => {
        editedText = currentOverride ?? currentSourceText;
    });

    /** Persist the contributor's edited text. If it matches the source, drop the
     *  override entry; otherwise upsert it under the currently-targeted cell's key. */
    async function saveEdit() {
        if (currentKey === undefined) return;
        if (editedText === currentSourceText)
            await deleteLocaleEdit(activeLocaleString, currentKey);
        else await saveLocaleEdit(activeLocaleString, currentKey, editedText);
    }

    /** Discard any in-progress changes and snap the editor back to the saved value
     *  (override if any, otherwise the source). */
    async function cancelEdit() {
        editedText = currentOverride ?? currentSourceText;
    }

    /** Remove the override for the current cell entirely, restoring the source text. */
    async function revertEdit() {
        if (currentKey === undefined) return;
        await deleteLocaleEdit(activeLocaleString, currentKey);
    }

    /** Within a tuple-typed value, move the editor to a sibling element after
     *  saving the current one. Index is clamped to the tuple bounds. */
    async function moveTupleIndex(next: number) {
        if (arrayLength === 0) return;
        const clamped = Math.max(0, Math.min(arrayLength - 1, next));
        if (clamped === selectedIndex) return;
        await saveEdit();
        manualIndex = clamped;
    }

    const currentEntryIndex = $derived(
        selectedPath === undefined
            ? -1
            : filteredOptions.findIndex((o) => o.value === selectedPath),
    );

    /** Step through the filtered dropdown one entry forward or backward, saving
     *  any pending edit before switching. */
    async function moveEntry(delta: -1 | 1) {
        if (filteredOptions.length === 0) return;
        await saveEdit();
        const next = Math.max(
            0,
            Math.min(
                filteredOptions.length - 1,
                (currentEntryIndex === -1 ? 0 : currentEntryIndex) + delta,
            ),
        );
        selectedPath = filteredOptions[next]?.value;
    }

    /** Resolve the source text for a single override key by walking the active
     *  locale at that key's path (and tuple index, if any). */
    function sourceTextFor(overrideKey: string): string {
        const { path, index } = parseOverrideKey(overrideKey);
        return resolveLocaleString($locales.getLocale(), path, index);
    }

    /** Edits visible in the submit-section bundle viewer. Tutorial-keyed edits
     *  are filtered out: their source text lives in the tutorial JSON (not the
     *  LocaleText tree) and the "jump back to edit" affordance can't route into
     *  the workspace. Those edits remain in storage and continue to be editable
     *  inline on /learn; they'll get their own submission path later. */
    const bundleItems = $derived.by(() =>
        [...activeLocaleEdits.entries()]
            .filter(([key]) => !isTutorialKey(key))
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => ({
                key,
                source: sourceTextFor(key),
                value,
            })),
    );

    /** Count of non-tutorial edits — what the submit section shows and gates on. */
    const bundleCount = $derived(bundleItems.length);

    // Clear the submit-result notice as soon as the contributor starts a new bundle.
    $effect(() => {
        if (bundleCount > 0) submitResult = undefined;
    });

    /** Jump from the bundle viewer back to the editor for that entry, and scroll the
     *  workspace area into view so the editor is visible. */
    function editFromBundle(overrideKey: string) {
        const { path, index } = parseOverrideKey(overrideKey);
        // Clear filters so the path is reachable.
        filterQuery = '';
        sectionChoice = 0;
        qualityChoice = 0;
        selectedPath = path;
        // manualIndex is cleared by the path-change effect and then re-applied
        // here; the derived selectedIndex picks it up immediately, no microtask
        // dance required.
        manualIndex = index;
        workspaceTop?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /** Submit the current bundle to the backend. On success, the function opens
     *  a GitHub PR and clears the submitted edits from local storage; we keep
     *  tutorial-keyed edits in place (they're not part of this workspace's
     *  bundle). On failure, leave everything as-is so the contributor can retry. */
    async function submitBundle(): Promise<
        { status: 'success'; prUrl: string } | { status: 'error' }
    > {
        if (functions === undefined) {
            console.error(
                'Firebase Functions not initialized; cannot submit bundle.',
            );
            return { status: 'error' };
        }
        const submitLocalizationBundle = httpsCallable<
            {
                locale: string;
                description: string;
                edits: Record<string, string>;
            },
            { prUrl: string }
        >(functions, 'submitLocalizationBundle');

        const edits: Record<string, string> = {};
        for (const { key, value } of bundleItems) edits[key] = value;
        let prUrl: string;
        try {
            const response = await submitLocalizationBundle({
                locale: toLocaleString($locales.getLocale()),
                description: bundleDescription,
                edits,
            });
            prUrl = response.data.prUrl;
        } catch (e) {
            console.error('Localization submit failed', e);
            return { status: 'error' };
        }
        for (const key of Object.keys(edits))
            await deleteLocaleEdit(activeLocaleString, key);
        bundleDescription = '';
        return { status: 'success', prUrl };
    }

    /** Click handler for the ConfirmButton; runs `submitBundle` and surfaces the
     *  result (or 'error' on a thrown exception) so the Notice below can render.
     *  Captures the returned PR URL so the success Notice can link to it. */
    async function handleSubmit() {
        try {
            const outcome = await submitBundle();
            submitResult = outcome.status;
            submittedPrUrl =
                outcome.status === 'success' ? outcome.prUrl : undefined;
        } catch {
            submitResult = 'error';
            submittedPrUrl = undefined;
        }
    }

    /** Keep bundleViewIndex within bounds whenever the bundle changes (e.g., after a revert). */
    $effect(() => {
        if (bundleItems.length === 0) {
            bundleViewIndex = 0;
        } else if (bundleViewIndex >= bundleItems.length) {
            bundleViewIndex = bundleItems.length - 1;
        }
    });

    const currentBundleItem = $derived(bundleItems[bundleViewIndex]);

    /** Static dropdown options for the emotion editor — one per declared emotion. */
    const emotionOptions: { value: string; label: string }[] = Object.values(
        Emotion,
    ).map((e) => ({ value: e, label: e }));
</script>

<Writing>
    <Header text={(l) => l.ui.page.localize.header} />
    <MarkupHTMLView markup={(l) => l.ui.page.localize.description} />

    {#if !isAuthenticated($user)}
        <Notice text={(l) => l.ui.page.localize.requireLogin} />
    {:else}
        <section class="workspace" bind:this={workspaceTop}>
            <h2>
                <LocalizedText
                    path={(l) => l.ui.page.localize.workspaceHeader}
                />
                <span class="header-count"
                    >({MACHINE_TRANSLATED_SYMBOL}
                    {totalWorkCount})</span
                >
            </h2>
            <div class="filters">
                <TextField
                    id="localize-filter"
                    description={(l) => l.ui.localize.field.filter.description}
                    placeholder={(l) => l.ui.localize.field.filter.placeholder}
                    noTipBadge
                    bind:text={filterQuery}
                />
                <!-- Top filter: all strings vs only the unwritten / machine-translated ones. -->
                <Mode
                    modes={(l) => l.ui.page.localize.qualityMode}
                    choice={qualityChoice}
                    select={(c) => {
                        qualityChoice = c;
                        queueMicrotask(() => {
                            selectedPath = filteredOptions[0]?.value;
                        });
                    }}
                    annotations={qualityAnnotations}
                />
                <Mode
                    modes={(l) => l.ui.page.localize.sectionMode}
                    choice={sectionChoice}
                    select={(c) => {
                        sectionChoice = c;
                        queueMicrotask(() => {
                            selectedPath = filteredOptions[0]?.value;
                        });
                    }}
                    annotations={sectionAnnotations}
                    wrap
                />
            </div>

            {#if filteredOptions.length === 0}
                <Notice text={(l) => l.ui.page.localize.empty} />
            {:else}
                <!-- Entry navigation lives ABOVE the dropdown so its position is
                 stable across edits (the editor below grows/shrinks freely),
                 making repeat-click navigation easier. -->
                <div class="entry-nav">
                    <Button
                        tip={(l) => l.ui.page.localize.prevEntry}
                        active={currentEntryIndex > 0}
                        action={() => moveEntry(-1)}
                        background>←</Button
                    >
                    <span class="entry-indicator"
                        >{currentEntryIndex === -1
                            ? '—'
                            : currentEntryIndex + 1} / {filteredOptions.length}</span
                    >
                    <Button
                        tip={(l) => l.ui.page.localize.nextEntry}
                        active={currentEntryIndex !== -1 &&
                            currentEntryIndex < filteredOptions.length - 1}
                        action={() => moveEntry(1)}
                        background>→</Button
                    >
                </div>
                <Options
                    value={selectedPath}
                    label={(l) => l.ui.localize.strings}
                    options={dropdownOptions}
                    change={(val) => (selectedPath = val)}
                    width="100%"
                >
                    {#snippet item(option, localized)}
                        {@const typePrefix =
                            editorTypePrefix[
                                getEditorType(option.description) ?? 'plain'
                            ] ?? ''}
                        {@const pair = allPaths.find(
                            (p) => p.toString() === option.value,
                        )}
                        {@const mt = pair ? isMT(pair) : false}
                        <span class="option-item">
                            <span class="option-label"
                                >{typePrefix}{mt
                                    ? ' ' + MACHINE_TRANSLATED_SYMBOL
                                    : ''}
                                {@render localized(option.label)}</span
                            >
                            {#if option.description}
                                <Note>{option.description}</Note>
                            {/if}
                        </span>
                    {/snippet}
                </Options>

                {#if selectedPath !== undefined}
                    {#if arrayLength > 1}
                        <div class="tuple-nav">
                            <Button
                                tip={(l) => l.ui.localize.button.prev}
                                active={(selectedIndex ?? 0) > 0}
                                action={() =>
                                    moveTupleIndex((selectedIndex ?? 0) - 1)}
                                background>←</Button
                            >
                            <span class="index-indicator"
                                >{(selectedIndex ?? 0) + 1} / {arrayLength}</span
                            >
                            <Button
                                tip={(l) => l.ui.localize.button.next}
                                active={(selectedIndex ?? 0) < arrayLength - 1}
                                action={() =>
                                    moveTupleIndex((selectedIndex ?? 0) + 1)}
                                background>→</Button
                            >
                        </div>
                    {/if}
                    {#if editorType === 'plain'}
                        <TextField
                            id="localize-mt-field"
                            description={(l) =>
                                l.ui.localize.field.plain.description}
                            placeholder={(l) =>
                                l.ui.localize.field.plain.placeholder}
                            noTipBadge
                            bind:text={editedText}
                            bind:view={textInputView}
                            fill
                        />
                    {:else if editorType === 'formatted'}
                        <FormattedEditor
                            id="localize-mt-field"
                            description={(l) =>
                                l.ui.localize.field.formatted.description}
                            placeholder={(l) =>
                                l.ui.localize.field.formatted.placeholder}
                            bind:text={editedText}
                            bind:view={textAreaView}
                        />
                    {:else if editorType === 'name'}
                        <TextField
                            id="localize-mt-field"
                            description={(l) =>
                                l.ui.localize.field.name.description}
                            placeholder={(l) =>
                                l.ui.localize.field.name.placeholder}
                            validator={(text) =>
                                isName(text) || text === ''
                                    ? true
                                    : (l) => l.ui.localize.invalidName}
                            noTipBadge
                            bind:text={editedText}
                            bind:view={textInputView}
                            fill
                        />
                    {:else if editorType === 'emotion'}
                        <Options
                            value={editedText}
                            label={(l) => l.ui.localize.emotion}
                            options={emotionOptions}
                            change={(val) => {
                                editedText = val ?? '';
                            }}
                        />
                    {/if}
                    <TemplateInputsPanel
                        path={selectedPath}
                        text={editedText}
                        view={editorView}
                        oninsert={(next) => {
                            editedText = next;
                        }}
                    />
                    {#if currentEnglishText !== ''}
                        <div class="english-reference">
                            <h3>
                                <LocalizedText
                                    path={(l) => l.ui.localize.reference}
                                />
                            </h3>
                            <p>{currentEnglishText}</p>
                        </div>
                    {/if}
                    {#if singletonWords.length > 0}
                        <Notice>
                            <p>
                                <LocalizedText
                                    path={(l) =>
                                        l.ui.page.localize
                                            .singletonWordsWarning}
                                />
                            </p>
                            <p class="singleton-words"
                                >{singletonWords.join(', ')}</p
                            >
                        </Notice>
                    {/if}
                    <div class="editor-actions">
                        <Button
                            tip={templateInputsClean
                                ? (l) => l.ui.localize.button.submit
                                : (l) => l.ui.localize.inputs.submitBlocked}
                            active={templateInputsClean &&
                                editedText !==
                                    (currentOverride ?? currentSourceText)}
                            action={saveEdit}
                            background>{CONFIRM_SYMBOL}</Button
                        >
                        <Button
                            tip={(l) => l.ui.localize.button.cancel}
                            active={editedText !==
                                (currentOverride ?? currentSourceText)}
                            action={cancelEdit}
                            background>{CANCEL_SYMBOL}</Button
                        >
                        {#if currentOverride !== undefined}
                            <Button
                                tip={(l) => l.ui.localize.button.revert}
                                action={revertEdit}
                                background>{REVERT_SYMBOL}</Button
                            >
                        {/if}
                    </div>
                {/if}
            {/if}
        </section>

        {#if bundleCount > 0 || submitResult !== undefined}
            <section class="submit">
                <h2>
                    <LocalizedText
                        path={(l) => l.ui.page.localize.submitHeader}
                    />
                    {#if bundleCount > 0}
                        <span class="header-count">({bundleCount})</span>
                    {/if}
                </h2>
                <MarkupHTMLView
                    markup={(l) => l.ui.page.localize.submitPrompt}
                />
                <MarkupHTMLView
                    markup={[
                        (l) => l.ui.page.localize.oneLocaleNote,
                        { locale: activeLocaleString },
                    ]}
                />

                {#if submitResult === 'success'}
                    <Notice>
                        <p>
                            <LocalizedText
                                path={(l) => l.ui.page.localize.submitSuccess}
                            />
                        </p>
                        {#if submittedPrUrl !== undefined && submittedPrUrl.startsWith('http')}
                            <p>
                                <Link
                                    to={submittedPrUrl}
                                    external
                                    label={(l) => l.ui.page.localize.viewPR}
                                />
                            </p>
                        {/if}
                    </Notice>
                {:else if submitResult === 'error'}
                    <Notice text={(l) => l.ui.page.localize.submitError} />
                {/if}

                {#if bundleCount > 0}
                    <TextBox
                        id="localize-bundle-description"
                        description={(l) =>
                            l.ui.page.localize.descriptionField.description}
                        placeholder={(l) =>
                            l.ui.page.localize.descriptionField.placeholder}
                        noTipBadge
                        bind:text={bundleDescription}
                    />

                    <div class="spam-check">
                        <Checkbox
                            id="localize-not-spam"
                            label={(l) => l.ui.page.localize.notSpamLabel}
                            bind:on={notSpamConfirmed}
                        />
                        <label for="localize-not-spam">
                            <LocalizedText
                                path={(l) => l.ui.page.localize.notSpamLabel}
                            />
                        </label>
                    </div>
                    <Note>
                        <LocalizedText
                            path={(l) => l.ui.page.localize.notSpamNote}
                        />
                    </Note>

                    <h3>
                        <LocalizedText
                            path={(l) => l.ui.page.localize.bundleSummary}
                        />
                    </h3>

                    {#if currentBundleItem}
                        {@const tipText = $locales.getPlainText(
                            (l) => l.ui.page.localize.editEntry,
                        )}
                        <div class="bundle-viewer">
                            <button
                                type="button"
                                class="bundle-item"
                                title={tipText}
                                aria-label={tipText}
                                onclick={() =>
                                    editFromBundle(currentBundleItem.key)}
                            >
                                <code class="bundle-key"
                                    >{currentBundleItem.key}</code
                                >
                                <div class="bundle-texts">
                                    <div class="bundle-source"
                                        >{currentBundleItem.source}</div
                                    >
                                    <div class="bundle-arrow">→</div>
                                    <div class="bundle-value"
                                        >{currentBundleItem.value}</div
                                    >
                                </div>
                            </button>
                            <div class="bundle-nav">
                                <Button
                                    tip={(l) =>
                                        l.ui.page.localize.prevBundleItem}
                                    active={bundleViewIndex > 0}
                                    action={() => {
                                        bundleViewIndex = bundleViewIndex - 1;
                                    }}
                                    background>←</Button
                                >
                                <span class="entry-indicator"
                                    >{bundleViewIndex + 1} / {bundleItems.length}</span
                                >
                                <Button
                                    tip={(l) =>
                                        l.ui.page.localize.nextBundleItem}
                                    active={bundleViewIndex <
                                        bundleItems.length - 1}
                                    action={() => {
                                        bundleViewIndex = bundleViewIndex + 1;
                                    }}
                                    background>→</Button
                                >
                                <Button
                                    tip={(l) => l.ui.page.localize.revertEntry}
                                    action={() =>
                                        deleteLocaleEdit(
                                            activeLocaleString,
                                            currentBundleItem.key,
                                        )}
                                    background>{REVERT_SYMBOL}</Button
                                >
                            </div>
                        </div>
                    {/if}

                    <ConfirmButton
                        tip={(l) => l.ui.page.localize.submit.description}
                        label={(l) => l.ui.page.localize.submit.prompt}
                        prompt={(l) => l.ui.page.localize.submit.prompt}
                        action={handleSubmit}
                        enabled={bundleDescription.trim().length > 0 &&
                            notSpamConfirmed}
                        background
                        icon={CONFIRM_SYMBOL}
                    />
                {/if}
            </section>
        {/if}
    {/if}
</Writing>

<style>
    section {
        display: flex;
        flex-direction: column;
        gap: calc(var(--wordplay-spacing) * 2);
        margin-block-start: calc(var(--wordplay-spacing) * 3);
    }

    /* Anti-spam confirmation row: checkbox + its accompanying label. */
    .spam-check {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
    }

    .english-reference {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing-half);
    }

    .english-reference h3 {
        font-size: var(--wordplay-small-font-size);
        color: var(--wordplay-inactive-color);
        margin: 0;
    }

    .english-reference p {
        margin: 0;
    }

    .singleton-words {
        font-family: var(--wordplay-code-font);
        margin-block-start: var(--wordplay-spacing-half);
    }

    h2 {
        margin: 0;
        display: flex;
        flex-direction: row;
        align-items: baseline;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing-half);
    }

    h3 {
        font-size: min(4vw, 14pt);
        margin: 0;
        display: flex;
        flex-direction: row;
        align-items: baseline;
        gap: var(--wordplay-spacing);
    }

    .header-count {
        font-size: var(--wordplay-small-font-size);
        font-weight: normal;
        font-variant-numeric: tabular-nums;
        color: var(--wordplay-inactive-color);
    }

    .filters {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }

    .option-item {
        display: flex;
        flex-direction: column;
        color: var(--wordplay-foreground);
    }

    .entry-nav,
    .tuple-nav,
    .editor-actions {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
    }

    .entry-indicator,
    .index-indicator {
        font-size: var(--wordplay-small-font-size);
        color: var(--wordplay-inactive-color);
        white-space: nowrap;
        min-width: 3em;
        text-align: center;
        font-variant-numeric: tabular-nums;
    }

    .bundle-viewer {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing-half);
    }

    /* The bundle item itself is one big button: clicking anywhere on it jumps
       back to the editor and scrolls the workspace into view. */
    .bundle-item {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing-half);
        padding: var(--wordplay-spacing-half);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        background: var(--wordplay-background);
        color: inherit;
        font: inherit;
        text-align: start;
        cursor: pointer;
    }

    .bundle-item:hover,
    .bundle-item:focus-visible {
        background: var(--wordplay-hover);
        outline: none;
    }

    .bundle-key {
        font-family: var(--wordplay-code-font);
        font-size: var(--wordplay-small-font-size);
        word-break: break-all;
    }

    .bundle-nav {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
    }

    .bundle-texts {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        gap: var(--wordplay-spacing);
        align-items: baseline;
    }

    .bundle-source {
        color: var(--wordplay-inactive-color);
        text-decoration: line-through;
    }

    .bundle-arrow {
        color: var(--wordplay-inactive-color);
    }

    .bundle-value {
        color: var(--wordplay-foreground);
    }
</style>
