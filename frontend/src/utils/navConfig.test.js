import { describe, expect, it } from "vitest";
import { NAV_BY_TIPO } from "./navConfig";

describe("navConfig", () => {
  it("tem menu para os três tipos de usuário, todos com Home", () => {
    for (const tipo of ["admin", "vistoriador", "cliente"]) {
      expect(NAV_BY_TIPO[tipo].map((l) => l.to)).toContain("/home");
    }
  });
});
