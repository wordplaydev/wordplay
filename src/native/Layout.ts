import { TRANSLATE } from "../nodes/Translations";
import { parseStructure, tokens } from "../parser/Parser";

export const Layout = parseStructure(tokens(`•Layout/eng,${TRANSLATE}Layout/😀()`))
export default Layout;

export const Vertical = parseStructure(tokens(`•Vertical/eng,⬇/😀 ∘Layout()`));