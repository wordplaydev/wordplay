<script lang="ts">
    import { getUser } from '@components/project/Contexts';
    import Profile from '../login/Profile.svelte';
    import { goto } from '$app/navigation';
    import Writing from '@components/app/Writing.svelte';
    import { browser } from '$app/environment';

    const user = getUser();

    $: if (browser && $user === null) goto('/login');
</script>

<!-- Is the user logged in?  -->
<Writing>
    {#if $user}
        <!-- Show their profile. -->
        <Profile user={$user} />
    {/if}
</Writing>
