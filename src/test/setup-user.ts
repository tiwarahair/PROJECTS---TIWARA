import { userEvent } from "@testing-library/user-event";

/**
 * user-event instance for a test. `delay: null` skips the setTimeout user-event waits between
 * actions, so it works under vi.useFakeTimers without advancing timers and keeps tests fast.
 */
export const setupUser = () => userEvent.setup({ delay: null });
