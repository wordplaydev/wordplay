<script lang="ts">
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import PageHeader from '@components/app/PageHeader.svelte';
    import Link from '@components/app/Link.svelte';
    import Writing from '@components/app/Writing.svelte';
    import Speech from '@components/lore/Speech.svelte';
    import { HOME_SYMBOL } from '@parser/Symbols';
    import Characters from '../lore/BasisCharacters';
</script>

<Writing>
    <PageHeader header={(l) => l.ui.page.unknown.header} />
    <Speech character={Characters.FunctionDefinition}
        >{#snippet content()}
            <p>
                <LocalizedText path={(l) => l.ui.page.unknown.message} />
                <Link to="/">{HOME_SYMBOL}</Link></p
            >
        {/snippet}</Speech
    >
</Writing>
