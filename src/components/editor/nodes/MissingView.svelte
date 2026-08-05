<!-- Marks a spot where code is expected but absent, whether the parser left an empty unparsable node
     there or the field is simply undefined. Drawn as an underline rather than a box, matching how
     conflicts read in blocks mode (NodeView's .blockmajor) and how an empty typeable slot reads
     (EmptyView's .blockText) — a box outlines *outside* its own width, so it overlapped the tokens on
     either side of the gap. -->
<span class="missing">&nbsp;</span>

<style>
    .missing {
        /* Only width, no mark of its own: the conflict about the missing code draws the underline, the
           same way every other conflict is drawn, so one problem gets one mark. Without a width the
           node's box would be zero-wide and the underline's path would paint nothing. */
        display: inline-block;
        width: 1ch;
    }
</style>
