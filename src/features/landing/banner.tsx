import { Fragment } from "react";
import { BANNER_ITEMS } from "../../data/landing-content";

/**
 * The track is rendered twice because the `banner` keyframes translate by
 * -50%; one copy would jump at the loop point.
 */
export function Banner() {
  const loop = [...BANNER_ITEMS, ...BANNER_ITEMS];

  return (
    <div className="banner">
      <div className="banner-track">
        {loop.map((name, index) => (
          <Fragment key={`${name}-${index}`}>
            <span className="banner-item">{name}</span>
            <span className="banner-sep"> ✦ </span>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
