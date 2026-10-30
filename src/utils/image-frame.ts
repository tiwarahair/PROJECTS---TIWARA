// a <picture> has no box of its own (display: contents): the frame is the element around it
export const getImageFrame = (image: HTMLElement) => {
  const wrapper = image.parentElement;

  return wrapper instanceof HTMLPictureElement
    ? wrapper.parentElement
    : wrapper;
};
