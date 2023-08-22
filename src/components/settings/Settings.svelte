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
        writingLayout,
    } from '../../db/Database';
    import { page } from '$app/stores';
    import Arrangement from '../../db/Arrangement';
    import Options from '../widgets/Options.svelte';
    import { onMount } from 'svelte';
    import Link from '../app/Link.svelte';
    import Status from '../app/Status.svelte';
    import { goto } from '$app/navigation';
    import Mode from '../widgets/Mode.svelte';
    import Dialog from '../widgets/Dialog.svelte';

    let show = false;

    let user = getUser();
    let dark = isDark();
    let project = getProject();

    $: anonymous = $user === null;

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

<div class="settings">
    <LanguageChooser />
    <Dialog bind:show width="50vw" description={$locale.ui.dialog.settings}>
        <p
            ><Mode
                descriptions={$locale.ui.mode.layout}
                choice={$arrangement === Arrangement.Horizontal
                    ? 0
                    : $arrangement === Arrangement.Vertical
                    ? 1
                    : 2}
                select={(choice) =>
                    Settings.setArrangement(
                        choice == 0
                            ? Arrangement.Horizontal
                            : choice === 1
                            ? Arrangement.Vertical
                            : Arrangement.Free
                    )}
                modes={['↔️', '↕', '⏹️']}
            /></p
        >
        <p
            ><Mode
                descriptions={$locale.ui.mode.animate}
                choice={$animationFactor}
                select={(choice) => Settings.setAnimationFactor(choice)}
                modes={['🧘🏽‍♀️', '🏃‍♀️', '½', '⅓', '¼']}
            /></p
        >
        <p
            ><Mode
                descriptions={$locale.ui.mode.writing}
                choice={$writingLayout === 'horizontal-tb'
                    ? 0
                    : $writingLayout === 'vertical-rl'
                    ? 1
                    : 2}
                select={(choice) =>
                    Settings.setWritingLayout(
                        choice === 0
                            ? 'horizontal-tb'
                            : choice === 1
                            ? 'vertical-rl'
                            : 'vertical-lr'
                    )}
                modes={['→↓', '↓←', '↓→']}
            /></p
        >
        {#if devicesRetrieved}
            <p
                ><label for="camera-setting">
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
                </label></p
            >
            <p
                ><label for="mic-setting">
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
                </label></p
            >
        {/if}
        <p
            ><Mode
                descriptions={$locale.ui.mode.dark}
                choice={$dark === false ? 0 : $dark === true ? 1 : 2}
                select={(choice) =>
                    dark.set(
                        choice === 0 ? false : choice === 1 ? true : undefined
                    )}
                modes={['☼', '☽', '-']}
            />
        </p>
    </Dialog>
    <Button tip={$locale.ui.description.settings} action={() => (show = !show)}
        >⚙</Button
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
