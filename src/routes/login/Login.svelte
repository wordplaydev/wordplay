<script lang="ts">
    import { isSignInWithEmailLink } from 'firebase/auth';
    import Header from '../../components/app/Header.svelte';
    import { locales } from '../../db/Database';
    import { auth } from '../../db/firebase';
    import { onMount } from 'svelte';
    import Mode from '../../components/widgets/Mode.svelte';
    import UsernameLogin from './UsernameLogin.svelte';
    import EmailLogin from './EmailLogin.svelte';

    let younger = true;
    let isEmailSignInLink = false;

    // If it's a sign in, finish signing in once authenticated.
    onMount(() => {
        if (auth && isSignInWithEmailLink(auth, window.location.href))
            isEmailSignInLink = true;
    });
</script>

<!-- Provide some reasons to log in -->
<Header>{$locales.get((l) => l.ui.page.login.header)}</Header>

<p>
    {$locales.get((l) => l.ui.page.login.prompt.login)}
</p>

<!-- Ask (but do not store) for the user's age, so we can decide what options to show -->
<Mode
    modes={$locales.get((l) => l.ui.page.login.prompt.age.modes)}
    choice={0}
    select={(choice) => (younger = choice === 0)}
    descriptions={$locales.get((l) => l.ui.page.login.prompt.age)}
/>

{#if isEmailSignInLink || !younger}
    <EmailLogin />
{/if}

<UsernameLogin />
