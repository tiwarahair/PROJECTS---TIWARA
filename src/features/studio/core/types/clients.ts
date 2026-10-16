interface ClientNotes {
  type?: string;
  size?: string;
  length?: string;
  products?: string;
}

export interface StudioClient {
  id: string | null;
  name: string;
  first?: string;
  area?: string;
  img?: string;
  visits?: number;
  last?: string;
  spent?: number;
  fav?: string;
  phone?: string;
  email?: string;
  address?: string;
  since?: string;
  sensitivities?: string;
  notes?: ClientNotes | null;
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
  sensitivities: string;
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
