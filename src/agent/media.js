// Image catalog the profile agent may show, referenced in answers as ![caption](media:<id>).
// Shared by the server agent (lists the ids in its prompt) and the browser renderer.
// Pure data, no Vite/browser APIs, so Node can import it too.
//   src     -> file in public/. Organization logos are the sites' own icons, saved once in
//              public/logos/ so visitors' browsers make no third-party request; a file that
//              fails to load shows a monogram tile instead.
//   neither -> monogram tile built from `mono` (no real image exists for it)
// Company names and logos identify employers and clients and belong to their owners.
// Only city-level location is public; there is intentionally no street address entry.

export const media = [
  { id: 'profile', label: 'Vinod Pyarelal Yadav', kind: 'photo', src: 'profile.webp' },

  { id: 'company/accenture', label: 'Accenture', kind: 'company', src: 'logos/accenture.png' },
  { id: 'company/htc', label: 'HTC Global Services', kind: 'company', src: 'logos/htcinc.png' },
  { id: 'company/clean-bill-of-health', label: 'Clean Bill of Health', kind: 'company', mono: 'CB' },
  { id: 'company/3cent', label: '3Cent Consultancy (Infosys)', kind: 'company', mono: '3C' },
  { id: 'company/xoriant', label: 'Xoriant Solutions', kind: 'company', src: 'logos/xoriant.png' },
  { id: 'company/it-gurus', label: 'IT Gurus Software', kind: 'company', mono: 'IG' },
  { id: 'company/yesha', label: 'Yesha IT Solutions', kind: 'company', mono: 'YI' },
  { id: 'company/hurix', label: 'Hurix Systems', kind: 'company', src: 'logos/hurix.png' },

  { id: 'edu/thakur', label: 'Thakur Institute of Management Studies (MCA)', kind: 'education', mono: 'TIMS' },
  { id: 'edu/ismail-yusuf', label: 'Ismail Yusuf College (B.Sc.)', kind: 'education', mono: 'IYC' },

  { id: 'project/darwin', label: 'Darwin Portal – Syngenta', kind: 'project', src: 'logos/syngenta.png' },
  { id: 'project/presto', label: 'PRESTO Transit Payments', kind: 'project', src: 'logos/prestocard.png' },
  { id: 'project/vusion', label: 'VusionGroup Retail IoT', kind: 'project', src: 'logos/vusion.png' },
  { id: 'project/meijer', label: 'Meijer Last-Mile Delivery', kind: 'project', mono: 'M' }, // meijer.com's site icon is a generic React logo
  { id: 'project/meta-mdm', label: 'Meta (Facebook) MDM Platform', kind: 'project', mono: 'MDM' },
  { id: 'project/intelity', label: 'INTELITY Hospitality', kind: 'project', src: 'logos/intelity.png' },
  { id: 'project/bayer', label: 'Bayer Global Pharma Web', kind: 'project', src: 'logos/bayer.png' },

  { id: 'location/bengaluru', label: 'Bengaluru, Karnataka, India', kind: 'location', icon: 'pin' },
]

// Shown under logo galleries and case-study logos (ADS-003).
export const LOGO_NOTE = 'Company names and logos identify employers and clients and belong to their owners; no endorsement is implied.'

export const mediaById =Object.fromEntries(media.map((m) => [m.id, m]))
