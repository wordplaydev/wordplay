<script lang="ts">
    import { browser } from '$app/environment';
    import Header from '@components/app/Header.svelte';
    import Loading from '@components/app/Loading.svelte';
    import Writing from '@components/app/Writing.svelte';
    import { getUser } from '@components/project/Contexts';
    import { authAttempted } from '@db/Database';
    import Profile from '../login/Profile.svelte';
    import { localeGoto } from '@util/localeGoto';

    const user = getUser();

    // Go to the login page if on the profile and not logged in — but only once
    // auth has actually resolved. The auth listeners can briefly push a `null`
    // before the restored user lands; redirecting on that transient null would
    // bounce a logged-in user to /login (and was flaking the WebKit login e2e).
    $effect(() => {
        if (browser && $authAttempted && $user === null) localeGoto('/login');
    });
</script>

<!-- Is the user logged in?  -->
<Writing>
    {#if $user}
        <!-- Show their profile. -->
        <Profile user={$user} />
    {:else if $user === undefined}
        <!-- Show a message indicating they are not logged in. -->
        <Header><Loading></Loading></Header>
    {/if}
</Writing>
