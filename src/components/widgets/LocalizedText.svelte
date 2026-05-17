<!-- Represents some text defined in the locale. -->
<script module lang="ts">
    let idCounter = 0;
</script>

<script lang="ts">
    import LocallyRevisedAnnotation from '@components/app/LocallyRevisedAnnotation.svelte';
    import MachineTranslatedAnnotation from '@components/app/MachineTranslatedAnnotation.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { accessorToLocalePath } from '@components/localization/accessorToLocalePath';
    import { getLocalizing } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { locales } from '@db/Database';
    import {
        deleteLocaleEdit,
        localeEdits,
        saveLocaleEdit,
    } from '@db/locales/LocalizationDexie';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import type LocaleText from '@locale/LocaleText';
    import { isMachineTranslated } from '@locale/LocaleText';
    import { withoutAnnotations } from '@locale/withoutAnnotations';
    import {
        CANCEL_SYMBOL,
        CONFIRM_SYMBOL,
        REVERT_SYMBOL,
        TOOLTIP_SYMBOL,
    } from '@parser/Symbols';
    import { tick } from 'svelte';

    interface Props {
        /** A property-access accessor on the locale tree. Must be a literal `(l) => l.a.b.c`
         *  for the inline editor's path extraction to work. May resolve to any subtree;
         *  use `extras` to navigate the rest of the way to a string.
         *
         *  Optional only because tutorial-text usage may supply `overrideKey` +
         *  `sourceText` instead, which bypasses locale-tree path resolution. */
        path?: ((locale: LocaleText) => unknown) | LocaleTextAccessor;
        markup?: boolean;
        /** Trailing path segments applied after `path` resolves. Used to address a sub-field
         *  (string) or an element of a fixed-length tuple (e.g., ['labels', 0]). */
        extras?: (string | number)[];
        /** When true, the salient button renders a 💭 tooltip icon instead of the resolved
         *  text. Use for tip-only editors (e.g., a tip on an icon-only button or unlabeled control)
         *  so the visible affordance signals "edit this tip" rather than displaying the tip text. */
        tipIcon?: boolean;
        /** Called when the inline editor opens or closes. Parents that render a pair of
         *  LocalizedTexts (e.g., a Button with both a label and a tip) can use this to hide
         *  the sibling while one is being edited. */
        onEditingChange?: (editing: boolean) => void;
        /** Storage key for an override, used in place of a parsed `path`. Pass this for
         *  text that doesn't live in the regular locale tree — e.g., tutorial titles. The
         *  override is read from / written to `LocalizationDexie` under this key. */
        overrideKey?: string;
        /** The current source text used when `overrideKey` is provided. Acts as the
         *  initial editor value and the "no-override" fallback for display. */
        sourceText?: string;
    }

    let {
        path,
        markup = false,
        extras = [],
        tipIcon = false,
        onEditingChange,
        overrideKey,
        sourceText,
    }: Props = $props();

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

    function resolveString(
        accessor: (locale: LocaleText) => unknown,
        segments: (string | number)[],
    ): string {
        const value = walk($locales.getWithAnnotations(accessor), segments);
        return typeof value === 'string' ? value : '';
    }

    // The text this slot represents (path + extras → string), or the provided
    // sourceText when the caller is using the overrideKey API.
    const text = $derived(
        overrideKey !== undefined
            ? (sourceText ?? '')
            : path !== undefined
              ? resolveString(path, extras)
              : '',
    );
    const isMT = $derived(isMachineTranslated(text));
    const withoutAnnotationsText = $derived(withoutAnnotations(text));

    let localizing = getLocalizing();
    let editing = $state(false);
    let editedText = $state('');
    let fieldView = $state<HTMLInputElement | undefined>(undefined);
    let cancelled = false;

    // Notify parents whenever editing state flips, so they can hide a sibling LocalizedText.
    $effect(() => {
        onEditingChange?.(editing);
    });

    /** Effective storage key for the override: caller-supplied `overrideKey` wins;
     *  otherwise we parse it from the accessor + extras. */
    let storageKey = $derived.by(() => {
        if (overrideKey !== undefined) return overrideKey;
        if (path === undefined) return undefined;
        return accessorToLocalePath(path, ...extras)?.toString();
    });
    let override = $derived(
        storageKey !== undefined ? $localeEdits.get(storageKey) : undefined,
    );

    async function startEditing() {
        editedText = override ?? withoutAnnotationsText;
        editing = true;
        await tick();
        fieldView?.focus();
    }

    function commitEdit(text: string) {
        if (storageKey === undefined) return;
        if (text === withoutAnnotationsText) deleteLocaleEdit(storageKey);
        else saveLocaleEdit(storageKey, text);
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
        class:tip-badge={tipIcon && !editing}
        class:editing
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
                max="6em"
                noTipBadge
                bind:text={editedText}
                bind:view={fieldView}
                focus={() =>
                    (localizing.focused =
                        path !== undefined
                            ? (path as LocaleTextAccessor)
                            : undefined)}
                blur={() => (localizing.focused = undefined)}
                done={() => {
                    if (cancelled) {
                        cancelled = false;
                    } else {
                        commitEdit(editedText);
                    }
                    editing = false;
                }}
            /><span class="edit-actions"
                ><Button
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
                            if (storageKey !== undefined)
                                deleteLocaleEdit(storageKey);
                            cancelled = true;
                            fieldView?.blur();
                        }}
                        background>{REVERT_SYMBOL}</Button
                    >{/if}</span
            >
        {:else}
            <Button
                tip={tipIcon
                    ? (l) => l.ui.localize.button.editTip
                    : (l) => l.ui.localize.button.edit}
                action={startEditing}
                padding={false}
                background="salient"
                size="inherit"
                >{#if tipIcon}{TOOLTIP_SYMBOL}{:else}{override ??
                        withoutAnnotationsText}{/if}{#if isMT && !override}<MachineTranslatedAnnotation
                    />{/if}{#if override}<LocallyRevisedAnnotation
                    />{/if}</Button
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

    /* When the inline editor is open, take a full block-level row of space.
       Becoming block-level (not inline-flex) guarantees the parent widget's height
       grows to fit the editor and its action buttons, instead of overflowing below
       and overlapping the next form field. */
    .localized-wrapper.editing {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--wordplay-spacing-half);
        width: 100%;
        margin-block: var(--wordplay-spacing-half);
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

    /* Tip-icon badge: a small affordance attached to widgets without a visible
       label. Override Button's widget-sized defaults so the badge fits into
       toolbars, form rows, and inline flows without dominating the layout. */
    .localized-wrapper.tip-badge {
        display: inline-flex;
        vertical-align: middle;
    }

    .localized-wrapper.tip-badge :global(button) {
        font-size: var(--wordplay-small-font-size);
        line-height: 1;
        min-height: 0;
        min-width: 0;
        padding: 0 var(--wordplay-spacing-half);
        vertical-align: middle;
    }
</style>
