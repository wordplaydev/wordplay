import { test, expect } from "vitest";
import parseRichText from "./parseRichText";

test("Test rich text parsing", () => {

    expect(parseRichText("hello").toString()).toBe("hello");
    expect(parseRichText("hello").toHTML()).toBe("hello");

    expect(parseRichText("hello _world_").toString()).toBe("hello _world_");
    expect(parseRichText("hello _world_").toHTML()).toBe("hello <u>world</u>");

    expect(parseRichText("hello /world/").toString()).toBe("hello /world/");
    expect(parseRichText("hello /world/").toHTML()).toBe("hello <em>world</em>");

    expect(parseRichText("hello *world*").toString()).toBe("hello *world*");
    expect(parseRichText("hello *world*").toHTML()).toBe("hello <span class='light'>world</span>");

    expect(parseRichText("hello **world**").toString()).toBe("hello **world**");
    expect(parseRichText("hello **world**").toHTML()).toBe("hello <strong>world</strong>");

    expect(parseRichText("hello ***world***").toString()).toBe("hello ***world***");
    expect(parseRichText("hello ***world***").toHTML()).toBe("hello <span class='extra'>world</span>");

    expect(parseRichText("hello /**wor**ld/!").toString()).toBe("hello /**wor**ld/!");
    expect(parseRichText("hello /**wor**ld/!").toHTML()).toBe("hello <em><strong>wor</strong>ld</em>!");

})