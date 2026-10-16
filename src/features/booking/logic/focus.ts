const ADDRESS_TARGET =
  '[data-af-root="bk-addr"] [aria-invalid="true"], [data-af-root="bk-addr"] input, [data-af-root="bk-addr"] button[aria-label="Edit address"]';

export const focusLater = (target: string | null) => {
  if (!target) return;

  window.setTimeout(() => {
    const element =
      target === "@address"
        ? document.querySelector<HTMLElement>(ADDRESS_TARGET)
        : document.getElementById(target);

    element?.focus();
  }, 60);
};
