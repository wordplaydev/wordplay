import Alias from "../nodes/Alias";
import NameType from "../nodes/NameType";
import StructureDefinition from "../nodes/StructureDefinition";
import TypeInput from "../nodes/TypeInput";

export const Layout = new StructureDefinition(
    [],
    [ new Alias("Layout", "eng") ],
    [],
    [],
    []
);
export default Layout;

export const Vertical = new StructureDefinition(
    [],
    [ new Alias("Vertical", "eng") ],
    [ new TypeInput(new NameType("Layout")) ],
    [],
    []
)