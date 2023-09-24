<script lang="ts">
    import Button from '../widgets/Button.svelte';
    import LanguageChooser from './LocaleChooser.svelte';
    import { getProject, getUser } from '../project/Contexts';
    import {
        animationFactor,
        locale,
        arrangement,
        camera,
        mic,
        Settings,
        Projects,
        writingLayout,
        dark,
    } from '../../db/Database';
    import { page } from '$app/stores';
    import Arrangement from '../../db/Arrangement';
    import Options from '../widgets/Options.svelte';
    import { onMount } from 'svelte';
    import Link from '../app/Link.svelte';
    import Status from '../app/Status.svelte';
    import Mode from '../widgets/Mode.svelte';
    import Dialog from '../widgets/Dialog.svelte';
    import { goto } from '$app/navigation';
    import Warning from '../widgets/Warning.svelte';

    let show = false;

    let user = getUser();
    let project = getProject();

    function getBackPath() {
        if ($page.route.id?.startsWith('/project/')) {
            const projectID = $page.params.projectid;
            if (Projects.readonlyProjects.has(projectID)) return '/galleries';
            return '/projects';
        } else return '/';
    }

    function handleKey(event: KeyboardEvent) {
        if (
            (event.ctrlKey || event.metaKey) &&
            event.key === 'Escape' &&
            $page.route.id !== null
        ) {
            goto(getBackPath());
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
    {#if $project}
        <Status />
    {/if}
    <Warning>
        <Link to="/login">
            <span class="user"
                >{$user && $user.email
                    ? $user.email
                    : $locale.ui.page.login.anonymous}</span
            >
        </Link>
    </Warning>
    <LanguageChooser />
    <Dialog bind:show width="50vw" description={$locale.ui.dialog.settings}>
        <p
            ><Mode
                descriptions={$locale.ui.dialog.settings.mode.layout}
                choice={$arrangement === Arrangement.Responsive
                    ? 0
                    : $arrangement === Arrangement.Horizontal
                    ? 1
                    : $arrangement === Arrangement.Vertical
                    ? 2
                    : 3}
                select={(choice) =>
                    Settings.setArrangement(
                        choice == 0
                            ? Arrangement.Responsive
                            : choice === 1
                            ? Arrangement.Horizontal
                            : choice === 2
                            ? Arrangement.Vertical
                            : Arrangement.Free
                    )}
                modes={['📐', '↔️', '↕', '⏹️']}
            /></p
        >
        <p
            ><Mode
                descriptions={$locale.ui.dialog.settings.mode.animate}
                choice={$animationFactor}
                select={(choice) => Settings.setAnimationFactor(choice)}
                modes={['🧘🏽‍♀️', '🏃‍♀️', '½', '⅓', '¼']}
            /></p
        >
        <p
            ><Mode
                descriptions={$locale.ui.dialog.settings.mode.writing}
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
                            { value: undefined, label: '—' },
                            ...cameras.map((device) => {
                                return {
                                    value: device.label,
                                    label: device.label,
                                };
                            }),
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
                            { value: undefined, label: '—' },
                            ...mics.map((device) => {
                                return {
                                    value: device.label,
                                    label: device.label,
                                };
                            }),
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
                descriptions={$locale.ui.dialog.settings.mode.dark}
                choice={$dark === false ? 0 : $dark === true ? 1 : 2}
                select={(choice) =>
                    Settings.setDark(
                        choice === 0 ? false : choice === 1 ? true : null
                    )}
                modes={['☼', '☽', '☼/☽']}
            />
        </p>
    </Dialog>
    <Button
        tip={$locale.ui.dialog.settings.button.show}
        action={() => (show = !show)}>⚙</Button
    >
    {#if $page.route.id !== '/'}<Link to={getBackPath()}>❌</Link>{/if}
</div>

<style>
    .settings {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
        margin-left: auto;
    }

    label {
        white-space: nowrap;
    }

    .user {
        color: var(--wordplay-background);
    }
</style>
