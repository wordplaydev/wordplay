<script lang="ts">
    import PageHeader from '@components/app/PageHeader.svelte';
    import Writing from '@components/app/Writing.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { locales } from '@db/Database';
</script>

<Writing>
    <PageHeader
        header={(l) => l.ui.page.rights.header}
        description={(l) => l.ui.page.rights.content}
    />
    <MarkupHTMLView
        markup={Object.values(
            $locales.getTextStructure((l) => l.moderation.flags),
        )
            .map((promise) => `• ${promise}`)
            .join('\n\n')}
    />
    <MarkupHTMLView markup={(l) => l.ui.page.rights.consequences} />
</Writing>
