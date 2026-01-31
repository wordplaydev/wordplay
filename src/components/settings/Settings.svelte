<script lang="ts">
    import { Faces, getFaceDescription } from '@basis/Fonts';
    import Feedback from '@components/app/Feedback.svelte';
    import { LayoutIcons } from '@components/project/Layout';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import {
        AnimationFactorIcons,
        AnimationFactors,
    } from '@db/settings/AnimationFactorSetting';
    import { FaceSetting } from '@db/settings/FaceSetting';
    import {
        BLOCK_EDITING_SYMBOL,
        CANCEL_SYMBOL,
        CONFIRM_SYMBOL,
        TEXT_EDITING_SYMBOL,
    } from '@parser/Symbols';
    import { onMount } from 'svelte';
    import { Creator } from '../../db/creators/CreatorDatabase';
    import {
        animationFactor,
        arrangement,
        blocks,
        camera,
        dark,
        locales,
        mic,
        Settings,
        showLines,
        spaceIndicator,
    } from '../../db/Database';
    import Arrangement from '../../db/settings/Arrangement';
    import CreatorView from '../app/CreatorView.svelte';
    import Link from '../app/Link.svelte';
    import Status from '../app/Status.svelte';
    import { getUser } from '../project/Contexts';
    import Dialog from '../widgets/Dialog.svelte';
    import Mode from '../widgets/Mode.svelte';
    import Options from '../widgets/Options.svelte';
    import FaceName from './FaceName.svelte';
    import LocaleChooser from './LocaleChooser.svelte';
    import Notifications from './Notifications.svelte';

    let user = getUser();

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

    let devicesRetrieved: boolean | undefined = $state(false);
    let cameras: MediaDeviceInfo[] = $state([]);
    let mics: MediaDeviceInfo[] = $state([]);

    let cameraDevice = $derived(
        $camera ? cameras.find((cam) => cam.deviceId === $camera) : undefined,
    );

    let micDevice = $derived(
        $mic ? mics.find((m) => m.deviceId === $mic) : undefined,
    );
</script>

