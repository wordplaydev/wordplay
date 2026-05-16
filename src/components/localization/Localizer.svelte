<script lang="ts">
    import Subheader from '@components/app/Subheader.svelte';
    import Notice from '@components/app/Notice.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getLocalizing } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import FormattedEditor from '@components/widgets/FormattedEditor.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Note from '@components/widgets/Note.svelte';
    import Options from '@components/widgets/Options.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { locales } from '@db/Database';
    import {
        deleteAllLocaleEdits,
        deleteLocaleEdit,
        localeEdits,
        saveLocaleEdit,
    } from '@db/locales/LocalizationDexie';
    import DefaultLocale from '@locale/DefaultLocale';
    import { isMachineTranslated } from '@locale/LocaleText';
    import { withoutAnnotations } from '@locale/withoutAnnotations';
    import {
        CANCEL_SYMBOL,
        CONFIRM_SYMBOL,
        MACHINE_TRANSLATED_SYMBOL,
        REVERT_SYMBOL,
    } from '@parser/Symbols';
    import { isName } from '@parser/Tokenizer';
    import { getKeyTemplatePairs } from '@util/verify-locales/LocalePath';
    import { onMount } from 'svelte';
    import { Emotion } from '../../lore/Emotion';

    let localizing = getLocalizing();
    let submitted = $state(false);

    $effect(() => {
        if ($localeEdits.size > 0) submitted = false;
    });
    let focusedEnglishText = $derived.by(() => {
        const accessor = localizing.focused;
        if (!accessor) return undefined;
        const result = accessor(DefaultLocale);
        return Array.isArray(result) ? result.join('\n\n') : result;
    });

    // Lazily fetched JSON Schema — not bundled
    let schema = $state<Record<string, unknown> | undefined>(undefined);

    onMount(async () => {
        const response = await fetch('/schemas/LocaleText.json');
        if (response.ok) schema = await response.json();
    });

    function resolveRef(
        s: Record<string, unknown>,
        ref: string,
    ): Record<string, unknown> | undefined {
        const parts = ref.replace('#/', '').split('/');
        let node: unknown = s;
        for (const part of parts) {
            if (typeof node !== 'object' || node === null) return undefined;
            node = (node as Record<string, unknown>)[decodeURIComponent(part)];
        }
        return typeof node === 'object' && node !== null
            ? (node as Record<string, unknown>)
            : undefined;
    }

    function getDescription(pathStr: string): string | undefined {
        if (!schema) return undefined;
        const parts = pathStr.split('.');
        let node: Record<string, unknown> | undefined = (
            schema.definitions as Record<string, unknown> | undefined
        )?.['LocaleText'] as Record<string, unknown> | undefined;

        for (const part of parts) {
            if (!node) return undefined;
            // Resolve $ref to get access to properties
            const ref = node['$ref'];
            if (typeof ref === 'string') node = resolveRef(schema, ref);
            if (!node) return undefined;
            const props = node['properties'] as
                | Record<string, unknown>
                | undefined;
            node = props?.[part] as Record<string, unknown> | undefined;
        }

        if (!node) return undefined;
        if (typeof node['description'] === 'string') return node['description'];
        // Fall back to the description on the referenced definition
        const ref = node['$ref'];
        if (typeof ref === 'string') {
            const resolved = resolveRef(schema, ref);
            if (typeof resolved?.['description'] === 'string')
                return resolved['description'] as string;
        }
        return undefined;
    }

    type EditorType = 'plain' | 'formatted' | 'name' | 'emotion';

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

    const allPaths = $derived.by(() => {
        const locale = $locales.getLocale();
        return getKeyTemplatePairs(
            locale as unknown as Record<string, unknown>,
        );
    });

    function isMT(pair: (typeof allPaths)[number]) {
        const val = pair.value;
        if (typeof val === 'string') return isMachineTranslated(val);
        if (Array.isArray(val)) return val.some((v) => isMachineTranslated(v));
        return false;
    }

    let filterQuery = $state('');

    const options = $derived.by(() => {
        const query = filterQuery.trim().toLowerCase();
        return [...allPaths]
            .sort((a, b) => {
                const aMT = isMT(a);
                const bMT = isMT(b);
                if (aMT === bMT) return 0;
                return aMT ? -1 : 1;
            })
            .map((pair) => ({
                value: pair.toString(),
                label: pair.toString(),
                description: getDescription(pair.toString()),
            }))
            .filter((opt) => {
                // Once schema is loaded, only include keys with a recognized editor type
                if (
                    schema !== undefined &&
                    getEditorType(opt.description) === undefined
                )
                    return false;
                return (
                    query === '' ||
                    opt.value.toLowerCase().includes(query) ||
                    (opt.description?.toLowerCase().includes(query) ?? false)
                );
            });
    });

    const mtCount = $derived(
        options.filter((opt) => {
            const pair = allPaths.find((p) => p.toString() === opt.value);
            return pair ? isMT(pair) : false;
        }).length,
    );

    const editorTypePrefix: Record<EditorType, string> = {
        plain: '[T]',
        formatted: '[*T*]',
        name: '[N]',
        emotion: '[🙂]',
    };

    let selectedPath = $state<string | undefined>(undefined);

    const selectedPair = $derived(
        allPaths.find((p) => p.toString() === selectedPath),
    );

    const selectedDescription = $derived(
        selectedPath !== undefined ? getDescription(selectedPath) : undefined,
    );

    const editorType = $derived(getEditorType(selectedDescription));

    // For tuple-typed values, which element the editor is currently focused on.
    // `undefined` means the value is a single string (no element selection).
    let selectedIndex = $state<number | undefined>(undefined);

    const arrayLength = $derived(
        selectedPair && Array.isArray(selectedPair.value)
            ? selectedPair.value.length
            : 0,
    );

    // Reset element index when the selected path changes.
    $effect(() => {
        if (!selectedPair) selectedIndex = undefined;
        else if (Array.isArray(selectedPair.value)) selectedIndex = 0;
        else selectedIndex = undefined;
    });

    // The original (source-of-truth) string at the currently-targeted cell.
    const currentSourceText = $derived.by(() => {
        if (!selectedPair) return '';
        const val = selectedPair.value;
        if (typeof val === 'string') return withoutAnnotations(val);
        if (Array.isArray(val) && selectedIndex !== undefined)
            return withoutAnnotations(val[selectedIndex] ?? '');
        return '';
    });

    // The serialized override key for the currently-targeted cell.
    const currentKey = $derived.by(() => {
        if (selectedPath === undefined) return undefined;
        return selectedIndex !== undefined
            ? `${selectedPath}.${selectedIndex}`
            : selectedPath;
    });

    const currentOverride = $derived(
        currentKey !== undefined ? $localeEdits.get(currentKey) : undefined,
    );

    let editedText = $state('');

    // Whenever the targeted cell changes (path or index), reset the editor to the override or source.
    $effect(() => {
        editedText = currentOverride ?? currentSourceText;
    });

    async function saveEdit() {
        if (currentKey === undefined) return;
        if (editedText === currentSourceText)
            await deleteLocaleEdit(currentKey);
        else await saveLocaleEdit(currentKey, editedText);
    }

    async function cancelEdit() {
        editedText = currentOverride ?? currentSourceText;
    }

    async function revertEdit() {
        if (currentKey === undefined) return;
        await deleteLocaleEdit(currentKey);
    }

    async function moveToIndex(next: number) {
        if (arrayLength === 0) return;
        const clamped = Math.max(0, Math.min(arrayLength - 1, next));
        if (clamped === selectedIndex) return;
        await saveEdit();
        selectedIndex = clamped;
    }

    const emotionOptions: { value: string; label: string }[] = Object.values(
        Emotion,
    ).map((e) => ({ value: e as string, label: e as string }));
