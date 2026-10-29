import { describe, expect, it, vi } from "vitest";
import type { AccountSecurity } from "../../../lib/account-security";
import type { AccountSettingsBackend } from "../backend";
import { getInitialSettingsState } from "../logic";
import { getSessionsActions, toSettingsSession } from "../sessions-actions";

const toRow = (id: string, isCurrent: boolean) => ({
  id,
  device: `Device ${id}`,
  kind: "laptop" as const,
  signed_in_at: "2026-10-12T09:00:00Z",
  active_at: "2026-10-20T09:00:00Z",
  is_current: isCurrent,
});

const rows = [toRow("a", true), toRow("b", false)];

describe("the sessions list", () => {
  it("doesn't bring back a session signed out while the list was reloading", async () => {
    let state = {
      ...getInitialSettingsState({ first: "", last: "", email: "", phone: "" }),
      sessions: rows.map((row) => toSettingsSession(row)),
    };

    let finishReload: (security: AccountSecurity) => void = () => undefined;

    const backend = {
      getSecurity: () =>
        new Promise<AccountSecurity>((resolve) => {
          finishReload = resolve;
        }),
      signOutSession: () => Promise.resolve(),
    } as unknown as AccountSettingsBackend;

    const actions = getSessionsActions({
      backend,
      setState: (patch) => {
        state = { ...state, ...patch(state) };
      },
      toast: vi.fn(),
      latestLoad: { current: 0 },
    });

    const reloading = actions.load();

    await actions.signOut(state.sessions[1]!);
    finishReload({ login_alerts: true, sessions: rows });
    await reloading;

    expect(state.sessions.map(({ id }) => id)).toEqual(["a"]);
  });

  it("doesn't show an error over a list a newer load got", async () => {
    let state = getInitialSettingsState({
      first: "",
      last: "",
      email: "",
      phone: "",
    });

    const loads: {
      resolve: (security: AccountSecurity) => void;
      reject: () => void;
    }[] = [];

    const backend = {
      getSecurity: () =>
        new Promise<AccountSecurity>((resolve, reject) => {
          loads.push({ resolve, reject });
        }),
    } as unknown as AccountSettingsBackend;

    const actions = getSessionsActions({
      backend,
      setState: (patch) => {
        state = { ...state, ...patch(state) };
      },
      toast: vi.fn(),
      latestLoad: { current: 0 },
    });

    const older = actions.load();
    const newer = actions.load();

    loads[1]?.resolve({ login_alerts: true, sessions: rows });
    await newer;
    loads[0]?.reject();
    await older;

    expect(state.sessionsFailed).toBe(false);
    expect(state.sessions).toHaveLength(2);
  });
});
