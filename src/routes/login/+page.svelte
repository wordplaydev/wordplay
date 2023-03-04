<script>
    import TextField from '@components/widgets/TextField.svelte';
    import Page from '@components/app/Page.svelte';
    import { preferredTranslations } from '@translation/translations';
    import { getUser } from '@components/project/Contexts';

    let user = getUser();
</script>

<Page>
    <p>
        {#if $user && $user.isAnonymous}
            {$preferredTranslations[0].ui.prompt.anonymousLogin}
        {:else}
            {$preferredTranslations[0].ui.prompt.login}
        {/if}
    </p>
    <p
        ><TextField
            placeholder={$preferredTranslations[0].ui.placeholders.email}
        />
    </p>
</Page>
