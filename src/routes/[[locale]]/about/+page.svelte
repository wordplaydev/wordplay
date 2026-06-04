<script lang="ts">
    import PageHeader from '@components/app/PageHeader.svelte';
    import Writing from '@components/app/Writing.svelte';
</script>

<Writing>
    <PageHeader
        header={(l) => l.ui.page.about.header}
        description={(l) => l.ui.page.about.content}
    />
</Writing>
