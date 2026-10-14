// The profile's service menu: groups, rows and the service details modal.
import type { Stylist } from "../../types/stylist";
import { formatMoney } from "../../utils/money";
import {
  formatServiceDuration,
  getCustomisationSummary,
  getFromWithFee,
  getMenu,
} from "../../utils/services";

const MENU_LIMIT = 6;

export interface ServiceModal {
  name: string;
  description: string;
  price: string;
  duration: string;
  href: string;
  customisation: string;
}

interface MenuItem {
  key: string;
  name: string;
  meta: string;
  price: string;
  href: string;
  modal: ServiceModal;
}

export interface MenuGroup {
  key: string;
  name: string;
  hasName: boolean;
  items: MenuItem[];
}

export const getBookHref = (stylistId: string): string =>
  `/book?stylist=${stylistId}`;

export const getMenuGroups = (stylist: Stylist): MenuGroup[] =>
  getMenu(stylist).map(({ id, name, items }) => ({
    key: id,
    name,
    hasName: !!name,
    items: items.map((service) => {
      const price = formatMoney(getFromWithFee(service));
      const duration = formatServiceDuration(service.minutes);
      const href = `${getBookHref(stylist.id)}&service=${encodeURIComponent(service.id)}`;

      return {
        key: service.id,
        name: service.name,
        meta: duration,
        price,
        href,
        modal: {
          name: service.name,
          description: service.description,
          price: `from ${price}`,
          duration,
          href,
          customisation: getCustomisationSummary(service),
        },
      };
    }),
  }));

export const countServices = (groups: MenuGroup[]): number =>
  groups.flatMap(({ items }) => items).length;

/** Only the first six services across all groups are listed; empty groups are dropped. */
export const limitMenuGroups = (groups: MenuGroup[]): MenuGroup[] =>
  groups
    .map((group, index) => ({
      ...group,
      items: group.items.slice(
        0,
        Math.max(0, MENU_LIMIT - countServices(groups.slice(0, index))),
      ),
    }))
    .filter(({ items }) => items.length);

export const hasMoreServices = (groups: MenuGroup[]): boolean =>
  countServices(groups) > MENU_LIMIT;
