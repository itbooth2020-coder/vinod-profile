// All site content lives here, taken from public/resume.pdf.
// The runtime agent (server/profileAgent.js) reads the PDF itself; this file powers the page
// and the offline fallback agent (src/agent/localAgent.js).

export const profile = {
  name: 'Vinod Pyarelal Yadav',
  firstName: 'Vinod Pyarelal',
  lastName: 'Yadav',
  headline: 'Engineering Manager | Mobile & Enterprise Architecture | Scalable Systems',
  tagline:
    'Engineering Manager with 14+ years leading teams of 20–50 engineers to deliver enterprise-grade mobile, IoT, AI-powered and web platforms at scale.',
  role: 'Custom Software Engineering Manager',
  company: 'Accenture',
  location: 'Bengaluru, Karnataka',
  email: 'yadav.vinod579@gmail.com',
  linkedin: 'https://www.linkedin.com/in/vinod-pyarelal-yadav-46ba1943',
  resume: 'resume.pdf',
  domains: ['Mobile', 'IoT', 'MDM / EMM', 'AI Agents', 'Enterprise', 'Web'],
  summary:
    'Results-driven Engineering Manager with 14+ years of experience leading cross-functional teams of 20–50 engineers to deliver enterprise-grade mobile, IoT, AI-powered, and web platforms at scale. Proven track record of improving system performance by 30%+, shipping solutions supporting 30K+ users and devices, and reducing time-to-market through CI/CD automation. Deep expertise in Android/iOS, MDM/EMM, AI-agent-driven platforms, system architecture, and Agile delivery across Retail, Transit, Healthcare, AgriTech, and Enterprise Mobility verticals. Adept at hiring, mentoring, setting OKRs, managing stakeholder relationships, budget ownership, and aligning engineering roadmaps with business strategy.',
}

export const profileCard = [
  ['role', 'Custom Software Engineering Manager'],
  ['company', 'Accenture · since Jun 2024'],
  ['previously', 'HTC Global Services (2016–2024)'],
  ['experience', '14+ years'],
  ['team scale', '20–50 engineers'],
  ['location', 'Bengaluru, India'],
  ['verticals', 'Retail, Transit, Healthcare, AgriTech, Enterprise Mobility'],
]

export const stats = [
  { value: '14+', label: 'Years in software engineering' },
  { value: '50', label: 'Engineers led across cross-functional teams' },
  { value: '30%+', label: 'System performance improvement' },
  { value: '30K+', label: 'Users and devices served' },
]

export const highlights = [
  { title: 'Team Scale', text: 'Led cross-functional teams of 20–50 engineers across 5+ concurrent enterprise programs' },
  { title: 'Performance', text: 'Improved system performance by 30%+ across Android, iOS, and web platforms' },
  { title: 'User Scale', text: 'Delivered production-grade solutions serving 30K+ users/devices globally' },
  { title: 'Architecture', text: 'Architected scalable MDM, IoT, AI-agent, transit payment, and retail mobility platforms from 0 to production' },
]

