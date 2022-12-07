import type StructureDefinition from "../nodes/StructureDefinition";
import { TRANSLATE } from "../nodes/Translations";
import { parseStructure, toTokens } from "../parser/Parser";

export const Layout = parseStructure(toTokens(`•Layout/eng,${TRANSLATE}Layout/😀()`)) as StructureDefinition;
export default Layout;

export const Vertical = parseStructure(toTokens(`•Vertical/eng,⬇/😀 •Layout()`)) as StructureDefinition;