<script lang="ts">
    import Header from '@components/app/Header.svelte';
    import { examples } from '../../examples/examples';
    import Writing from '@components/app/Writing.svelte';
    import { Locales, locale } from '@db/Database';
    import Gallery from '@components/app/Gallery.svelte';
    import Project from '../../models/Project';
</script>

<svelte:head>
    <title>{$locale.ui.header.galleries}</title>
</svelte:head>

<Writing>
    <Header>{$locale.ui.header.galleries}</Header>
    {#await Promise.all(Array.from(examples.values()).map( (example) => Project.deserializeProject(Locales, example) ))}
        …
    {:then projects}<Gallery {projects} name={$locale.ui.header.examples} />
    {:catch error}
        :( {error}
    {/await}
</Writing>
