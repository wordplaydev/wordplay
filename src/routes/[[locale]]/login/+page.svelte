<script lang="ts">
    import { browser } from '$app/environment';
    import { getUser, isAuthenticated } from '@components/project/Contexts';
    import { ensureAuth } from '@db/firebase';
    import type { Auth } from 'firebase/auth';
    import Feedback from '@components/app/Notice.svelte';
    import PageHeader from '@components/app/PageHeader.svelte';
    import Writing from '@components/app/Writing.svelte';
    import Login from './Login.svelte';
    import { localeGoto } from '@util/localeGoto';

    let user = getUser();

    // Auth loads lazily; resolve it into local reactive state so the offline vs.
    // login branch below reacts once the SDK is ready (the module binding isn't
    // reactive).
    let auth = $state<Auth | undefined>(undefined);
    $effect(() => {
        if (browser) void ensureAuth().then((a) => (auth = a));
    });

    /** Go to profile if logged in. */
    $effect(() => {
        if (browser && isAuthenticated($user)) localeGoto('/profile');
    });
</script>

<Writing>
    <PageHeader />
    <!-- Do we have a connection to the servers? -->
    {#if $user === null}
        {#if auth}
            <!-- Otherwise, show the login page. -->
            <Login />
        {:else}
            <!-- No connection? Give some feedback. -->
            <Feedback text={(l) => l.ui.page.login.error.offline} />
        {/if}
    {/if}
</Writing>
