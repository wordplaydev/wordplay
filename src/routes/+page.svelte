<script lang="ts">
    import { PUBLIC_CONTEXT } from '$env/static/public';
    import Lead from '@components/app/Lead.svelte';
    import Page from '@components/app/Page.svelte';
    import BigLink from '../components/app/BigLink.svelte';
    import Background from '../components/app/Background.svelte';
    import { config } from '../db/Database';
</script>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" />
    <title>Wordplay</title>
</svelte:head>

<Background />
<Page>
    <Lead>{$config.getLocale().wordplay}</Lead>
    <p>{$config.getLocale().ui.phrases.motto}</p>
    {#if PUBLIC_CONTEXT === 'prod'}
        <p
            >Coming Fall 2023. Write <a href="https://amyjko.com">Amy</a> for details.</p
        >
    {:else}
        <BigLink to="/learn">{$config.getLocale().ui.header.learn}</BigLink>
        <BigLink to="/projects"
            >{$config.getLocale().ui.header.projects}</BigLink
        >
        <BigLink to="/login">{$config.getLocale().ui.login.header}</BigLink>
    {/if}
</Page>
