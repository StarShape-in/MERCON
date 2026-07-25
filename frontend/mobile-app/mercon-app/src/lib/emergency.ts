/**
 * Driver emergency alert — POST /mobile/emergency.
 * Notifies all operators/admins. Location is optional until live GPS lands.
 */
import { api } from './api';

export interface EmergencyPayload {
  incident_type: string;
  notes?: string;
  lat?: number;
  lng?: number;
}

export const emergencyService = {
  async raise(payload: EmergencyPayload): Promise<{ notified: number }> {
    const { data } = await api.post('/mobile/emergency', payload);
    return (data.data ?? { notified: 0 }) as { notified: number };
  },
};
