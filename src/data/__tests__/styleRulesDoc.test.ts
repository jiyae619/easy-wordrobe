import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { renderStyleRulesDoc } from "../styleRulesDoc";

const DOC = resolve(__dirname, "../../../docs/STYLE_RULES.md");

describe("docs/STYLE_RULES.md", () => {
    it("matches the rule tables and scoring code", () => {
        const expected = renderStyleRulesDoc();
        // `npm run docs:style-rules` sets this to rewrite the doc instead of checking it.
        if (process.env.UPDATE_STYLE_RULES_DOC === "1") writeFileSync(DOC, expected);
        const actual = existsSync(DOC) ? readFileSync(DOC, "utf8") : "";
        expect(actual === expected, "docs/STYLE_RULES.md is out of date. Run `npm run docs:style-rules` and commit the result.").toBe(true);
    });
});
