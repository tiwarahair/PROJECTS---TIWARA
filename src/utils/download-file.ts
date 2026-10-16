/** Saves text as a file download. */
export const downloadFile = (name: string, text: string, type: string) => {
  try {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = document.createElement("a");

    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    // downloads unavailable
  }
};
