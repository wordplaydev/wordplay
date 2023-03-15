<script lang="ts">
    import { PUBLIC_CONTEXT } from '$env/static/public';
    import Lead from '@components/app/Lead.svelte';
    import Page from '@components/app/Page.svelte';
    import BigLink from '../components/app/BigLink.svelte';
    import { preferredTranslations } from '../translation/translations';
</script>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" />
</svelte:head>

<Page>
    <Lead>{$preferredTranslations[0].wordplay}</Lead>
    <p>{$preferredTranslations[0].motto}</p>
    {#if PUBLIC_CONTEXT === 'prod'}
        <p><strong>Wordplay.dev</strong> is coming</p>
        <p>Curious? Write <a href="https://amyjko.com">Amy</a></p>
    {:else}
        <BigLink to="/projects"
            >{$preferredTranslations[0].ui.headers.projects}</BigLink
        >
        <BigLink to="/login"
            >{$preferredTranslations[0].ui.login.header}</BigLink
        >
    {/if}
</Page>
