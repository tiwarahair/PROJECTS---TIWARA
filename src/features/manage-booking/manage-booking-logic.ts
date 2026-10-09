// Demo booking shown on the booking-link page (prototype Manage Booking.dc.html renderVals).
import { stylists } from "../../data";
import type { Stylist } from "../../types/stylist";
import { getActiveServices, getServiceOptions } from "../../utils/services";

export interface SharedEntry {
  id: string;
  text: string;
}

export const DEFAULT_STYLIST_ID = "amara-beauty";

/** The stylist for an entry, or a placeholder name like the prototype. */
export const getEntryStylist = (
  id: string,
): Pick<Stylist, "name" | "area"> & Partial<Stylist> =>
  stylists.find((stylist) => stylist.id === id) ?? {
    name: "your stylist",
    area: "",
  };

export interface DemoBooking {
  service: string;
  total: string;
  options: string;
  when: string;
  stylist: string;
  area: string;
}

/** Knotless braids (else the first active service), Shoulder length, next Wednesday at 10:30. */
export const getDemoBooking = (stylistId: string): DemoBooking => {
  const stylist = getEntryStylist(stylistId);
  const active = stylist.services ? getActiveServices(stylist as Stylist) : [];
  const service =
    active.find(({ serviceTypeId }) => serviceTypeId === "knotless-braids") ??
    active[0] ??
    null;
  const options = getServiceOptions(service);
  const price = service
    ? service.price +
      (options.length.find(({ label }) => label === "Shoulder")?.priceDelta ||
        0)
    : 0;
  const date = new Date();
  date.setDate(date.getDate() + ((10 - date.getDay()) % 7 || 7));
  return {
    service: service ? service.name : "Knotless braids",
    // the prototype adds the booking fee inline (50p + 1.5%), unrounded until toFixed
    total: service ? "£" + (price + 0.5 + price * 0.015).toFixed(2) : "£142.60",
    options:
      service && options.size.length
        ? "Medium · Shoulder · 1B Natural Black"
        : "",
    when:
      date.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }) + " · 10:30",
    stylist: stylist.name,
    area: stylist.area,
  };
};
