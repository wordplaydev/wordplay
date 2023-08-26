<script lang="ts">
    import Header from '@components/app/Header.svelte';
    import { examples } from '../../examples/examples';
    import Writing from '@components/app/Writing.svelte';
    import { Locales, locale } from '@db/Database';
    import Gallery from '@components/app/Gallery.svelte';
    import Project from '../../models/Project';
    import MarkupHtmlView from '../../components/concepts/MarkupHTMLView.svelte';
</script>

<svelte:head>
    <title>{$locale.ui.page.galleries.header}</title>
</svelte:head>

<Writing>
    <Header>{$locale.ui.page.galleries.header}</Header>
    <MarkupHtmlView markup={$locale.ui.page.galleries.prompt} />
    {#await Promise.all(Array.from(examples.values()).map( (example) => Project.deserializeProject(Locales, example) ))}
        …
    {:then projects}<Gallery
            {projects}
            name={$locale.ui.page.galleries.examples}
        />
    {:catch error}
        :( {error}
    {/await}
</Writing>
