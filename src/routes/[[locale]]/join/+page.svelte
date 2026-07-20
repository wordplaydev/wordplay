<script lang="ts">
    import { browser } from '$app/environment';
    import Notice from '@components/app/Notice.svelte';
    import PageHeader from '@components/app/PageHeader.svelte';
    import Writing from '@components/app/Writing.svelte';
    import { getUser, isAuthenticated } from '@components/project/Contexts';
    import { ensureAuth } from '@db/firebase';
    import type { Auth } from 'firebase/auth';
    import Join from './Join.svelte';
    import { localeGoto } from '@util/localeGoto';

    const user = getUser();

    // Auth loads lazily; resolve it into local reactive state so the offline vs.
    // join branch below reacts once the SDK is ready.
    let auth = $state<Auth | undefined>(undefined);
    $effect(() => {
        if (browser) void ensureAuth().then((a) => (auth = a));
    });

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
