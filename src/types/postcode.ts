export interface PostcodeDistrict {
  lat: number;
  lng: number;
  town: string;
  street: string;
}

export type Postcodes = Record<string, PostcodeDistrict>;
