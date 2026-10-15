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
  // Hero lede: a one-sentence pitch from the Accenture bullets in the resume ("managing a team of 35+
  // engineers", "budget … for a 35-engineer org", "100% on-time milestone delivery", "release cycle time
  // from 3 weeks to 5 days", "reducing team attrition by 20%"). The second sentence is from the Darwin
  // bullets: "Led the Darwin Portal program for Syngenta, … AI assistant routes requests to specialist
  // Claude AI agents" and "Used Claude Code agents to build the project … under engineer oversight".
  // The tagline above is still VINCE's intro. Keep index.html's static fallback in sync.
  pitch:
    "Engineering Manager leading a 35+ engineer, budget-owning org at Accenture: 100% on-time milestones, release cycles cut from 3 weeks to 5 days, and attrition down 20%. Led Syngenta's Darwin Portal, whose AI assistant routes requests to specialist Claude AI agents, built with Claude Code agents under engineer oversight.",
  role: 'Custom Software Engineering Manager',
  company: 'Accenture',
  location: 'Bengaluru, Karnataka',
  email: 'yadav.vinod579@gmail.com',
  linkedin: 'https://www.linkedin.com/in/vinod-pyarelal-yadav-46ba1943',
  facebook: 'https://www.facebook.com/vinodpyarelalyadav/',
  x: 'https://x.com/yadavvinod579',
  github: 'https://github.com/vinodyadav5799',
  source: 'https://github.com/itbooth2020-coder/vinod-profile', // this site's source code
  resume: 'resume.pdf',
  domains: ['Mobile', 'IoT', 'MDM / EMM', 'AI Agents', 'Enterprise', 'Web'],
  summary:
    'Results-driven Engineering Manager with 14+ years of experience leading cross-functional teams of 20–50 engineers to deliver enterprise-grade mobile, IoT, AI-powered, and web platforms at scale. Proven track record of improving system performance by 30%+, shipping solutions supporting 30K+ users and devices, and reducing time-to-market through CI/CD automation. Deep expertise in Android/iOS, MDM/EMM, prompt engineering, Claude AI agent integration, agentic development, system architecture, and Agile delivery across Retail, Transit, Healthcare, Agri-Tech, and Enterprise Mobility verticals. Adept at hiring, mentoring, setting OKRs, managing stakeholder relationships, budget ownership, and aligning engineering roadmaps with business strategy.',
}

// empty. Only the year and month are kept: the full date of birth isn't needed and shouldn't be public.
export const personal = {
  photo: 'profile.webp',
  nationality: 'Indian',
  location: 'Bengaluru, Karnataka, India',
  languages: 'English (Professional), Hindi (Native), Marathi (Native)',
}

// One is picked at random each time the profile dialog opens.
export const quotes = [
  { text: 'Simplicity is prerequisite for reliability.', by: 'Edsger W. Dijkstra' },
  { text: 'The best way to predict the future is to invent it.', by: 'Alan Kay' },
  { text: 'Make it work, make it right, make it fast.', by: 'Kent Beck' },
  { text: 'Talk is cheap. Show me the code.', by: 'Linus Torvalds' },
  { text: "It's not who I am underneath, but what I do that defines me.", by: 'Batman Begins (2005)' },
]

export const profileCard = [
  ['role', 'Custom Software Engineering Manager'],
  ['company', 'Accenture · since Jun 2024'],
  ['previously', 'HTC Global Services (2016–2024)'],
  ['experience', '14+ years'],
  ['team scale', '35+ engineers'],
  ['scale', '30K+ users and devices'],
  ['location', 'Bengaluru, India'],
  ['verticals', 'Retail, Transit, Healthcare, Agri-Tech, Enterprise Mobility'],
]

