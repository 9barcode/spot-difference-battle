import { describe, expect, it } from "vitest";
import { operationalLogFields } from "../../src/observability/operational-logging.js";

describe("operationalLogFields", () => {
  it("creates searchable structured fields", () => {
    const error = Object.assign(new Error("database unavailable"), { code: "ECONNREFUSED" });
    expect(
      operationalLogFields(
        "database.match_save_failed",
        { matchId: "match-1", playerId: "player-1", action: "game:guess" },
        error,
      ),
    ).toEqual({
      event: "database.match_save_failed",
      matchId: "match-1",
      playerId: "player-1",
      action: "game:guess",
      errorType: "Error",
      errorCode: "ECONNREFUSED",
    });
  });

  it("omits undefined context", () => {
    expect(operationalLogFields("match.reconnect_timeout")).toEqual({
      event: "match.reconnect_timeout",
    });
  });

  it("does not copy error messages or arbitrary sensitive payloads", () => {
    const error = Object.assign(new Error("guestToken=secret renderedImage=large-data"), {
      guestToken: "secret",
      renderedImage: "large-data",
    });
    const serialized = JSON.stringify(
      operationalLogFields("game.action_failed", { playerId: "player-1" }, error),
    );
    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("large-data");
    expect(serialized).not.toContain("guestToken");
    expect(serialized).not.toContain("renderedImage");
  });
});
