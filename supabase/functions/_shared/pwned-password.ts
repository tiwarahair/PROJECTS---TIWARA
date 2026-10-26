// Have I Been Pwned's range check: only the first 5 characters of the password's SHA-1 hash are sent.
const toHex = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

export const isPwnedPassword = async (password: string) => {
  try {
    const hash = toHex(
      await crypto.subtle.digest("SHA-1", new TextEncoder().encode(password)),
    );

    const response = await fetch(
      `https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`,
      { headers: { "Add-Padding": "true" }, signal: AbortSignal.timeout(3000) },
    );

    if (!response.ok) return false;

    const suffix = hash.slice(5);

    // padding lines have a count of 0
    return (await response.text()).split("\n").some((line) => {
      const [candidate, count] = line.trim().split(":");

      return candidate === suffix && Number(count) > 0;
    });
  } catch {
    return false;
  }
};
