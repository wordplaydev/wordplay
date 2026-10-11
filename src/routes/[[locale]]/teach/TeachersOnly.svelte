<script lang="ts">
    import Centered from '#components/app/Centered.svelte';
    import Link from '#components/app/Link.svelte';
    import Notice from '#components/app/Notice.svelte';
    import Spinning from '#components/app/Spinning.svelte';
    import MarkupHTMLView from '#components/concepts/MarkupHTMLView.svelte';
    import { getUser, isAuthenticated } from '#components/project/Contexts.ts';
    import { isTeacher } from '#db/projects/Moderation.ts';

    let { children } = $props();

    let user = getUser();
</script>

<!-- No heading here: each page renders its own, so a refusal would otherwise show two. -->

{#if $user === undefined}
    <Spinning />
{:else if !isAuthenticated($user)}
    <MarkupHTMLView markup={(l) => l.ui.page.teach.error.login} />
{:else}
    {#await isTeacher($user)}
        <Spinning />
    {:then claim}
        {#if !claim}
            <MarkupHTMLView markup={(l) => l.ui.page.teach.prompt.none} />
            <Notice>
                <MarkupHTMLView markup={(l) => l.ui.page.teach.error.teacher} />
            </Notice>
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
        <MarkupHTMLView markup={(l) => l.ui.page.teach.error.offline} />
    {/await}
{/if}
