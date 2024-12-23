<script lang="ts">
    import Header from '@components/app/Header.svelte';
    import Writing from '@components/app/Writing.svelte';
    import { locales } from '@db/Database';
    import MarkupHtmlView from '../../components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '@components/project/Contexts';
    import TeachersOnly from '../TeachersOnly.svelte';

    let user = getUser();
</script>

<svelte:head>
    <title>{$locales.get((l) => l.ui.page.teach.header)}</title>
</svelte:head>

<Writing>
    <Header>{$locales.get((l) => l.ui.page.teach.header)}</Header>
    <TeachersOnly>
        <MarkupHtmlView
            markup={$locales.get((l) => l.ui.page.teach.prompt.some)}
        />
    </TeachersOnly>
</Writing>
