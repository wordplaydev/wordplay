<script lang="ts">
    import { animationFactor } from '@db/Database';
    import { musicActivity } from '@output/Music/activity';
    import {
        easeTint,
        targetTint,
        tintToCSS,
        type Tint,
    } from '@output/Music/lightshow';
    import { onDestroy } from 'svelte';

    interface Props {
        /** The reconciliation names of the music on this stage. */
        names: string[];
    }

    let { names }: Props = $props();

    let tint = $state<Tint>({ hue: 0, strength: 0 });

    let sounding = $derived(
        names.flatMap((name) => $musicActivity.get(name) ?? []),
    );

    // Ease toward what's sounding on the frame clock. The easing itself is
    // what caps the rate — see lightshow.ts — so this can run at any frame
    // rate without the tint ever flashing.
    let frame: number | undefined = undefined;
    let last: number | undefined = undefined;

    $effect(() => {
        // Reduced motion damps animation everywhere else; here the tint is
        // already slower than the flash threshold, so it keeps changing but
        // takes its cue from the setting for how far it goes.
        const factor = $animationFactor;
        const step = (now: number) => {
            const elapsed = last === undefined ? 0 : (now - last) / 1000;
            last = now;
            const target = targetTint(sounding);
            tint = easeTint(
                tint,
                factor === 0
                    ? { ...target, strength: target.strength * 0.5 }
                    : target,
                elapsed,
            );
            frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
        return () => {
            if (frame !== undefined) cancelAnimationFrame(frame);
            frame = undefined;
            last = undefined;
        };
    });

    onDestroy(() => {
        if (frame !== undefined) cancelAnimationFrame(frame);
    });
</script>

<!-- Decorative: the orchestra rendering and the music's description carry the
     content for screen readers, so this is hidden from them. -->
<div
    class="lightshow"
    aria-hidden="true"
    style:background={tintToCSS(tint)}
></div>

<style>
    .lightshow {
        position: absolute;
        inset: 0;
        pointer-events: none;
        /* Sits over the stage's own background but under its output, so a
           creator's background stays the base rather than being replaced. */
        z-index: 0;
        transition: background 100ms linear;
    }
</style>
