<script lang="ts">
    import { preferredTranslations } from '@translation/translations';
    import Button from '../widgets/Button.svelte';
    import { animationsOn } from '@models/stores';
    import LayoutChooser from './LayoutChooser.svelte';
    import LanguageChooser from './LanguageChooser.svelte';
    import { getUser, isDark } from '../project/Contexts';

    let expanded = false;

    let user = getUser();
    let dark = isDark();

    $: anonymous = $user && $user.isAnonymous;
    $: offline = $user === undefined;
</script>

<div class="settings" class:expanded>
    <div class="account" class:anonymous class:offline>
        {#if $user}
            <a href="/login">
                {anonymous
                    ? $preferredTranslations[0].ui.labels.anonymous
                    : $user.email}
            </a>
        {:else if offline}
            ⚡️
        {/if}
    </div>
    <div class="controls">
        <Button
            tip={$preferredTranslations[0].ui.tooltip.animate}
            action={() => animationsOn.set(!$animationsOn)}
            >{#if $animationsOn}🏃‍♀️{:else}🧘🏽‍♀️{/if}</Button
        >
        <LayoutChooser />
        <LanguageChooser />
        <Button
            tip={$preferredTranslations[0].ui.tooltip.dark}
            action={() =>
                dark.set(
                    $dark === undefined
                        ? true
                        : $dark === true
                        ? false
                        : undefined
                )}
            ><div class="dark-mode"
                >{$dark === true ? '☽' : $dark === false ? '☼' : '–'}</div
            ></Button
        >
    </div>
    <Button
        tip={$preferredTranslations[0].ui.tooltip.settings}
        action={() => (expanded = !expanded)}
        ><div class="gear" class:expanded>⚙</div></Button
    >
</div>

<style>
    .settings {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
    }

    .controls {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
        max-width: 0;
        opacity: 0;
        overflow-x: hidden;
        height: 2em;
        user-select: none;
    }

    :global(.animated) .controls {
        transition: max-width, opacity;
        transition-duration: 300ms;
        transition-timing-function: ease-out;
    }

    .settings.expanded .controls {
        max-width: 12em;
        opacity: 1;
        user-select: all;
    }

    :global(.animated) .gear {
        transition: transform 300ms ease-out;
    }

    .dark-mode {
        display: inline-block;
        width: 1em;
    }

    .gear.expanded {
        display: inline-block;
        transform: rotate(270deg);
    }

    .account.anonymous {
        background: var(--wordplay-warning);
        color: var(--wordplay-background);
        padding: calc(var(--wordplay-spacing) / 2) var(--wordplay-spacing);
    }

    .account.anonymous a {
        color: var(--wordplay-background);
    }

    .account.offline {
        background: var(--wordplay-error);
        color: var(--wordplay-background);
        padding: calc(var(--wordplay-spacing) / 2) var(--wordplay-spacing);
    }
</style>
