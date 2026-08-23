import { Driver } from '@/services/driverService';
import { Vehicle } from '@/services/vehicleService';
import { RateCard } from '@/services/rateCardService';

export interface ContractSlot {
  id: string;
  origin: string;
  destination: string;
  pickupTime: string;
  dropoffTime: string;
  billingAmount: string;
  driverTripCharge: string;
  isOvernight?: boolean;
  intermediateLocations: string[];
  intermediateStopFees?: string[];
  returnOrigin?: string;
  returnDestination?: string;
  returnPickupTime?: string;
  returnDropoffTime?: string;
  returnIsOvernight?: boolean;
  returnIntermediateLocations?: string[];
  returnIntermediateStopFees?: string[];
}

export interface LoopTeam {
  id: string;
  name: string;
  driverId: string;
  vehicleId: string;
}

export interface MonthDateItem {
  dateStr: string;
  dayNumber: number;
  dayOfWeek: number;
  dayName: string;
  formattedDate?: string;
}

export interface BatchTripRow {
  key: string;
  dateStr: string;
  formattedDate: string;
  slotLabel: string;
  pickupTime: string;
  isOvernight?: boolean;
}
