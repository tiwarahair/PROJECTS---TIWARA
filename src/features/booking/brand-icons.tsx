// Google and Apple marks used by the wallet buttons and the "Save your details" row, verbatim from the prototype.

interface BrandIconProps {
  size: number;
}

export const GoogleIcon = ({ size }: BrandIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.44a5.5 5.5 0 0 1-2.39 3.61v3h3.86c2.26-2.08 3.59-5.15 3.59-8.79z"
    ></path>
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.86-3a7.2 7.2 0 0 1-4.09 1.17 7.5 7.5 0 0 1-7.05-5.2H1.05v3.1A12 12 0 0 0 12 24z"
    ></path>
    <path
      fill="#FBBC05"
      d="M4.95 14.06a7.4 7.4 0 0 1 0-4.12v-3.1H1.05a12 12 0 0 0 0 10.32l3.9-3.1z"
    ></path>
    <path
      fill="#EA4335"
      d="M12 4.73a6.5 6.5 0 0 1 4.6 1.8l3.42-3.42A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.05 6.84l3.9 3.1A7.5 7.5 0 0 1 12 4.73z"
    ></path>
  </svg>
);

export const AppleIcon = ({ size }: BrandIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M17.05 12.54c.02-2.2 1.79-3.26 1.87-3.31-1.02-1.5-2.61-1.7-3.17-1.73-1.35-.11-2.63.79-3.31.79-.7 0-1.75-.77-2.88-.75-1.48.02-2.85.86-3.61 2.19-1.54 2.68-.39 6.64 1.11 8.81.74 1.06 1.62 2.25 2.78 2.21 1.11-.04 1.54-.72 2.89-.72 1.34 0 1.73.72 2.9.7 1.2-.02 1.96-1.09 2.69-2.16.85-1.23 1.2-2.42 1.22-2.48-.03-.01-2.34-.9-2.36-3.56zM14.93 5.9c.6-.73 1-1.74.89-2.75-.89.04-1.97.59-2.6 1.32-.56.64-1.05 1.68-.92 2.67.99.08 1.99-.5 2.63-1.24z"></path>
  </svg>
);
