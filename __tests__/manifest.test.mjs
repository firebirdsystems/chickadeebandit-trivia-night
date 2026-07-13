import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { describe, it, expect } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(join(__dirname, "../manifest.json"), "utf-8"));

describe("manifest.json", () => {
  it("has required string fields", () => {
    for (const field of ["id", "name", "version", "description", "entrypoint", "runtime", "icon"]) {
      expect(manifest[field], `missing field: ${field}`).toBeTruthy();
    }
  });
  it("entrypoint/runtime/storage are standard", () => {
    expect(manifest.entrypoint).toBe("index.html");
    expect(manifest.runtime).toBe("static");
    expect(manifest.storage).toBe("db");
  });
  it("version follows semver", () => expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/));
  it("has a nav label", () => expect(manifest.nav?.label).toBeTruthy());

  it("rounds: everyone sees, ONLY the host writes (write_owner_only)", () => {
    const p = manifest.row_policies?.rounds;
    expect(p?.kind).toBe("owner_or_visibility");
    expect(p?.write_owner_only).toBe(true);
  });

  it("questions: host-only INSERT, correct_answer masked to the host", () => {
    const p = manifest.row_policies?.questions;
    expect(p?.kind).toBe("inherit_visibility");
    expect(p?.insert_only_by_parent_column_member).toBe("created_by");
    expect(p?.column_read_acls?.correct_answer?.visible_to).toEqual(["owner"]);
  });

  it("guesses: sealed until close, one per member per question, frozen after", () => {
    const p = manifest.row_policies?.guesses;
    expect(p?.kind).toBe("sealed_until");
    expect(p?.visible_parent_status_values).toEqual(["closed"]);
    expect(p?.max_per_member?.scope_columns).toEqual(["question_id"]);
    expect(p?.max_per_member?.limit).toBe(1);
    expect(p?.frozen_when?.locked_values).toContain("closed");
  });

  it("gradings: host-only INSERT via the parent-column gate", () => {
    const p = manifest.row_policies?.gradings;
    expect(p?.kind).toBe("inherit_visibility");
    expect(p?.insert_only_by_parent_column_member).toBe("created_by");
  });

  it("has no ai_access (game content, no AI surface)", () => {
    expect(manifest.ai_access).toBeUndefined();
  });
});
