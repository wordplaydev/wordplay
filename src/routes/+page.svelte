<script lang="ts">
    import { PUBLIC_CONTEXT } from '$env/static/public';
    import Lead from '@components/app/Lead.svelte';
    import Page from '@components/app/Page.svelte';
    import BigLink from '../components/app/BigLink.svelte';
    import { preferredLocales } from '../locale/locales';
    import Background from '../components/app/Background.svelte';
</script>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" />
    <title>Wordplay</title>
</svelte:head>

<Background />
<Page>
    <Lead>{$preferredLocales[0].wordplay}</Lead>
    <p>{$preferredLocales[0].motto}</p>
    {#if PUBLIC_CONTEXT === 'prod'}
        <p
            >Coming Fall 2023. Write <a href="https://amyjko.com">Amy</a> for details.</p
        >
    {:else}
        <BigLink to="/learn">{$preferredLocales[0].ui.headers.learn}</BigLink>
        <BigLink to="/projects"
            >{$preferredLocales[0].ui.headers.projects}</BigLink
        >
        <BigLink to="/login">{$preferredLocales[0].ui.login.header}</BigLink>
    {/if}
</Page>
