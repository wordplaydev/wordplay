<!-- A window manager that displays a set of windows -->
<script lang="ts">
    import { project } from '@models/stores';
    import { setContext } from 'svelte';
    import { ProjectSymbol, type ProjectContext } from '../project/Contexts';
    import { PUBLIC_CONTEXT } from '$env/static/public';

    if (PUBLIC_CONTEXT !== 'prod') console.log(`*** ${PUBLIC_CONTEXT} ***`);

    /** A global context for the current project */
    setContext<ProjectContext>(ProjectSymbol, project);
</script>

<div class="teaser">
    {#if PUBLIC_CONTEXT === 'prod'}
        <h1><strong>Wordplay.dev</strong> is coming</h1>
        <p>Curious? Write <a href="https://amyjko.com">Amy</a></p>
    {:else}
        <h1>Wordplay</h1>
        <a href="/project">projects</a>
    {/if}
</div>

<style>
    .teaser {
        width: 100vw;
        height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }
</style>
