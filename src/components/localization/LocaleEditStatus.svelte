<!--
    What became of a localization edit, shown beside the field that made it and announced.
    Without it, confirming an edit only closed the field, and contributors went looking for a
    save button (#1495). Loaded on demand by the always-present text components.
-->
<script lang="ts">
    import { localeEditAnnouncement } from '#components/localization/localeEditAnnouncement.ts';
    import {
        getAnnouncer,
        setLocalizing,
    } from '#components/project/Contexts.ts';
    import LocalizedText from '#components/widgets/LocalizedText.svelte';
    import Note from '#components/widgets/Note.svelte';
    import { locales } from '#db/Database.ts';
    import type { LocaleEditResult } from '#db/locales/LocalizationDexie.ts';
    import { CONFIRM_SYMBOL } from '#parser/Symbols.ts';
    import { untrack } from 'svelte';

    interface Props {
        result: LocaleEditResult;
    }

    let { result }: Props = $props();

    /** How long a confirmation stays; a failure stays until the next attempt. */
    const ShownFor = 4000;

    const announce = getAnnouncer();

    // A confirmation is not text to suggest an edit to: in localization mode every string
    // becomes an edit button, which made "saved" look like something still to press.
    setLocalizing({ on: false, focused: undefined });

    let visible = $state(true);

    $effect(() => {
        const current = result;
        visible = true;
        untrack(() => {
            if (announce === undefined || $announce === undefined) return;
            const { kind, message } = localeEditAnnouncement($locales, current);
            $announce(kind, $locales.getLanguages()[0], message);
        });
        if (current.kind === 'failed') return;
        const timer = setTimeout(() => (visible = false), ShownFor);
        return () => clearTimeout(timer);
    });
</script>

{#if visible}
    <span class="locale-edit-status" class:failed={result.kind === 'failed'}
        ><Note inline
            >{#if result.kind === 'saved'}{CONFIRM_SYMBOL}
                <LocalizedText
                    path={(l) => l.ui.localize.save.saved}
                />{:else if result.kind === 'reverted'}<LocalizedText
                    path={(l) => l.ui.localize.save.reverted}
                />{:else}<LocalizedText
                    path={(l) => l.ui.localize.save.failed}
                />{/if}</Note
        ></span
    >
{/if}

<style>
    .locale-edit-status {
        margin-inline-start: var(--wordplay-spacing-half);
    }

    .failed :global(.note) {
        color: var(--wordplay-error);
    }
</style>
