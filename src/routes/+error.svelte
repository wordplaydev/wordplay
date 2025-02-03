<script module lang="ts">
    export type UnknownPageText = {
        /** The header for the unknown route */
        header: string;
        /** The message for the unknown route */
        message: string;
    };
</script>

<script lang="ts">
    import Header from '../components/app/Header.svelte';
    import { locales } from '../db/Database';
    import Link from '../components/app/Link.svelte';
    import Speech from '../components/lore/Speech.svelte';
    import Characters from '../lore/BasisCharacters';
    import Writing from '../components/app/Writing.svelte';
</script>

<Writing>
    <Header>{$locales.get((l) => l.ui.page.unknown.header)}</Header>
    <Speech character={Characters.FunctionDefinition}
        >{#snippet content()}
            <p>
                {$locales.get((l) => l.ui.page.unknown.message)}
                <Link to="/">🏠</Link></p
            >
        {/snippet}</Speech
    >
</Writing>
