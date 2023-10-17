<script>
    import Speech from '@components/lore/Speech.svelte';
    import Glyphs from '../../lore/Glyphs';
    import { ShowMenu, toShortcut } from './util/Commands';
    import { fade } from 'svelte/transition';
    import { locales } from '@db/Database';
    import { docToMarkup } from '@locale/Locale';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';

    $: markup = docToMarkup($locales.get((l) => l.ui.source.empty)).concretize(
        $locales,
        [toShortcut(ShowMenu)]
    );
</script>

{#if markup}
    <div transition:fade={{ duration: 100 }}>
        <Speech glyph={Glyphs.Function} scroll={false}>
            <svelte:fragment slot="content">
                <MarkupHTMLView {markup} />
            </svelte:fragment>
        </Speech>
    </div>
{/if}

<style>
    div {
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        max-width: 30em;
        margin: auto;
        margin-top: 5em;
    }
</style>
