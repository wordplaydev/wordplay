import Alias from "../nodes/Alias";
import Block from "../nodes/Block";
import Language from "../nodes/Language";
import StructureDefinition from "../nodes/StructureDefinition";

const Layout = new StructureDefinition(
    [], // TODO Localized documentation
    [ new Alias("Layout", new Language("eng")) ],
    [],
    [],
    new Block([], [], true)
);

export const Vertical = new StructureDefinition(
    [], // TODO Localized documentation
    [ new Alias("Vertical", new Language("eng")) ],
    [],
    [],
    new Block([], [], true)
)

export default Layout;