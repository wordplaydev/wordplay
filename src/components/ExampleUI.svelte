<script lang="ts">
    import RootView from '../editor/RootView.svelte';
    import Project from '../models/Project';
    import type Example from '../nodes/Example';
    import Source from '../nodes/Source';

    export let example: Example;

    // $: project = new Project("example", new Source("example", [ example.program, $project ]
</script>

<RootView node={example.program} />
