/** Text made safe to put inside HTML. */
export const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);
