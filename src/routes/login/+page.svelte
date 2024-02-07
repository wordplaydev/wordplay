<script lang="ts">
    import { getUser } from '@components/project/Contexts';
    import { auth } from '@db/firebase';
    import { locales } from '../../db/Database';
    import Feedback from '../../components/app/Feedback.svelte';
    import Writing from '../../components/app/Writing.svelte';
    import Login from './Login.svelte';
    import { goto } from '$app/navigation';
    import { browser } from '$app/environment';

    let user = getUser();

    $: if (browser && $user !== null) goto('/profile');
</script>

<Writing>
    <!-- Do we have a connection to the servers? -->
    {#if $user === null}
        {#if auth}
            <!-- Otherwise, show the login page. -->
            <Login />
        {:else}
            <!-- No connection? Give some feedback. -->
            <Feedback
                >{$locales.get((l) => l.ui.page.login.error.offline)}</Feedback
            >
        {/if}
    {/if}
</Writing>
