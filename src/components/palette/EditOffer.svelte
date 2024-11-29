<script lang="ts">
    import { withMonoEmoji } from '../../unicode/emoji';
    import type { Template } from '../../locale/LocaleText';
    import type Locales from '../../locale/Locales';
    import MarkupHtmlView from '../concepts/MarkupHTMLView.svelte';
    import Speech from '../lore/Speech.svelte';
    import Button from '../widgets/Button.svelte';

    interface Props {
        symbols: string;
        locales: Locales;
        message: Template;
        tip: string;
        action: () => void;
        command: string;
    }

    let { symbols, locales, message, tip, action, command }: Props = $props();
</script>

<div class="offer">
    <Speech glyph={{ symbols }}>
        {#snippet content()}
            <MarkupHtmlView markup={locales.concretize(message)} />
        {/snippet}
    </Speech>
    <Button large {tip} {action}>{withMonoEmoji(command)}</Button>
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
