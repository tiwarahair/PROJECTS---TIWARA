import type { ReactNode } from "react";
import styles from "../../styles/features/studio/settings-page-parts.module.css";

interface FieldProps {
  label: ReactNode;
  children: ReactNode;
}

export const Field = ({ label, children }: FieldProps) => (
  <label className={styles.field}>
    <span className={styles.fieldLabel}>{label}</span>
    {children}
  </label>
);
