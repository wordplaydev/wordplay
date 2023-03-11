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
    <Lead>Wordplay</Lead>
    {#if PUBLIC_CONTEXT === 'prod'}
        <p><strong>Wordplay.dev</strong> is coming</p>
        <p>Curious? Write <a href="https://amyjko.com">Amy</a></p>
    {:else}
        <p><a href="/projects">projects</a></p>
        <p><a href="/login">login</a></p>
    {/if}
</Page>
