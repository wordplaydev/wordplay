<script lang="ts">
    import LanguageChooser from './LocaleChooser.svelte';
    import { getUser } from '../project/Contexts';
    import {
        animationFactor,
        locales,
        arrangement,
        camera,
        mic,
        Settings,
        dark,
        spaceIndicator,
        showLines,
    } from '../../db/Database';
    import Arrangement from '../../db/settings/Arrangement';
    import Options from '../widgets/Options.svelte';
    import { onMount } from 'svelte';
    import Link from '../app/Link.svelte';
    import Status from '../app/Status.svelte';
    import Mode from '../widgets/Mode.svelte';
    import Dialog from '../widgets/Dialog.svelte';
    import CreatorView from '../app/CreatorView.svelte';
    import { Creator } from '../../db/creators/CreatorDatabase';
    import { AnimationFactorIcons } from '@db/settings/AnimationFactorSetting';
    import { SupportedFaces } from '@basis/Fonts';
    import { FaceSetting } from '@db/settings/FaceSetting';

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
    <Status />
    <Link nowrap to="/login">
        <CreatorView
            anonymize={false}
            creator={$user ? Creator.from($user) : null}
            prompt
        />
    </Link>
    <LanguageChooser />
    <Dialog
        button={{
            tip: $locales.get((l) => l.ui.dialog.settings.button.show),
            icon: '⚙',
            label: '',
        }}
        description={$locales.get((l) => l.ui.dialog.settings)}
    >
        <hr />
        <div class="controls">
            <label for="ui-face">
                {$locales.get((l) => l.ui.dialog.settings.options.face)}
                <Options
                    value={FaceSetting.get() ?? 'Noto Sans'}
                    label={$locales.get(
                        (l) => l.ui.dialog.settings.options.face,
                    )}
                    id="ui-face"
                    options={[
                        { value: undefined, label: '—' },
                        ...SupportedFaces.map((face) => {
                            return {
                                value: face,
                                label: face,
                            };
                        }),
                    ]}
                    change={(choice) =>
                        Settings.setFace(choice === undefined ? null : choice)}
                ></Options>
            </label>
            <Mode
                descriptions={$locales.get(
                    (l) => l.ui.dialog.settings.mode.layout,
                )}
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
                                : Arrangement.Free,
                    )}
                modes={['📐', '↔️', '↕', '⏹️']}
            />
            <Mode
                descriptions={$locales.get(
                    (l) => l.ui.dialog.settings.mode.animate,
                )}
                choice={$animationFactor}
                select={(choice) => Settings.setAnimationFactor(choice)}
                modes={AnimationFactorIcons}
            />
            {#if devicesRetrieved}
                <label for="camera-setting">
                    🎥
                    <Options
                        value={cameraDevice?.label}
                        label={$locales.get(
                            (l) => l.ui.dialog.settings.options.camera,
                        )}
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
                                    (camera) => camera.label === choice,
                                )?.deviceId ?? null,
                            )}
                        width="4em"
                    />
                </label>
                <label for="mic-setting">
                    🎤
                    <Options
                        value={micDevice?.label}
                        label={$locales.get(
                            (l) => l.ui.dialog.settings.options.mic,
                        )}
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
                                    ?.deviceId ?? null,
                            )}
                        width="4em"
                    />
                </label>
            {/if}
            <Mode
                descriptions={$locales.get(
                    (l) => l.ui.dialog.settings.mode.dark,
                )}
                choice={$dark === false ? 0 : $dark === true ? 1 : 2}
                select={(choice) =>
                    Settings.setDark(
                        choice === 0 ? false : choice === 1 ? true : null,
                    )}
                modes={['☼', '☽', '☼/☽']}
            />

            <Mode
                descriptions={$locales.get(
                    (l) => l.ui.dialog.settings.mode.space,
                )}
                choice={$spaceIndicator ? 1 : 0}
                select={(choice) =>
                    Settings.setSpace(choice === 1 ? true : false)}
                modes={['✗', '✓']}
            />
            <Mode
                descriptions={$locales.get(
                    (l) => l.ui.dialog.settings.mode.lines,
                )}
                choice={$showLines ? 1 : 0}
                select={(choice) =>
                    Settings.setLines(choice === 1 ? true : false)}
                modes={['✗', '✓']}
            />
        </div>
    </Dialog>
</div>

<style>
    .settings {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
        margin-inline-start: auto;
    }

    .controls {
        display: flex;
        flex-direction: column;
        gap: calc(2 * var(--wordplay-spacing));
        align-items: baseline;
    }

    label {
        white-space: nowrap;
        font-style: italic;
    }
</style>
