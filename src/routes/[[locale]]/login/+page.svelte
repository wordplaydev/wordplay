<script lang="ts">
    import { browser } from '$app/environment';
    import { getUser, isAuthenticated } from '@components/project/Contexts';
    import { auth } from '@db/firebase';
    import Feedback from '@components/app/Notice.svelte';
    import Writing from '@components/app/Writing.svelte';
    import Login from './Login.svelte';
    import { localeGoto } from '@util/localeGoto';

    let user = getUser();

    /** Go to profile if logged in. */
    $effect(() => {
        if (browser && isAuthenticated($user)) localeGoto('/profile');
    });
</script>

<Writing>
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
