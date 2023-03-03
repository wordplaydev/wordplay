<script lang="ts">
    import { auth } from '@db/firebase';
    import {
        onAuthStateChanged,
        signInAnonymously,
        type User,
    } from 'firebase/auth';
    import { setContext } from 'svelte';
    import { writable } from 'svelte/store';
    import { ProjectsSymbol, UserSymbol } from '@components/project/Contexts';
    import Projects from '@db/Projects';
    // import { examples, makeProject } from '../../examples/examples';
    import { onDestroy } from 'svelte';

    /** Create a user store */
    const user = writable<User | null>(null);

    /** Create a database of projects linked to the current user. */
    const projects = new Projects([]);

    /** Load whatever is stored in local storage */
    projects.loadLocal();

    /** Add some example projects */
    // projects.addUnique(examples.map((example) => makeProject(example)));

    /** Try logging in */
    try {
        signInAnonymously(auth);
    } catch (err: any) {
        console.log(err.code);
        console.log(err.message);
    }

    /** Whenever the user changes, reset the project store. */
    onAuthStateChanged(auth, (newUser) => {
        user.set(newUser);

        if (newUser === null) projects.reset();
        else projects.loadRemote(newUser.uid);
    });

    setContext(ProjectsSymbol, projects.getStore());
    setContext(UserSymbol, user);

    onDestroy(() => {
        projects.clean();
    });
</script>

<slot />
