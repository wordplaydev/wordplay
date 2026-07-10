<span class="insertion-point"></span>

<style>
    /* Zero layout footprint: a 0×0 inline-block anchored to the line's middle,
       with the visible bar drawn OUT OF FLOW via ::before. If the marker itself
       had height (it used to be an inline-block of min-line-height + vertical-align:
       middle), appearing at a drag target would enlarge that line's box, shifting
       every line below — and since the drop target is resolved by geometry
       (elementFromPoint / getBoundingClientRect), that shift moved the target under
       the pointer, flipping it every frame (a per-pixel oscillation onto blank
       lines). A 0-height box can't change the line box, so the target stays put. */
    .insertion-point {
        display: inline-block;
        vertical-align: middle;
        width: 0;
        height: 0;
        position: relative;
        /* Never intercept hit-testing: the drop-target resolver uses
           document.elementFromPoint, and hitting the marker itself would feed the
           insertion oscillation. */
        pointer-events: none;
    }
    .insertion-point::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        height: var(--wordplay-min-line-height);
        width: 0;
        outline: 3px solid var(--wordplay-highlight-color);
    }
</style>
