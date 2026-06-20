<script lang="ts">
    import { browser } from '$app/environment';
    import Loading from '@components/app/Loading.svelte';
    import PageHeader from '@components/app/PageHeader.svelte';
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
{#if $user === undefined}
    <!-- Auth hasn't resolved yet: overlay the page with a loader, alone. -->
    <Loading></Loading>
{:else}
    <Writing>
        <PageHeader />
        {#if $user}
            <!-- Show their profile. -->
            <Profile user={$user} />
        {/if}
    </Writing>
{/if}
