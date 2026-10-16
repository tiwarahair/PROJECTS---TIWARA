/** Cloudflare Turnstile's server check; each token passes once. */
export const isHuman = async (token: string, ip: string) => {
  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: new URLSearchParams({
        secret: Deno.env.get("TURNSTILE_SECRET_KEY") ?? "",
        response: token,
        remoteip: ip,
      }),
    },
  );

  const { success } = (await response.json()) as { success: boolean };

  return success;
};