// Availability, confirmed by Vinod (not in the resume). Shown in the hero, the 30-second brief,
// Contact and role fit, and used by the offline agent.
export const availability = {
  open: true,
  roles: ['Senior Engineering Manager', 'Head of Engineering', 'CTO'],
  notice: '3 months',
  location: 'Bengaluru',
  workModes: ['Onsite', 'Hybrid', 'Remote'],
  relocation: true,
}

// Manager metrics ("At a glance" and the brief's proof points), all from the Accenture entry of the resume.
// Counter.jsx counts up a leading number only when the rest has no digits; `sr` is the screen-reader
// wording for a value that doesn't read well as written.
export const stats = [
  // "managing a team of 35+ engineers"; "Managed engineering budget and resource allocation for a 35-engineer org"
  { value: '35+', label: 'Engineers led in a budget-owning org' },
  // "Spearheaded end-to-end delivery of 3 enterprise mobility programs simultaneously … achieving 100% on-time milestone delivery"
  { value: '100%', label: 'On-time milestones across 3 concurrent programs' },
  // "reducing release cycle time from 3 weeks to 5 days"
  { value: '3 wk → 5 days', sr: '3 weeks to 5 days', label: 'Release cycle, via CI/CD' },
  // "drove hiring of 8 senior engineers, reducing team attrition by 20%"
  { value: '8', label: 'Senior engineers hired; attrition down 20%' },
]

// "How I lead" (Leadership.jsx). Each point restates a resume bullet (source in the comment).
export const leadership = [
  {
    title: 'Hiring & growth',
    points: [
      'Drove hiring of 8 senior engineers', // Accenture: "drove hiring of 8 senior engineers"
      'Mentored 10+ junior and mid-level engineers', // HTC: "Mentored 10+ junior and mid-level engineers"
      'Reduced team attrition by 20%', // Accenture: "reducing team attrition by 20%"
      'Quarterly OKRs and bi-weekly performance reviews', // Accenture: "Defined quarterly OKRs … bi-weekly performance reviews"
    ],
  },
  {
    title: 'Delivery',
    points: [
      '3 enterprise programs run simultaneously with 100% on-time milestones', // Accenture: "3 enterprise mobility programs simultaneously … 100% on-time milestone delivery"
      'Release cycle cut from 3 weeks to 5 days', // Accenture: "reducing release cycle time from 3 weeks to 5 days"
      'Agile delivery for 8+ products with teams of 15–25 engineers (HTC)', // HTC: "Led Agile delivery for 8+ enterprise Android/iOS products … teams of 15–25 engineers"
    ],
  },
  {
    title: 'Quality',
    points: [
      'Production defects down 35%', // Accenture: "cutting production defects by 35%"
      'Build failures down 45%', // HTC: "reducing build failures by 45%"
      'Bug escape rate down 30% through coding standards and PR reviews', // HTC: "establishing coding standards, PR reviews … reduced bug escape rate by 30%"
    ],
  },
  {
    title: 'Budget & stakeholders',
    points: [
      // Accenture: "Managed engineering budget and resource allocation for a 35-engineer org, overseeing headcount
      // planning, vendor costs, and tooling investments — optimizing team structure to reduce operational costs by 15%"
      'Owned engineering budget and resource allocation for a 35-engineer org (headcount, vendor costs, tooling), cutting operational costs by 15%',
      'Managed stakeholder communication across client leadership, product and operations', // Accenture: "Managed stakeholder communications across client leadership, product, and operations teams"
    ],
  },
]

