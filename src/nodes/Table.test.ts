import { ExpectedColumnType, IncompatibleCellType, MissingCells, testConflict } from "../parser/Conflict";
import Table from "./Table";

test("Test table conflicts", () => {

    testConflict('|a•#|b•#', '|a•#|b', Table, ExpectedColumnType);
    testConflict('|a•#|b•#\n|1|2', '|a•#|b•#\n|1', Table, MissingCells);
    testConflict('|a•#|b•#\n|1|2', '|a•#|b•#\n|"hi"|"there"', Table, IncompatibleCellType);
    
});