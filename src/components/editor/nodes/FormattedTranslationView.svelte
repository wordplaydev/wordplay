<script lang="ts">
    import type FormattedTranslation from '../../../nodes/FormattedTranslation';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: FormattedTranslation;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'open']} {format} /><NodeView
    node={[node, 'markup']}
    {format}
/><NodeView node={[node, 'close']} {format} /><NodeView
    node={[node, 'language']}
    empty="menu"
    {format}
/><NodeView node={[node, 'separator']} {format} />
