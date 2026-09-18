export interface TimestampedStep {
  time: string; // e.g. "00:45"
  title: string;
  description: string;
}

export interface VideoTutorial {
  id: string;
  title: string;
  category: string;
  categoryLabel: string;
  description: string;
  duration: string; // e.g. "4:20"
  views: number;
  thumbnailGradient: string;
  videoUrl?: string;
  steps: TimestampedStep[];
  keyTakeaways: string[];
  isWatched?: boolean;
  createdAt: string;
}

const STORAGE_KEY = 'mercon_learning_tutorials_v1';
const WATCHED_KEY = 'mercon_learning_watched_v1';

const DEFAULT_TUTORIALS: VideoTutorial[] = [
  {
    id: 'vid-1',
    title: 'How to Dispatch a Trip & Match Commercial Rate Cards',
    category: 'dispatch',
    categoryLabel: 'Dispatch & Trips',
    description: 'Learn step-by-step how to create single or multi-stop trips, select drivers, and automatically apply commercial rate card pricing.',
    duration: '4:20',
    views: 1420,
    thumbnailGradient: 'from-amber-600 via-orange-600 to-red-700',
    steps: [
      { time: '00:00', title: 'Introduction to Dispatch Center', description: 'Overview of the trip creation workflow and customer selection.' },
      { time: '00:45', title: 'Selecting Customer & Route', description: 'Pick the customer account and choose origin/destination stops.' },
      { time: '01:50', title: 'Commercial Rate Card Auto-Matching', description: 'How MERCON automatically pulls vehicle class rates and base price.' },
      { time: '02:55', title: 'Driver & Co-Driver Assignment', description: 'Selecting main driver, co-driver, and vehicle plate assignment.' },
      { time: '03:40', title: 'Final Dispatch & Confirmation', description: 'Reviewing trip summary and dispatching to driver mobile app.' }
    ],
    keyTakeaways: [
      'Rate cards auto-calculate rate based on customer, vehicle class, and route.',
      'Adding a co-driver automatically enables split driver payout logic.',
      'Status immediately syncs with the driver mobile app upon dispatch.'
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'vid-2',
    title: 'Driver & Co-Driver 50/50 Equal Payout Calculation',
    category: 'payouts',
    categoryLabel: 'Driver Payouts',
    description: 'Understand how driver payout amounts are determined from rate cards and equally divided when two drivers are assigned.',
    duration: '3:15',
    views: 980,
    thumbnailGradient: 'from-emerald-600 via-teal-600 to-cyan-700',
    steps: [
      { time: '00:00', title: 'Driver Payout Overview', description: 'Explanation of rate card driver payout vs customer billing amount.' },
      { time: '00:40', title: 'Single Driver vs Two Drivers', description: 'How single drivers receive 100% vs 50/50 split for two drivers.' },
      { time: '01:30', title: 'Verifying Payout on Trip Details', description: 'Checking the Driver Payout breakdown box on the trip page.' },
      { time: '02:20', title: 'Driver Financial Ledger', description: 'Where operators can audit historical payouts per driver.' }
    ],
    keyTakeaways: [
      'Rate card defines the total base Driver Payout.',
      'When Driver 1 & Driver 2 are selected, payout is divided 50/50.',
      'Payout amounts remain locked after trip completion for auditing.'
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'vid-3',
    title: 'Creating Commercial Quotations & Multi-Stop Rate Cards',
    category: 'quotations',
    categoryLabel: 'Quotations & Rates',
    description: 'Guide to setting up customer commercial contracts, defining multi-stop routes (e.g. Riyadh -> Al Hasa -> Dammam), and vehicle class pricing.',
    duration: '5:50',
    views: 1850,
    thumbnailGradient: 'from-blue-600 via-indigo-600 to-purple-700',
    steps: [
      { time: '00:00', title: 'Commercial Quotations Ledger', description: 'Navigating to Finance -> Commercial Quotations.' },
      { time: '01:10', title: 'Customer & Vehicle Class Setup', description: 'Selecting vehicle class (3-4 TON, 5 TON, 10 TON, 20 TON, 40 FEET).' },
      { time: '02:30', title: 'Building Multi-Stop Legs', description: 'Adding intermediate stops and final destination.' },
      { time: '04:00', title: 'Defining Base Rate & Driver Payout', description: 'Entering agreed customer billing rate and driver payout.' },
      { time: '05:15', title: 'Saving & Publishing Quotation', description: 'Activating quotation for live trip rate matching.' }
    ],
    keyTakeaways: [
      'Multi-stop routes represent a single commercial rate contract.',
      'Changing route stops on a trip auto-triggers rate card re-matching.',
      'Always associate quotations with active customer accounts.'
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'vid-4',
    title: 'Third-Party Carrier Subcontracting & Partner Trips',
    category: 'dispatch',
    categoryLabel: 'Dispatch & Trips',
    description: 'Learn how to dispatch trips to external third-party fleet partners, record subcontractor costs, and track partner execution.',
    duration: '3:40',
    views: 740,
    thumbnailGradient: 'from-violet-600 via-purple-600 to-pink-700',
    steps: [
      { time: '00:00', title: 'Subcontracting Concept', description: 'When to assign third-party carriers instead of internal fleet.' },
      { time: '00:50', title: 'Selecting 3rd Party Partner', description: 'Choosing external fleet partner from registered vendor list.' },
      { time: '01:45', title: 'Subcontractor Cost & Driver Details', description: 'Entering negotiated cost and partner driver contact info.' },
      { time: '02:50', title: 'Tracking Partner Performance', description: 'Monitoring status updates and POD collection.' }
    ],
    keyTakeaways: [
      'Third-party trips allow recording partner cost for net profit calculation.',
      'Partner drivers can also upload POD documents digitally.',
      'Subcontractor rates stay confidential to operations.'
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'vid-5',
    title: 'Driver Mobile App & Digital POD Upload Guide',
    category: 'mobile',
    categoryLabel: 'Mobile & POD',
    description: 'Walkthrough of the MERCON Mobile Driver App: starting trips, reporting status changes, and uploading physical stamped Proof of Delivery (POD).',
    duration: '2:50',
    views: 2100,
    thumbnailGradient: 'from-rose-600 via-pink-600 to-red-700',
    steps: [
      { time: '00:00', title: 'Mobile Driver App Login', description: 'Driver login with mobile number and PIN.' },
      { time: '00:40', title: 'Assigned Trips View', description: 'Viewing pending, in-transit, and completed trips.' },
      { time: '01:20', title: 'Updating Trip Milestones', description: 'Tapping Arrived at Pickup, Loaded, and En Route.' },
      { time: '02:00', title: 'Capturing & Uploading POD', description: 'Taking photos of paper POD and uploading instantly to dashboard.' }
    ],
    keyTakeaways: [
      'POD uploads immediately transition trip status to Delivered.',
      'High-resolution camera capture ensures readable stamps and signatures.',
      'Works offline with auto-sync when network connection is restored.'
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'vid-6',
    title: 'Vehicle Fleet Maintenance & Pre-Trip Safety Inspections',
    category: 'fleet',
    categoryLabel: 'Fleet & Maintenance',
    description: 'How to log workshop service tasks, schedule preventive maintenance, and track vehicle inspection checklists.',
    duration: '4:10',
    views: 620,
    thumbnailGradient: 'from-slate-700 via-gray-800 to-zinc-900',
    steps: [
      { time: '00:00', title: 'Fleet Maintenance Hub', description: 'Navigating to Fleet -> Vehicle Maintenance.' },
      { time: '00:55', title: 'Logging Service Tasks', description: 'Recording oil changes, tire replacements, and brake repairs.' },
      { time: '02:10', title: 'Cost Tracking & Invoices', description: 'Uploading service invoices and assigning repair expenses.' },
      { time: '03:20', title: 'Safety Inspection Schedules', description: 'Setting next service due date alerts.' }
    ],
    keyTakeaways: [
      'Preventive maintenance prevents vehicle downtime on long hauls.',
      'Maintenance expenses factor directly into Vehicle P&L statements.',
      'Always record odometer readings at time of service.'
    ],
    createdAt: new Date().toISOString()
  }
];

export const learningService = {
  getAll(): VideoTutorial[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const watchedRaw = localStorage.getItem(WATCHED_KEY);
      const watchedMap: Record<string, boolean> = watchedRaw ? JSON.parse(watchedRaw) : { 'vid-1': true };
      
      let tutorials: VideoTutorial[] = stored ? JSON.parse(stored) : DEFAULT_TUTORIALS;
      if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TUTORIALS));
      }

      return tutorials.map(t => ({
        ...t,
        isWatched: !!watchedMap[t.id]
      }));
    } catch {
      return DEFAULT_TUTORIALS;
    }
  },

  toggleWatched(id: string): Record<string, boolean> {
    try {
      const watchedRaw = localStorage.getItem(WATCHED_KEY);
      const watchedMap: Record<string, boolean> = watchedRaw ? JSON.parse(watchedRaw) : { 'vid-1': true };
      watchedMap[id] = !watchedMap[id];
      localStorage.setItem(WATCHED_KEY, JSON.stringify(watchedMap));
      return watchedMap;
    } catch {
      return {};
    }
  },

  getWatchedMap(): Record<string, boolean> {
    try {
      const watchedRaw = localStorage.getItem(WATCHED_KEY);
      return watchedRaw ? JSON.parse(watchedRaw) : { 'vid-1': true };
    } catch {
      return { 'vid-1': true };
    }
  },

  addTutorial(newTutorial: Omit<VideoTutorial, 'id' | 'createdAt' | 'views'>): VideoTutorial[] {
    try {
      const current = this.getAll();
      const created: VideoTutorial = {
        ...newTutorial,
        id: `vid-${Date.now()}`,
        views: 1,
        createdAt: new Date().toISOString()
      };
      const updated = [created, ...current];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    } catch {
      return DEFAULT_TUTORIALS;
    }
  }
};
