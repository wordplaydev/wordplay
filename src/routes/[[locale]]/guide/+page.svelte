<script lang="ts">
    import Page from '@components/app/Page.svelte';
    import Title from '@components/widgets/Title.svelte';
    import Guide from './Guide.svelte';
</script>

<Title text={(l) => l.ui.page.guide.header} />

<Page>
    <Guide></Guide>
</Page>
