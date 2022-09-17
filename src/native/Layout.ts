import Alias from "../nodes/Alias";
import Block from "../nodes/Block";
import Language from "../nodes/Language";
import NameType from "../nodes/NameType";
import StructureDefinition from "../nodes/StructureDefinition";
import TypeInput from "../nodes/TypeInput";

export const Layout = new StructureDefinition(
    [], // TODO Localized documentation
    [ new Alias("Layout", new Language("eng")) ],
    [],
    [],
    [],
    new Block([], [], true)
);
export default Layout;

export const Vertical = new StructureDefinition(
    [], // TODO Localized documentation
    [ new Alias("Vertical", new Language("eng")) ],
    [ new TypeInput(new NameType("Layout")) ],
    [],
    [],
    new Block([], [], true)
)