<div class="settings">
    <Notifications />
    <Status />
    <Link nowrap to="/login">
        <CreatorView
            anonymize={false}
            creator={$user ? Creator.from($user) : null}
            prompt
        />
    </Link>
    <LocaleChooser />
    <Feedback />
    <Dialog
        button={{
            tip: (l) => l.ui.dialog.settings.button.show,
            icon: '⚙',
        }}
        header={(l) => l.ui.dialog.settings.header}
        explanation={(l) => l.ui.dialog.settings.explanation}
    >
        <hr />
        <div class="controls">
            <label for="ui-face">
                <LocalizedText
                    path={(l) => l.ui.dialog.settings.options.face}
                />
                <Options
                    value={FaceSetting.get() ?? 'Noto Sans'}
                    label={(l) => l.ui.dialog.settings.options.face}
                    id="ui-face"
                    width="10em"
                    options={[
                        { value: undefined, label: '—', face: null },
                        // Only show faces supported in the current locale
                        ...Object.entries(Faces)
                            .filter(
                                ([name, face]) =>
                                    name === FaceSetting.get() ||
                                    face.scripts.some((script) =>
                                        $locales.usesScript(script),
                                    ),
                            )
                            .map(([name, face]) => {
                                return {
                                    value: name,
                                    label: getFaceDescription(name, face),
                                    face: {
                                        name: name,
                                        face: face,
                                    },
                                };
                            }),
                    ]}
                    change={(choice) =>
                        Settings.setFace(choice === undefined ? null : choice)}
                >
                    {#snippet item(option)}
                        {#if option.face === null}<span>{option.label}</span>
                        {:else}
                            <FaceName
                                name={option.face.name}
                                face={option.face.face}
                            />
                        {/if}
                    {/snippet}
                </Options>
            </label>
            <Mode
                modes={(l) => l.ui.dialog.settings.mode.layout}
                wrap
                choice={$arrangement === Arrangement.Responsive
                    ? 0
                    : $arrangement === Arrangement.Horizontal
                      ? 1
                      : $arrangement === Arrangement.Vertical
                        ? 2
                        : $arrangement === Arrangement.Split
                          ? 3
                          : $arrangement === Arrangement.Single
                            ? 4
                            : 5}
                select={(choice) =>
                    Settings.setArrangement(
                        choice == 0
                            ? Arrangement.Responsive
                            : choice === 1
                              ? Arrangement.Horizontal
                              : choice === 2
                                ? Arrangement.Vertical
                                : choice === 3
                                  ? Arrangement.Split
                                  : choice === 4
                                    ? Arrangement.Single
                                    : Arrangement.Free,
                    )}
                icons={Object.values(LayoutIcons)}
            />
            <Mode
                modes={(l) => l.ui.dialog.settings.mode.animate}
                choice={AnimationFactors.indexOf($animationFactor)}
                select={(choice) =>
                    Settings.setAnimationFactor(AnimationFactors[choice])}
                icons={AnimationFactorIcons}
                modeLabels={false}
            />
            {#if devicesRetrieved}
                <label for="camera-setting">
                    🎥
                    <Options
                        value={cameraDevice?.label}
                        label={(l) => l.ui.dialog.settings.options.camera}
                        id="camera-setting"
                        options={[
                            {
                                value: undefined,
                                label: $locales.get(
                                    (l) => l.ui.dialog.settings.options.default,
                                ),
                            },
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
                                    (camera) => camera.label === choice,
                                )?.deviceId ?? null,
                            )}
                    />
                </label>
                <label for="mic-setting">
                    🎤
                    <Options
                        value={micDevice?.label}
                        label={(l) => l.ui.dialog.settings.options.mic}
                        id="mic-setting"
                        options={[
                            {
                                value: undefined,
                                label: $locales.get(
                                    (l) => l.ui.dialog.settings.options.default,
                                ),
                            },
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
                                    ?.deviceId ?? null,
                            )}
                    />
                </label>
            {/if}
            <Mode
                modes={(l) => l.ui.dialog.settings.mode.dark}
                choice={$dark === false ? 0 : $dark === true ? 1 : 2}
                select={(choice) =>
                    Settings.setDark(
                        choice === 0 ? false : choice === 1 ? true : null,
                    )}
                icons={['☼', '☽', '☼/☽']}
            />
            <Mode
                modes={(l) => l.ui.dialog.settings.mode.blocks}
                choice={$blocks ? 1 : 0}
                select={(choice) =>
                    Settings.setBlocks(choice === 1 ? true : false)}
                icons={[TEXT_EDITING_SYMBOL, BLOCK_EDITING_SYMBOL]}
            />
            <Mode
                modes={(l) => l.ui.dialog.settings.mode.space}
                choice={$spaceIndicator ? 1 : 0}
                select={(choice) =>
                    Settings.setSpace(choice === 1 ? true : false)}
                icons={[CANCEL_SYMBOL, CONFIRM_SYMBOL]}
            />
            <Mode
                modes={(l) => l.ui.dialog.settings.mode.lines}
                choice={$showLines ? 1 : 0}
                select={(choice) =>
                    Settings.setLines(choice === 1 ? true : false)}
                icons={[CANCEL_SYMBOL, CONFIRM_SYMBOL]}
            />
        </div>
    </Dialog>
</div>

<style>
    .settings {
        display: flex;
        flex-direction: row;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing-half);
        margin-inline-start: auto;
    }

    .controls {
        display: flex;
        flex-direction: column;
        gap: calc(2 * var(--wordplay-spacing-half));
        align-items: baseline;
    }

    label {
        white-space: nowrap;
        display: flex;
        flex-direction: row;
        align-items: baseline;
        gap: var(--wordplay-spacing-half);
    }

    label > :global(span) {
        font-style: italic;
    }
</style>
