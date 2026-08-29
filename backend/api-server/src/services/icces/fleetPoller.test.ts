import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { persist } from './fleetPoller';
import type { IccesTelemetry } from './trackParser';

describe('fleetPoller persist stale GPS data protection', () => {
  function mockPrisma(initialVehicles: Array<{ id: string; icces_device_id: string; last_seen_at: Date | null; last_lat: number | null; last_lng: number | null }>) {
    const db = new Map(
      initialVehicles.map((v) => [
        v.id,
        { ...v },
      ])
    );

    return {
      db,
      vehicle: {
        async updateMany(args: {
          where: {
            icces_device_id: string;
            deletedAt: null;
            OR: Array<{ last_seen_at: null } | { last_seen_at: { lt: Date } }>;
          };
          data: {
            last_lat: number;
            last_lng: number;
            last_speed_kph: number | null;
            last_heading: number | null;
            last_status: string | null;
            last_seen_at: Date;
          };
        }) {
          let count = 0;
          for (const vehicle of db.values()) {
            if (vehicle.icces_device_id !== args.where.icces_device_id) continue;

            const matchesNull = args.where.OR ? args.where.OR.some(
              (cond) => 'last_seen_at' in cond && cond.last_seen_at === null && vehicle.last_seen_at === null
            ) : false;
            const matchesLt = args.where.OR ? args.where.OR.some(
              (cond) =>
                'last_seen_at' in cond &&
                cond.last_seen_at !== null &&
                'lt' in cond.last_seen_at &&
                vehicle.last_seen_at !== null &&
                vehicle.last_seen_at.getTime() < cond.last_seen_at.lt.getTime()
            ) : false;

            if (matchesNull || matchesLt) {
              vehicle.last_lat = args.data.last_lat;
              vehicle.last_lng = args.data.last_lng;
              vehicle.last_seen_at = args.data.last_seen_at;
              count++;
            }
          }
          return { count };
        },

        async count(args: { where: { icces_device_id: string; deletedAt: null } }) {
          let count = 0;
          for (const vehicle of db.values()) {
            if (vehicle.icces_device_id === args.where.icces_device_id) count++;
          }
          return count;
        },
      },
    };
  }

  const sampleReading = (deviceId: string, recordedAt: Date, lat = 24.7136, lng = 46.6753): IccesTelemetry => ({
    deviceId,
    deviceKey: 'KEY-1',
    description: 'TRUCK-1',
    recordedAt,
    status: 'MOVING',
    latitude: lat,
    longitude: lng,
    speedKph: 80,
    headingDeg: 90,
    altitudeM: 500,
    odometerKm: 12000,
    satellites: 10,
    address: 'Riyadh',
    ignitionOn: true,
    batteryLevel: 100,
  });

  it('A. First tracker reading is stored when last_seen_at is null', async () => {
    const client = mockPrisma([
      { id: 'v1', icces_device_id: 'DEV-1', last_seen_at: null, last_lat: null, last_lng: null },
    ]);

    const reading = sampleReading('DEV-1', new Date('2026-08-09T10:00:00.000Z'), 24.7136, 46.6753);
    const result = await persist([reading], client as any);

    assert.equal(result.matched, 1);
    assert.deepEqual(result.unmatched, []);
    assert.equal(client.db.get('v1')?.last_lat, 24.7136);
    assert.equal(client.db.get('v1')?.last_lng, 46.6753);
    assert.equal(client.db.get('v1')?.last_seen_at?.toISOString(), '2026-08-09T10:00:00.000Z');
  });

  it('B. Newer tracker reading replaces older tracker reading', async () => {
    const client = mockPrisma([
      { id: 'v1', icces_device_id: 'DEV-1', last_seen_at: new Date('2026-08-09T10:00:00.000Z'), last_lat: 24.7136, last_lng: 46.6753 },
    ]);

    const newerReading = sampleReading('DEV-1', new Date('2026-08-09T10:30:00.000Z'), 21.5433, 39.1728);
    const result = await persist([newerReading], client as any);

    assert.equal(result.matched, 1);
    assert.equal(client.db.get('v1')?.last_lat, 21.5433);
    assert.equal(client.db.get('v1')?.last_lng, 39.1728);
    assert.equal(client.db.get('v1')?.last_seen_at?.toISOString(), '2026-08-09T10:30:00.000Z');
  });

  it('C. Older tracker reading (stale packet) does NOT replace newer tracker reading', async () => {
    const client = mockPrisma([
      { id: 'v1', icces_device_id: 'DEV-1', last_seen_at: new Date('2026-08-09T10:30:00.000Z'), last_lat: 24.7136, last_lng: 46.6753 },
    ]);

    // Stale packet from 09:15 trying to place vehicle back in Jeddah
    const staleReading = sampleReading('DEV-1', new Date('2026-08-09T09:15:00.000Z'), 21.5433, 39.1728);
    const result = await persist([staleReading], client as any);

    assert.equal(result.matched, 1);
    assert.deepEqual(result.unmatched, []);
    // Position remains Riyadh at 10:30 (stale Jeddah position was rejected)
    assert.equal(client.db.get('v1')?.last_lat, 24.7136);
    assert.equal(client.db.get('v1')?.last_lng, 46.6753);
    assert.equal(client.db.get('v1')?.last_seen_at?.toISOString(), '2026-08-09T10:30:00.000Z');
  });

  it('D. Same timestamp reading behaves deterministically (does not overwrite)', async () => {
    const client = mockPrisma([
      { id: 'v1', icces_device_id: 'DEV-1', last_seen_at: new Date('2026-08-09T10:30:00.000Z'), last_lat: 24.7136, last_lng: 46.6753 },
    ]);

    const sameTimeReading = sampleReading('DEV-1', new Date('2026-08-09T10:30:00.000Z'), 21.5433, 39.1728);
    const result = await persist([sameTimeReading], client as any);

    assert.equal(result.matched, 1);
    assert.equal(client.db.get('v1')?.last_lat, 24.7136);
    assert.equal(client.db.get('v1')?.last_lng, 46.6753);
  });

  it('E. Latitude 0 and Longitude 0 are preserved', async () => {
    const client = mockPrisma([
      { id: 'v1', icces_device_id: 'DEV-1', last_seen_at: null, last_lat: null, last_lng: null },
    ]);

    const zeroReading = sampleReading('DEV-1', new Date('2026-08-09T10:00:00.000Z'), 0, 0);
    const result = await persist([zeroReading], client as any);

    assert.equal(result.matched, 1);
    assert.equal(client.db.get('v1')?.last_lat, 0);
    assert.equal(client.db.get('v1')?.last_lng, 0);
  });

  it('F. Unmatched device ID is reported in unmatched list', async () => {
    const client = mockPrisma([
      { id: 'v1', icces_device_id: 'DEV-1', last_seen_at: null, last_lat: null, last_lng: null },
    ]);

    const unknownReading = sampleReading('UNKNOWN-DEV', new Date('2026-08-09T10:00:00.000Z'));
    const result = await persist([unknownReading], client as any);

    assert.equal(result.matched, 0);
    assert.deepEqual(result.unmatched, ['UNKNOWN-DEV']);
  });
});
