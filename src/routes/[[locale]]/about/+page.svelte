<script lang="ts">
    import Header from '../../components/app/Header.svelte';
    import Writing from '../../components/app/Writing.svelte';
    import MarkupHTMLView from '../../components/concepts/MarkupHTMLView.svelte';
</script>

<Writing>
    <Header text={(l) => l.ui.page.about.header}></Header>

    <MarkupHTMLView markup={(l) => l.ui.page.about.content} />
</Writing>
