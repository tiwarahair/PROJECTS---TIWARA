import { useState } from "react";
import { Check, Search, X } from "lucide-react";
import { Button } from "../../../../components/ds/button";
import { Sheet } from "../../../../components/sheet";
import { joinClassNames } from "../../../../utils/class-names";
import type { StudioController } from "../../core/use-studio";
import { openServicesTab } from "../../shell/setup";
import { ALL_CATEGORIES, getAttachView } from "./attach-view";
import { attachPhoto } from "./photos";
import search from "../../../../styles/features/studio/services/wizard/dialogs/suggestions.module.css";
import styles from "../../../../styles/features/studio/settings/profile/attach-service.module.css";

interface AttachServiceProps {
  studio: StudioController;
  photoId: string | null;
  onClose: () => void;
}

export const AttachService = ({
  studio,
  photoId,
  onClose,
}: AttachServiceProps) => {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState(ALL_CATEGORIES);

  const view = getAttachView(studio.state, photoId ?? "", query, categoryId);

  const close = () => {
    setQuery("");
    setCategoryId(ALL_CATEGORIES);
    onClose();
  };

  const attachTo = (serviceId: string | null, message: string) => {
    if (photoId) attachPhoto(studio.context, photoId, serviceId);

    studio.actions.showToast(message);
    close();
  };

  return (
    <Sheet
      open={!!photoId}
      onClose={close}
      title="Attach to a service"
      subtitle="Clients see it when they open the service and on their booking."
      footer={
        <div className={styles.footer}>
          {view.isAttached && (
            <Button
              variant="outline"
              onClick={() => attachTo(null, "Photo taken off its service")}
            >
              Remove from service
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => {
              close();
              openServicesTab(studio);
            }}
          >
            Go to services
          </Button>
        </div>
      }
    >
      {view.hasServices ? (
        <div className={styles.body}>
          <div className={search.searchWrap}>
            <Search
              className={search.searchIcon}
              size={16}
              strokeWidth={1.8}
              color="var(--text-secondary)"
            />
            <input
              className={joinClassNames(
                search.search,
                !!query && search.searchActive,
              )}
              value={query}
              aria-label="Search your services"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your services"
            />
            {!!query && (
              <button
                type="button"
                className={search.clear}
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                <X size={14} strokeWidth={2.2} />
              </button>
            )}
          </div>
          <div className={search.chips}>
            {view.categoryChips.map(({ key, label, isOn }) => (
              <button
                key={key}
                type="button"
                className={joinClassNames(search.chip, isOn && search.chipOn)}
                aria-pressed={isOn}
                onClick={() => setCategoryId(key)}
              >
                {label}
              </button>
            ))}
          </div>
          {view.items.map(
            ({ key, name, category, isDraft, count, isCurrent, isFull }) => (
              <button
                key={key}
                type="button"
                className={search.item}
                disabled={isFull || isCurrent}
                onClick={() => attachTo(key, `Photo added to ${name}`)}
              >
                <span className={styles.itemText}>
                  <span className={search.itemName}>{name}</span>
                  <span className={styles.itemMeta}>
                    {[category, isDraft ? "Draft" : "", `${count} photos`]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                {isCurrent && (
                  <Check
                    className={styles.current}
                    size={17}
                    strokeWidth={2.2}
                    aria-label="On this service"
                  />
                )}
              </button>
            ),
          )}
          {view.hasNoResults && (
            <p className={search.noResultsText}>
              No services match. Try another search or category.
            </p>
          )}
        </div>
      ) : (
        <p className={styles.empty}>
          You haven’t added any services yet. Add one, then attach your photos
          to it.
        </p>
      )}
    </Sheet>
  );
};
