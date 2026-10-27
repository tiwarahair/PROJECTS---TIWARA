import { screen, waitFor } from "@testing-library/react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "../../../../test/render-with-store";
import type { BookingAddress } from "../../logic/types";
import { useTravelCheck } from "../use-travel-check";

vi.mock("../../../../lib/booking-api", () => ({
  isInTravelArea: vi.fn(async () => true),
}));

const ADDRESS: BookingAddress = {
  postcode: "M15 5RN",
  line1: "12 Stretford Road",
  line2: "",
  town: "Manchester",
  notes: "",
  source: "typed",
  lat: null,
  lng: null,
};

const fakeGeocoding = (geocode: () => unknown) =>
  ({
    Geocoder: class {
      geocode = geocode;
    },
  }) as unknown as ReturnType<typeof useMapsLibrary>;

const TravelCheck = () => {
  const { point, inArea } = useTravelCheck("service-1", ADDRESS, true);

  return <p>{point ? `${point.lat},${point.lng} ${inArea}` : "no point"}</p>;
};

describe("useTravelCheck", () => {
  afterEach(() => vi.mocked(useMapsLibrary).mockReturnValue(null));

  it("checks the travel area at the typed address's point", async () => {
    vi.mocked(useMapsLibrary).mockReturnValue(
      fakeGeocoding(async () => ({
        results: [
          {
            geometry: {
              location: { toJSON: () => ({ lat: 53.47, lng: -2.25 }) },
            },
          },
        ],
      })),
    );

    renderWithStore(<TravelCheck />);

    expect(await screen.findByText("53.47,-2.25 true")).toBeInTheDocument();
  });

  it("carries on without a point when Google has switched Maps off", async () => {
    const geocode = vi.fn(() => undefined);

    vi.mocked(useMapsLibrary).mockReturnValue(fakeGeocoding(geocode));

    renderWithStore(<TravelCheck />);

    await waitFor(() => expect(geocode).toHaveBeenCalled());
    expect(screen.getByText("no point")).toBeInTheDocument();
  });
});
