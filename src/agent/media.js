// Image catalog the profile agent may show, referenced in answers as ![caption](media:<id>).
// Shared by the server agent (lists the ids in its prompt) and the browser renderer.
// Pure data, no Vite/browser APIs, so Node can import it too.
//   src     -> file in public/
//   domain  -> organization logo from its website icon (falls back to a monogram tile)
//   neither -> monogram tile built from `mono` (no real image exists for it)
// Only city-level location is public; there is intentionally no street address entry.

export const media = [
  { id: 'profile', label: 'Vinod Pyarelal Yadav', kind: 'photo', src: 'profile.png' },

  { id: 'company/accenture', label: 'Accenture', kind: 'company', domain: 'accenture.com' },
  { id: 'company/htc', label: 'HTC Global Services', kind: 'company', domain: 'htcinc.com' },
  { id: 'company/clean-bill-of-health', label: 'Clean Bill of Health', kind: 'company', mono: 'CB' },
  { id: 'company/3cent', label: '3Cent Consultancy (Infosys)', kind: 'company', mono: '3C' },
  { id: 'company/xoriant', label: 'Xoriant Solutions', kind: 'company', domain: 'xoriant.com' },
  { id: 'company/it-gurus', label: 'IT Gurus Software', kind: 'company', mono: 'IG' },
  { id: 'company/yesha', label: 'Yesha IT Solutions', kind: 'company', mono: 'YI' },
  { id: 'company/hurix', label: 'Hurix Systems', kind: 'company', domain: 'hurix.com' },

  { id: 'edu/thakur', label: 'Thakur Institute of Management Studies (MMS)', kind: 'education', mono: 'TIMS' },
  { id: 'edu/ismail-yusuf', label: 'Ismail Yusuf College (B.Sc.)', kind: 'education', mono: 'IYC' },

  { id: 'project/darwin', label: 'Darwin Portal – Syngenta', kind: 'project', domain: 'syngenta.com' },
  { id: 'project/presto', label: 'PRESTO Transit Payments', kind: 'project', domain: 'prestocard.ca' },
  { id: 'project/vusion', label: 'VusionGroup Retail IoT', kind: 'project', domain: 'vusion.com' },
  { id: 'project/meijer', label: 'Meijer Last-Mile Delivery', kind: 'project', mono: 'M' }, // meijer.com's site icon is a generic React logo
  { id: 'project/meta-mdm', label: 'META MDM Platform', kind: 'project', mono: 'MDM' },
  { id: 'project/intelity', label: 'INTELITY Hospitality', kind: 'project', domain: 'intelity.com' },
  { id: 'project/bayer', label: 'Bayer Global Pharma Web', kind: 'project', domain: 'bayer.com' },

  { id: 'location/bengaluru', label: 'Bengaluru, Karnataka, India', kind: 'location', mono: '📍' },
]

export const mediaById = Object.fromEntries(media.map((m) => [m.id, m]))
