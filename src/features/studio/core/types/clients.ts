interface ClientNotes {
  type?: string;
  size?: string;
  length?: string;
  products?: string;
}

export interface ClientMoney {
  deposits: number;
  fees: number;
  refunds: number;
}

export interface StudioClient {
  id: string | null;
  name: string;
  first?: string;
  area?: string;
  img?: string;
  photoPath?: string;
  visits?: number;
  last?: string;
  lastAt?: string;
  spent?: number;
  fav?: string;
  phone?: string;
  email?: string;
  address?: string;
  since?: string;
  sensitivities?: string;
  sensitivitiesNote?: string;
  notes?: ClientNotes | null;
  money?: ClientMoney;
  noShows?: number;
  lateCancels?: number;
  blocked?: boolean;
  deleted?: boolean;
  walkIn?: boolean;
}

export interface ClientEditDraft {
  id: string | null;
  first: string;
  last: string;
  phone: string;
  email: string;
  type: string;
  size: string;
  length: string;
  products: string;
  img?: string;
}

export interface NewClientDraft {
  first: string;
  last: string;
  email: string;
  phone: string;
}

export interface AddNewClient {
  name: string;
  contact: string;
  email: string;
  address: string;
}
