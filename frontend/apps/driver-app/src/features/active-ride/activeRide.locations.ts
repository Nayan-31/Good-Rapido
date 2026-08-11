import type { DriverRideLocation } from "@/features/ride-requests/rideRequest.types";

interface KnownRideLocation {
  latitude: number;
  longitude: number;
  aliases: string[];
}

const KNOWN_RIDE_LOCATIONS: KnownRideLocation[] = [
  {
    latitude: 22.5851,
    longitude: 88.3468,
    aliases: ["howrah", "howrah bridge"]
  },
  {
    latitude: 22.5546,
    longitude: 88.3520,
    aliases: ["park street", "parkstreet"]
  },
  {
    latitude: 23.3779,
    longitude: 85.8666,
    aliases: ["muri", "muri junction", "muri railway station"]
  },
  {
    latitude: 23.3518,
    longitude: 85.8282,
    aliases: ["silli", "silli jharkhand"]
  },
  {
    latitude: 23.3432,
    longitude: 85.3094,
    aliases: ["ranchi", "ranchi jharkhand"]
  },
  {
    latitude: 28.6315,
    longitude: 77.2167,
    aliases: ["connaught place", "cp", "new delhi"]
  },
  {
    latitude: 28.6129,
    longitude: 77.2295,
    aliases: ["india gate"]
  },
  {
    latitude: 28.5355,
    longitude: 77.3910,
    aliases: ["noida"]
  },
  {
    latitude: 19.0760,
    longitude: 72.8777,
    aliases: ["mumbai"]
  }
];

export const resolveKnownRideLocation = (location: DriverRideLocation): DriverRideLocation => {
  const knownLocation = KNOWN_RIDE_LOCATIONS.find((candidate) =>
    candidate.aliases.some((alias) => normalizeAddress(alias) === normalizeAddress(location.address))
  );

  if (!knownLocation) {
    return location;
  }

  return {
    ...location,
    latitude: knownLocation.latitude,
    longitude: knownLocation.longitude
  };
};

const normalizeAddress = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
