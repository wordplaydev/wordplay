<script lang="ts">
    import type Locales from '@locale/Locales';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Speech from '@components/lore/Speech.svelte';
    import Button from '@components/widgets/Button.svelte';

    interface Props {
        symbols: string;
        locales: Locales;
        message: LocaleTextAccessor;
        tip: LocaleTextAccessor;
        action: () => void;
        command: string;
    }

    let { symbols, message, tip, action, command }: Props = $props();
</script>

<div class="offer">
    <Speech character={{ symbols }}>
        {#snippet content()}
            <MarkupHTMLView markup={message} />
        {/snippet}
    </Speech>
    <Button large {tip} {action} icon={command}></Button>
</div>

<style>
    .offer {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        width: 100%;
    }

    .offer :global(button) {
        margin-inline-start: auto;
    }
</style>