export const experience = [
  {
    company: 'Accenture',
    role: 'Custom Software Engineering Manager',
    location: 'Bengaluru',
    period: 'Jun 2024 – Present',
    current: true,
    points: [
      'Spearheaded end-to-end delivery of 3 enterprise mobility programs simultaneously, managing a team of 35+ engineers across Android, iOS, and web stacks, achieving 100% on-time milestone delivery.',
      'Managed engineering budget and resource allocation for a 35-engineer org, overseeing headcount planning, vendor costs, and tooling investments — optimizing team structure to reduce operational costs by 15%.',
      'Designed and deployed MDM/EMM solutions for provisioning and managing 10,000+ enterprise devices, reducing device onboarding time by 40% through automation.',
      'Built Automated Transit Payment Systems (ATPS) integrating NFC, embedded POS, and smart card workflows, processing 1M+ contactless transactions with 99.9% uptime.',
      'Established CI/CD pipelines using Jenkins, Git, and DevOps tooling, reducing release cycle time from 3 weeks to 5 days and cutting production defects by 35%.',
      'Delivered GroceryTech mobile solutions with Bluetooth proximity, real-time location tracking, and barcode scanning, improving warehouse operational efficiency by 25%.',
      'Led the Darwin Portal program for client Syngenta, architecting a React Native for Web application with an AI assistant powered by an orchestrator-core architecture, integrating CopilotKit, AG-UI, and A2-UI frameworks together with Claude AI agents.',
      'Engineered Darwin Portal backend services using Claude-Agent for web APIs and Python on Databricks, applying data analysis and model training for crop-yield prediction, crop stabilization trend forecasting, and seed-loss risk prediction.',
      'Defined quarterly OKRs, conducted bi-weekly performance reviews, and drove hiring of 8 senior engineers, reducing team attrition by 20%.',
      'Managed stakeholder communications across client leadership, product, and operations teams, ensuring roadmap alignment and proactive risk mitigation.',
    ],
  },
  {
    company: 'HTC Global Services',
    role: 'Senior Consultant – Lead',
    location: 'Bengaluru',
    period: 'Oct 2016 – May 2024',
    points: [
      'Led Agile delivery for 8+ enterprise Android/iOS products over 7+ years, managing sprints, code reviews, and release planning for teams of 15–25 engineers.',
      'Oversaw budget planning and cost management for engineering operations across multiple concurrent client engagements.',
      'Delivered Jenkins-based CI/CD infrastructure supporting 30K+ user deployments, reducing build failures by 45%.',
      'Architected a real-time last-mile delivery tracking platform for Meijer (GroceryTech), leading a 10-member team and delivering 3 major releases on schedule.',
      'Drove R&D and algorithm design for IoT and sensor-driven mobile applications, improving operational efficiency by 20% for field teams.',
      'Mentored 10+ junior and mid-level engineers, establishing coding standards, PR reviews, and documentation practices that reduced bug escape rate by 30%.',
      'Collaborated with product, QA, DevOps, and clients to define roadmaps, milestones, and delivery SLAs.',
    ],
  },
  {
    company: 'Clean Bill of Health',
    role: 'Android Developer',
    location: 'Bengaluru',
    period: 'Nov 2015 – Sep 2016',
    points: [
      'Owned end-to-end delivery of a healthcare IoT Android app integrating Wi-Fi modules and smart indicators for medicine reminders, serving 5,000+ users.',
      'Evaluated 3rd-party SDKs and delivered secure, cloud-integrated mobile solutions.',
      'Ensured high-quality releases through automated testing and HIPAA-aligned engineering standards.',
    ],
  },
  {
    company: '3Cent Consultancy (Infosys)',
    role: 'Senior Software Engineer',
    location: 'Bengaluru',
    period: 'May 2015 – Oct 2015',
    points: [
      'Delivered end-to-end web solutions using Node.js, React, and MySQL within tight 3-month delivery windows.',
      'Reduced critical production issues by 25% through proactive debugging and performance optimization.',
    ],
  },
  {
    company: 'Xoriant Solutions Pvt. Ltd',
    role: 'Senior Software Engineer',
    location: 'Mumbai',
    period: 'Mar 2014 – Apr 2015',
    points: [
      'Built scalable, data-driven web applications using Node.js, PHP, and MySQL for enterprise clients.',
      'Achieved 99%+ uptime through systematic fixes and controlled release processes.',
    ],
  },
  {
    company: 'IT Gurus Software',
    role: 'Software Engineer',
    location: 'Mumbai',
    period: 'Oct 2012 – Feb 2014',
    points: ['Developed Android applications with NLP capabilities, improving user engagement metrics by 30%.'],
  },
  {
    company: 'Yesha IT Solutions Pvt. Ltd',
    role: 'Software Engineer',
    location: 'Mumbai',
    period: 'Apr 2012 – Sep 2012',
    points: ['Delivered an order-processing mobile solution with an SQLite offline database and reliable data integrity.'],
  },
  {
    company: 'Hurix Systems Pvt. Ltd',
    role: 'Integration Developer',
    location: 'Mumbai',
    period: 'Aug 2011 – Mar 2012',
    points: ['Delivered UI solutions with media integrations, benchmarking and secure API integrations.'],
  },
]

