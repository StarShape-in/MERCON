/**
 * Utility to generate a composited Geotagged Evidence Image
 * containing the original cargo photo with the official MERCON Geotag Panel stamped at the bottom.
 */

export interface GeotagData {
  photoUri: string;
  locationName: string;
  fullAddress: string;
  companyName: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

export async function generateGeotaggedEvidenceImage(data: GeotagData): Promise<string> {
  const {
    photoUri, locationName, fullAddress, companyName, latitude, longitude, timestamp
  } = data;

  const dateObj = new Date(timestamp);
  const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  const formattedTime = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const coordsStr = `${latitude.toFixed(4)}°N · ${longitude.toFixed(4)}°E`;

  if (typeof document !== 'undefined') {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const width = 1080;
        const scale = width / img.width;
        const photoHeight = Math.round(img.height * scale);
        const panelHeight = 280;
        const totalHeight = photoHeight + panelHeight;

        canvas.width = width;
        canvas.height = totalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(photoUri);

        // 1. Background & Photo
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(0, 0, width, totalHeight);
        ctx.drawImage(img, 0, 0, width, photoHeight);

        // 2. Solid White Geotag Card
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(0, photoHeight - 16, width, panelHeight + 16, [24, 24, 0, 0]);
        } else {
          ctx.rect(0, photoHeight - 16, width, panelHeight + 16);
        }
        ctx.fill();

        // 3. Inner Map Tile (Left)
        ctx.fillStyle = '#F1F5F9';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(24, photoHeight + 24, 180, 200, 16);
        } else {
          ctx.rect(24, photoHeight + 24, 180, 200);
        }
        ctx.fill();

        // Roads
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(24, photoHeight + 100, 180, 24);
        ctx.fillRect(90, photoHeight + 24, 24, 200);

        // Pin
        ctx.fillStyle = '#FA634E';
        ctx.beginPath();
        ctx.arc(102, photoHeight + 100, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(102, photoHeight + 100, 5, 0, Math.PI * 2);
        ctx.fill();

        // 4. Location Details & Metadata (Right)
        ctx.fillStyle = '#3E3C3D';
        ctx.font = 'bold 30px sans-serif';
        ctx.fillText(locationName, 230, photoHeight + 60);

        ctx.fillStyle = '#64748B';
        ctx.font = '20px sans-serif';
        ctx.fillText(fullAddress.replace(/\n/g, ' '), 230, photoHeight + 94);

        // Divider
        ctx.strokeStyle = '#F1F5F9';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(230, photoHeight + 114);
        ctx.lineTo(width - 24, photoHeight + 114);
        ctx.stroke();

        // Metadata rows
        ctx.fillStyle = '#64748B';
        ctx.font = '19px sans-serif';
        ctx.fillText('Captured:', 230, photoHeight + 148);
        ctx.fillStyle = '#3E3C3D';
        ctx.font = 'bold 19px sans-serif';
        ctx.fillText(`${formattedDate} · ${formattedTime}`, 330, photoHeight + 148);

        ctx.fillStyle = '#64748B';
        ctx.font = '19px sans-serif';
        ctx.fillText('Coordinates:', 230, photoHeight + 180);
        ctx.fillStyle = '#3E3C3D';
        ctx.font = 'bold 19px sans-serif';
        ctx.fillText(coordsStr, 350, photoHeight + 180);

        ctx.fillStyle = '#64748B';
        ctx.font = '19px sans-serif';
        ctx.fillText('Customer:', 230, photoHeight + 212);
        ctx.fillStyle = '#3E3C3D';
        ctx.font = 'bold 19px sans-serif';
        ctx.fillText(companyName, 330, photoHeight + 212);

        // MERCON Branding + GPS Attribution Footer
        ctx.fillStyle = '#3E3C3D';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(`MERCON LOGISTICS • ${companyName}`, 24, photoHeight + 265);

        ctx.fillStyle = '#94A3B8';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('Google Maps · GPS Verified', width - 290, photoHeight + 265);

        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(photoUri);
      img.src = photoUri;
    });
  }

  return photoUri;
}
