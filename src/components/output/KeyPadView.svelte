<script lang="ts">
    /**
     * Tappable keys for a project that listens to a known set of them.
     *
     * A touch screen has no arrow keys and no room for the on-screen keyboard
     * over a stage, so when the project's keys can be bounded statically we
     * offer exactly those, arranged like the keyboard they replace. Presses go
     * through the same path a physical key does, so nothing downstream — the
     * streams, the announcements, the input recording replay depends on — can
     * tell the difference.
     */
    import { locales } from '@db/Database';
    import Button from '@components/widgets/Button.svelte';
    import KeyHold from '@components/output/keyHold';
    import layoutKeyPad from '@components/output/keyPadLayout';
    import { localizeKeyName } from '@input/Key/Key';
    import type { KeyAnalysis } from '@input/Key/analyzeProjectKeys';

    interface Props {
        /** The keys to offer; unbounded projects don't render a pad at all. */
        analysis: Exclude<KeyAnalysis, { kind: 'unbounded' }>;
        /** Send a key press or release, exactly as a keyboard would. */
        press: (key: string, down: boolean) => void;
    }

    let { analysis, press }: Props = $props();

    /** A project that only asks whether a key happened gets one button, and
     * the space bar is the key least likely to mean something specific. */
    const AnyKey = ' ';

    /** Held keys repeat, since a physical keyboard's auto-repeat is what makes
     * continuous movement work; `Placement` steps once per event. Wrapped in a
     * closure rather than passed directly so each call reads the current prop. */
    const hold = new KeyHold({ press: (key, down) => press(key, down) });

    let sections = $derived(
        analysis.kind === 'specific' ? layoutKeyPad(analysis.keys) : [],
    );

    function label(key: string): string {
        return key === ' '
            ? $locales.getPrimaryPlainText((l) => l.ui.output.keypad.any)
            : localizeKeyName(key, $locales);
    }

    /** Arrows read better as the direction they point than as their name. */
    function caption(key: string): string {
        return (
            {
                ArrowLeft: '←',
                ArrowRight: '→',
                ArrowUp: '↑',
                ArrowDown: '↓',
                ' ': '␣',
            }[key] ?? localizeKeyName(key, $locales)
        );
    }

    function down(event: PointerEvent, key: string) {
        // Button already prevents the default, stops propagation so the stage's
        // own handling doesn't fire its Button and Pointer streams, and captures
        // the pointer so a release still lands here. Read the element
        // synchronously — currentTarget is nulled once dispatch completes — and
        // only trust a capture that actually took, since that's what later
        // tells us the finger is still down.
        const element = event.currentTarget;
        const capture =
            element instanceof HTMLElement &&
            element.hasPointerCapture(event.pointerId)
                ? element
                : undefined;
        hold.down(event.pointerId, key, capture);
    }

    function up(event: PointerEvent) {
        hold.up(event.pointerId);
    }

    /** A press with no pointer behind it — a click, or Enter/Space on a focused
     *  key — has no up to pair with, so send the release immediately. Without
     *  this the pad is unusable by keyboard and switch access. */
    function tap(key: string) {
        press(key, true);
        press(key, false);
    }

    // Nothing guarantees a pointer up reaches the button it started on: a
    // system edge gesture can claim the touch, the element can lose capture,
    // the app can be switched away — and a lost one used to leave the key
    // repeating forever. Capture phase, because Button stops propagation at
    // the target; releasing a pointer that isn't held is a no-op, so the
    // backstop firing alongside Button's own handler costs nothing.
    $effect(() => {
        const lost = (event: PointerEvent) => hold.up(event.pointerId);
        const all = () => hold.releaseAll();
        const hidden = () => (document.hidden ? all() : undefined);
        const capture = { capture: true };
        window.addEventListener('pointerup', lost, capture);
        window.addEventListener('pointercancel', lost, capture);
        window.addEventListener('lostpointercapture', lost, capture);
        window.addEventListener('blur', all);
        window.addEventListener('pagehide', all);
        document.addEventListener('visibilitychange', hidden);
        // A stage that unmounts mid-press must not leave a key down forever.
        return () => {
            window.removeEventListener('pointerup', lost, capture);
            window.removeEventListener('pointercancel', lost, capture);
            window.removeEventListener('lostpointercapture', lost, capture);
            window.removeEventListener('blur', all);
            window.removeEventListener('pagehide', all);
            document.removeEventListener('visibilitychange', hidden);
            all();
        };
    });
