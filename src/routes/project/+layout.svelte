<script lang="ts">
    import { setContext } from 'svelte';
    import { getUser, ProjectsSymbol } from '@components/project/Contexts';
    import Projects from '@db/Projects';
    import { onDestroy } from 'svelte';
    import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
    import { auth } from '../../db/firebase';
    import { FirebaseError } from 'firebase/app';

    let user = getUser();

    let authenticated = false;

    /** Create a database of projects linked to the current user. */
    const projects = new Projects([]);

    /** Load whatever is stored in local storage */
    projects.loadLocal();

    setContext(ProjectsSymbol, projects.getStore());

    // Sign in anonymously if no user.
    onAuthStateChanged(auth, (user) => {
        if (user === null && !authenticated) {
            try {
                signInAnonymously(auth);
                authenticated = true;
            } catch (err: any) {
                if (err instanceof FirebaseError) {
                    console.log(err.code);
                    console.log(err.message);
                }
            }
        } else authenticated = true;
    });

    onDestroy(() => {
        projects.clean();
    });
</script>

{#if authenticated && $user}
    <slot />
{/if}
