<script lang="ts">
    import { setContext } from 'svelte';
    import { getUser, ProjectsSymbol } from '@components/project/Contexts';
    import Projects from '@db/Projects';
    import { onDestroy } from 'svelte';

    let user = getUser();

    /** Create a database of projects linked to the current user. */
    const projects = new Projects([]);

    $: {
        if ($user === null) projects.reset();
        else projects.loadRemote($user.uid);
    }

    /** Load whatever is stored in local storage */
    projects.loadLocal();

    setContext(ProjectsSymbol, projects.getStore());

    onDestroy(() => {
        projects.clean();
    });
</script>

<slot />
