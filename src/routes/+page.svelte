<script lang="ts">
    import { PUBLIC_CONTEXT } from '$env/static/public';
    import Lead from '@components/app/Lead.svelte';
    import Page from '@components/app/Page.svelte';
</script>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" />
</svelte:head>

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
