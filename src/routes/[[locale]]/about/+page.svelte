<script lang="ts">
    import PageHeader from '@components/app/PageHeader.svelte';
    import Title from '@components/widgets/Title.svelte';
    import Writing from '@components/app/Writing.svelte';
</script>

<Title text={(l) => l.ui.page.about.header} />

<Writing reading>
    <PageHeader
        header={(l) => l.ui.page.about.header}
        description={(l) => l.ui.page.about.content}
    />
</Writing>
