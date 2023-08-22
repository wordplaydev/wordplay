<script lang="ts">
    import Button from '../widgets/Button.svelte';
    import LanguageChooser from './LocaleChooser.svelte';
    import { getProject, getUser, isDark } from '../project/Contexts';
    import {
        animationFactor,
        locale,
        arrangement,
        camera,
        mic,
        Settings,
        Projects,
    } from '../../db/Database';
    import LayoutChooser from './LayoutChooser.svelte';
    import { page } from '$app/stores';
    import { clickOutside } from '../app/clickOutside';
    import Arrangement from '../../db/Arrangement';
    import { slide } from 'svelte/transition';
    import Options from '../widgets/Options.svelte';
    import { onMount } from 'svelte';
    import Link from '../app/Link.svelte';
    import Status from '../app/Status.svelte';
    import { goto } from '$app/navigation';

    let expanded = false;

    let user = getUser();
    let dark = isDark();
    let project = getProject();

    $: anonymous = $user === null;
    $: animationSymbol = { 0: '🧘🏽‍♀️', 1: '🏃‍♀️', 2: '½', 3: '⅓', 4: '¼' }[
        $animationFactor
    ];

    function back() {
        if ($page.route.id?.startsWith('/project/')) {
            const projectID = $page.params.projectid;
            if (Projects.readonlyProjects.has(projectID)) goto('/galleries');
            else goto('/projects');
        } else goto('/');
    }

    function handleKey(event: KeyboardEvent) {
        if (
            (event.ctrlKey || event.metaKey) &&
            event.key === 'Escape' &&
            $page.route.id !== null
        ) {
            back();
        }
    }

    onMount(async () => {
        if (
            typeof navigator === 'undefined' ||
            typeof navigator.mediaDevices == 'undefined'
        ) {
            devicesRetrieved = undefined;
            return;
        }

        const devices = await navigator.mediaDevices.enumerateDevices();

        cameras = devices.filter((device) => device.kind === 'videoinput');
        mics = devices.filter((device) => device.kind === 'audioinput');
        devicesRetrieved = true;
    });

    let devicesRetrieved: boolean | undefined = false;
    let cameras: MediaDeviceInfo[] = [];
    let mics: MediaDeviceInfo[] = [];

    $: cameraDevice = $camera
        ? cameras.find((cam) => cam.deviceId === $camera)
        : undefined;

    $: micDevice = $mic ? mics.find((m) => m.deviceId === $mic) : undefined;
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
            <Button
                tip={$arrangement === Arrangement.Free
                    ? $locale.ui.description.vertical
                    : $arrangement === Arrangement.Vertical
                    ? $locale.ui.description.horizontal
                    : $locale.ui.description.freeform}
                action={() =>
                    Settings.setArrangement(
                        $arrangement === Arrangement.Vertical
                            ? Arrangement.Horizontal
                            : $arrangement === Arrangement.Horizontal
                            ? Arrangement.Free
                            : Arrangement.Vertical
                    )}
                >{#if $arrangement === Arrangement.Vertical}↕{:else if $arrangement === Arrangement.Horizontal}↔️{:else if $arrangement === Arrangement.Free}⏹️{/if}</Button
            >
            <Button
                tip={$locale.ui.description.animate}
                action={() =>
                    Settings.setAnimationFactor(
                        $animationFactor < 4 ? $animationFactor + 1 : 0
                    )}>{animationSymbol}</Button
            >
            <LayoutChooser />
            <LanguageChooser />
            {#if devicesRetrieved}
                <label for="camera-setting">
                    🎥
                    <Options
                        value={cameraDevice?.label}
                        id="camera-setting"
                        options={[
                            undefined,
                            ...cameras.map((device) => device.label),
                        ]}
                        change={(choice) =>
                            Settings.setCamera(
                                cameras.find(
                                    (camera) => camera.label === choice
                                )?.deviceId ?? null
                            )}
                        width="4em"
                    />
                </label>
                <label for="mic-setting">
                    🎤
                    <Options
                        value={micDevice?.label}
                        id="mic-setting"
                        options={[
                            undefined,
                            ...mics.map((device) => device.label),
                        ]}
                        change={(choice) =>
                            Settings.setMic(
                                mics.find((mic) => mic.label === choice)
                                    ?.deviceId ?? null
                            )}
                        width="4em"
                    />
                </label>
            {/if}
            <Button
                tip={$locale.ui.description.dark}
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
    <Button
        tip={$locale.ui.description.settings}
        action={() => (expanded = !expanded)}
        ><div class="gear" class:expanded>⚙</div></Button
    >
    <div class="account" class:anonymous>
        <Link to="/login">
            <span class="user"
                >{$user ? $user.email : $locale.ui.labels.anonymous}</span
            >
        </Link>
    </div>
    {#if $project}
        <Status />
    {/if}
    {#if $page.route.id !== '/'}<Button
            tip={$locale.ui.description.close}
            active={$page.route.id !== null && $page.route.id !== "/'"}
            action={back}>❌</Button
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
        border-radius: var(--wordplay-border-radius);
    }

    .anonymous .user {
        color: var(--wordplay-background);
    }

    label {
        white-space: nowrap;
    }
</style>
