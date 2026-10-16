import type { DecoratedBooking } from "./decorate";

interface BlockBadgeProps {
  booking: DecoratedBooking;
  className?: string;
}

export const BlockBadge = ({ booking, className }: BlockBadgeProps) =>
  booking.badge ? <span className={className}>{booking.badge}</span> : null;
