<!-- A reusable component that only shows its content if the user is a teacher -->
<script lang="ts">
    import Centered from '@components/app/Centered.svelte';
    import Link from '@components/app/Link.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '@components/project/Contexts';
    import { locales } from '@db/Database';
    import getClaim from '@models/getClaim';
    import type { Snippet } from 'svelte';

    let { children }: { children: Snippet } = $props();

    let user = getUser();
</script>

{#if $user === null}
    <MarkupHtmlView markup={$locales.get((l) => l.ui.page.teach.error.login)} />
{:else}
    {#await getClaim($user, 'teacher')}
        <Spinning />
    {:then claim}
        {#if !claim}
            <MarkupHtmlView
                markup={$locales.get((l) => l.ui.page.teach.error.teacher)}
            />
            <Centered>
                <Link to="https://forms.gle/6x1sbyC4SZHoPXYq5"
                    >{$locales.get((l) => l.ui.page.teach.link.request)}</Link
                >
            </Centered>
        {:else}
            {@render children()}
        {/if}
    {:catch}
        <MarkupHtmlView
            markup={$locales.get((l) => l.ui.page.teach.error.offline)}
        />
    {/await}
{/if}