</script>

<Subheader text={(l) => l.ui.localize.header} />
<MarkupHTMLView markup={(l) => l.ui.localize.description} />

{#if focusedEnglishText !== undefined}
    <h3><LocalizedText path={(l) => l.ui.localize.reference} /></h3>
    <p>{focusedEnglishText}</p>
{:else if allPaths.length > 0}
    <h3><LocalizedText path={(l) => l.ui.localize.unwritten} /></h3>
    <div class="mt-editor">
        <div class="selector-row">
            <TextField
                id="localize-filter"
                description={(l) => l.ui.localize.field.filter.description}
                placeholder={(l) => l.ui.localize.field.filter.placeholder}
                bind:text={filterQuery}
            />
            <div class="dropdown-group">
                <Note
                    >{MACHINE_TRANSLATED_SYMBOL}
                    {mtCount} / {options.length}</Note
                >
                <Options
                    value={selectedPath}
                    label={(l) => l.ui.localize.strings}
                    {options}
                    change={(val) => {
                        selectedPath = val;
                    }}
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
            </div>
        </div>
        {#if selectedPath !== undefined}
            {#if arrayLength > 1}
                <div class="nav-row">
                    <Button
                        tip={(l) => l.ui.localize.button.prev}
                        active={(selectedIndex ?? 0) > 0}
                        action={() => moveToIndex((selectedIndex ?? 0) - 1)}
                        background>←</Button
                    >
                    <span class="index-indicator"
                        >{(selectedIndex ?? 0) + 1} / {arrayLength}</span
                    >
                    <Button
                        tip={(l) => l.ui.localize.button.next}
                        active={(selectedIndex ?? 0) < arrayLength - 1}
                        action={() => moveToIndex((selectedIndex ?? 0) + 1)}
                        background>→</Button
                    >
                </div>
            {/if}
            {#if editorType === 'plain'}
                <TextField
                    id="localize-mt-field"
                    description={(l) => l.ui.localize.field.plain.description}
                    placeholder={(l) => l.ui.localize.field.plain.placeholder}
                    noTipBadge
                    bind:text={editedText}
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
                />
            {:else if editorType === 'name'}
                <TextField
                    id="localize-mt-field"
                    description={(l) => l.ui.localize.field.name.description}
                    placeholder={(l) => l.ui.localize.field.name.placeholder}
                    validator={(text) =>
                        isName(text) || text === ''
                            ? true
                            : (l) => l.ui.localize.invalidName}
                    noTipBadge
                    bind:text={editedText}
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
            <div class="editor-actions">
                <Button
                    tip={(l) => l.ui.localize.button.submit}
                    active={editedText !== (currentOverride ?? currentSourceText)}
                    action={saveEdit}
                    background>{CONFIRM_SYMBOL}</Button
                >
                <Button
                    tip={(l) => l.ui.localize.button.cancel}
                    active={editedText !== (currentOverride ?? currentSourceText)}
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
    </div>

    {#if submitted}
        <Notice text={(l) => l.ui.localize.submitted} />
    {/if}

    {#if $localeEdits.size > 0}
        <h3><LocalizedText path={(l) => l.ui.localize.revised} /></h3>
        <MarkupHTMLView markup={(l) => l.ui.localize.revisedDescription} />
        <div class="revised-actions">
            <span>{$localeEdits.size}</span>
            <Button
                tip={(l) => l.ui.localize.submitRevisions}
                action={async () => { await deleteAllLocaleEdits(); submitted = true; }}
                background
                padding={true}
                >{CONFIRM_SYMBOL}
                <LocalizedText
                    path={(l) => l.ui.localize.submitRevisions}
                /></Button
            >
        </div>
    {/if}
{/if}

<style>
    .revised-actions {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
        margin-block-start: var(--wordplay-spacing);
    }

    h3 {
        font-size: min(4vw, 14pt);
        margin-block-start: 1em;
        margin-block-end: var(--wordplay-spacing);
    }

    .mt-editor {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        margin-top: var(--wordplay-spacing);
    }

    .selector-row {
        display: flex;
        flex-direction: row;
        align-items: flex-start;
        gap: var(--wordplay-spacing);
    }

    .dropdown-group {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        flex: 1;
        min-width: 0;
    }

    .option-item {
        display: flex;
        flex-direction: column;
        color: var(--wordplay-foreground);
    }

    .nav-row,
    .editor-actions {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
    }

    .index-indicator {
        font-size: var(--wordplay-small-font-size);
        color: var(--wordplay-inactive-color);
        white-space: nowrap;
        min-width: 2.5em;
        text-align: center;
        font-variant-numeric: tabular-nums;
    }
</style>
