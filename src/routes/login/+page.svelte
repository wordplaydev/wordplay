<script lang="ts">
    import { getUser } from '@components/project/Contexts';
    import { auth } from '@db/firebase';
    import { locales } from '../../db/Database';
    import Feedback from '../../components/app/Feedback.svelte';
    import Writing from '../../components/app/Writing.svelte';
    import Login from './Login.svelte';
    import Profile from './Profile.svelte';

    let user = getUser();
</script>

<Writing>
    {#if auth}
        {#if $user}
            <Profile user={$user} />
        {:else}
            <Login />
        {/if}
    {:else}
        <Feedback>{$locales.get((l) => l.ui.page.login.error.offline)}</Feedback
        >
    {/if}
</Writing>
