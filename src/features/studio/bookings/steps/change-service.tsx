import { joinClassNames } from "../../../../utils/class-names";
import type { StudioController } from "../../core/use-studio";
import type { EditServiceView } from "../edit-view";
import { NoMatches } from "./no-matches";
import { OptionGroup } from "./option-group";
import { getPaneClass } from "./pane";
import { SearchField } from "./search-field";
import shared from "../../../../styles/features/studio/bookings/steps/index.module.css";

interface ChangeServiceStepProps {
  studio: StudioController;
  edit: EditServiceView;
}

export const ChangeServiceStep = ({ studio, edit }: ChangeServiceStepProps) => (
  <div className={getPaneClass(studio)}>
    <SearchField
      value={edit.serviceQuery}
      onChange={edit.onServiceQuery}
      placeholder="Search services"
    />
    {edit.serviceGroups.map(({ key, category, count, items }) => (
      <OptionGroup key={key} category={category} count={count}>
        {items.map((item) => (
          <button
            key={item.key}
            className={joinClassNames(
              shared.option,
              item.isOn && shared.optionOn,
            )}
            onClick={item.pick}
          >
            <span className={shared.grow}>
              <span className={shared.optionName}>{item.name}</span>
              <span className={shared.optionSub}>{item.duration}</span>
            </span>
            <span className={shared.optionPrice}>{item.price}</span>
          </button>
        ))}
      </OptionGroup>
    ))}
    {edit.serviceGroups.length === 0 && <NoMatches title="No services match" />}
  </div>
);