// Optional pull-quote above the "How I lead" cards; hidden while empty. DRAFTS for Vinod to pick and
// edit (not rendered):
// 1. "I grow engineers and hold teams to outcomes, not activity. Clear OKRs, regular feedback and
//    honest reviews keep people improving, and strong engineering practice — CI/CD, code reviews,
//    shared standards — keeps quality from depending on heroics."
// 2. "Good delivery comes from good people and good habits. I hire carefully, mentor deliberately and
//    measure what ships: on-time milestones, shorter release cycles and fewer defects. AI agents speed
//    up the work; engineers stay accountable for every line."
// 3. "My job is to build teams that deliver predictably without burning out. That means investing in
//    people, setting outcome-driven goals and automating the path to production — and adopting
//    AI-assisted engineering with human review at every step."
export const leadershipPhilosophy = ''

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
    media: 'company/accenture',
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
      'Led the Darwin Portal program for Syngenta, architecting a React Native for Web agri-intelligence portal whose orchestrator-core AI assistant routes requests to specialist Claude AI agents, with CopilotKit, AG-UI, and A2UI rendering agent responses as interactive UI.',
      'Applied prompt engineering across the assistant: role-based system prompts, few-shot examples, structured JSON outputs, tool-calling instructions, and grounding guardrails, refined through test-set evaluation.',
      'Used Claude Code agents to build the project (scaffolding, code generation, refactoring, unit tests, code review) under engineer oversight, and the Claude Agent SDK with Python on Databricks for backend APIs and crop-yield, crop-stabilization, and seed-loss prediction models.',
      'Defined quarterly OKRs, conducted bi-weekly performance reviews, and drove hiring of 8 senior engineers, reducing team attrition by 20%.',
      'Managed stakeholder communications across client leadership, product, and operations teams, ensuring roadmap alignment and proactive risk mitigation.',
    ],
  },
  {
    company: 'HTC Global Services',
    media: 'company/htc',
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
    media: 'company/clean-bill-of-health',
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
    media: 'company/3cent',
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
    media: 'company/xoriant',
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
    media: 'company/it-gurus',
    role: 'Software Engineer',
    location: 'Mumbai',
    period: 'Oct 2012 – Feb 2014',
    points: ['Developed Android applications with NLP capabilities, improving user engagement metrics by 30%.'],
  },
  {
    company: 'Yesha IT Solutions Pvt. Ltd',
    media: 'company/yesha',
    role: 'Software Engineer',
    location: 'Mumbai',
    period: 'Apr 2012 – Sep 2012',
    points: ['Delivered an order-processing mobile solution with an SQLite offline database and reliable data integrity.'],
  },
  {
    company: 'Hurix Systems Pvt. Ltd',
    media: 'company/hurix',
    role: 'Integration Developer',
    location: 'Mumbai',
    period: 'Aug 2011 – Mar 2012',
    points: ['Delivered UI solutions with media integrations, benchmarking and secure API integrations.'],
  },
]

