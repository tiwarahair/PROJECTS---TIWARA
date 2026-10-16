import { useState } from "react";
import { useParams } from "react-router";
import {
  Calendar,
  ChevronRight,
  Link as LinkIcon,
  Navigation,
  Search,
} from "lucide-react";
import { Avatar } from "../../components/ds/avatar";
import { Badge } from "../../components/ds/badge";
import { Button } from "../../components/ds/button";
import { Card } from "../../components/ds/card";
import { Checkbox } from "../../components/ds/checkbox";
import { IconButton } from "../../components/ds/icon-button";
import { IconChip } from "../../components/ds/icon-chip";
import { Input } from "../../components/ds/input";
import { Radio } from "../../components/ds/radio";
import { ScrollRevealCard } from "../../components/ds/scroll-reveal-card";
import { Select } from "../../components/ds/select";
import { Switch } from "../../components/ds/switch";
import { Tabs } from "../../components/ds/tabs";
import { Tag } from "../../components/ds/tag";
import { Toast } from "../../components/ds/toast";
import { joinClassNames } from "../../utils/class-names";
import styles from "../../styles/features/ds-specimens/ds-specimens.module.css";

const ActionsSpecimen = () => (
  <div className={styles.actionsBody}>
    <div>
      <div className={styles.group}>
        <p className={styles.label}>
          Variants — colour only, one shape, sentence case
        </p>
        <div className={styles.row}>
          <Button variant="primary">Book now</Button>
          <Button variant="secondary">View my page</Button>
          <Button variant="tertiary">Reschedule</Button>
          <Button variant="outline">Book</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="primary" disabled>
            Booked
          </Button>
        </div>
      </div>
      <div className={styles.group}>
        <p className={styles.label}>Sizes — sm 13.5 · md 15 · lg 16</p>
        <div className={styles.row}>
          <Button variant="primary" size="sm">
            Small
          </Button>
          <Button variant="primary" size="md">
            Medium
          </Button>
          <Button variant="primary" size="lg">
            Large
          </Button>
          <Button
            variant="secondary"
            icon={<Calendar size={16} strokeWidth={1.8} />}
          >
            Add to calendar
          </Button>
        </div>
      </div>
      <div className={joinClassNames(styles.group, styles.darkGroup)}>
        <p className={joinClassNames(styles.label, styles.darkLabel)}>
          cta — marketing hero &amp; nav only · uppercase, .14em · sm 10.5 · md
          11 · lg 12
        </p>
        <div className={styles.row}>
          <Button variant="primary" size="lg" cta>
            Book now
          </Button>
          <Button variant="primary" size="md" cta>
            Get started
          </Button>
          <Button variant="outline" size="lg" cta className={styles.ctaOnDark}>
            Browse by style
          </Button>
          <Button variant="primary" size="sm" cta>
            Small
          </Button>
        </div>
      </div>
      <div className={styles.group}>
        <p className={styles.label}>
          IconButton — the pill applied to a square · ghost default, tint,
          outline, primary
        </p>
        <div className={styles.row}>
          <IconButton label="Share">
            <LinkIcon size={18} strokeWidth={1.8} />
          </IconButton>
          <IconButton label="Search" variant="tint">
            <Search size={18} strokeWidth={1.8} />
          </IconButton>
          <IconButton label="Next" variant="outline">
            <ChevronRight size={18} strokeWidth={1.8} />
          </IconButton>
          <IconButton label="Add" variant="primary">
            <Calendar size={18} strokeWidth={1.8} />
          </IconButton>
          <IconButton label="Search small" variant="tint" size="sm">
            <Search size={16} strokeWidth={1.8} />
          </IconButton>
          <IconButton label="Next large" variant="outline" size="lg">
            <ChevronRight size={20} strokeWidth={1.8} />
          </IconButton>
        </div>
      </div>
      <div>
        <p className={styles.label}>Off-system — do not reintroduce</p>
        <div className={styles.row}>
          <span className={styles.offSystemRect}>View my page</span>
          <span className={styles.offSystemPill}>Reschedule</span>
          <span className={styles.offSystemNote}>
            rounded rectangle · cta casing on an in-app action
          </span>
        </div>
      </div>
    </div>
  </div>
);

