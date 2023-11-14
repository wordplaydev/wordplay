<script lang="ts">
    import { withVariationSelector } from '../../unicode/emoji';
    import type { Template } from '../../locale/Locale';
    import type Locales from '../../locale/Locales';
    import concretize from '../../locale/concretize';
    import MarkupHtmlView from '../concepts/MarkupHTMLView.svelte';
    import Speech from '../lore/Speech.svelte';
    import Button from '../widgets/Button.svelte';

    export let symbols: string;
    export let locales: Locales;
    export let message: Template;
    export let tip: string;
    export let action: () => void;
    export let command: string;
</script>

<div class="offer">
    <Speech glyph={{ symbols }}>
        <svelte:fragment slot="content">
            <MarkupHtmlView markup={concretize(locales, message)} />
        </svelte:fragment>
    </Speech>
    <Button large {tip} {action}>{withVariationSelector(command)}</Button>
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
