<script>
    import { browser } from '$app/environment';
    import Notice from '@components/app/Notice.svelte';
    import PageHeader from '@components/app/PageHeader.svelte';
    import Writing from '@components/app/Writing.svelte';
    import { getUser, isAuthenticated } from '@components/project/Contexts';
    import { auth } from '@db/firebase';
    import Join from './Join.svelte';
    import { localeGoto } from '@util/localeGoto';

    const user = getUser();

    $effect(() => {
        if (browser && isAuthenticated($user)) localeGoto('/profile');
    });
</script>

<Writing>
    <PageHeader />
    <!-- Do we have a connection to the servers? -->
    {#if auth}
        <!-- Otherwise, show the login page. -->
        <Join></Join>
    {:else}
        <!-- No connection? Give some feedback. -->
        <Notice text={(l) => l.ui.page.login.error.offline} />
    {/if}
</Writing>
