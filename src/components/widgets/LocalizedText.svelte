<!-- Represents some text defined in the locale. -->
<script module lang="ts">
    let idCounter = 0;
</script>

<script lang="ts">
    import MachineTranslatedAnnotation from '@components/app/MachineTranslatedAnnotation.svelte';
    import LocallyRevisedAnnotation from '@components/app/LocallyRevisedAnnotation.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getLocalizing } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { locales } from '@db/Database';
    import type LocaleText from '@locale/LocaleText';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { isMachineTranslated } from '@locale/LocaleText';
    import { withoutAnnotations } from '@locale/withoutAnnotations';
    import { CANCEL_SYMBOL, CONFIRM_SYMBOL, REVERT_SYMBOL } from '@parser/Symbols';
    import { tick } from 'svelte';
    import { accessorToLocalePath } from '@components/localization/accessorToLocalePath';
    import { localeEdits, saveLocaleEdit, deleteLocaleEdit } from '@db/locales/LocalizationDexie';

    interface Props {
        /** A property-access accessor on the locale tree. Must be a literal `(l) => l.a.b.c`
         *  for the inline editor's path extraction to work. May resolve to any subtree;
         *  use `extras` to navigate the rest of the way to a string. */
        path: ((locale: LocaleText) => unknown) | LocaleTextAccessor;
        markup?: boolean;
        /** Trailing path segments applied after `path` resolves. Used to address a sub-field
         *  (string) or an element of a fixed-length tuple (e.g., ['labels', 0]). */
        extras?: (string | number)[];
    }

    let { path, markup = false, extras = [] }: Props = $props();

    const fieldId = `localize-field-${idCounter++}`;

    function walk(root: unknown, segments: (string | number)[]): unknown {
        let node: unknown = root;
        for (const seg of segments) {
            if (node === null || node === undefined) return undefined;
            if (typeof node !== 'object') return undefined;
            node = (node as Record<string | number, unknown>)[seg];
        }
        return node;
    }

    const text = $derived(((): string => {
        const value = walk($locales.getWithAnnotations(path), extras);
        return typeof value === 'string' ? value : '';
    })());

    const isMT = $derived(isMachineTranslated(text));
    const withoutAnnotationsText = $derived(withoutAnnotations(text));

    let localizing = getLocalizing();
    let editing = $state(false);
    let editedText = $state('');
    let fieldView = $state<HTMLInputElement | undefined>(undefined);
    let cancelled = false;

    let localePath = $derived(accessorToLocalePath(path, ...extras));
    let override = $derived($localeEdits.get(localePath?.toString() ?? ''));

    async function startEditing() {
        editedText = override ?? withoutAnnotationsText;
        editing = true;
        await tick();
        fieldView?.focus();
    }

    function commitEdit(text: string) {
        if (!localePath) return;
        const key = localePath.toString();
        if (text === withoutAnnotationsText) deleteLocaleEdit(key);
        else saveLocaleEdit(key, text);
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            cancelled = true;
            fieldView?.blur();
        } else if (e.key === 'Enter') {
            commitEdit(editedText);
            editing = false;
        }
    }
</script>

{#if localizing?.on}
    <span
        class="localized-wrapper"
        role="none"
        onclick={(e) => {
            e.stopPropagation();
            e.preventDefault();
        }}
        onkeydown={handleKeydown}
    >
        {#if editing}
            <TextField
                id={fieldId}
                description={(l) => l.ui.localize.field.plain.description}
                placeholder={(l) => l.ui.localize.field.plain.placeholder}
                bind:text={editedText}
                bind:view={fieldView}
                focus={() =>
                    (localizing.focused = path as LocaleTextAccessor)}
                blur={() => (localizing.focused = undefined)}
                done={() => {
                    if (cancelled) {
                        cancelled = false;
                    } else {
                        commitEdit(editedText);
                    }
                    editing = false;
                }}
            /><span class="edit-actions"><Button
                    tip={(l) => l.ui.localize.button.submit}
                    action={() => {
                        commitEdit(editedText);
                        editing = false;
                    }}
                    background>{CONFIRM_SYMBOL}</Button
                ><Button
                    tip={(l) => l.ui.localize.button.cancel}
                    action={() => {
                        cancelled = true;
                        fieldView?.blur();
                    }}
                    background>{CANCEL_SYMBOL}</Button
                >{#if override}<Button
                        tip={(l) => l.ui.localize.button.revert}
                        action={() => {
                            if (localePath)
                                deleteLocaleEdit(localePath.toString());
                            cancelled = true;
                            fieldView?.blur();
                        }}
                        background>{REVERT_SYMBOL}</Button
                    >{/if}</span
            >
        {:else}
            <Button
                tip={(l) => l.ui.localize.button.edit}
                action={startEditing}
                padding={false}
                background="salient"
                size="inherit"
                >{override ?? withoutAnnotationsText}{#if isMT && !override}<MachineTranslatedAnnotation
                    />{/if}{#if override}<LocallyRevisedAnnotation />{/if}</Button
            >
        {/if}
    </span>
{:else}
    <span class="localized"
        >{#if markup}<MarkupHTMLView markup={text}
            ></MarkupHTMLView>{:else}{withoutAnnotationsText}{/if}{#if isMT}<MachineTranslatedAnnotation
            />{/if}</span
    >
{/if}

<style>
    .localized-wrapper {
        display: inline;
    }

    span.edit-actions {
        display: inline-flex;
        gap: var(--wordplay-spacing);
    }

    .localized-wrapper :global(button) {
        font-weight: inherit;
        max-width: 100%;
        min-width: 0;
        flex-shrink: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        vertical-align: bottom;
    }
</style>
