<script lang="ts">
    import Header from '@components/app/Header.svelte';
    import Writing from '@components/app/Writing.svelte';
    import { locales } from '@db/Database';
    import MarkupHtmlView from '../../components/concepts/MarkupHTMLView.svelte';
    import getClaim from '@models/getClaim';
    import Spinning from '@components/app/Spinning.svelte';
    import { getUser } from '@components/project/Contexts';
    import Link from '@components/app/Link.svelte';

    let user = getUser();
</script>

<svelte:head>
    <title>{$locales.get((l) => l.ui.page.teach.header)}</title>
</svelte:head>

<Writing>
    <Header>{$locales.get((l) => l.ui.page.teach.header)}</Header>
    {#if $user === null}
        <MarkupHtmlView
            markup={$locales.get((l) => l.ui.page.teach.error.login)}
        />
    {:else}
        {#await getClaim($user, 'teacher')}
            <Spinning />
        {:then claim}
            {#if !claim}
                <MarkupHtmlView
                    markup={$locales.get((l) => l.ui.page.teach.error.teacher)}
                />
                <p>
                    <Link to="https://forms.gle/6x1sbyC4SZHoPXYq5"
                        >{$locales.get(
                            (l) => l.ui.page.teach.link.request,
                        )}</Link
                    >
                </p>
            {:else}
                <MarkupHtmlView
                    markup={$locales.get((l) => l.ui.page.teach.prompt.some)}
                />
            {/if}
        {:catch}
            <MarkupHtmlView
                markup={$locales.get((l) => l.ui.page.teach.error.offline)}
            />
        {/await}
    {/if}
</Writing>
