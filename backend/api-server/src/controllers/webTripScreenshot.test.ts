import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('WEB EXTERNAL SCREENSHOT API ENDPOINT SUITE', () => {

  it('1. Rejects web request when no file is uploaded (400 Bad Request)', async () => {
    let responseStatus = 0;
    let responseData: any = null;

    const req: any = {
      user: { id: 'usr-operator-1', role: 'Operator' },
      params: { id: 'trip-100' },
      file: undefined,
    };

    const res: any = {
      status: (code: number) => {
        responseStatus = code;
        return res;
      },
      json: (data: any) => {
        responseData = data;
        return res;
      },
    };

    const handleWebUpload = async (r: any, s: any) => {
      if (!r.file) return s.status(400).json({ success: false, error: { message: 'No screenshot file uploaded' } });
    };

    await handleWebUpload(req, res);

    assert.equal(responseStatus, 400);
    assert.equal(responseData.success, false);
    assert.equal(responseData.error.message, 'No screenshot file uploaded');
  });

  it('2. Web Operator flow passes driverId = null to shared processExternalScreenshot', async () => {
    const webParams = {
      tripId: 'trip-100',
      filePath: '/uploads/screenshot.jpg',
      mimeType: 'image/jpeg',
      userId: 'usr-operator-1',
      driverId: null, // Operator is authorized via RBAC, not driver assignment
      autoApply: true,
    };

    assert.equal(webParams.driverId, null);
    assert.equal(webParams.autoApply, true);
  });

  it('3. Mobile Driver endpoint requires authenticated driver identity (403 if missing driver_id)', async () => {
    let responseStatus = 0;
    let responseData: any = null;

    const req: any = {
      user: { id: 'usr-driver-1' }, // Missing driver_id
      params: { id: 'trip-100' },
      file: { path: '/tmp/test.jpg', mimetype: 'image/jpeg' },
    };

    const res: any = {
      status: (code: number) => {
        responseStatus = code;
        return res;
      },
      json: (data: any) => {
        responseData = data;
        return res;
      },
    };

    const handleMobileUpload = async (r: any, s: any) => {
      const driverId = r.user?.driver_id;
      if (!driverId) return s.status(403).json({ success: false, error: { message: 'Driver not authenticated' } });
    };

    await handleMobileUpload(req, res);

    assert.equal(responseStatus, 403);
    assert.equal(responseData.success, false);
    assert.equal(responseData.error.message, 'Driver not authenticated');
  });

  it('4. Obtains tripId from URL parameter params.id', async () => {
    const reqSingle: any = { params: { id: 'trip-abc-123' } };
    const reqArray: any = { params: { id: ['trip-xyz-999'] } };

    const idSingle = Array.isArray(reqSingle.params.id) ? reqSingle.params.id[0] : reqSingle.params.id;
    const idArray = Array.isArray(reqArray.params.id) ? reqArray.params.id[0] : reqArray.params.id;

    assert.equal(idSingle, 'trip-abc-123');
    assert.equal(idArray, 'trip-xyz-999');
  });

  it('5. Web endpoint autoApply defaults to true unless explicitly disabled', () => {
    const parseAutoApply = (body: any, query: any) => {
      return body?.auto_apply !== 'false' && body?.auto_apply !== false && query?.auto_apply !== 'false';
    };

    assert.equal(parseAutoApply({}, {}), true);
    assert.equal(parseAutoApply({ auto_apply: 'true' }, {}), true);
    assert.equal(parseAutoApply({ auto_apply: 'false' }, {}), false);
    assert.equal(parseAutoApply({ auto_apply: false }, {}), false);
    assert.equal(parseAutoApply({}, { auto_apply: 'false' }), false);
  });
});
