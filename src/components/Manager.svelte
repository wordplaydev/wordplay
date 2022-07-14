<!-- A window manager that displays a set of windows -->
<script lang="ts">
    import DocumentView from './DocumentView.svelte';
    import Header from '../components/Header.svelte';
    import { project } from '../models/stores';

</script>

<!-- Render the header and a project's documents, if there is one. -->
<div class="manager">
    <Header></Header>
    <div class="windows">
        {#if $project === undefined}
            <p>No project</p>
        {:else}
            {#each $project.docs as doc}
                <DocumentView doc={doc}/>
            {/each}
        {/if}
    </div>
</div>

<style>
    .manager {
        width: 100vw;
        height: 100vh;
        padding: 0;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
    }

    .windows {
        height: auto;
        padding: var(--wordplay-spacing);
        display: flex;
        flex-flow: row wrap;
        align-items: stretch;
        justify-content: center;
        gap: var(--wordplay-spacing);
    }
</style>