// Case studies (CaseStudy.jsx). Every `caseStudy` field is restructured from text already in this
// file: the project's own text, its graphProjects entry, or an experience bullet that names it.
// Nothing is paraphrased or added. Empty fields are hidden in the dialog, and a project whose case
// study adds nothing beyond its card text gets no "Read case study" button.
// Vinod: fill `context` (the problem/situation) and `approach` in your own words where empty.
//   company  -> the experience entry the role/approach bullets come from (shows its role and period)
//   metrics  -> only numbers stated in the text: { label, before, after, unit, better } for
//               "X to Y" figures, or { label, change, unit, better } for a single relative change.
export const projects = [
  {
    name: 'Darwin Portal – Syngenta',
    media: 'project/darwin',
    tag: 'Agri-Tech AI Platform',
    text: 'AI-powered agricultural intelligence portal giving Syngenta teams a conversational assistant for crop-yield, crop-stabilization, and seed-loss insights, backed by Databricks data pipelines and predictive models.',
    caseStudy: {
      company: 'Accenture',
      // Context: the resume's Darwin Portal project description (also the card text). Role: the first
      // Darwin bullet in the Accenture experience entry. Approach: the labelled points under the
      // resume's Darwin Portal project. All verbatim; the resume states no Darwin metrics.
      context: 'AI-powered agricultural intelligence portal giving Syngenta teams a conversational assistant for crop-yield, crop-stabilization, and seed-loss insights, backed by Databricks data pipelines and predictive models.',
      role: 'Led the Darwin Portal program for Syngenta, architecting a React Native for Web agri-intelligence portal whose orchestrator-core AI assistant routes requests to specialist Claude AI agents, with CopilotKit, AG-UI, and A2UI rendering agent responses as interactive UI.',
      approach: [
        'Architecture: React Native for Web front end with CopilotKit, AG-UI, and A2UI; orchestrator-core AI assistant that routes user requests to specialist Claude AI agents and renders their results as interactive UI.',
        'Claude AI agent integration: Built domain agents with defined tools and data access (Databricks queries, prediction APIs), managed context and conversation state, and combined agent outputs through the orchestrator.',
        'Prompt engineering: Authored system prompts, few-shot examples, and structured output schemas; added guardrails so answers stay grounded in Databricks data; refined prompts through test-set evaluation.',
        'Agents used to build: Claude Code for agentic development (scaffolding, code generation, refactoring, test writing, PR review); Claude Agent SDK for backend web APIs; Python on Databricks for data analysis and model training.',
      ],
      outcomes: [],
      metrics: [],
    },
  },
  {
    name: 'PRESTO – Transit Payment System',
    media: 'project/presto',
    tag: 'Transit · Canada',
    text: 'Secure transit payment platform integrating NFC, FarePay smart cards, embedded POS and backend systems, with MDM/EMM for large-scale device deployment. 99.9% uptime and regulatory compliance.',
    caseStudy: {
      // Vinod confirmed PRESTO is the Accenture ATPS work; the client is Metrolinx, which owns and
      // operates PRESTO. Role: the ATPS bullet in the Accenture entry, verbatim. Approach: the resume's
      // PRESTO project description, verbatim.
      company: 'Accenture',
      client: 'Metrolinx',
      context: '',
      role: 'Built Automated Transit Payment Systems (ATPS) integrating NFC, embedded POS, and smart card workflows, processing 1M+ contactless transactions with 99.9% uptime.',
      approach: [
        'Architected and delivered a secure transit payment platform integrating NFC, FarePay smart cards, embedded POS, and backend systems.',
        'Managed MDM/EMM for large-scale device deployment across the transit network; achieved 99.9% uptime and regulatory compliance.',
      ],
      // From the PRESTO graphProjects entry, verbatim.
      outcomes: ['1M+ contactless transactions with 99.9% uptime.'],
      metrics: [], // 1M+ and 99.9% are totals, not before/after or relative changes
    },
  },
  {
    name: 'VusionGroup – Retail IoT & ESL',
    media: 'project/vusion',
    tag: 'Retail IoT',
    text: 'GroceryTech mobile apps with real-time Bluetooth proximity tracking, camera scanning and enterprise API integration. Improved warehouse pick accuracy by 20% and reduced fulfillment time by 15%.',
    caseStudy: {
      company: '',
      context: '',
      role: '',
      approach: [],
      outcomes: ['Improved warehouse pick accuracy by 20% and reduced fulfillment time by 15%.'],
      // From the text above ("pick accuracy +20%, fulfillment time −15%" in graphProjects).
      metrics: [
        { label: 'Warehouse pick accuracy', change: 20, unit: '%', better: 'higher' },
        { label: 'Fulfillment time', change: -15, unit: '%', better: 'lower' },
      ],
    },
  },
  {
    name: 'Meta (Facebook) – MDM Platform for Qculous Devices',
    media: 'project/meta-mdm',
    tag: 'Device Management',
    text: 'React-based MDM solution and mobile agent app for secure onboarding, monitoring and policy enforcement with encrypted communications across 5,000+ managed devices.',
    caseStudy: { company: '', context: '', role: '', approach: [], outcomes: [], metrics: [] },
  },
  {
    name: 'Meijer – Real-time Last-Mile Delivery',
    media: 'project/meijer',
    tag: 'GroceryTech',
    text: 'Led a 10-member team delivering real-time delivery tracking and last-mile routing. Sprint planning, CI/CD releases and code reviews; 3 major releases on schedule.',
    caseStudy: {
      company: 'HTC Global Services',
      context: '',
      // From the HTC Global Services experience entry, verbatim.
      role: 'Architected a real-time last-mile delivery tracking platform for Meijer (GroceryTech), leading a 10-member team and delivering 3 major releases on schedule.',
      approach: ['Sprint planning, CI/CD releases and code reviews'],
      outcomes: ['3 major releases on schedule'],
      metrics: [], // "3 major releases" is a count, not a change
    },
  },
  {
    name: 'INTELITY – Hospitality Platform',
    media: 'project/intelity',
    tag: 'Hospitality',
    text: 'Managed Android/iOS development with a 12-member team, implementing CI/CD pipelines and zero-downtime production releases.',
    caseStudy: { company: '', context: '', role: '', approach: [], outcomes: [], metrics: [] },
  },
]

