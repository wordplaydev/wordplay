<!-- A window manager that displays a set of windows -->
<script lang="ts">
    import { PUBLIC_CONTEXT } from '$env/static/public';
    import Lead from './Lead.svelte';
    import Page from './Page.svelte';

    if (PUBLIC_CONTEXT !== 'prod') console.log(`*** ${PUBLIC_CONTEXT} ***`);
</script>

<Page>
    {#if PUBLIC_CONTEXT === 'prod'}
        <h1><strong>Wordplay.dev</strong> is coming</h1>
        <p>Curious? Write <a href="https://amyjko.com">Amy</a></p>
    {:else}
        <Lead>Wordplay</Lead>
        <a href="/project">projects</a>
        <a href="/login">login</a>
    {/if}
</Page>
