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

    /** Held keys repeat, since a physical keyboard's auto-repeat is what
     * makes continuous movement work; `Placement` steps once per event. */
    const RepeatDelay = 400;
    const RepeatInterval = 66;

    /** What each pointer is holding, so several fingers can hold several
     * keys — a chord is how a project is played with two thumbs. */
    let held = new Map<number, { key: string; timer: number }>();

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
        // Keep the stage's own pointer handling — which would fire Button and
        // Pointer streams and refocus the keyboard sink — out of this.
        event.preventDefault();
        event.stopPropagation();
        if (event.currentTarget instanceof HTMLElement)
            event.currentTarget.setPointerCapture(event.pointerId);

        release(event.pointerId);
        press(key, true);

        const repeat = () => {
            press(key, true);
            const holding = held.get(event.pointerId);
            if (holding) holding.timer = window.setTimeout(repeat, RepeatInterval);
        };
        held.set(event.pointerId, {
            key,
            timer: window.setTimeout(repeat, RepeatDelay),
        });
    }

    function up(event: PointerEvent) {
        event.preventDefault();
        event.stopPropagation();
        release(event.pointerId);
    }

    /** Stop repeating and report the key up, so nothing is left held. */
    function release(pointer: number) {
        const holding = held.get(pointer);
        if (holding === undefined) return;
        clearTimeout(holding.timer);
        held.delete(pointer);
        press(holding.key, false);
    }

    // A stage that unmounts mid-press must not leave a key down forever.
    $effect(() => () => {
        for (const pointer of Array.from(held.keys())) release(pointer);
    });
</script>

<div
    class="key-pad"
    role="group"
    aria-label={$locales.getPrimaryPlainText((l) => l.ui.output.keypad.label)}
>
    {#snippet keyButton(key: string, wide: boolean, text?: string)}
        <button
            type="button"
            class="key"
            class:wide
            title={label(key)}
            aria-label={label(key)}
            onpointerdown={(event) => down(event, key)}
            onpointerup={up}
            onpointercancel={up}
            onclick={(event) => event.stopPropagation()}
            >{text ?? caption(key)}</button
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
    .key-pad {
        position: absolute;
        /* Above the orchestra, which owns the bottom 15% of the stage. */
        inset-block-end: calc(15% + var(--wordplay-spacing));
        inset-inline: 0;
        /* Above the stage HUD (`.overlay-layer`, z-index 10 in StageView), or
           a project that draws there would bury its own controls. */
        z-index: 11;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--wordplay-spacing);
        /* The gutters around the keys are still stage, and still draggable. */
        pointer-events: none;
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

    .key {
        pointer-events: auto;
        /* Comfortably above the 24px minimum target size, since these are
           meant for fingers rather than a cursor. */
        min-inline-size: 44px;
        min-block-size: 44px;
        padding: var(--wordplay-spacing);
        /* Opaque, since a creator's stage can be any color behind this. */
        background: var(--wordplay-background);
        color: var(--wordplay-foreground);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        font-family: var(--wordplay-app-font);
        font-size: var(--wordplay-font-size);
        cursor: pointer;
        /* The stage suppresses gestures; these are taps, not pans. */
        touch-action: none;
        user-select: none;
    }

    .key.wide {
        min-inline-size: 128px;
        flex-grow: 1;
    }

    .key:active {
        background: var(--wordplay-highlight-color);
    }

    .key:focus-visible {
        outline: var(--wordplay-focus-width) solid
            var(--wordplay-focus-color);
    }
</style>
