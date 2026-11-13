<script lang="ts">
    import LocalizedText from '#components/widgets/LocalizedText.svelte';
    import PageHeader from '#components/app/PageHeader.svelte';
    import Link from '#components/app/Link.svelte';
    import Writing from '#components/app/Writing.svelte';
    import Speech from '#components/lore/Speech.svelte';
    import { HOME_SYMBOL } from '#parser/Symbols.ts';
    import Characters from '../lore/BasisCharacters';
    import { page } from '$app/state';
</script>

<Writing>
    <PageHeader header={(l) => l.ui.page.unknown.header} />
    <Speech character={Characters.FunctionDefinition}
        >{#snippet content()}
            <p>
                <LocalizedText path={(l) => l.ui.page.unknown.message} />
                <Link to="/">{HOME_SYMBOL}</Link></p
            >
            <!-- What failed, untranslated on purpose: it is for whoever is
                 asked to fix it, usually from a photo of this page. -->
            {#if page.status !== 404 && page.error}
                <p><code>{page.status} {page.error.message}</code></p>
            {/if}
        {/snippet}</Speech
    >
</Writing>