export const projects = [
  {
    name: 'Darwin Portal – Syngenta',
    tag: 'Agri-Tech AI Platform',
    text: 'AI-powered agricultural intelligence portal using React Native for Web, CopilotKit, AG-UI and A2-UI, with an orchestrator-core AI assistant and Claude AI agents. Backend APIs with Claude-Agent and Python/Databricks pipelines for crop-yield prediction, crop stabilization forecasting and seed-loss risk prediction.',
  },
  {
    name: 'PRESTO – Transit Payment System',
    tag: 'Transit · Canada',
    text: 'Secure transit payment platform integrating NFC, FarePay smart cards, embedded POS and backend systems, with MDM/EMM for large-scale device deployment. 99.9% uptime and regulatory compliance.',
  },
  {
    name: 'VusionGroup – Retail IoT & ESL',
    tag: 'Retail IoT',
    text: 'GroceryTech mobile apps with real-time Bluetooth proximity tracking, camera scanning and enterprise API integration. Improved warehouse pick accuracy by 20% and reduced fulfillment time by 15%.',
  },
  {
    name: 'META – MDM Platform for Qculous Devices',
    tag: 'Device Management',
    text: 'React-based MDM solution and mobile agent app for secure onboarding, monitoring and policy enforcement with encrypted communications across 5,000+ managed devices.',
  },
  {
    name: 'Meijer – Real-time Last-Mile Delivery',
    tag: 'GroceryTech',
    text: 'Led a 10-member team delivering real-time delivery tracking and last-mile routing. Sprint planning, CI/CD releases and code reviews; 3 major releases on schedule.',
  },
  {
    name: 'INTELITY – Hospitality Platform',
    tag: 'Hospitality',
    text: 'Managed Android/iOS development with a 12-member team, implementing CI/CD pipelines and zero-downtime production releases.',
  },
]

// Domain graph: Vinod -> vertical (or domain) -> project -> technologies. All from the resume.
export const graphDomains = ['Mobile', 'IoT', 'MDM / EMM', 'AI Agents', 'Web']

export const graphProjects = [
  {
    short: 'Darwin Portal',
    name: 'Darwin Portal – Syngenta',
    vertical: 'AgriTech',
    domains: ['AI Agents', 'Web'],
    tech: ['React Native for Web', 'CopilotKit', 'AG-UI', 'A2-UI', 'Claude AI Agents', 'Python', 'Databricks'],
    text: 'AI-powered agricultural intelligence portal with an orchestrator-core AI assistant and Claude AI agents; Python/Databricks pipelines for crop-yield prediction, crop stabilization forecasting and seed-loss risk prediction.',
  },
  {
    short: 'PRESTO',
    name: 'PRESTO – Transit Payment System (Canada)',
    vertical: 'Transit',
    domains: ['Mobile', 'IoT', 'MDM / EMM'],
    tech: ['NFC', 'FarePay smart cards', 'Embedded POS', 'MDM/EMM'],
    text: 'Secure transit payment platform integrating NFC, smart cards, embedded POS and backend systems; 1M+ contactless transactions with 99.9% uptime.',
  },
  {
    short: 'VusionGroup',
    name: 'VusionGroup – Retail IoT & ESL Solutions',
    vertical: 'Retail',
    domains: ['Mobile', 'IoT'],
    tech: ['Bluetooth', 'Barcode scanning', 'Location tracking', 'REST APIs'],
    text: 'GroceryTech mobile apps with Bluetooth proximity tracking, camera scanning and enterprise API integration; pick accuracy +20%, fulfillment time −15%.',
  },
  {
    short: 'Meijer',
    name: 'Meijer – Real-time Last-Mile Delivery',
    vertical: 'Retail',
    domains: ['Mobile'],
    tech: ['Android', 'iOS', 'Jenkins CI/CD'],
    text: 'Real-time delivery tracking and last-mile routing mobile solution; led a 10-member team to 3 major releases on schedule.',
  },
  {
    short: 'META MDM',
    name: 'META – MDM Platform for Qculous Devices',
    vertical: 'Enterprise Mobility',
    domains: ['MDM / EMM', 'Web', 'Mobile'],
    tech: ['React', 'MDM/EMM', 'Encrypted comms'],
    text: 'React-based MDM solution and mobile agent app for onboarding, monitoring and policy enforcement across 5,000+ managed devices.',
  },
  {
    short: 'Enterprise MDM',
    name: 'Enterprise MDM/EMM Rollout (Accenture)',
    vertical: 'Enterprise Mobility',
    domains: ['MDM / EMM'],
    tech: ['MDM/EMM', 'Android', 'iOS'],
    text: 'Provisioning and managing 10,000+ enterprise devices; onboarding time reduced by 40% through automation.',
  },
  {
    short: 'INTELITY',
    name: 'INTELITY – Hospitality Platform',
    vertical: 'Hospitality',
    domains: ['Mobile'],
    tech: ['Android', 'iOS', 'Jenkins CI/CD'],
    text: 'Android/iOS hospitality platform; led a 12-member team with CI/CD pipelines and zero-downtime releases.',
  },
  {
    short: 'Medicine Reminder',
    name: 'Healthcare IoT App – Clean Bill of Health',
    vertical: 'Healthcare',
    domains: ['Mobile', 'IoT'],
    tech: ['Android', 'Wi-Fi modules', 'Cloud'],
    text: 'Healthcare IoT Android app with Wi-Fi modules and smart indicators for medicine reminders, serving 5,000+ users under HIPAA-aligned standards.',
  },
  {
    short: 'Elder Care',
    name: 'Elder Care IoT Healthcare App',
    vertical: 'Healthcare',
    domains: ['IoT', 'Mobile'],
    tech: [],
    text: 'IoT healthcare app for elder care (listed under other notable projects).',
  },
  {
    short: 'Virtual Clinic',
    name: 'Virtual Clinic / VC Doctor Apps',
    vertical: 'Healthcare',
    domains: ['Mobile'],
    tech: [],
    text: 'Virtual clinic and doctor apps (listed under other notable projects).',
  },
  {
    short: 'Bayer Pharma',
    name: 'Bayer Global Pharma Web',
    vertical: 'Healthcare',
    domains: ['Web'],
    tech: [],
    text: 'Global pharma web platform (listed under other notable projects).',
  },
]

