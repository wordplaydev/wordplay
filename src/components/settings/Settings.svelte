<script lang="ts">
    import { Faces, getFaceDescription } from '@basis/faces/Fonts';
    import {
        getLocalizing,
        getUser,
        isAuthenticated,
    } from '@components/project/Contexts';
    import Subheader from '@components/app/Subheader.svelte';
    import {
        LayoutIcons,
        StagePlacementIcons,
    } from '@components/project/Layout';
    import FaceName from '@components/settings/FaceName.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import Options from '@components/widgets/Options.svelte';
    import Tabbed from '@components/widgets/Tabbed.svelte';
    import Synced from '@components/widgets/Synced.svelte';
    import {
        adaptOutput,
        arrangement,
        blockDensity,
        blocks,
        camera,
        animationCues,
        captionSize,
        contactCues,
        cues,
        dark,
        haptics,
        insertTab,
        locales,
        mic,
        musicDucking,
        musicVisualization,
        musicVolume,
        Settings,
        showLines,
        stagePlacement,
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
    import {
        ArrangementOrder,
        hasStagePlacement,
    } from '@db/settings/Arrangement';
    import { StagePlacementOrder } from '@db/settings/StagePlacement';
    import {
        CaptionSizeIcons,
        CaptionSizes,
    } from '@db/settings/CaptionSizeSetting';
    import { FaceSetting } from '@db/settings/FaceSetting';
    import {
        MusicVisualizationIcons,
        MusicVisualizations,
    } from '@db/settings/MusicSettings';
    import supportsVibration from '@db/settings/supportsVibration';
    import { TAB_SYMBOL } from '@parser/Spaces';
    import {
        BLOCK_EDITING_SYMBOL,
        CANCEL_SYMBOL,
        CONFIRM_SYMBOL,
        EDIT_SYMBOL,
        TEXT_EDITING_SYMBOL,
    } from '@parser/Symbols';
    import { onMount } from 'svelte';

    const user = getUser();

    const animationFactor = AnimationFactorSetting.value;

    onMount(async () => {
        vibrates = supportsVibration();

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

    /** Resolved on mount, not at module scope, so a prerendered page doesn't
     *  bake in the server's answer of "no". */
    let vibrates = $state(false);

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

    /** Index into the tab labels; see `ui.dialog.settings.tab`. */
    let tab = $state(0);

    /** The index of the input tab, which is the only one that can disappear. */
    const InputTab = 2;

    /** The input tab holds nothing but the camera and microphone pickers, so
     *  hide the tab rather than offer an empty panel on a device that exposes
     *  no media devices at all. */
    let omit = $derived(devicesRetrieved ? [] : [InputTab]);

    // Fall back to the first tab if the selected one is hidden, so the dialog
    // can't end up showing no panel with no tab marked selected.
    $effect(() => {
        if (omit.includes(tab)) tab = 0;
    });

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
    pinned
>
    <!-- Grouped by the language's own vocabulary — what a program reads, what it
         produces, and the code between them — plus the app's own appearance.
         Deliberately no accessibility tab: captions belong with the music and
         speech they stand in for, and animation speed with the motion it
         governs, so pulling them into a group of their own would separate each
         from the thing it modifies. -->
    <Tabbed
        id="settings-tabs"
        tabs={(l) => l.ui.dialog.settings.tab}
        icons={['🎨', EDIT_SYMBOL, '🎥', '🔊']}
        {omit}
        choice={tab}
        select={(choice) => (tab = choice)}
        wrap
    >
        {#snippet children()}
            <!-- Only the sound panel carries headers, and only because it holds
                 two different outputs. Elsewhere the tab already names the
                 group, so a header would just repeat it. -->
            {#if tab === 0}
                <div class="controls">
                    <label for="ui-face">
                        <span class="label"
                            ><LocalizedText
                                path={(l) => l.ui.dialog.settings.options.face}
                            /></span
                        >
                        <!-- The label above is `display: contents`, so the chooser
                             and its badge need a box of their own to share one
                             cell of the control column. -->
                        <span class="control">
                            <Options
                                value={FaceSetting.get() ?? 'Noto Sans'}
                                label={(l) => l.ui.dialog.settings.options.face}
                                id="ui-face"
                                width="10em"
                                options={[
                                    {
                                        value: undefined,
                                        label: () => '—',
                                        face: null,
                                    },
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
                                                label: () =>
                                                    getFaceDescription(
                                                        $locales,
                                                        name,
                                                        face,
                                                    ),
                                                face: {
                                                    name: name,
                                                    face: face,
                                                },
                                            };
                                        }),
                                ]}
                                change={(choice) =>
                                    Settings.setFace(
                                        choice === undefined ? null : choice,
                                    )}
                            >
                                {#snippet item(option, localized)}
                                    {#if option.face === null}<span
                                            >{@render localized(
                                                option.label,
                                            )}</span
                                        >
                                    {:else}
                                        <FaceName
                                            name={option.face.name}
                                            face={option.face.face}
                                        />
                                    {/if}
                                {/snippet}
                            </Options><Synced />
                        </span>
                    </label>
                    <Mode
                        grid
                        modes={(l) => l.ui.dialog.settings.mode.dark}
                        choice={$dark === false ? 0 : $dark === true ? 1 : 2}
                        select={(choice) =>
                            Settings.setDark(
                                choice === 0
                                    ? false
                                    : choice === 1
                                      ? true
                                      : null,
                            )}
                        icons={['☼', '☽', '☼/☽']}
                    />
                    <!-- Hidden when the creator has forced light, since a
                         project's colors are only ever flipped on a dark screen. -->
                    {#if $dark !== false}
                        <Mode
                            grid
                            indented
                            modes={(l) => l.ui.dialog.settings.mode.adaptOutput}
                            choice={$adaptOutput ? 1 : 0}
                            select={(choice) =>
                                Settings.setAdaptOutput(choice === 1)}
                            icons={['🎨', '🌗']}
                        />
                    {/if}
                    <Mode
                        grid
                        modes={(l) => l.ui.dialog.settings.mode.layout}
                        choice={ArrangementOrder.indexOf($arrangement)}
                        select={(choice) => {
                            const chosen = ArrangementOrder[choice];
                            if (chosen !== undefined)
                                Settings.setArrangement(chosen);
                        }}
                        icons={ArrangementOrder.map((a) => LayoutIcons[a])}
                    />
                    <!-- Only the arrangements that lay tiles out on axes have a
                         stage placement; auto is included, since it resolves to
                         one of the two. -->
                    {#if hasStagePlacement($arrangement)}
                        <Mode
                            grid
                            indented
                            modes={(l) => l.ui.dialog.settings.mode.placement}
                            choice={StagePlacementOrder.indexOf(
                                $stagePlacement,
                            )}
                            select={(choice) => {
                                const chosen = StagePlacementOrder[choice];
                                if (chosen !== undefined)
                                    Settings.setStagePlacement(chosen);
                            }}
                            icons={StagePlacementOrder.map(
                                (p) => StagePlacementIcons[p],
                            )}
                        />
                    {/if}
                    <!-- modeLabels={false} because the scale factor *is* the
                         label, so drawing both would read "1x 1x". Each button
                         still names itself to a screen reader, from its tip. -->
                    <Mode
                        grid
                        synced
                        modes={(l) => l.ui.dialog.settings.mode.animate}
                        choice={AnimationFactors.indexOf($animationFactor)}
                        select={(choice) =>
                            Settings.setAnimationFactor(
                                AnimationFactors[choice],
                            )}
                        icons={AnimationFactorIcons}
                        modeLabels={false}
                    />
                    <Mode
                        grid
                        synced
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
                </div>
            {:else if tab === 1}
                <div class="controls">
                    <Mode
                        grid
                        modes={(l) => l.ui.dialog.settings.mode.blocks}
                        choice={$blocks ? 1 : 0}
                        select={(choice) =>
                            Settings.setBlocks(choice === 1 ? true : false)}
                        icons={[TEXT_EDITING_SYMBOL, BLOCK_EDITING_SYMBOL]}
                    />
                    <!-- `indented` rather than a wrapper element: these depend on
                         the editor mode above, and a wrapper would occupy one
                         grid cell and take both of the row's cells with it. -->
                    {#if $blocks}
                        <Mode
                            grid
                            indented
                            modes={(l) =>
                                l.ui.dialog.settings.mode.blockDensity}
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
                    {:else}
                        <Mode
                            grid
                            indented
                            synced
                            modes={(l) => l.ui.dialog.settings.mode.lines}
                            choice={$showLines ? 1 : 0}
                            select={(choice) =>
                                Settings.setLines(choice === 1 ? true : false)}
                            icons={[CANCEL_SYMBOL, CONFIRM_SYMBOL]}
                        />
                        <Mode
                            grid
                            indented
                            synced
                            modes={(l) => l.ui.dialog.settings.mode.wrap}
                            choice={$wrap ? 1 : 0}
                            select={(choice) =>
                                Settings.setWrap(choice === 1 ? true : false)}
                            icons={[CANCEL_SYMBOL, CONFIRM_SYMBOL]}
                        />
                    {/if}
                    <!-- Not indented, unlike the rows above: the markers apply in
                         both modes — NodeSequenceView renders a ↵ per line break
                         in blocks mode too — so this is a peer of the editor
                         mode, not something that depends on it. -->
                    <Mode
                        grid
                        synced
                        modes={(l) => l.ui.dialog.settings.mode.space}
                        choice={$spaceIndicator ? 1 : 0}
                        select={(choice) =>
                            Settings.setSpace(choice === 1 ? true : false)}
                        icons={[CANCEL_SYMBOL, CONFIRM_SYMBOL]}
                    />
                    <Mode
                        grid
                        modes={(l) => l.ui.dialog.settings.mode.words}
                        choice={$words ? 1 : 0}
                        select={(choice) =>
                            Settings.setWords(choice === 1 ? true : false)}
                        icons={['ƒ', 'Aa']}
                    />
                    <Mode
                        grid
                        modes={(l) => l.ui.dialog.settings.mode.tab}
                        choice={$insertTab ? 1 : 0}
                        select={(choice) => Settings.setTab(choice === 1)}
                        icons={['⌨', TAB_SYMBOL]}
                    />
                </div>
            {:else if tab === 2}
                <div class="controls">
                    <!-- Prefixed with the stream's own emoji, the way the sound
                         panel's headers are, since these two rows have no header
                         of their own to carry it. -->
                    <label for="camera-setting">
                        <span class="label"
                            >🎥 <LocalizedText
                                path={(l) =>
                                    l.ui.dialog.settings.options.camera}
                            /></span
                        >
                        <Options
                            value={cameraDevice?.label}
                            label={(l) => l.ui.dialog.settings.options.camera}
                            id="camera-setting"
                            options={[
                                {
                                    value: undefined,
                                    label: (l) =>
                                        l.ui.dialog.settings.options.default,
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
                                    cameras.find(
                                        (camera) => camera.label === choice,
                                    )?.deviceId ?? null,
                                )}
                        />
                    </label>
                    <label for="mic-setting">
                        <span class="label"
                            >🎤 <LocalizedText
                                path={(l) => l.ui.dialog.settings.options.mic}
                            /></span
                        >
                        <Options
                            value={micDevice?.label}
                            label={(l) => l.ui.dialog.settings.options.mic}
                            id="mic-setting"
                            options={[
                                {
                                    value: undefined,
                                    label: (l) =>
                                        l.ui.dialog.settings.options.default,
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
                </div>
            {:else}
                <div class="controls">
                    <!-- Named after the output each group belongs to, so every
                         label below can drop the prefix it would otherwise
                         repeat ("music volume", "Say caption size"). -->
                    <Subheader compact
                        >🎼 <LocalizedText
                            path={(l) => l.ui.dialog.settings.subheader.music}
                        /></Subheader
                    >
                    <div class="header-row-end"></div>
                    <!-- Driven by the arrays rather than by hand-written indices,
                         so adding a rendering is one entry in MusicSettings
                         rather than four places that have to agree about what
                         index 2 means. -->
                    <Mode
                        grid
                        modes={(l) =>
                            l.ui.dialog.settings.mode.musicVisualization}
                        choice={Math.max(
                            0,
                            MusicVisualizations.indexOf($musicVisualization),
                        )}
                        select={(choice) =>
                            Settings.setMusicVisualization(
                                MusicVisualizations[choice] ?? 'orchestra',
                            )}
                        icons={MusicVisualizationIcons}
                    />
                    <Mode
                        grid
                        modes={(l) => l.ui.dialog.settings.mode.musicVolume}
                        choice={$musicVolume === 0
                            ? 0
                            : $musicVolume <= 0.5
                              ? 1
                              : 2}
                        select={(choice) =>
                            Settings.setMusicVolume(
                                choice === 0 ? 0 : choice === 1 ? 0.5 : 1,
                            )}
                        icons={['🔇', '🔉', '🔊']}
                    />
                    <Mode
                        grid
                        modes={(l) => l.ui.dialog.settings.mode.musicDucking}
                        choice={$musicDucking === 0
                            ? 2
                            : $musicDucking <= 0.1
                              ? 1
                              : 0}
                        select={(choice) =>
                            Settings.setMusicDucking(
                                choice === 0 ? 0.2 : choice === 1 ? 0.1 : 0,
                            )}
                        icons={['🔉', '🔈', '🔇']}
                    />
                    <!-- Offered only where it can do something: this is the same
                         condition the vibrate call itself checks, so a device
                         that would silently no-op never sees the toggle. -->
                    {#if vibrates}
                        <Mode
                            grid
                            modes={(l) => l.ui.dialog.settings.mode.haptics}
                            choice={$haptics ? 1 : 0}
                            select={(choice) =>
                                Settings.setHaptics(choice === 1)}
                            icons={['◌', '📳']}
                        />
                    {/if}
                    <!-- The app's own sounds, not a program's, so they sit in
                         their own group rather than under Music. -->
                    <Subheader compact
                        >🔔 <LocalizedText
                            path={(l) => l.ui.dialog.settings.subheader.cues}
                        /></Subheader
                    >
                    <div class="header-row-end"></div>
                    <Mode
                        grid
                        modes={(l) => l.ui.dialog.settings.mode.cues}
                        choice={$cues ? 1 : 0}
                        select={(choice) => Settings.setCues(choice === 1)}
                        icons={['◌', '🔔']}
                    />
                    <!-- Its own row, since a contact is not a re-evaluation —
                         it sounds whether or not the program watches for one —
                         and a landing is twenty cues where a keypress is one. -->
                    <Mode
                        grid
                        modes={(l) => l.ui.dialog.settings.mode.contactCues}
                        choice={$contactCues ? 1 : 0}
                        select={(choice) =>
                            Settings.setContactCues(choice === 1)}
                        icons={['◌', '💥']}
                    />
                    <!-- Its own row, since animation sounds continuously where
                         the others sound on an event. -->
                    <Mode
                        grid
                        modes={(l) => l.ui.dialog.settings.mode.animationCues}
                        choice={$animationCues ? 1 : 0}
                        select={(choice) =>
                            Settings.setAnimationCues(choice === 1)}
                        icons={['◌', '🎭']}
                    />
                    <Subheader compact
                        >🔊 <LocalizedText
                            path={(l) => l.ui.dialog.settings.subheader.say}
                        /></Subheader
                    >
                    <div class="header-row-end"></div>
                    <!-- Driven by the arrays like the rendering chooser above, so
                         adding a size is one entry rather than a hand-written
                         index. Unconditional, unlike the voice chooser below it:
                         a device with no voices is exactly where captions matter
                         most, so they must not vanish alongside it.

                         modeLabels={false} like the animation speed row, and for
                         the same reason: the scale factor *is* the label, so
                         drawing both would read "1x 1x". Each button still names
                         itself to a screen reader, from its tip. -->
                    <Mode
                        grid
                        modes={(l) => l.ui.dialog.settings.mode.captionSize}
                        choice={Math.max(0, CaptionSizes.indexOf($captionSize))}
                        select={(choice) =>
                            Settings.setCaptionSize(CaptionSizes[choice] ?? 1)}
                        icons={CaptionSizeIcons}
                        modeLabels={false}
                    />
                    <!-- Gated on the voice list alone, not on the media device
                         list: speech synthesis works on devices that expose no
                         cameras or microphones at all. -->
                    {#if voices.length > 0}
                        <label for="voice-setting">
                            <span class="label"
                                ><LocalizedText
                                    path={(l) =>
                                        l.ui.dialog.settings.options.voice}
                                /></span
                            >
                            <Options
                                value={selectedVoice?.name}
                                label={(l) =>
                                    l.ui.dialog.settings.options.voice}
                                id="voice-setting"
                                options={[
                                    {
                                        value: undefined,
                                        label: (l) =>
                                            l.ui.dialog.settings.options
                                                .default,
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
                </div>
            {/if}
        {/snippet}
    </Tabbed>
</Dialog>

<style>
    /* The same label grid the guide's filters use: labels right-aligned in one
       column, controls left-aligned in the next, so the whole panel scans as a
       single column instead of a stack of independently sized rows. Each Mode
       contributes its two cells via its `grid` prop (`display: contents`). */
    .controls {
        display: grid;
        grid-template-columns: max-content minmax(0, 1fr);
        column-gap: var(--wordplay-spacing);
        row-gap: calc(2 * var(--wordplay-spacing-half));
        align-items: baseline;
    }

    /* Options rows are wrapped in a label for the `for`/`id` association, so it
       has to dissolve too or the row would sit in a single cell and miss the
       column. */
    label {
        display: contents;
    }

    /* Matches Mode's `.control`: an Options row's chooser and its cloud badge
       share the control column's cell, so the row still contributes two cells. */
    .control {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing-half);
        align-items: baseline;
        min-width: 0;
    }

    /* Matches Mode's own grid label styling, so an Options row's label lands on
       exactly the same edge as a Mode row's. */
    .label {
        justify-self: end;
        text-align: end;
        font-style: italic;
    }

    /* In the label column and right-aligned, so a header lands on the same edge
       as the labels it heads rather than starting a second one. Spanning both
       columns or sitting in the control column each put it out of line with
       everything beneath it. */
    .controls :global(h2) {
        grid-column: 1;
        justify-self: end;
        text-align: end;
        margin-block-start: var(--wordplay-spacing);
    }

    /* A header pinned to column 1 does not finish its row, so auto-placement
       would drop the next label into column 2 and shift every cell after it by
       one. This empty cell finishes the row. It has no content or role, so it
       never reaches the accessibility tree. */
    .header-row-end {
        grid-column: 2;
    }

    .controls :global(h2:first-child) {
        margin-block-start: 0;
    }
</style>
