import Skeleton from "react-loading-skeleton";
import { useAccountPhoto } from "../../hooks/use-account-photo";
import styles from "../../styles/components/account-photo/index.module.css";

interface AccountPhotoProps {
  initials: string;
}

export const AccountPhoto = ({ initials }: AccountPhotoProps) => {
  const { photo, isLoading } = useAccountPhoto();

  if (isLoading)
    return (
      <Skeleton
        circle
        inline
        height="100%"
        containerClassName={styles.skeleton}
      />
    );

  if (photo) return <img className={styles.image} src={photo} alt="" />;

  return initials;
};
