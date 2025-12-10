<script lang="ts">
    interface Props {
        xcoord: number;
        ycoord: number;
        title: string;
        preview: string;
    }

    let { xcoord = 0, ycoord = 0, title = "", preview = "" }: Props = $props();

</script>

<div class="howto" style="--xcoord: {xcoord}px; --ycoord: {ycoord}px;">
    <p>{title}</p>
    <div class="howtopreview">{preview}</div>
</div>


<style>
    .howto {
        overflow: hidden;
        position: absolute;
        left: var(--xcoord);
        top: var(--ycoord);
        min-width: 100px;
        max-width: 100px;
    }

    .howtopreview {
        min-width: 100px;
        min-height: 100px;
        max-width: 100px;
        max-height: 100px;
        border: 1px solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        padding: var(--wordplay-spacing);
    }
</style>
