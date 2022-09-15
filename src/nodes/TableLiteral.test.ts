import { testConflict } from "../conflicts/TestUtilities";
import { MissingCells } from "../conflicts/MissingCells";
import { ExpectedColumnType } from "../conflicts/ExpectedColumnType";
import { IncompatibleCellType } from "../conflicts/IncompatibleCellType";
import TableLiteral from "./TableLiteral";

test("Test table conflicts", () => {

    testConflict('|a•#|b•#||', '|a•#|b||', TableLiteral, ExpectedColumnType);
    testConflict('|a•#|b•#||\n|1|2', '|a•#|b•#||\n|1', TableLiteral, MissingCells);
    testConflict('|a•#|b•#||\n|1|2', '|a•#|b•#||\n|"hi"|"there"', TableLiteral, IncompatibleCellType);
    
});