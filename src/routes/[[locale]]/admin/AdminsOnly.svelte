<!-- The gate on the privileges page, shaped like TeachersOnly: four states, and
     the denial is never shown while the claim is still resolving.

     No header of its own, unlike TeachersOnly: the page renders a PageHeader
     above this, and a second heading in the refusal would be the page's title
     twice. -->
<script lang="ts">
    import Notice from '@components/app/Notice.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser, isAuthenticated } from '@components/project/Contexts';
    import { isAdmin } from '@db/projects/Moderation';

    let { children } = $props();

    let user = getUser();
</script>

{#if $user === undefined}
    <Spinning />
{:else if !isAuthenticated($user)}
    <MarkupHTMLView markup={(l) => l.ui.page.admin.error.login} />
{:else}
    {#await isAdmin($user)}
        <Spinning />
    {:then admin}
        {#if !admin}
            <Notice>
                <MarkupHTMLView
                    markup={(l) => l.ui.page.admin.error.notadmin}
                />
            </Notice>
        {:else}
            {@render children()}
        {/if}
    {:catch}
        <MarkupHTMLView markup={(l) => l.ui.page.admin.error.offline} />
    {/await}
{/if}
