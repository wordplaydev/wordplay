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
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { isMachineTranslated } from '@locale/LocaleText';
    import { withoutAnnotations } from '@locale/withoutAnnotations';
    import { CANCEL_SYMBOL, CONFIRM_SYMBOL, REVERT_SYMBOL } from '@parser/Symbols';
    import { tick } from 'svelte';
    import { accessorToLocalePath } from '@components/localization/accessorToLocalePath';
    import { localeEdits, saveLocaleEdit, deleteLocaleEdit } from '@db/locales/LocalizationDexie';

    interface Props {
        path: LocaleTextAccessor;
        markup?: boolean;
    }

    let { path, markup = false }: Props = $props();

    const fieldId = `localize-field-${idCounter++}`;
    const text = $derived($locales.getWithAnnotations(path));
    const isMT = $derived(isMachineTranslated(text));
    const withoutAnnotationsText = $derived(withoutAnnotations(text));

    let localizing = getLocalizing();
    let editing = $state(false);
    let editedText = $state('');
    let fieldView = $state<HTMLInputElement | undefined>(undefined);
    let cancelled = false;

    let localePath = $derived(accessorToLocalePath(path));
    let override = $derived($localeEdits.get(localePath?.toString() ?? ''));

    async function startEditing() {
        editedText = override ?? withoutAnnotationsText;
        editing = true;
        await tick();
        fieldView?.focus();
    }

    function commitEdit(text: string) {
        if (!localePath) return;
        if (text === withoutAnnotationsText) deleteLocaleEdit(localePath.toString());
        else saveLocaleEdit(localePath.toString(), text);
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
                focus={() => (localizing.focused = path)}
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
                    if (localePath) deleteLocaleEdit(localePath.toString());
                    cancelled = true;
                    fieldView?.blur();
                }}
                background>{REVERT_SYMBOL}</Button
            >{/if}</span>
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
    }
</style>
