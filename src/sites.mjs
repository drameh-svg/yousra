// Retailers searched directly on every discovery round (comma-separated domains). Default: SHEIN.
export const prioritySites=()=>[...new Set((process.env.PRIORITY_SITES??'shein.com').split(',').map(x=>x.trim().toLowerCase().replace(/^https?:\/\//,'').replace(/^www\./,'').replace(/\/.*$/,'')).filter(x=>/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(x)))].slice(0,3);
