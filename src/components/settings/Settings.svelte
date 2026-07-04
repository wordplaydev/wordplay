<script lang="ts">
    import { Faces, getFaceDescription } from '@basis/faces/Fonts';
    import {
        getLocalizing,
        getUser,
        isAuthenticated,
    } from '@components/project/Contexts';
    import { LayoutIcons } from '@components/project/Layout';
    import FaceName from '@components/settings/FaceName.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import Options from '@components/widgets/Options.svelte';
    import {
        arrangement,
        blockDensity,
        blocks,
        camera,
        dark,
        insertTab,
        locales,
        mic,
        Settings,
        showLines,
        spaceIndicator,
        voice,
        words,
        wrap,
        writingLayout,
    } from '@db/Database';
    import {
        AnimationFactorIcons,
        AnimationFactors,
        AnimationFactorSetting,
    } from '@db/settings/AnimationFactorSetting';
    import { Arrangement } from '@db/settings/Arrangement';
    import { FaceSetting } from '@db/settings/FaceSetting';
    import { TAB_SYMBOL } from '@parser/Spaces';
    import {
        BLOCK_EDITING_SYMBOL,
        CANCEL_SYMBOL,
        CONFIRM_SYMBOL,
        TEXT_EDITING_SYMBOL,
    } from '@parser/Symbols';
    import { onMount } from 'svelte';

    const user = getUser();

    const animationFactor = AnimationFactorSetting.value;

    onMount(async () => {
        if (
            typeof navigator === 'undefined' ||
            typeof navigator.mediaDevices == 'undefined'
        ) {
            devicesRetrieved = undefined;
        } else {
            const devices = await navigator.mediaDevices.enumerateDevices();
            cameras = devices.filter((device) => device.kind === 'videoinput');
            mics = devices.filter((device) => device.kind === 'audioinput');
            devicesRetrieved = true;
        }

        if (typeof speechSynthesis !== 'undefined') {
            function loadVoices() {
                voices = speechSynthesis.getVoices();
            }
            loadVoices();
            speechSynthesis.addEventListener('voiceschanged', loadVoices);
        }
    });

    let devicesRetrieved: boolean | undefined = $state(false);
    let cameras: MediaDeviceInfo[] = $state([]);
    let mics: MediaDeviceInfo[] = $state([]);
    let voices: SpeechSynthesisVoice[] = $state([]);

    let cameraDevice = $derived(
        $camera ? cameras.find((cam) => cam.deviceId === $camera) : undefined,
    );

    let micDevice = $derived(
        $mic ? mics.find((m) => m.deviceId === $mic) : undefined,
    );

    let selectedVoice = $derived(
        $voice ? voices.find((v) => v.voiceURI === $voice) : undefined,
    );

    const localizing = getLocalizing();

    // Force localizing mode off whenever the visitor is signed out, so badges
    // and inline editors disappear on sign-out and don't reappear for an
    // anonymous session that has no way to submit edits.
    $effect(() => {
        if (!isAuthenticated($user) && localizing.on) localizing.on = false;
    });
</script>

<Dialog
    id="settings"
    button={{
        tip: (l) => l.ui.dialog.settings.button.show,
        icon: '⚙',
        background: true,
    }}
    header={(l) => l.ui.dialog.settings.header}
    explanation={(l) => l.ui.dialog.settings.explanation}
