import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";

interface HomeSectionLinkProps {
  hash: string;
  className?: string;
  children: ReactNode;
}

export const HomeSectionLink = ({
  hash,
  className,
  children,
}: HomeSectionLinkProps) => {
  const { pathname } = useLocation();

  if (pathname === "/")
    return (
      <a href={hash} className={className}>
        {children}
      </a>
    );

  return (
    <Link to={`/${hash}`} className={className}>
      {children}
    </Link>
  );
};
