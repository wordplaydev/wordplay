<script lang="ts">
    import type Locales from '@locale/Locales';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Speech from '@components/lore/Speech.svelte';
    import Button from '@components/widgets/Button.svelte';
    import type { Snippet } from 'svelte';

    interface Props {
        symbols: string;
        locales: Locales;
        message: LocaleTextAccessor;
        tip: LocaleTextAccessor;
        action: () => void;
        command: string;
        /** Another way to get the same thing, shown beside the main button —
         *  importing a song rather than starting one, say. Same size and shape,
         *  so it reads as an alternative rather than a lesser control. */
        also?: Snippet;
    }

    let {
        symbols,
        message,
        tip,
        action,
        command,
        also = undefined,
    }: Props = $props();
</script>

<div class="offer">
    <Speech character={{ symbols }}>
        {#snippet content()}
            <MarkupHTMLView markup={message} />
        {/snippet}
    </Speech>
    <div class="actions">
        <Button large {tip} {action} icon={command}></Button>
        {@render also?.()}
    </div>
</div>

<style>
    .offer {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        width: 100%;
    }

    /* The actions carry the push to the end, rather than each button doing it
       itself — two buttons each claiming `auto` would be shoved apart. */
    .actions {
        margin-inline-start: auto;
        display: flex;
        flex-direction: row;
        align-items: start;
        gap: var(--wordplay-spacing);
    }
</style>