>
    <hr />
    <div class="controls">
        <label for="ui-face">
            <LocalizedText path={(l) => l.ui.dialog.settings.options.face} />
            <Options
                value={FaceSetting.get() ?? 'Noto Sans'}
                label={(l) => l.ui.dialog.settings.options.face}
                id="ui-face"
                width="10em"
                options={[
                    { value: undefined, label: () => '—', face: null },
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
                                label: () => getFaceDescription(name, face),
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
                {#snippet item(option, localized)}
                    {#if option.face === null}<span
                            >{@render localized(option.label)}</span
                        >
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
                            label: (l) => l.ui.dialog.settings.options.default,
                        },
                        ...cameras.map((device) => {
                            return {
                                value: device.label,
                                label: () => device.label,
                            };
                        }),
                    ]}
                    change={(choice) =>
                        Settings.setCamera(
                            cameras.find((camera) => camera.label === choice)
                                ?.deviceId ?? null,
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
                            label: (l) => l.ui.dialog.settings.options.default,
                        },
                        ...mics.map((device) => {
                            return {
                                value: device.label,
                                label: () => device.label,
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
            {#if voices.length > 0}
                <label for="voice-setting">
                    🔊
                    <Options
                        value={selectedVoice?.name}
                        label={(l) => l.ui.dialog.settings.options.voice}
                        id="voice-setting"
                        options={[
                            {
                                value: undefined,
                                label: (l) =>
                                    l.ui.dialog.settings.options.default,
                            },
                            ...voices.map((v) => {
                                return {
                                    value: v.name,
                                    label: () => v.name,
                                };
                            }),
                        ]}
                        change={(choice) =>
                            Settings.setVoice(
                                voices.find((v) => v.name === choice)
                                    ?.voiceURI ?? null,
                            )}
                    />
                </label>
            {/if}
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
            select={(choice) => Settings.setBlocks(choice === 1 ? true : false)}
            icons={[TEXT_EDITING_SYMBOL, BLOCK_EDITING_SYMBOL]}
        />
        <Mode
            modes={(l) => l.ui.dialog.settings.mode.words}
            choice={$words ? 1 : 0}
            select={(choice) => Settings.setWords(choice === 1 ? true : false)}
            icons={['ƒ', 'Aa']}
        />
        <Mode
            modes={(l) => l.ui.dialog.settings.mode.writing}
            choice={$writingLayout === 'horizontal-tb'
                ? 0
                : $writingLayout === 'vertical-rl'
                  ? 1
                  : $writingLayout === 'vertical-lr'
                    ? 2
                    : 3}
            select={(choice) =>
                Settings.setWritingLayout(
                    choice === 0
                        ? 'horizontal-tb'
                        : choice === 1
                          ? 'vertical-rl'
                          : choice === 2
                            ? 'vertical-lr'
                            : 'auto',
                )}
            icons={['↔↓', '↕←', '↕→', '🌐']}
        />
        {#if $blocks}
            <div class="indented">
                <Mode
                    modes={(l) => l.ui.dialog.settings.mode.blockDensity}
                    choice={$blockDensity === 'compact'
                        ? 0
                        : $blockDensity === 'spacious'
                          ? 2
                          : 1}
                    select={(choice) =>
                        Settings.setBlockDensity(
                            choice === 0
                                ? 'compact'
                                : choice === 2
                                  ? 'spacious'
                                  : 'normal',
                        )}
                />
            </div>
        {:else}
            <div class="indented">
                <Mode
                    modes={(l) => l.ui.dialog.settings.mode.lines}
                    choice={$showLines ? 1 : 0}
                    select={(choice) =>
                        Settings.setLines(choice === 1 ? true : false)}
                    icons={[CANCEL_SYMBOL, CONFIRM_SYMBOL]}
                />
            </div>
            <div class="indented">
                <Mode
                    modes={(l) => l.ui.dialog.settings.mode.wrap}
                    choice={$wrap ? 1 : 0}
                    select={(choice) =>
                        Settings.setWrap(choice === 1 ? true : false)}
                    icons={[CANCEL_SYMBOL, CONFIRM_SYMBOL]}
                />
            </div>
        {/if}
        <div class="indented">
            <Mode
                modes={(l) => l.ui.dialog.settings.mode.space}
                choice={$spaceIndicator ? 1 : 0}
                select={(choice) =>
                    Settings.setSpace(choice === 1 ? true : false)}
                icons={[CANCEL_SYMBOL, CONFIRM_SYMBOL]}
            />
        </div>
        <Mode
            modes={(l) => l.ui.dialog.settings.mode.tab}
            choice={$insertTab ? 1 : 0}
            select={(choice) => Settings.setTab(choice === 1)}
            icons={['⌨', TAB_SYMBOL]}
        />
    </div>
</Dialog>

<style>
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

    .indented {
        margin-inline-start: var(--wordplay-spacing);
    }

    label > :global(span) {
        font-style: italic;
    }
</style>
