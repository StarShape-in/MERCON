export function downloadCSV<T extends Record<string, any>>(data: T[], filename: string = 'export.csv') {
  if (!data || !data.length) {
    return;
  }

  // Define headers from first object keys, skipping complex objects or arrays if necessary,
  // but for simplicity we will just extract top level primitive values or stringify.
  const headers = Object.keys(data[0]);

  const csvRows = [];
  
  // Add header row
  csvRows.push(headers.join(','));

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      let val = row[header];
      if (val === null || val === undefined) {
        val = '';
      } else if (typeof val === 'object') {
        // Simple serialization for nested objects (e.g. customer.name)
        val = JSON.stringify(val).replace(/"/g, '""'); // Escape quotes for CSV
      } else {
        val = String(val).replace(/"/g, '""');
      }
      // Wrap in quotes if it contains comma, newline or quote
      if (/[",\n]/.test(val)) {
        val = `"${val}"`;
      }
      return val;
    });
    csvRows.push(values.join(','));
  }

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
