<script lang="ts">
    import Header from '@components/app/Header.svelte';
    import { examples, makeProject } from '../../examples/examples';
    import Writing from '@components/app/Writing.svelte';
    import { locale } from '@db/Database';
    import Gallery from '@components/app/Gallery.svelte';
</script>

<svelte:head>
    <title>{$locale.ui.header.galleries}</title>
</svelte:head>

<Writing>
    <Header>{$locale.ui.header.galleries}</Header>
    {#await Promise.all(examples.map((example) => makeProject(example)))}
        …
    {:then projects}<Gallery {projects} name={$locale.ui.header.examples} />
    {:catch error}
        :( {error}
    {/await}
</Writing>
