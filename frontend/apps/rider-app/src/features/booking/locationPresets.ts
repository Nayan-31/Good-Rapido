import type { BookingLocationForm } from "./booking.types";

interface KnownLocation {
  address: string;
  latitude: string;
  longitude: string;
  aliases: string[];
  context: string;
}

const KNOWN_LOCATIONS: KnownLocation[] = [
  {
    address: "Howrah Bridge",
    latitude: "22.5851",
    longitude: "88.3468",
    aliases: ["howrah", "howrah bridge"],
    context: "Kolkata, West Bengal"
  },
  {
    address: "Park Street",
    latitude: "22.5546",
    longitude: "88.3520",
    aliases: ["park street", "parkstreet"],
    context: "Kolkata, West Bengal"
  },
  {
    address: "Muri",
    latitude: "23.3779",
    longitude: "85.8666",
    aliases: ["muri", "muri junction", "muri railway station"],
    context: "Ranchi district, Jharkhand"
  },
  {
    address: "Silli",
    latitude: "23.3518",
    longitude: "85.8282",
    aliases: ["silli", "silli jharkhand"],
    context: "Ranchi district, Jharkhand"
  },
  {
    address: "Ranchi",
    latitude: "23.3432",
    longitude: "85.3094",
    aliases: ["ranchi", "ranchi jharkhand"],
    context: "Jharkhand"
  },
  {
    address: "Connaught Place",
    latitude: "28.6315",
    longitude: "77.2167",
    aliases: ["connaught place", "cp", "new delhi"],
    context: "New Delhi"
  },
  {
    address: "India Gate",
    latitude: "28.6129",
    longitude: "77.2295",
    aliases: ["india gate"],
    context: "New Delhi"
  },
  {
    address: "Noida",
    latitude: "28.5355",
    longitude: "77.3910",
    aliases: ["noida"],
    context: "Uttar Pradesh"
  },
  {
    address: "Mumbai",
    latitude: "19.0760",
    longitude: "72.8777",
    aliases: ["mumbai"],
    context: "Maharashtra"
  }
];

export interface LocationSuggestion {
  address: string;
  context: string;
  latitude: string;
  longitude: string;
}

export const resolveKnownLocationPatch = (
  address: string
): Pick<BookingLocationForm, "latitude" | "longitude"> | null => {
  const knownLocation = findKnownLocation(address);

  if (!knownLocation) {
    return null;
  }

  return {
    latitude: knownLocation.latitude,
    longitude: knownLocation.longitude
  };
};

export const hasKnownLocation = (address: string) => Boolean(findKnownLocation(address));

export const searchKnownLocations = (query: string): LocationSuggestion[] => {
  const normalizedQuery = normalizeAddress(query);

  if (!normalizedQuery) {
    return [];
  }

  return KNOWN_LOCATIONS
    .filter((location) =>
      normalizeAddress(location.address).includes(normalizedQuery)
      || location.aliases.some((alias) => normalizeAddress(alias).includes(normalizedQuery))
      || normalizeAddress(location.context).includes(normalizedQuery)
    )
    .slice(0, 5)
    .map((location) => ({
      address: location.address,
      context: location.context,
      latitude: location.latitude,
      longitude: location.longitude
    }));
};

const findKnownLocation = (address: string) => {
  const normalizedAddress = normalizeAddress(address);

  if (!normalizedAddress) {
    return null;
  }

  return KNOWN_LOCATIONS.find((location) =>
    location.aliases.some((alias) => normalizeAddress(alias) === normalizedAddress)
  ) ?? null;
};

const normalizeAddress = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
