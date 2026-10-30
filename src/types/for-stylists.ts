export interface BenefitGroup {
  label: string;
  image: string;
  imagePosition: "top" | "middle";
  alt: string;
}

export interface Benefit {
  group: string;
  title: string;
  description: string;
}
