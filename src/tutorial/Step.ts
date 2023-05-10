import type { TileID } from '../components/project/Layout';
import type Source from '../nodes/Source';
import type Check from './Check';

type Step = {
    /** The project to show */
    sources: Source[];
    /** Optional list of tile IDs to hide upon display */
    hidden?: TileID[];
    /** Test that must be true before the next step becomes available */
    checks: Check[];
};

export default Step;
