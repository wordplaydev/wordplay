import {
    DOCUMENTATION_SYMBOL,
    PALETTE_SYMBOL,
    SOURCE_SYMBOL,
    STAGE_SYMBOL,
} from '@parser/Symbols';
import type { TileKind } from './Tile';

const TileSymbols: { [ID in TileKind]: string } = {
    output: STAGE_SYMBOL,
    palette: PALETTE_SYMBOL,
    docs: DOCUMENTATION_SYMBOL,
    source: SOURCE_SYMBOL,
};

export default TileSymbols;
