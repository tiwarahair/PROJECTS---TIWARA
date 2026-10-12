/** Demo spec per service type: [minutes, £ over the stylist's "from" price, description]. */
type ServiceSpecEntry = [number, number, string];

export type ServiceSpecs = Record<string, ServiceSpecEntry>;

export interface ServiceSpec {
  minutes: number;
  addedPrice: number;
  description: string;
}