export const otherProjects = [
  'Summit Control (IoT Gate Automation)',
  'LIVE Letting (Real Estate Platform)',
  'Bayer Global Pharma Web',
  'Elder Care IoT Healthcare App',
  'Virtual Clinic / VC Doctor Apps',
  'BuyOnBoard In-flight POS',
  'Ciber Connect Enterprise App',
]

export const skills = [
  { area: 'Mobile', items: ['Android (Kotlin, Java, Jetpack Compose)', 'iOS (Swift, SwiftUI)', 'Flutter', 'React Native', 'Xamarin'] },
  { area: 'Frontend / Web', items: ['React JS', 'Next.js', 'TypeScript', 'JavaScript', 'HTML5', 'jQuery', 'PHP'] },
  { area: 'AI & Agents', items: ['CopilotKit', 'AG-UI', 'A2-UI', 'Claude AI Agents', 'Claude-Agent', 'Orchestrator-based AI Assistants', 'Generative AI', 'NLP', 'Data Analysis & Model Training'] },
  { area: 'Backend & APIs', items: ['Node.js', 'RESTful APIs', 'Python', 'Databricks', 'XML', 'JSON', 'MySQL', 'SQLite'] },
  { area: 'DevOps & CI/CD', items: ['Jenkins', 'GitHub', 'GitLab', 'Azure DevOps', 'Git'] },
  { area: 'Architecture', items: ['MVVM', 'MVC', 'Singleton', 'Observer', 'Microservices', 'MDM/EMM'] },
  { area: 'Cloud & IoT', items: ['Firebase', 'Google Maps', 'Google Ads', 'Azure', 'NFC', 'Bluetooth', 'Wi-Fi modules'] },
  { area: 'Methodologies', items: ['Agile/Scrum', 'Waterfall', 'OKR Frameworks', 'SDLC', 'Sprint Planning', 'Budget Management'] },
  { area: 'Libraries', items: ['Dagger 2', 'Hilt', 'RxJava', 'Rx Android', 'OpenTok', 'PayPal SDK'] },
]

export const certifications = [
  'Claude Code AI Tools Certified — Coursiv, 2026',
  'AI Tools for Business & Productivity (In Progress) — Coursiv, 2025',
  'Generative AI — Fundamentals to Advanced (In Progress) — Udemy, 2025',
]

export const education = [
  'Master of Management Studies (MMS) — Thakur Institute of Management Studies, Career Development & Research, Mumbai (2008 – 2011)',
  'Bachelor of Science (B.Sc.) — Ismail Yusuf College, Mumbai (2005 – 2008)',
]

export const languages = ['English (Professional)', 'Hindi (Native)', 'Marathi (Native)']

export const suggestedPrompts = [
  'Who is Vinod?',
  'What is his current role?',
  'Tell me about the Darwin Portal AI project',
  'What MDM / IoT work has he done?',
  'Which tech stack does he know?',
]
