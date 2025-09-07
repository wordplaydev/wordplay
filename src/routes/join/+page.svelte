<script>
    import { browser } from '$app/environment';
    import { goto } from '$app/navigation';
    import Notice from '@components/app/Notice.svelte';
    import Writing from '@components/app/Writing.svelte';
    import { getUser } from '@components/project/Contexts';
    import { auth } from '@db/firebase';
    import Join from './Join.svelte';

    const user = getUser();

    $effect(() => {
        if (browser && $user !== null) goto('/profile');
    });
</script>

<Writing>
    <!-- Do we have a connection to the servers? -->
    {#if auth}
        <!-- Otherwise, show the login page. -->
        <Join></Join>
    {:else}
        <!-- No connection? Give some feedback. -->
        <Notice text={(l) => l.ui.page.login.error.offline} />
    {/if}
</Writing>
