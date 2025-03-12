<script lang="ts">
    import Centered from '@components/app/Centered.svelte';
    import Feedback from '@components/app/Feedback.svelte';
    import Header from '@components/app/Header.svelte';
    import Link from '@components/app/Link.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '@components/project/Contexts';
    import getClaim from '@db/creators/getClaim';

    let { children } = $props();

    let user = getUser();
</script>

{#if $user === null}
    <Header text={(l) => l.ui.page.teach.header} />
    <MarkupHTMLView markup={(l) => l.ui.page.teach.error.login} />
{:else}
    {#await getClaim($user, 'teacher')}
        <Spinning />
    {:then claim}
        {#if !claim}
            <Header text={(l) => l.ui.page.teach.header} />
            <MarkupHTMLView markup={(l) => l.ui.page.teach.prompt.none} />
            <Feedback>
                <MarkupHTMLView markup={(l) => l.ui.page.teach.error.teacher} />
            </Feedback>
            <Centered>
                <Link
                    to="https://forms.gle/6x1sbyC4SZHoPXYq5"
                    label={(l) => l.ui.page.teach.link.request}
                />
            </Centered>
        {:else}
            {@render children()}
        {/if}
    {:catch}
        <Header text={(l) => l.ui.page.teach.header} />
        <MarkupHTMLView markup={(l) => l.ui.page.teach.error.offline} />
    {/await}
{/if}