// Domain graph: Vinod -> vertical (or domain) -> project -> technologies. All from the resume.
export const graphDomains = ['Mobile', 'IoT', 'MDM / EMM', 'AI Agents', 'Web']

export const graphProjects = [
  {
    short: 'Darwin Portal',
    name: 'Darwin Portal – Syngenta',
    vertical: 'Agri-Tech',
    domains: ['AI Agents', 'Web'],
    tech: ['React Native for Web', 'CopilotKit', 'AG-UI', 'A2UI', 'Claude AI Agents', 'Claude Agent SDK', 'Claude Code', 'Prompt Engineering', 'Multi-Agent Orchestration', 'Python', 'Databricks'],
    text: 'AI-powered agricultural intelligence portal giving Syngenta teams a conversational assistant for crop-yield, crop-stabilization, and seed-loss insights, backed by Databricks data pipelines and predictive models.',
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
    short: 'Meta MDM',
    name: 'Meta (Facebook) – MDM Platform for Qculous Devices',
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
  { area: 'AI & Agents', items: ['Claude AI Agent Integration', 'Claude Agent SDK', 'Claude Code (Agentic Development)', 'Multi-Agent Orchestration', 'Tool/Function Calling', 'CopilotKit', 'AG-UI', 'A2UI', 'Generative AI', 'NLP', 'Data Analysis & Model Training'] },
  { area: 'Prompt Engineering', items: ['System Prompt Design', 'Few-Shot Prompting', 'Structured JSON Outputs', 'Context Management', 'Guardrails & Grounding', 'Prompt Evaluation & Iteration'] },
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
  'Master of Computer Applications (MCA) — Thakur Institute of Management Studies, Career Development & Research, Mumbai (2008 – 2011)',
  'Bachelor of Science (B.Sc.) — Ismail Yusuf College, Mumbai (2005 – 2008)',
]

export const languages = ['English (Professional)', 'Hindi (Native)', 'Marathi (Native)']

// Blogs section. The latest posts are fetched at build time (scripts/fetch-blogs.mjs → src/data/blogs.json).
export const blogs = {
  tech: {
    name: 'AndroidSuperNerds',
    tagline: 'All about Android UI and libraries',
    description: 'Hands-on Android UI tutorials: layouts, dialogs, custom views, Jetpack Compose and Material 3.',
    url: 'https://androidsupernerds.blogspot.com/',
  },
  comic: {
    name: 'Batman: The Legend',
    tagline: 'A comic blog about the Dark Knight',
    description: 'Facts and stories from the Batman universe: the Robins, the Wayne family legacy and more.',
    url: 'https://batmansfact.blogspot.com/',
  },
}

export const suggestedPrompts = [
  'Who is Vinod?',
  'Show his career timeline',
  'Which companies has he worked for?',
  'What impact has he had?',
  'Show me his projects',
  'Tell me about the Darwin Portal AI project',
  'Which tech stack does he know?',
]
