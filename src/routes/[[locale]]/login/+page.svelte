<script lang="ts">
    import { browser } from '$app/environment';
    import { getUser, isAuthenticated } from '@components/project/Contexts';
    import { ensureAuth } from '@db/firebase';
    import type { Auth } from 'firebase/auth';
    import Feedback from '@components/app/Notice.svelte';
    import PageHeader from '@components/app/PageHeader.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import Title from '@components/widgets/Title.svelte';
    import Writing from '@components/app/Writing.svelte';
    import Login from './Login.svelte';
    import { localeGoto } from '@util/localeGoto';

    let user = getUser();

    // Auth loads lazily; resolve it into local reactive state so the offline vs.
    // login branch below reacts once the SDK is ready (the module binding isn't
    // reactive). Track rejection too: without it a failed SDK load left this
    // page permanently blank (`$user` never resolves past undefined), and
    // ensureAuth retries a failed load on the next call, so a reload recovers.
    let auth = $state<Auth | undefined>(undefined);
    let authState = $state<'pending' | 'ready' | 'failed'>('pending');
    $effect(() => {
        if (browser)
            void ensureAuth()
                .then((a) => {
                    auth = a;
                    authState = 'ready';
                })
                .catch(() => {
                    authState = 'failed';
                });
    });

    /** Go to profile if logged in. */
    $effect(() => {
        if (browser && isAuthenticated($user)) localeGoto('/profile');
    });
</script>

<Title text={(l) => l.ui.page.login.header} />

<Writing>
    <PageHeader />
    {#if authState === 'failed'}
        <!-- The auth SDK couldn't load (offline or blocked). -->
        <Feedback text={(l) => l.ui.page.login.error.offline} />
    {:else if $user === undefined || authState === 'pending'}
        <!-- Auth is still resolving; never render a blank page. -->
        <Spinning />
    {:else if $user === null}
        {#if auth}
            <!-- Show the login page. -->
            <Login />
        {:else}
            <!-- Auth resolved but isn't configured in this environment. -->
            <Feedback text={(l) => l.ui.page.login.error.offline} />
        {/if}
    {/if}
</Writing>