</script>

<div
    class="key-pad"
    role="group"
    aria-label={$locales.getPrimaryPlainText((l) => l.ui.output.keypad.label)}
>
    {#snippet keyButton(key: string, wide: boolean, text?: string)}
        <Button
            classes={wide ? 'key wide' : 'key'}
            background
            tip={() => label(key)}
            onPress={(event) => down(event, key)}
            onRelease={up}
            action={() => tap(key)}>{text ?? caption(key)}</Button
        >
    {/snippet}

    {#if analysis.kind === 'any'}
        <!-- Which key doesn't matter here, so say what the button does
             rather than naming the key it happens to send. -->
        {@render keyButton(
            AnyKey,
            true,
            $locales.getPrimaryPlainText((l) => l.ui.output.keypad.any),
        )}
    {:else}
        {#each sections as section}
            {#if section.kind === 'arrows'}
                <div class="cluster">
                    <div class="arrows">
                        <div class="arrow-up">
                            {#if section.up}{@render keyButton(
                                    'ArrowUp',
                                    false,
                                )}{/if}
                        </div>
                        <div class="arrow-row">
                            {#if section.left}{@render keyButton(
                                    'ArrowLeft',
                                    false,
                                )}{/if}
                            {#if section.down}{@render keyButton(
                                    'ArrowDown',
                                    false,
                                )}{/if}
                            {#if section.right}{@render keyButton(
                                    'ArrowRight',
                                    false,
                                )}{/if}
                        </div>
                    </div>
                    {#if section.beside.length > 0}
                        <div class="beside">
                            {#each section.beside as slot}
                                {@render keyButton(slot.key, slot.wide)}
                            {/each}
                        </div>
                    {/if}
                </div>
            {:else if section.kind === 'spread'}
                <div class="spread">
                    {@render keyButton(section.left.key, section.left.wide)}
                    <div class="middle">
                        {#each section.middle as slot}
                            {@render keyButton(slot.key, slot.wide)}
                        {/each}
                    </div>
                    {@render keyButton(section.right.key, section.right.wide)}
                </div>
            {:else}
                <div class="row">
                    {#each section.keys as slot}
                        {@render keyButton(slot.key, slot.wide)}
                    {/each}
                </div>
            {/if}
        {/each}
    {/if}
</div>

<style>
    /* Placement belongs to the stage floor band in OutputView, which anchors
       this clear of whichever music rendering must not be overlapped and keeps
       the caption above it. This used to position itself against a hardcoded
       15%, which floated it over nothing when the viewer chose `off`, buried it
       under the mood cloud, and left it to collide with the caption. */
    .key-pad {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--wordplay-spacing);
        max-inline-size: 100%;
    }

    .row,
    .middle,
    .arrow-row,
    .arrow-up {
        display: flex;
        justify-content: center;
        gap: var(--wordplay-spacing);
    }

    .arrows {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--wordplay-spacing);
    }

    /* Arrows and everything else on one band, so the pad stays short. */
    .cluster {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: calc(var(--wordplay-spacing) * 2);
        flex-wrap: wrap;
    }

    .beside {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        /* Two rows, matching the cluster beside it. */
        max-inline-size: 60cqi;
        gap: var(--wordplay-spacing);
    }

    .spread {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--wordplay-spacing);
        inline-size: 100%;
        padding-inline: var(--wordplay-spacing);
    }

    /* These are standard Buttons, so their chrome — background, border, radius,
       hover and press feedback, focus — comes from the widget. Scoped styles
       can't reach inside a component, so the few things the pad needs on top of
       that are set globally on the class the buttons carry. */
    .key-pad :global(button.key) {
        /* The pad itself is pointer-events: none so the stage stays draggable
           between the keys, so each key has to opt back in. */
        pointer-events: auto;
        /* Comfortably above the standard 24px minimum target size, since these
           are meant for fingers rather than a cursor. */
        min-inline-size: 44px;
        min-block-size: 44px;
        /* Keys are read at a glance while playing, not at widget size. */
        font-size: var(--wordplay-font-size);
        /* The stage suppresses gestures; these are taps, not pans. */
        touch-action: none;
        user-select: none;
    }

    .key-pad :global(button.key.wide) {
        min-inline-size: 128px;
        flex-grow: 1;
    }
</style>
