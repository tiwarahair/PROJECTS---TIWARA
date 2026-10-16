interface SelectOption {
  key: number;
  value: string;
  label: string;
}

interface SelectOptionsProps {
  options: SelectOption[];
}

export const SelectOptions = ({ options }: SelectOptionsProps) =>
  options.map(({ key, value, label }) => (
    <option key={key} value={value}>
      {label}
    </option>
  ));
