<script>
    import Writing from '@components/app/Writing.svelte';
    import Join from './Join.svelte';
    import Feedback from '@components/app/Feedback.svelte';
    import { locales } from '@db/Database';
    import { auth } from '@db/firebase';
    import { getUser } from '@components/project/Contexts';
    import { browser } from '$app/environment';
    import { goto } from '$app/navigation';

    const user = getUser();

    $: if (browser && $user !== null) goto('/profile');
</script>

<Writing>
    <!-- Do we have a connection to the servers? -->
    {#if auth}
        <!-- Otherwise, show the login page. -->
        <Join></Join>
    {:else}
        <!-- No connection? Give some feedback. -->
        <Feedback>{$locales.get((l) => l.ui.page.login.error.offline)}</Feedback
        >
    {/if}
</Writing>