const DisplaySpecimen = () => (
  <div className={styles.cardBody}>
    <div className={styles.displayLayout}>
      <Card onClick={() => {}} className={styles.stylistCard}>
        <div className={styles.personRow}>
          <Avatar name="Amara Osei" size={48} />
          <div>
            <div className={styles.personName}>Amara Osei</div>
            <div className={styles.personMeta}>
              Loc specialist · Whalley Range
            </div>
          </div>
        </div>
        <div className={styles.tagRow}>
          <Tag selected>Starter locs</Tag>
          <Tag>Retwist</Tag>
          <Tag>Loc repair</Tag>
        </div>
      </Card>
      <div className={styles.column}>
        <div className={styles.wrapRow}>
          <Badge tone="success">Confirmed</Badge>
          <Badge tone="warning">Pending deposit</Badge>
          <Badge tone="danger">Cancelled</Badge>
        </div>
        <div className={styles.wrapRow}>
          <Badge tone="neutral">Draft</Badge>
          <Badge tone="accent">New client</Badge>
          <Badge tone="ink">Pro plan</Badge>
        </div>
        <div className={styles.centreRow}>
          <Avatar name="Amara Osei" size={32} />
          <Avatar name="Kofi Mensah" size={40} />
          <Avatar name="Zuri Baptiste" size={48} />
        </div>
        <div className={styles.centreRow}>
          <IconChip size="sm">
            <Search size={16} strokeWidth={1.7} />
          </IconChip>
          <IconChip>
            <Calendar size={18} strokeWidth={1.7} />
          </IconChip>
          <IconChip size="lg" tone="muted">
            <Navigation size={20} strokeWidth={1.7} />
          </IconChip>
          <span className={styles.chipNote}>
            IconChip — static, non-interactive
          </span>
        </div>
      </div>
    </div>
  </div>
);

const FeedbackSpecimen = () => (
  <div className={styles.cardBody}>
    <div className={styles.feedbackLayout}>
      <div className={styles.dialogMock}>
        <div className={styles.dialogMockTitle}>Cancel appointment?</div>
        <div className={styles.dialogMockBody}>
          Your £20 deposit is refundable up to 48 hours before your appointment.
        </div>
        <div className={styles.dialogMockFooter}>
          <Button variant="outline" size="sm">
            Keep it
          </Button>
          <Button variant="primary" size="sm">
            Cancel appointment
          </Button>
        </div>
      </div>
      <div className={styles.toastRow}>
        <Toast tone="success">
          Appointment confirmed for Sat 12 Sep, 10:00.
        </Toast>
        <Toast tone="danger">Payment failed. Try another card.</Toast>
      </div>
    </div>
  </div>
);

const FormsSpecimen = () => (
  <div className={styles.cardBody}>
    <div className={styles.formsGrid}>
      <Input
        label="Email"
        placeholder="you@example.com"
        hint="Only used for booking confirmations."
      />
      <Select
        label="Service"
        options={["Knotless braids", "Silk press", "Loc retwist", "Cornrows"]}
      />
      <Input
        label="Phone"
        placeholder="+44"
        error="Enter a valid phone number."
        defaultValue="07x"
      />
      <div className={styles.column}>
        <Checkbox label="Send me appointment reminders" defaultChecked />
        <Radio
          options={["In salon", "Mobile — stylist travels to you"]}
          defaultValue="In salon"
        />
        <Switch label="Accept new clients" defaultChecked />
      </div>
    </div>
  </div>
);

const TAB_COPY: Record<string, string> = {
  Upcoming: "3 appointments this week.",
  Past: "42 completed appointments.",
  Cancelled: "No cancellations.",
};

const NavigationSpecimen = () => {
  const [tab, setTab] = useState("Upcoming");

  return (
    <div className={styles.navigationBody}>
      <div>
        <Tabs
          tabs={["Upcoming", "Past", "Cancelled"]}
          active={tab}
          onChange={setTab}
        />
        <div className={styles.tabPanel}>{TAB_COPY[tab]}</div>
      </div>
    </div>
  );
};

const MotionSpecimen = () => {
  const title = (
    <div className={styles.motionTitle}>Run your chair like a business</div>
  );

  const frames = [
    { progress: 0, label: "progress 0 — tilted back" },
    { progress: 1, label: "progress 1 — settled" },
  ];

  return (
    <div className={styles.motionBody}>
      <div className={styles.pair}>
        {frames.map(({ progress, label }) => (
          <div key={label} className={styles.pairColumn}>
            <div className={styles.motionFrame}>
              <div className={styles.motionStage}>
                <ScrollRevealCard
                  progress={progress}
                  height={0}
                  className={styles.motionTrack}
                  title={title}
                >
                  {/* the card's photo (assets/photo-braiding-lounge.jpeg) is not in the design bundle */}
                  <img src="" alt="" className={styles.motionImage} />
                </ScrollRevealCard>
              </div>
            </div>
            <span className={styles.caption}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const SPECIMENS: Record<string, () => React.JSX.Element> = {
  actions: ActionsSpecimen,
  display: DisplaySpecimen,
  feedback: FeedbackSpecimen,
  forms: FormsSpecimen,
  navigation: NavigationSpecimen,
  motion: MotionSpecimen,
};

/** Dev-only gallery at /__ds/:card mirroring each design-system .card.html for side-by-side checks. */
export const DsSpecimens = () => {
  const { card = "actions" } = useParams();
  const Specimen = SPECIMENS[card] ?? ActionsSpecimen;

  return (
    <div id="root-specimen">
      <Specimen />
    </div>
  );
};
