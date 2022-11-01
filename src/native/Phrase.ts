import Bind from "../nodes/Bind";
import Dimension from "../nodes/Dimension";
import MeasurementLiteral from "../nodes/MeasurementLiteral";
import MeasurementType from "../nodes/MeasurementType";
import NameType from "../nodes/NameType";
import NoneLiteral from "../nodes/NoneLiteral";
import NoneType from "../nodes/NoneType";
import StructureDefinition from "../nodes/StructureDefinition";
import TextLiteral from "../nodes/TextLiteral";
import TextType from "../nodes/TextType";
import Token from "../nodes/Token";
import TokenType from "../nodes/TokenType";
import { WRITE_DOCS } from "../nodes/Translations";
import UnionType from "../nodes/UnionType";
import Unit from "../nodes/Unit";

const Phrase = new StructureDefinition(
    WRITE_DOCS,
    {
        eng: "Phrase",
        "😀": "💬"
    },
    [],
    [],
    [
        new Bind(
            WRITE_DOCS, 
            {
                eng: "text",
                "😀": "✍︎"
            },
            new TextType()
        ),
        new Bind(
            WRITE_DOCS,
            {
                eng: "size",
                "😀": "⇕"
            },
            new MeasurementType(undefined, new Unit(undefined, [ new Dimension("pt") ])),
            new MeasurementLiteral(12, new Unit(undefined, [ new Dimension("pt")]))
        ),
        new Bind(
            WRITE_DOCS,
            {
                eng: "font",
                "😀": "👚"
            },
            new TextType(),
            new TextLiteral(new Token("'Noto Sans'", TokenType.TEXT))
        ),
        new Bind(
            WRITE_DOCS,
            {
                eng: "in",
                "😀": "🎬"
            },
            new UnionType(new NameType("Transition"), new NoneType()),
            new NoneLiteral()
        ),
        new Bind(
            WRITE_DOCS,
            {
                eng: "animate",
                "😀": "🔂"
            },
            new UnionType(new NameType("Animation"), new NoneType()),
            new NoneLiteral()
        )
    ]
);

export default Phrase;