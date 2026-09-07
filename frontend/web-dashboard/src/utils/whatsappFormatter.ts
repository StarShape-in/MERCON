import { Trip } from '@/services/tripService';
import { calculateRoadDistanceKm, resolveCityCoords } from '@/services/travelTimeService';
import { toast } from 'sonner';

/**
 * Formats a single trip message for WhatsApp dispatch.
 */
export function formatSingleTripWhatsappMessage(trip: Trip, withTailgate = false): string {
  const customerName = trip.customer?.name || 'Unassigned';
  const driverName = trip.is_third_party
    ? (trip.third_party_driver_name || trip.thirdPartyProvider?.name || '3PL Driver')
    : (trip.driver ? `${trip.driver.first_name} ${trip.driver.last_name || ''}`.trim() : 'Unassigned');
  const plate = trip.is_third_party
    ? (trip.third_party_vehicle_plate || '3PL Vehicle')
    : (trip.vehicle?.plate_number || 'Unassigned');

  const pickupName = trip.stops?.find((s) => s.stop_type === 'Pickup')?.location_name || trip.stops?.[0]?.location_name || 'Origin';
  const dropoffStop = trip.stops?.find((s) => s.stop_type === 'Dropoff') || trip.stops?.[trip.stops.length - 1];
  const dropoffName = dropoffStop?.location_name || 'Destination';

  const isScheduled = ['Draft', 'Scheduled'].includes(trip.status);

  if (isScheduled) {
    const isMonthly = trip.billing_type?.toUpperCase().includes('MONTHLY') || trip.quotation_billing_type?.toUpperCase().includes('MONTHLY');
    const billingLabel = isMonthly ? 'MONTHLY' : 'EXTRA';
    const vClass = trip.quotation_vehicle_class || trip.vehicle_type || trip.vehicle?.asset_type || 'VEHICLE';
    const lType = trip.quotation_line_type || 'ROUND TRIP';

    let text = `@${customerName}\n` +
           `*(${billingLabel} VEHICLE)*\n` +
           `1. ${pickupName}>>>${dropoffName} ${vClass} (${lType})\n` +
           `Driver name # ${driverName}\n` +
           `Number # ${trip.driver?.phone_primary || trip.third_party_driver_phone || 'Unassigned'}\n` +
           `Truck no # ${plate}`;

    if (withTailgate) {
      text += `\n\nWITH TAILGATE`;
    }
    return text;
  } else {
    let distanceText = 'Unavailable';
    let etaText = 'Unavailable';

    const vehicleLat = trip.vehicle?.resolved_location?.latitude;
    const vehicleLng = trip.vehicle?.resolved_location?.longitude;

    let destLat = dropoffStop?.location_lat;
    let destLng = dropoffStop?.location_lng;

    if (!destLat || !destLng) {
      const resolvedDest = resolveCityCoords(dropoffName);
      if (resolvedDest) {
        destLat = resolvedDest.lat;
        destLng = resolvedDest.lng;
      }
    }

    if (vehicleLat && vehicleLng && destLat && destLng) {
      const distKm = calculateRoadDistanceKm(vehicleLat, vehicleLng, destLat, destLng);
      distanceText = `${distKm}KM TO ${dropoffName.toUpperCase()}`;
      const etaHours = (distKm / 70).toFixed(1);
      etaText = `${etaHours}HRS`;
    }

    let statusDisplay = trip.status;
    if (trip.status === 'AtPickup') statusDisplay = 'Loading';
    else if (trip.status === 'AtDelivery') statusDisplay = 'At Delivery';
    else if (trip.status === 'InTransit') statusDisplay = 'In Transit';

    return `🚛 Vehicle Status Update\n\n` +
           `Truck: *${plate}*\n` +
           `Driver: ${driverName}\n` +
           `Route: ${pickupName}>>>${dropoffName}\n` +
           `Distance left: ${distanceText}\n` +
           `ETA: ${etaText}\n` +
           `Status: ${statusDisplay}`;
  }
}

/**
 * Triggers multiple WhatsApp messages sequentially for an array of selected trips.
 * Spaced out by 350ms to prevent browser popup blockers from suppressing multiple tabs.
 */
export function openMultipleWhatsappMessages(trips: Trip[]) {
  if (!trips || trips.length === 0) return;

  trips.forEach((trip, index) => {
    const text = formatSingleTripWhatsappMessage(trip);
    let phone = '';
    if (!trip.is_third_party && trip.driver?.phone_primary) {
      phone = trip.driver.phone_primary;
    } else if (trip.is_third_party && (trip.third_party_driver_phone || trip.thirdPartyProvider?.phone)) {
      phone = trip.third_party_driver_phone || trip.thirdPartyProvider?.phone || '';
    } else if (trip.customer?.contact_phone) {
      phone = trip.customer.contact_phone;
    }

    const cleanPhone = phone.trim().replace(/\+/g, '').replace(/\D/g, '');
    const baseUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}`
      : `https://api.whatsapp.com/send`;

    const shareUrl = `${baseUrl}?text=${encodeURIComponent(text)}`;

    setTimeout(() => {
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    }, index * 350);
  });

  toast.success(`Opening ${trips.length} separate WhatsApp messages...`);
}
