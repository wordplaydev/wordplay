<!-- A window manager that displays a set of windows -->
<script lang="ts">
    import { PUBLIC_CONTEXT } from '$env/static/public';

    if (PUBLIC_CONTEXT !== 'prod') console.log(`*** ${PUBLIC_CONTEXT} ***`);
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
