<script lang="ts">
    import Button from '../widgets/Button.svelte';
    import LanguageChooser from './LocaleChooser.svelte';
    import { getUser, isDark } from '../project/Contexts';
    import { PUBLIC_CONTEXT } from '$env/static/public';
    import { config } from '../../db/Database';
    import LayoutChooser from './LayoutChooser.svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { clickOutside } from '../app/clickOutside';
    import Arrangement from '../../db/Arrangement';
    import Status from '../app/Status.svelte';
    import { slide } from 'svelte/transition';

    let expanded = false;

    let user = getUser();
    let dark = isDark();

    $: arrangement = $config.getArrangement();

    $: anonymous = $user === null;
    $: animationSymbol = { 0: '🧘🏽‍♀️', 1: '🏃‍♀️', 2: '½', 3: '⅓', 4: '¼' }[
        $config.getAnimationFactor()
    ];

    function getBackPath(route: string): string {
        if (route.startsWith('/project/')) return '/projects';
        else return '/';
    }

    function handleKey(event: KeyboardEvent) {
        if (
            (event.ctrlKey || event.metaKey) &&
            event.key === 'Escape' &&
            $page.route.id !== null
        )
            goto(getBackPath($page.route.id));
    }
</script>

<svelte:window on:keydown={handleKey} />

<div
    class="settings"
    class:expanded
    use:clickOutside
    on:outclick={() => (expanded = false)}
>
    {#if expanded}
        <div class="controls" transition:slide>
            {#if PUBLIC_CONTEXT !== 'prod'}
                <div class="account" class:anonymous>
                    <a href="/login">
                        {$user
                            ? $user.email
                            : $config.getLocale().ui.labels.anonymous}
                    </a>
                </div>
            {/if}
            <Button
                tip={arrangement === Arrangement.Free
                    ? $config.getLocale().ui.description.vertical
                    : arrangement === Arrangement.Vertical
                    ? $config.getLocale().ui.description.horizontal
                    : $config.getLocale().ui.description.freeform}
                action={() =>
                    $config.setArrangement(
                        arrangement === Arrangement.Vertical
                            ? Arrangement.Horizontal
                            : arrangement === Arrangement.Horizontal
                            ? Arrangement.Free
                            : Arrangement.Vertical
                    )}
                >{#if arrangement === Arrangement.Vertical}↕{:else if arrangement === Arrangement.Horizontal}↔️{:else if arrangement === Arrangement.Free}⏹️{/if}</Button
            >
            <Button
                tip={$config.getLocale().ui.description.animate}
                action={() =>
                    $config.setAnimationFactor(
                        $config.getAnimationFactor() < 4
                            ? $config.getAnimationFactor() + 1
                            : 0
                    )}>{animationSymbol}</Button
            >
            <LayoutChooser />
            <LanguageChooser />
            <Button
                tip={$config.getLocale().ui.description.dark}
                action={() =>
                    dark.set(
                        $dark === undefined
                            ? true
                            : $dark === true
                            ? false
                            : undefined
                    )}
                ><div class="dark-mode"
                    >{$dark === true ? '☽' : $dark === false ? '☼' : '☼/☽'}</div
                ></Button
            >
        </div>
    {/if}
    <Status />
    <Button
        tip={$config.getLocale().ui.description.settings}
        action={() => (expanded = !expanded)}
        ><div class="gear" class:expanded>⚙</div></Button
    >
    {#if $page.route.id !== '/'}<Button
            tip={$config.getLocale().ui.description.close}
            active={$page.route.id !== null && $page.route.id !== "/'"}
            action={() => goto(getBackPath($page.route.id ?? '/'))}>❌</Button
        >{/if}
</div>

<style>
    .settings {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
        margin-left: auto;
    }

    .controls {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
        max-width: 0;
        max-height: 1.25em;
        opacity: 0;
        overflow-x: hidden;
        overflow-y: hidden;
        user-select: none;
    }

    .controls {
        transition: max-width, opacity;
        transition-duration: calc(var(--animation-factor) * 200ms);
        transition-timing-function: ease-out;
    }

    .settings.expanded .controls {
        max-width: 40em;
        opacity: 1;
        user-select: all;
    }

    .gear {
        transition: transform calc(var(--animation-factor) * 200ms) ease-out;
    }

    .dark-mode {
        display: inline-block;
        width: 2em;
    }

    .gear.expanded {
        display: inline-block;
        transform: rotate(270deg);
    }

    .account.anonymous {
        background: var(--wordplay-warning);
        color: var(--wordplay-background);
        padding: calc(var(--wordplay-spacing) / 2) var(--wordplay-spacing);
        font-size: medium;
    }

    .account.anonymous a {
        color: var(--wordplay-background);
    }
</style>
