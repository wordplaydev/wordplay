<script lang="ts">
    import Page from '#components/app/Page.svelte';
    import Title from '#components/widgets/Title.svelte';
    import type { Snippet } from 'svelte';
    import Guide from './Guide.svelte';

    // The child pages are empty; they're rendered only so Kit knows this layout
    // isn't dropping content by mistake.
    let { children }: { children: Snippet } = $props();
</script>

<Title text={(l) => l.ui.page.guide.header} />

<Page>
    <Guide></Guide>
</Page>
{@render children()}
