import type { BookingHomeForm, VehicleType } from "./booking.types";

export const VEHICLE_OPTIONS: Array<{
  type: VehicleType;
  label: string;
  eta: string;
  capacity: string;
  description: string;
  displayPrice: string;
  iconLabel: string;
}> = [
  {
    type: "bike",
    label: "Bike",
    eta: "2 min",
    capacity: "1 rider",
    description: "Quickest",
    displayPrice: "₹45",
    iconLabel: "B"
  },
  {
    type: "auto",
    label: "Auto",
    eta: "4 min",
    capacity: "3 seats",
    description: "Reliable",
    displayPrice: "₹82",
    iconLabel: "A"
  },
  {
    type: "cab_economy",
    label: "Economy Cab",
    eta: "6 min",
    capacity: "4 seats",
    description: "AC Sedans",
    displayPrice: "₹156",
    iconLabel: "E"
  },
  {
    type: "cab_premium",
    label: "Premium Cab",
    eta: "8 min",
    capacity: "6 seats",
    description: "Top Drivers",
    displayPrice: "₹240",
    iconLabel: "P"
  }
];

export const DEFAULT_BOOKING_FORM: BookingHomeForm = {
  pickup: {
    address: "Howrah Bridge",
    latitude: "22.5851",
    longitude: "88.3468"
  },
  dropoff: {
    address: "Park Street",
    latitude: "22.5546",
    longitude: "88.3520"
  },
  vehicleType: "bike",
  passengers: "1"
};
