import type { BookingLocationForm } from "./booking.types";

interface KnownLocation {
  address: string;
  latitude: string;
  longitude: string;
  aliases: string[];
}

const KNOWN_LOCATIONS: KnownLocation[] = [
  {
    address: "Howrah Bridge",
    latitude: "22.5851",
    longitude: "88.3468",
    aliases: ["howrah", "howrah bridge"]
  },
  {
    address: "Park Street",
    latitude: "22.5546",
    longitude: "88.3520",
    aliases: ["park street", "parkstreet"]
  },
  {
    address: "Muri",
    latitude: "23.3779",
    longitude: "85.8666",
    aliases: ["muri", "muri junction", "muri railway station"]
  },
  {
    address: "Silli",
    latitude: "23.3518",
    longitude: "85.8282",
    aliases: ["silli", "silli jharkhand"]
  },
  {
    address: "Ranchi",
    latitude: "23.3432",
    longitude: "85.3094",
    aliases: ["ranchi", "ranchi jharkhand"]
  },
  {
    address: "Connaught Place",
    latitude: "28.6315",
    longitude: "77.2167",
    aliases: ["connaught place", "cp", "new delhi"]
  },
  {
    address: "India Gate",
    latitude: "28.6129",
    longitude: "77.2295",
    aliases: ["india gate"]
  },
  {
    address: "Noida",
    latitude: "28.5355",
    longitude: "77.3910",
    aliases: ["noida"]
  },
  {
    address: "Mumbai",
    latitude: "19.0760",
    longitude: "72.8777",
    aliases: ["mumbai"]
  }
];

export const resolveKnownLocationPatch = (
  address: string
): Pick<BookingLocationForm, "latitude" | "longitude"> | null => {
  const normalizedAddress = normalizeAddress(address);
  const knownLocation = KNOWN_LOCATIONS.find((location) =>
    location.aliases.some((alias) => normalizeAddress(alias) === normalizedAddress)
  );

  if (!knownLocation) {
    return null;
  }

  return {
    latitude: knownLocation.latitude,
    longitude: knownLocation.longitude
  };
};

const normalizeAddress = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
