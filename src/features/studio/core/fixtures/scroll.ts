/** Scrolls the first visible match to the top of its scroller once it renders. */
export const scrollToSelector = (selector: string) => {
  let tries = 0;

  const tryScroll = () => {
    const element = [...document.querySelectorAll<HTMLElement>(selector)].find(
      (item) => item.offsetParent,
    );

    if (!element) {
      if (++tries < 20) window.setTimeout(tryScroll, 150);

      return;
    }

    let parent = element.parentElement;

    while (parent && parent !== document.body) {
      const style = getComputedStyle(parent);

      if (
        /(auto|scroll)/.test(style.overflowY) &&
        parent.scrollHeight > parent.clientHeight
      ) {
        parent.scrollTop +=
          element.getBoundingClientRect().top -
          parent.getBoundingClientRect().top -
          16;

        break;
      }

      parent = parent.parentElement;
    }
  };

  window.setTimeout(tryScroll, 400);
};
