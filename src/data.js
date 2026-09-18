// All site content lives here. Only facts from the profile document are included;
// add more (dates, achievements, certifications) as you finalize them.

export const profile = {
  name: 'Vinod Pyarelal Yadav',
  tagline: 'Engineering leader building mobile, IoT and enterprise platforms',
  role: 'Custom Software Engineering Manager',
  company: 'Accenture',
  linkedin: 'https://www.linkedin.com/in/vinod-pyarelal-yadav-46ba1943',
  domains: ['Mobile', 'IoT', 'Device Management', 'Enterprise Platforms', 'Web'],
  about: [
    "I'm an engineering leader with 14+ years of experience designing, building and delivering software across mobile, IoT, enterprise and web platforms. I have led teams of 35+ engineers and have shipped solutions for the transit, healthcare and retail industries.",
    'I enjoy the space where hands-on technical depth meets delivery leadership: shaping architecture, growing engineers, and turning complex requirements into reliable products.',
  ],
}

export const stats = [
  { value: '14+', label: 'Years in software engineering' },
  { value: '35+', label: 'Engineers led' },
  { value: '3', label: 'Industries: transit, healthcare, retail' },
]

export const expertise = [
  {
    title: 'Mobile Engineering',
    icon: '📱',
    points: [
      'Native Android and iOS application development and delivery',
      'Enterprise-grade mobile apps for regulated and high-usage domains',
    ],
  },
  {
    title: 'IoT & Connected Devices',
    icon: '📡',
    points: ['End-to-end IoT solutions spanning devices, connectivity and applications'],
  },
  {
    title: 'MDM / EMM',
    icon: '🔐',
    points: [
      'Mobile Device Management and Enterprise Mobility Management solutions',
      'Managing and securing device fleets and enterprise apps at scale',
    ],
  },
  {
    title: 'Enterprise Software',
    icon: '🏢',
    points: ['Large-scale custom software delivery for enterprise clients'],
  },
  {
    title: 'Web Platforms',
    icon: '🌐',
    points: ['Web application and platform development, including modern JavaScript/TypeScript stacks'],
  },
  {
    title: 'Engineering Leadership',
    icon: '🧭',
    points: [
      'Leading and scaling engineering teams (35+ engineers)',
      'Delivery management, technical architecture, hiring and mentoring',
      'Bridging client requirements and engineering execution',
    ],
  },
]

export const experience = [
  {
    role: 'Custom Software Engineering Manager',
    company: 'Accenture',
    current: true,
    points: [
      'Lead engineering teams delivering custom software across mobile, IoT, MDM/EMM, enterprise and web',
      'Own technical delivery, team growth and client-facing engineering outcomes',
    ],
  },
  {
    role: 'Earlier career',
    company: 'HTC',
    current: false,
    points: [],
  },
]

export const industries = ['Transit', 'Healthcare', 'Retail']

export const snapshot = [
  { label: 'Experience', value: '14+ years in software engineering and engineering leadership' },
  { label: 'Team scale', value: 'Led teams of 35+ engineers' },
  { label: 'Current role', value: 'Custom Software Engineering Manager, Accenture' },
  { label: 'Previously', value: 'HTC' },
  { label: 'Industries', value: 'Transit, Healthcare, Retail' },
]

export const industryCards = [
  { name: 'Transit', icon: '🚆' },
  { name: 'Healthcare', icon: '🏥' },
  { name: 'Retail', icon: '🛍️' },
]
