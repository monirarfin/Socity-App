import React, { useState, useEffect, useRef } from 'react';
import { 
  Building, 
  FileText, 
  Upload, 
  Download, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle, 
  Calendar, 
  Users, 
  Award, 
  Trash2, 
  Settings, 
  AlertCircle, 
  Lock, 
  Activity, 
  Sparkles, 
  ChevronRight, 
  X, 
  Info,
  Clock,
  MapPin,
  Eye,
  FileCheck2,
  FileArchive,
  Flag
} from 'lucide-react';
import confetti from 'canvas-confetti';

export interface PortalUser {
  name: string;
  email: string;
  avatar: string;
  uid: string;
  joinedAt: string;
}

export interface CommunityComment {
  id: string;
  userName: string;
  userAvatar: string;
  text: string;
  date: string;
  email: string;
}

// TypeScript Interfaces for Strict Safety
interface ProjectLog {
  id: string;
  date: string;
  title: string;
  description: string;
  status: 'info' | 'success' | 'alert';
}

interface ProjectFile {
  id: string;
  name: string;
  size: string;
  type: 'image' | 'document';
  extension: string;
  uploadedAt: string;
  dataUrl: string; // Base64 encoding for realistic offline view / download
}

interface ProjectMilestone {
  id: string;
  title: string;
  plannedDate: string;
  status: 'Pending' | 'In Progress' | 'Completed';
}

interface DevelopmentProject {
  id: string;
  title: string;
  category: 'Infrastructure' | 'Health' | 'Education' | 'Disaster Relief' | 'Agriculture';
  description: string;
  details: string;
  targetFund: number;
  raisedFund: number;
  progress: number; // 0 to 100
  status: 'Planning' | 'In Progress' | 'On Hold' | 'Completed';
  location: string;
  startedDate: string;
  completionDate?: string;
  beneficiariesCount: number;
  gradient: string; // Dynamic CSS gradient banner
  logs: ProjectLog[];
  files: ProjectFile[];
  milestones: ProjectMilestone[];
}

// Helper to backport or initialize default milestones for projects
const getInitialMilestonesForProject = (id: string): ProjectMilestone[] => {
  switch (id) {
    case 'mosque-reconstruct':
      return [
        { id: 'm-mr-1', title: 'Soil Testing & Excavation', plannedDate: 'Jan 20, 2026', status: 'Completed' },
        { id: 'm-mr-2', title: 'Foundation Concrete Pouring', plannedDate: 'Feb 10, 2026', status: 'Completed' },
        { id: 'm-mr-3', title: 'Ground Floor Completed', plannedDate: 'Feb 15, 2026', status: 'Completed' },
        { id: 'm-mr-4', title: 'Second Floor Pillar Framing', plannedDate: 'Mar 30, 2026', status: 'Completed' },
        { id: 'm-mr-5', title: 'Outer Dome Assembly', plannedDate: 'Jun 12, 2026', status: 'In Progress' },
        { id: 'm-mr-6', title: 'Solar Cooling Deployment', plannedDate: 'Aug 05, 2026', status: 'Pending' }
      ];
    case 'deep-wells-sanitation':
      return [
        { id: 'm-dws-1', title: 'Hydrologic Site Assessment', plannedDate: 'Mar 12, 2026', status: 'Completed' },
        { id: 'm-dws-2', title: 'Community Layout Survey', plannedDate: 'Mar 20, 2026', status: 'Completed' },
        { id: 'm-dws-3', title: 'Drilling Casing Site #1 & #2', plannedDate: 'Apr 01, 2026', status: 'Completed' },
        { id: 'm-dws-4', title: 'Drilling & Fitting Site #3', plannedDate: 'May 15, 2026', status: 'In Progress' },
        { id: 'm-dws-5', title: 'Arsenic Laboratory Assay', plannedDate: 'Jun 10, 2026', status: 'Pending' },
        { id: 'm-dws-6', title: 'Site #5 & #6 Water Pump Integration', plannedDate: 'Jul 25, 2026', status: 'Pending' }
      ];
    case 'laptop-literacy-skills':
      return [
        { id: 'm-lls-1', title: 'Secure Lab Location', plannedDate: 'Feb 05, 2026', status: 'Completed' },
        { id: 'm-lls-2', title: 'Broadband Satellite Setup', plannedDate: 'Mar 10, 2026', status: 'Completed' },
        { id: 'm-lls-3', title: 'Hardware Procurement', plannedDate: 'Mar 25, 2026', status: 'Completed' },
        { id: 'm-lls-4', title: 'Student Batch #1 Registration', plannedDate: 'Apr 10, 2026', status: 'Completed' },
        { id: 'm-lls-5', title: 'Course Completion & Graduation', plannedDate: 'May 08, 2026', status: 'Completed' }
      ];
    case 'winter-warmth-relief':
      return [
        { id: 'm-wwr-1', title: 'Suppliers Procurement Audits', plannedDate: 'Dec 10, 2025', status: 'Completed' },
        { id: 'm-wwr-2', title: 'Blanket Depot Allocation', plannedDate: 'Dec 18, 2025', status: 'Completed' },
        { id: 'm-wwr-3', title: 'Rural Workers Logistics Run 1', plannedDate: 'Dec 22, 2025', status: 'Completed' },
        { id: 'm-wwr-4', title: 'Rural Workers Logistics Run 2', plannedDate: 'Jan 15, 2026', status: 'Completed' },
        { id: 'm-wwr-5', title: 'Final Financial Balance Audits', plannedDate: 'Jan 20, 2026', status: 'Completed' }
      ];
    default:
      return [
        { id: 'm-gen-1', title: 'Permits & Community Clearance', plannedDate: 'May 10, 2026', status: 'Completed' },
        { id: 'm-gen-2', title: 'Procurement of Core Materials', plannedDate: 'Jul 15, 2026', status: 'Pending' }
      ];
  }
};

// Initial default high utility projects for the Hazi Bari Foundation
const INITIAL_PROJECTS: DevelopmentProject[] = [
  {
    id: 'mosque-reconstruct',
    title: 'Hazi Bari Jame Masjid Reconstruction Phase II',
    category: 'Infrastructure',
    description: 'Expanding and restoring the historic village mosque using sustainable, modern structure, solar lighting, and rainfall harvesting infrastructure to host over 1,200 worshipers.',
    details: 'This critical construction phase concentrates on finishing the outer dome, assembling the modular second floor for womens welfare programs, and installing modern low-impact eco-cooling setups. The initial foundation phase is completely audited and finalized.',
    targetFund: 1500000,
    raisedFund: 1125000,
    progress: 75,
    status: 'In Progress',
    location: 'Hazi Bari Central, Satkhira BDT',
    startedDate: 'Jan 15, 2026',
    beneficiariesCount: 1800,
    gradient: 'from-emerald-900 via-teal-950 to-slate-950',
    logs: [
      { id: 'log-1', date: 'May 01, 2026', title: 'Second Floor Pillars Set', description: 'Structural pillars completed successfully with verified concrete weight tolerance.', status: 'success' },
      { id: 'log-2', date: 'Apr 10, 2026', title: 'Solar Array Framework Approved', description: 'Procurement of high efficiency photovoltaic cells finalized for off-grid operations.', status: 'info' },
      { id: 'log-3', date: 'Feb 15, 2026', title: 'Ground Floor Open for Prayers', description: 'Interim prayer hall finalized with high volume industrial ventilation systems.', status: 'success' }
    ],
    files: [
      {
        id: 'file-m1',
        name: 'Architectural_Dome_Blueprint.pdf',
        size: '4.2 MB',
        type: 'document',
        extension: 'pdf',
        uploadedAt: 'Jan 20, 2026',
        dataUrl: 'data:text/plain;base64,U0dSTF9CRU9GSUxFX0NPTlRFTlQ='
      },
      {
        id: 'file-m2',
        name: 'Structural_Integrity_Audit_Report.pdf',
        size: '1.8 MB',
        type: 'document',
        extension: 'pdf',
        uploadedAt: 'Mar 02, 2026',
        dataUrl: 'data:text/plain;base64,U0dSTF9CRU9GSUxFX0NPTlRFTlQ='
      }
    ],
    milestones: getInitialMilestonesForProject('mosque-reconstruct')
  },
  {
    id: 'deep-wells-sanitation',
    title: 'Strategic Safe Arsenic-Free Tube-Wells',
    category: 'Health',
    description: 'Sinking 6 high-depth arsenic-filtration tube-wells to grant pure potable water access to disadvantaged sub-regions surrounding the Hazi Bari community fields.',
    details: 'Groundwater arsenic testing remains highly essential in our community. We evaluate deep coordinates to find secure aquifers. A solid concrete protective housing is constructed over each completed drilling site to secure sanitization.',
    targetFund: 300000,
    raisedFund: 210000,
    progress: 70,
    status: 'In Progress',
    location: 'North Hazi Bari & Outer Suburbs',
    startedDate: 'Mar 10, 2026',
    beneficiariesCount: 1200,
    gradient: 'from-cyan-900 via-blue-950 to-slate-950',
    logs: [
      { id: 'log-w1', date: 'May 12, 2026', title: 'Site #3 Aquifer Discovered', description: 'Pure high yield flow identified at 840 feet depth. Zero trace arsenic verified by local council.', status: 'success' },
      { id: 'log-w2', date: 'Apr 02, 2026', title: 'Site #1 & #2 Fully Certified', description: 'Local municipal engineers certified physical casing setups and pure mineral counts.', status: 'success' }
    ],
    files: [
      {
        id: 'file-w1',
        name: 'Arsenic_Chemical_Assay_Certificates.pdf',
        size: '1.1 MB',
        type: 'document',
        extension: 'pdf',
        uploadedAt: 'Apr 05, 2026',
        dataUrl: 'data:text/plain;base64,U0dSTF9CRU9GSUxFX0NPTlRFTlQ='
      }
    ],
    milestones: getInitialMilestonesForProject('deep-wells-sanitation')
  },
  {
    id: 'laptop-literacy-skills',
    title: 'Hazi Bari Primary Education & IT Hub',
    category: 'Education',
    description: 'Developing a central computer lab containing 8 robust study workstations, internet connection, and organized basic software skill courses for local youth.',
    details: 'Fostering IT and remote work skills changes the baseline economy. This program provides guided sessions in English, digital design, basic coding, and bookkeeping spreadsheet operations overseen by volunteer developers.',
    targetFund: 650000,
    raisedFund: 650000,
    progress: 100,
    status: 'Completed',
    location: 'Community Library wing, Hall B',
    startedDate: 'Feb 01, 2026',
    completionDate: 'May 08, 2026',
    beneficiariesCount: 450,
    gradient: 'from-indigo-900 via-slate-900 to-zinc-950',
    logs: [
      { id: 'log-e1', date: 'May 08, 2026', title: 'Inaugural Graduation Ceremony', description: 'First batch of 35 students finished basic spreadsheet & web navigation modules.', status: 'success' },
      { id: 'log-e2', date: 'Mar 15, 2026', title: 'Broadband Satellite Active', description: 'Fitted heavy-use dish allowing consistent 50mbps connection across terminal cells.', status: 'success' }
    ],
    files: [
      {
        id: 'file-e1',
        name: 'Curriculum_Syllabus_2026.pdf',
        size: '890 KB',
        type: 'document',
        extension: 'pdf',
        uploadedAt: 'Feb 10, 2026',
        dataUrl: 'data:text/plain;base64,U0dSTF9CRU9GSUxFX0NPTlRFTlQ='
      }
    ],
    milestones: getInitialMilestonesForProject('laptop-literacy-skills')
  },
  {
    id: 'winter-warmth-relief',
    title: 'Emergency Winter Warmth Distribution',
    category: 'Disaster Relief',
    description: 'Procuring and transporting 1,500 heavy-insulated wool blankets and warm accessories directly to elderly and marginalized rural workers facing sudden freezing winter cycles.',
    details: 'This crucial relief drive targeted the coldest settlements in the northern boundaries. Working closely with local volunteers, the Hazi Bari logistical cells secured streamlined audit-verified distribution logs to prevent overlapping distribution.',
    targetFund: 250000,
    raisedFund: 250000,
    progress: 100,
    status: 'Completed',
    location: 'Greater Satkhira Bordering Zones',
    startedDate: 'Dec 05, 2025',
    completionDate: 'Jan 20, 2026',
    beneficiariesCount: 1500,
    gradient: 'from-amber-900 via-stone-900 to-slate-950',
    logs: [
      { id: 'log-r1', date: 'Jan 20, 2026', title: 'Wrapping Up Audited Purchase Ledger', description: 'Final financial sheets reviewed. Zero discrepancies reported inside relief treasury.', status: 'success' },
      { id: 'log-r2', date: 'Dec 22, 2025', title: 'Stage 1 Distribution Completed', description: 'Dispatched and hand-delivered 800 heavy blanket packets to targeted farmers.', status: 'success' }
    ],
    files: [
      {
        id: 'file-r1',
        name: 'Purchase_Receipts_Audit.pdf',
        size: '2.4 MB',
        type: 'document',
        extension: 'pdf',
        uploadedAt: 'Jan 22, 2026',
        dataUrl: 'data:text/plain;base64,U0dSTF9CRU9GSUxFX0NPTlRFTlQ='
      }
    ],
    milestones: getInitialMilestonesForProject('winter-warmth-relief')
  }
];

export default function App() {
  // Application state with clean dynamic synchronization
  const [projects, setProjects] = useState<DevelopmentProject[]>(() => {
    const saved = localStorage.getItem('hazibari_projects');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Cleanly backport milestones if missing in old saved localStorage items
        return parsed.map((p: any) => ({
          ...p,
          milestones: p.milestones || getInitialMilestonesForProject(p.id)
        }));
      } catch (err) {
        return INITIAL_PROJECTS;
      }
    }
    return INITIAL_PROJECTS;
  });

  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [isAdminMode, setIsAdminMode] = useState<boolean>(true); // Admin toggle enabled naturally
  
  // Filtering and Searching parameters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  // Interactive Create Project State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'Infrastructure' | 'Health' | 'Education' | 'Disaster Relief' | 'Agriculture'>('Infrastructure');
  const [newDescription, setNewDescription] = useState('');
  const [newDetails, setNewDetails] = useState('');
  const [newTargetFund, setNewTargetFund] = useState('');
  const [newRaisedFund, setNewRaisedFund] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newBeneficiaries, setNewBeneficiaries] = useState('');
  const [newGradient, setNewGradient] = useState('from-indigo-900 via-slate-950 to-emerald-950');

  // Interactive Live Add Progress Update Log state
  const [logTitle, setLogTitle] = useState('');
  const [logDesc, setLogDesc] = useState('');
  const [logStatus, setLogStatus] = useState<'info' | 'success' | 'alert'>('success');

  // Interactive Milestone states
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState('');
  const [newMilestoneStatus, setNewMilestoneStatus] = useState<'Pending' | 'In Progress' | 'Completed'>('Pending');

  // File Upload State
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic status edits in sidebar
  const [editingProgressValue, setEditingProgressValue] = useState<number>(0);
  const [editingStatusValue, setEditingStatusValue] = useState<'Planning' | 'In Progress' | 'On Hold' | 'Completed'>('In Progress');

  // Lightbox for base64 images
  const [activeLightboxImage, setActiveLightboxImage] = useState<{ name: string; url: string } | null>(null);

  // Google User Auth States (নতুন ইউজার এ্যাপ গুগল সাইন আপ)
  const [currentUser, setCurrentUser] = useState<PortalUser | null>(() => {
    const saved = localStorage.getItem('hazibari_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showOneTap, setShowOneTap] = useState(false);
  const [oneTapDismissed, setOneTapDismissed] = useState(() => {
    return localStorage.getItem('hazibari_onetap_dismissed') === 'true';
  });

  // Custom User Feedback/Discussion State
  const [projectComments, setProjectComments] = useState<Record<string, CommunityComment[]>>(() => {
    const saved = localStorage.getItem('hazibari_comments');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        return {};
      }
    }
    // Pre-seed some beautiful comments
    return {
      'mosque-reconstruct': [
        {
          id: 'comm-1',
          userName: 'Monir Ahamed Arfin',
          userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100',
          text: 'মাশাল্লাহ! খুব সুন্দর কাজ হচ্ছে। পরিবেশবান্ধব কুলিং ফিটিংস সত্যিই আধুনিক ও যুগোপযোগী উদ্যোগ।',
          date: 'May 16, 2026',
          email: 'mdmonirahamedarfin@gmail.com'
        }
      ]
    };
  });

  // Trigger Google One Tap slider after 2 seconds if user is not logged in and not dismissed
  useEffect(() => {
    let timer: any = null;
    if (!currentUser && !oneTapDismissed) {
      timer = setTimeout(() => {
        setShowOneTap(true);
      }, 2000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [currentUser, oneTapDismissed]);

  // Persistent System Saving
  useEffect(() => {
    localStorage.setItem('hazibari_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('hazibari_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('hazibari_user');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('hazibari_comments', JSON.stringify(projectComments));
  }, [projectComments]);

  const selectedProject = projects.find(p => p.id === selectedProjectId) || projects[0];

  useEffect(() => {
    if (selectedProject) {
      setEditingProgressValue(selectedProject.progress);
      setEditingStatusValue(selectedProject.status);
    }
  }, [selectedProjectId]);

  // Status Colors styling helpers
  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Infrastructure': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Health': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'Education': return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
      case 'Disaster Relief': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Agriculture': return 'bg-lime-500/10 text-lime-400 border-lime-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-emerald-500 text-white font-semibold text-xs border border-emerald-600';
      case 'In Progress': return 'bg-blue-600 text-white font-semibold text-xs border border-blue-700 animate-pulse-slow';
      case 'On Hold': return 'bg-amber-500 text-slate-950 font-semibold text-xs border border-amber-600';
      case 'Planning': return 'bg-slate-600 text-slate-100 font-semibold text-xs border border-slate-700';
      default: return 'bg-slate-200 text-slate-800 text-xs';
    }
  };

  const getTimelineLogIconStyle = (status: 'info' | 'success' | 'alert') => {
    switch (status) {
      case 'success': return 'bg-emerald-500/20 text-emerald-400 ring-4 ring-emerald-505/10';
      case 'info': return 'bg-blue-500/20 text-blue-400 ring-4 ring-blue-505/10';
      case 'alert': return 'bg-rose-500/20 text-rose-400 ring-4 ring-rose-505/10';
    }
  };

  // Helper calculation metrics
  const totalProjectsCount = projects.length;
  const ongoingProjectsCount = projects.filter(p => p.status === 'In Progress').length;
  const completedProjectsCount = projects.filter(p => p.status === 'Completed').length;
  const totalRaisedValue = projects.reduce((sum, p) => sum + p.raisedFund, 0);
  const totalTargetValue = projects.reduce((sum, p) => sum + p.targetFund, 0);
  const overallRaisedPercentage = totalTargetValue > 0 ? Math.round((totalRaisedValue / totalTargetValue) * 100) : 0;
  
  const totalFilesCount = projects.reduce((sum, p) => sum + p.files.length, 0);

  // Filtering Logic
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesStatus = selectedStatus === 'All' || p.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Action: Add Progress Log
  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logTitle.trim() || !logDesc.trim()) return;

    const newLogItem: ProjectLog = {
      id: 'log-' + Date.now(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      title: logTitle,
      description: logDesc,
      status: logStatus
    };

    setProjects(prev => prev.map(p => {
      if (p.id === selectedProjectId) {
        return {
          ...p,
          logs: [newLogItem, ...p.logs]
        };
      }
      return p;
    }));

    setLogTitle('');
    setLogDesc('');
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#059669', '#10b981', '#34d399']
    });
  };

  // Action: Delete Progress Log
  const handleDeleteLog = (projectId: string, logId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          logs: p.logs.filter(l => l.id !== logId)
        };
      }
      return p;
    }));
  };

  // Action: Delete Attached File
  const handleDeleteFile = (projectId: string, fileId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          files: p.files.filter(f => f.id !== fileId)
        };
      }
      return p;
    }));
  };

  // Action: Add Milestone
  const handleCreateMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim() || !newMilestoneDate.trim()) return;

    // Make date more readable if user inputted YYYY-MM-DD
    let formattedDate = newMilestoneDate;
    try {
      const parsedDate = new Date(newMilestoneDate);
      if (!isNaN(parsedDate.getTime())) {
        formattedDate = parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    } catch (e) {
      // Keep as-is
    }

    const addedItem: ProjectMilestone = {
      id: 'milestone-' + Date.now(),
      title: newMilestoneTitle,
      plannedDate: formattedDate,
      status: newMilestoneStatus
    };

    setProjects(prev => prev.map(p => {
      if (p.id === selectedProjectId) {
        const autoLog: ProjectLog = {
          id: 'log-sys-milestone-' + Date.now(),
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          title: `Milestone Added: ${newMilestoneTitle}`,
          description: `Planned for ${formattedDate} (${newMilestoneStatus} status).`,
          status: 'success'
        };
        return {
          ...p,
          milestones: [...(p.milestones || []), addedItem],
          logs: [autoLog, ...p.logs]
        };
      }
      return p;
    }));

    setNewMilestoneTitle('');
    setNewMilestoneDate('');
    setNewMilestoneStatus('Pending');

    confetti({
      particleCount: 60,
      spread: 40,
      colors: ['#10b981', '#34d399', '#6ee7b7']
    });
  };

  // Action: Delete Milestone
  const handleDeleteMilestone = (projectId: string, milestoneId: string) => {
    const targetProj = projects.find(p => p.id === projectId);
    const targetMilestone = targetProj?.milestones?.find(m => m.id === milestoneId);
    
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const autoLog: ProjectLog = {
          id: 'log-sys-milestone-del-' + Date.now(),
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          title: `Milestone Removed: ${targetMilestone ? targetMilestone.title : 'Charter Goal'}`,
          description: `Deleted structural milestone from project goals database.`,
          status: 'alert'
        };
        return {
          ...p,
          milestones: (p.milestones || []).filter(m => m.id !== milestoneId),
          logs: [autoLog, ...p.logs]
        };
      }
      return p;
    }));
  };

  // Action: Update Milestone Status
  const handleUpdateMilestoneStatus = (projectId: string, milestoneId: string, status: 'Pending' | 'In Progress' | 'Completed') => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const targetMilestone = (p.milestones || []).find(m => m.id === milestoneId);
        const oldStatus = targetMilestone?.status || 'Pending';
        
        const updatedMilestones = (p.milestones || []).map(m => {
          if (m.id === milestoneId) {
            return { ...m, status };
          }
          return m;
        });

        const autoLog: ProjectLog = {
          id: 'log-sys-milestone-upd-' + Date.now(),
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          title: `Goal Status Shifted: ${targetMilestone ? targetMilestone.title : 'Scope Point'}`,
          description: `Milestone status changed from "${oldStatus}" to "${status}".`,
          status: status === 'Completed' ? 'success' : 'info'
        };

        if (status === 'Completed') {
          confetti({
            particleCount: 50,
            spread: 30,
            colors: ['#10b981', '#059669']
          });
        }

        return {
          ...p,
          milestones: updatedMilestones,
          logs: [autoLog, ...p.logs]
        };
      }
      return p;
    }));
  };

  // Action: Update Progress Stats
  const handleUpdateProgressConfig = () => {
    if (!selectedProject) return;
    
    setProjects(prev => prev.map(p => {
      if (p.id === selectedProjectId) {
        const isComplete = editingStatusValue === 'Completed' ? 100 : editingProgressValue;
        
        // Log auto system alert
        const progressChangedText = `Project status modified to ${editingStatusValue} (${isComplete}% complete).`;
        const autoLog: ProjectLog = {
          id: 'log-sys-' + Date.now(),
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          title: 'Status Assessment Metric Updated',
          description: progressChangedText,
          status: 'info'
        };

        if (isComplete === 100) {
          confetti({
            particleCount: 150,
            spread: 90,
            origin: { y: 0.5 }
          });
        }

        return {
          ...p,
          progress: isComplete,
          status: editingStatusValue,
          logs: [autoLog, ...p.logs]
        };
      }
      return p;
    }));
  };

  // Action: Google Auth & Discussions Operators (নতুন ইউজার এ্যাপ গুগল সাইন আপ)
  const handleGoogleSignInSimulated = (account: { name: string; email: string; avatar: string }) => {
    setIsSigningIn(true);
    
    // Smooth Google OAuth loader simulator
    setTimeout(() => {
      const newUser: PortalUser = {
        name: account.name,
        email: account.email,
        avatar: account.avatar,
        uid: 'google-usr-' + Math.random().toString(36).substring(2, 9),
        joinedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      };
      
      setCurrentUser(newUser);
      setIsSigningIn(false);
      setShowAuthModal(false);
      setShowOneTap(false);

      // Save Google Sign Up success log inside project development dashboard
      const signupLog: ProjectLog = {
        id: 'log-sys-signup-' + Date.now(),
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        title: `Google Sign-Up: ${account.name}`,
        description: `Successfully authenticated through secure Google One Tap Node (${account.email}).`,
        status: 'success'
      };

      setProjects(prev => prev.map(p => {
        if (p.id === selectedProjectId) {
          return {
            ...p,
            logs: [signupLog, ...p.logs]
          };
        }
        return p;
      }));

      // Pop lots of energetic confetti for Google Sign-up Success
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#4285F4', '#EA4335', '#FBBC05', '#34A853'] // Google Palette
      });
    }, 1200);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setShowOneTap(false);
    // Remove dismissed to allow testing again
    localStorage.removeItem('hazibari_onetap_dismissed');
    setOneTapDismissed(false);
  };

  const handleAddComment = (text: string) => {
    if (!currentUser || !text.trim() || !selectedProjectId) return;

    const newComment: CommunityComment = {
      id: 'comm-' + Date.now(),
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      text: text.trim(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      email: currentUser.email
    };

    setProjectComments(prev => ({
      ...prev,
      [selectedProjectId]: [...(prev[selectedProjectId] || []), newComment]
    }));

    confetti({
      particleCount: 30,
      spread: 25,
      colors: ['#34d399', '#10b981']
    });
  };

  // Action: Upload Document/Image Handler (Base64 converter)
  const processUploadedFiles = (fileList: FileList) => {
    if (!selectedProject) return;

    Array.from(fileList).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        const fileType = ['jpg', 'jpeg', 'png', 'svg', 'webp', 'gif'].includes(extension) ? 'image' : 'document';
        
        const newAttachedFile: ProjectFile = {
          id: 'file-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          name: file.name,
          size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
          type: fileType as 'image' | 'document',
          extension,
          uploadedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          dataUrl
        };

        setProjects(prev => prev.map(p => {
          if (p.id === selectedProjectId) {
            const autoLog: ProjectLog = {
              id: 'log-sys-file-' + Date.now(),
              date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              title: `${fileType === 'image' ? 'Image Visual' : 'Document Specification'} Added`,
              description: `Uploaded file attachment "${file.name}" to safe vault storage.`,
              status: 'success'
            };
            return {
              ...p,
              files: [newAttachedFile, ...p.files],
              logs: [autoLog, ...p.logs]
            };
          }
          return p;
        }));

        confetti({
          particleCount: 50,
          spread: 40,
          colors: ['#06b6d4', '#3b82f6']
        });
      };
      
      reader.readAsDataURL(file);
    });
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUploadedFiles(e.dataTransfer.files);
    }
  };

  const triggerFileSelection = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processUploadedFiles(e.target.files);
    }
  };

  // Action: Create Project
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim() || !newTargetFund.trim()) return;

    const projectId = newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    // Fallback ID collision check
    const idExists = projects.some(p => p.id === projectId);
    const finalProjectId = idExists ? `${projectId}-${Date.now().toString().slice(-4)}` : projectId;

    const addedProject: DevelopmentProject = {
      id: finalProjectId,
      title: newTitle,
      category: newCategory,
      description: newDescription,
      details: newDetails || 'Specific operational parameters are in documentation reviews.',
      targetFund: Number(newTargetFund),
      raisedFund: Number(newRaisedFund) || 0,
      progress: 0,
      status: 'Planning',
      location: newLocation || 'Hazi Bari Main Campus',
      startedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      beneficiariesCount: Number(newBeneficiaries) || 500,
      gradient: newGradient,
      logs: [
        {
          id: 'log-initial',
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          title: 'Project Initiated',
          description: 'Hazi Bari Philanthropic Committee approved project charter & community metrics.',
          status: 'success'
        }
      ],
      files: [],
      milestones: [
        { id: 'm-new-' + Date.now() + '-1', title: 'Permit Approval & Community Board Clearing', plannedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), status: 'Completed' },
        { id: 'm-new-' + Date.now() + '-2', title: 'Vendor Alignment and Sourcing Logistics', plannedDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), status: 'Pending' },
        { id: 'm-new-' + Date.now() + '-3', title: 'Active Groundwork & Testing Phase', plannedDate: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), status: 'Pending' }
      ]
    };

    setProjects(prev => [addedProject, ...prev]);
    setSelectedProjectId(finalProjectId);
    setShowCreateModal(false);

    // Reset fields
    setNewTitle('');
    setNewDescription('');
    setNewDetails('');
    setNewTargetFund('');
    setNewRaisedFund('');
    setNewLocation('');
    setNewBeneficiaries('');

    confetti({
      particleCount: 150,
      spread: 80,
      colors: ['#f59e0b', '#10b981', '#3b82f6']
    });
  };

  const handleDeleteProject = (projId: string) => {
    const confirmation = window.confirm("Are you absolutely sure you want to delete this developmental project from the Hazi Bari Showcase registry? All uploaded images and associated audits will be permanently removed.");
    if (!confirmation) return;

    const updated = projects.filter(p => p.id !== projId);
    setProjects(updated);
    if (selectedProjectId === projId && updated.length > 0) {
      setSelectedProjectId(updated[0].id);
    }
  };

  // Helper Mock Download initiator
  const initiateMockDownload = (file: ProjectFile) => {
    const link = document.createElement('a');
    link.href = file.dataUrl;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="app-root" className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans select-none selection:bg-emerald-500 selection:text-white">
      
      {/* Dynamic Photo Lightbox */}
      {activeLightboxImage && (
        <div id="lightbox-container" className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <button 
            id="close-lightbox"
            onClick={() => setActiveLightboxImage(null)}
            className="absolute top-4 right-4 bg-slate-800 p-3 rounded-full hover:bg-slate-700 transition text-slate-300"
          >
            <X size={24} />
          </button>
          
          <div className="max-w-4xl max-h-[80vh] overflow-hidden rounded-xl border border-slate-700/50 shadow-2xl">
            <img 
              id="lightbox-image"
              src={activeLightboxImage.url} 
              alt={activeLightboxImage.name} 
              className="object-contain w-full h-full"
            />
          </div>
          
          <div className="mt-4 text-center">
            <p id="lightbox-filename" className="text-sm font-semibold tracking-wide text-slate-200">{activeLightboxImage.name}</p>
            <p className="text-xs text-slate-400 mt-1">Stored securely in modern base-64 Local Vault</p>
          </div>
        </div>
      )}

      {/* Top Professional Portal Header */}
      <header id="main-header" className="border-b border-slate-800 bg-slate-950/80 sticky top-0 backdrop-blur-xl z-20 transition-all duration-300">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          
          {/* Logo & Branding mark */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-lg shadow-emerald-500/5">
              <Building className="h-5 w-5 animate-pulse-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-lg tracking-tight text-white">HAZI BARI FOUNDATION</span>
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Development Portal</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Trust & Accountability in Communal Progress</p>
            </div>
          </div>

          {/* Configuration Switches / Controls & Google Sign Up (নতুন ইউজার এ্যাপ) */}
          <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap sm:flex-nowrap">
            
            {/* Google Authentication Control */}
            {currentUser ? (
              <div id="user-header-profile" className="flex items-center gap-2 bg-slate-905 border border-slate-800 rounded-lg p-1 pr-2.5">
                <img 
                  id="user-avatar-element"
                  src={currentUser.avatar} 
                  alt={currentUser.name} 
                  referrerPolicy="no-referrer"
                  className="h-7 w-7 rounded-md border border-slate-750 object-cover" 
                />
                <div className="hidden md:block text-left">
                  <p id="user-display-name" className="text-[11px] font-bold text-white leading-tight">{currentUser.name}</p>
                  <p className="text-[9px] text-slate-400 leading-tight font-mono font-semibold">Registered Viewer</p>
                </div>
                <button
                  id="logout-btn-header"
                  onClick={handleLogout}
                  className="ml-1.5 px-2 py-0.5 bg-slate-900 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800 rounded transition"
                  title="Sign Out"
                >
                  <span className="text-[9px] uppercase font-mono tracking-wider font-extrabold">Log Out</span>
                </button>
              </div>
            ) : (
              <button
                id="sign-up-google-trigger"
                onClick={() => setShowAuthModal(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition-all rounded-lg text-xs font-semibold text-white cursor-pointer"
              >
                {/* Google Multi-colored SVG Logo */}
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                <span className="font-sans font-bold">Google Sign Up</span>
              </button>
            )}

            <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-0.5">
              <button 
                id="toggle-public-view"
                onClick={() => setIsAdminMode(false)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${!isAdminMode ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                Public View
              </button>
              <button 
                id="toggle-admin-view"
                onClick={() => setIsAdminMode(true)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${isAdminMode ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                <Lock size={12} />
                Admin Controls
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* Hero Analytics Bar */}
      <section id="hero-analytics" className="bg-slate-950 border-b border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            
            <div id="metric-total-invested" className="bg-slate-900/40 border border-slate-800/60 p-4 rounded-xl flex items-center gap-3.5 hover:border-slate-700/55 transition-all">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <span className="font-display text-xl font-bold">৳</span>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-mono font-bold">Total Capital Invested</p>
                <p className="font-display text-lg sm:text-2xl font-bold text-white mt-0.5 font-mono">৳{(totalRaisedValue).toLocaleString()}</p>
                <div className="flex items-center gap-1 text-[10px] text-emerald-400 mt-1">
                  <CheckCircle size={10} />
                  <span>{overallRaisedPercentage}% Fund Goal Met</span>
                </div>
              </div>
            </div>

            <div id="metric-completed-projects" className="bg-slate-900/40 border border-slate-800/60 p-4 rounded-xl flex items-center gap-3.5 hover:border-slate-700/55 transition-all">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Award size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-mono font-bold">Active Scope Scale</p>
                <p className="font-display text-lg sm:text-2xl font-bold text-white mt-0.5">{completedProjectsCount}<span className="text-slate-500 text-sm font-light"> / {totalProjectsCount} Built</span></p>
                <p className="text-[10px] text-slate-400 mt-1 italic">{ongoingProjectsCount} in active progression</p>
              </div>
            </div>

            <div id="metric-specifications-vault" className="bg-slate-900/40 border border-slate-800/60 p-4 rounded-xl flex items-center gap-3.5 hover:border-slate-700/55 transition-all">
              <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                <FileCheck2 size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-mono font-bold">Specifications Vault</p>
                <p className="font-display text-lg sm:text-2xl font-bold text-white mt-0.5">{totalFilesCount} <span className="text-slate-500 text-sm font-light">Files</span></p>
                <p className="text-[10px] text-cyan-400 mt-1 flex items-center gap-1">
                  <Activity size={10} className="animate-pulse" /> Live Uploads Retained
                </p>
              </div>
            </div>

            <div id="metric-direct-beneficiaries" className="bg-slate-900/40 border border-slate-800/60 p-4 rounded-xl flex items-center gap-3.5 hover:border-slate-700/55 transition-all">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                <Users size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-mono font-bold">Estimated Impact</p>
                <p className="font-display text-lg sm:text-2xl font-bold text-white mt-0.5">
                  {(projects.reduce((sum, p) => sum + p.beneficiariesCount, 0)).toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                  <Sparkles size={10} className="text-amber-400" /> Rural souls impacted directly
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Main Panel Workspace */}
      <main id="main-content-layout" className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-6">
        
        {/* Left Side: Navigation Filter Shell & Project Showcase Grid */}
        <section id="showcase-left-panel" className="w-full lg:w-5/12 flex flex-col gap-4">
          
          <div id="filter-shell" className="bg-slate-950 p-4 rounded-xl border border-slate-800/70 shadow-xl space-y-4">
            
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-white text-base flex items-center gap-2">
                <Activity size={16} className="text-emerald-500" />
                Project Showcase Catalogue
              </h2>
              {isAdminMode && (
                <button 
                  id="open-create-modal"
                  onClick={() => setShowCreateModal(true)}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1 transition shadow-lg shadow-emerald-900/25 cursor-pointer"
                >
                  <Plus size={14} /> Add Project
                </button>
              )}
            </div>

            {/* Direct Instant Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input 
                id="search-input"
                type="text"
                placeholder="Search blueprints, locations, budgets..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-850 rounded-lg text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 text-slate-100 transition-all"
              />
              {searchQuery && (
                <button 
                  id="clear-search"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 hover:text-white text-slate-500"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Structured Dual Select Filters */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">Category Sector</label>
                <div className="relative">
                  <Filter className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <select 
                    id="filter-category"
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 bg-slate-900 border border-slate-850 rounded-lg text-xs focus:outline-none focus:border-emerald-500 text-slate-100 italic"
                  >
                    <option value="All">All Sectors</option>
                    <option value="Infrastructure">Infrastructure</option>
                    <option value="Health">Health</option>
                    <option value="Education">Education</option>
                    <option value="Disaster Relief">Disaster Relief</option>
                    <option value="Agriculture">Agriculture</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">Operational Status</label>
                <div className="relative">
                  <Filter className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <select 
                    id="filter-status"
                    value={selectedStatus}
                    onChange={e => setSelectedStatus(e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 bg-slate-900 border border-slate-850 rounded-lg text-xs focus:outline-none focus:border-emerald-500 text-slate-100 italic"
                  >
                    <option value="All">All States</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Planning">Planning</option>
                    <option value="On Hold">On Hold</option>
                  </select>
                </div>
              </div>
            </div>

          </div>

          {/* Project List Column */}
          <div id="project-list-wrapper" className="space-y-3 max-h-[66vh] overflow-y-auto pr-1">
            {filteredProjects.length === 0 ? (
              <div id="no-projects-found" className="bg-slate-950 border border-slate-850 p-8 rounded-xl text-center space-y-2">
                <AlertCircle className="mx-auto h-10 w-10 text-slate-600" />
                <p className="text-sm font-semibold text-slate-400">No Projects Found</p>
                <p className="text-xs text-slate-500">Refine or expand your filter targets or add a new Hazi Bari charter.</p>
              </div>
            ) : (
              filteredProjects.map((proj) => {
                const isFocused = proj.id === selectedProjectId;
                const fundPercentage = Math.round((proj.raisedFund / proj.targetFund) * 100);

                return (
                  <div 
                    key={proj.id}
                    id={`project-card-${proj.id}`}
                    onClick={() => setSelectedProjectId(proj.id)}
                    className={`group/card relative rounded-xl border p-4 cursor-pointer transition-all duration-300 transform hover:-translate-y-0.5 ${
                      isFocused 
                      ? 'bg-slate-950 border-emerald-500/80 shadow-[0_4px_24px_rgba(16,185,129,0.06)]' 
                      : 'bg-slate-950/60 border-slate-850 hover:bg-slate-950 hover:border-slate-700'
                    }`}
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getCategoryColor(proj.category)}`}>
                        {proj.category}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${getStatusBadge(proj.status)}`}>
                        {proj.status}
                      </span>
                    </div>

                    <h3 className="font-display font-bold text-sm text-white group-hover/card:text-emerald-400 transition-colors line-clamp-1">
                      {proj.title}
                    </h3>
                    
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {proj.description}
                    </p>

                    {/* Funding representation */}
                    <div className="mt-3 grid grid-cols-2 text-[10px] border-t border-slate-900 pt-2.5">
                      <div>
                        <span className="text-slate-500 block uppercase font-mono">Raised Funding</span>
                        <span className="text-white font-bold font-mono">৳{proj.raisedFund.toLocaleString()}</span>
                        <span className="text-slate-500 font-normal"> ({fundPercentage}%)</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 block uppercase font-mono">Target Budget</span>
                        <span className="text-slate-300 font-semibold font-mono">৳{proj.targetFund.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Progress Indicator */}
                    <div className="mt-2.5">
                      <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                        <span>Milestone Success</span>
                        <span className="font-bold text-emerald-400">{proj.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full transition-all duration-700" 
                          style={{ width: `${proj.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Footer Location & File Counter */}
                    <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <MapPin size={10} className="text-slate-600" />
                        {proj.location}
                      </span>
                      <span className="flex items-center gap-1.5 font-mono text-emerald-400 font-bold bg-emerald-950/45 px-1.5 py-0.5 rounded border border-emerald-900/40">
                        <FileText size={10} />
                        {proj.files.length} Spec Vaulted
                      </span>
                    </div>

                    {/* Arrow decorator */}
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/card:opacity-100 group-hover/card:translate-x-1 transition-all duration-300">
                      <ChevronRight size={16} className="text-emerald-500" />
                    </div>

                    {/* Quick Delete Admin Tool */}
                    {isAdminMode && (
                      <button 
                        id={`delete-project-${proj.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(proj.id);
                        }}
                        className="absolute bottom-2 right-2 p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded border border-rose-500/20 opacity-0 group-hover/card:opacity-100 transition-opacity"
                        title="Delete Project Space"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}

                  </div>
                );
              })
            )}
          </div>

        </section>

        {/* Right Side: Immersive Inspection Workspace & Upload Cockpit */}
        <section id="showcase-right-panel" className="w-full lg:w-7/12">
          
          {!selectedProject ? (
            <div id="no-active-workspace" className="h-full bg-slate-950 border border-slate-850 rounded-2xl flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="h-14 w-14 rounded-full bg-slate-900 border border-slate-850 flex items-center justify-center text-slate-600">
                <Building size={28} />
              </div>
              <div>
                <p className="text-base font-bold text-white">No active project selected</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">Please select a Hazi Bari development project from the left showcase list to investigate blueprints, files, logs, and upload audits.</p>
              </div>
            </div>
          ) : (
            <div id="active-workspace-panel" className="bg-slate-950 rounded-2xl border border-slate-800/80 shadow-2xl overflow-hidden flex flex-col h-full">
              
              {/* Cover Banner Theme */}
              <div id="project-workspace-banner" className={`bg-gradient-to-r ${selectedProject.gradient} p-6 sm:p-8 relative overflow-hidden shrink-0 border-b border-slate-800`}>
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
                <div className="absolute right-0 top-0 w-1/3 h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />
                
                <div className="relative z-10 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase bg-emerald-500 text-white font-bold shadow-md shadow-emerald-900/30`}>
                      {selectedProject.category}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono border border-white/20 bg-white/10 text-white/90">
                      Est. {selectedProject.startedDate}
                    </span>
                  </div>

                  <h1 id="workspace-project-title" className="font-display font-extrabold text-xl sm:text-2xl text-white tracking-tight leading-snug">
                    {selectedProject.title}
                  </h1>

                  <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-300">
                    <span className="flex items-center gap-1">
                      <MapPin size={13} className="text-emerald-400" />
                      {selectedProject.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={13} className="text-cyan-400" />
                      {selectedProject.beneficiariesCount}+ Impacted souls
                    </span>
                    {selectedProject.completionDate && (
                      <span className="flex items-center gap-1 text-emerald-300 font-semibold">
                        <CheckCircle size={13} />
                        Completed On {selectedProject.completionDate}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Segmented Panels Tab Navigation (Details, Documents Vault, Progress Logs) */}
              <div className="p-6 space-y-6 flex-1 overflow-y-auto max-h-[85vh]">
                
                {/* Project Overview Meta Details Card */}
                <div id="panel-metrics-row" className="grid grid-cols-3 gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-900">
                  <div className="text-center sm:text-left">
                    <span className="text-[9px] uppercase tracking-wider font-mono text-slate-500 font-bold block">Status Index</span>
                    <span className="inline-flex mt-1.5"><span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-extrabold ${getStatusBadge(selectedProject.status)}`}>{selectedProject.status}</span></span>
                  </div>
                  
                  <div className="text-center sm:text-left border-l border-slate-800/80 pl-4">
                    <span className="text-[9px] uppercase tracking-wider font-mono text-slate-500 font-bold block">Consolidated Fund</span>
                    <p className="text-sm font-extrabold font-mono text-white mt-1">
                      ৳{selectedProject.raisedFund.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono">of ৳{selectedProject.targetFund.toLocaleString()} target</span>
                  </div>

                  <div className="text-center sm:text-left border-l border-slate-800/80 pl-4">
                    <span className="text-[9px] uppercase tracking-wider font-mono text-slate-500 font-bold block">Milestone Complete</span>
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-1">
                      <span className="text-sm font-extrabold font-mono text-emerald-400">{selectedProject.progress}%</span>
                      <div className="hidden sm:block h-2.5 w-16 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${selectedProject.progress}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main description section */}
                <div id="project-description-box" className="space-y-2">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-extrabold flex items-center gap-1.5">
                    <Info size={14} className="text-emerald-500" />
                    Project Background & Charter
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed font-sans">
                    {selectedProject.details}
                  </p>
                </div>

                {/* KEY MILESTONES WORKSPACE CHECKLIST */}
                <div id="project-milestones-checklist-container" className="space-y-4 bg-slate-900/30 p-5 rounded-xl border border-slate-900">
                  
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Flag size={15} className="text-emerald-500 animate-pulse-slow font-bold" />
                      <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-extrabold">
                        Key Milestone Assessment & Checklist
                      </h3>
                    </div>
                    {/* Milestone metrics KPI overview */}
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-mono font-bold">
                      {selectedProject.milestones?.filter(m => m.status === 'Completed').length || 0} / {selectedProject.milestones?.length || 0} Completed
                    </span>
                  </div>

                  {/* Checklist Rows wrapper */}
                  {(!selectedProject.milestones || selectedProject.milestones.length === 0) ? (
                    <div className="py-4 text-center text-slate-500 text-xs italic">
                      No key milestones uploaded for this project charter yet.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedProject.milestones.map((m) => {
                        return (
                          <div 
                            key={m.id} 
                            id={`milestone-row-${m.id}`}
                            className="flex items-center justify-between gap-4 p-3 bg-slate-950/60 border border-slate-850 rounded-lg hover:border-slate-800 transition"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Checkmark style status indicator */}
                              <div 
                                className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 border ${
                                  m.status === 'Completed' 
                                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' 
                                    : m.status === 'In Progress'
                                    ? 'border-blue-500 bg-blue-505/10 text-blue-400'
                                    : 'border-slate-750 bg-slate-900/50 text-slate-505'
                                }`}
                                title={m.status}
                              >
                                {m.status === 'Completed' ? (
                                  <CheckCircle size={12} className="stroke-[2.5]" />
                                ) : m.status === 'In Progress' ? (
                                  <Activity size={10} className="animate-spin" style={{ animationDuration: '6s' }} />
                                ) : (
                                  <Clock size={10} />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className={`text-xs font-semibold leading-snug ${m.status === 'Completed' ? 'text-slate-450 line-through decoration-slate-650' : 'text-slate-200'}`}>
                                  {m.title}
                                </p>
                                <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                                  <Calendar size={10} />
                                  Planned Date: {m.plannedDate}
                                </span>
                              </div>
                            </div>

                            {/* Status change actions & delete controls */}
                            <div className="flex items-center gap-2 shrink-0">
                              {isAdminMode ? (
                                <>
                                  {/* Status Dropdown selector */}
                                  <select
                                    id={`update-milestone-status-${m.id}`}
                                    value={m.status}
                                    onChange={(e) => handleUpdateMilestoneStatus(selectedProject.id, m.id, e.target.value as any)}
                                    className="bg-slate-900 border border-slate-800 text-[10px] px-2 py-1 rounded font-mono font-medium text-slate-300 focus:outline-none focus:border-emerald-500"
                                  >
                                    <option value="Pending">Pending</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Completed">Completed</option>
                                  </select>

                                  {/* Remove Button */}
                                  <button
                                    id={`remove-milestone-btn-${m.id}`}
                                    type="button"
                                    onClick={() => handleDeleteMilestone(selectedProject.id, m.id)}
                                    className="p-1 text-slate-500 hover:text-rose-405 bg-slate-900/50 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/25 rounded transition"
                                    title="Remove Milestone"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </>
                              ) : (
                                /* Static view state badges for public */
                                <span className={`px-2 py-0.5 rounded text-[9px] font-mono tracking-wider font-bold ${
                                  m.status === 'Completed' 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                    : m.status === 'In Progress'
                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                    : 'bg-slate-900 text-slate-500 border border-slate-800'
                                }`}>
                                  {m.status}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Admin additive nested miniature form */}
                  {isAdminMode && (
                    <form 
                      id="milestone-addition-inline-form"
                      onSubmit={handleCreateMilestone}
                      className="pt-3.5 border-t border-slate-900 mt-2 space-y-2.5"
                    >
                      <p className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                        + Assess & Append Project Milestone Goal
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <input 
                          id="new-milestone-title-input"
                          type="text"
                          required
                          placeholder="Goal designation (e.g. Drilling 4 wells)"
                          value={newMilestoneTitle}
                          onChange={e => setNewMilestoneTitle(e.target.value)}
                          className="w-full text-xs p-2 bg-slate-950 border border-slate-850 rounded-lg focus:outline-none focus:border-emerald-500 text-slate-100"
                        />
                        <div className="flex gap-2">
                          <input 
                            id="new-milestone-date-input"
                            type="text"
                            required
                            placeholder="Planned Date (e.g. Jun 10, 2026)"
                            value={newMilestoneDate}
                            onChange={e => setNewMilestoneDate(e.target.value)}
                            className="w-full text-xs p-2 bg-slate-950 border border-slate-850 rounded-lg focus:outline-none focus:border-emerald-500 text-slate-100 font-mono"
                          />
                          <select 
                            id="new-milestone-status-select"
                            value={newMilestoneStatus}
                            onChange={e => setNewMilestoneStatus(e.target.value as any)}
                            className="bg-slate-950 border border-slate-850 p-2 rounded-lg text-xs text-slate-300 font-medium focus:outline-none focus:border-emerald-500"
                          >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end pt-1">
                        <button
                          id="submit-new-milestone-btn"
                          type="submit"
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/20"
                        >
                          <Plus size={12} /> Append Goal
                        </button>
                      </div>
                    </form>
                  )}

                </div>

                {/* ADMIN STATUS / PROGRESS CONFIG CONTROL SHEET */}
                {isAdminMode && (
                  <div id="admin-interactive-slider-box" className="bg-slate-900/60 p-4 rounded-xl border border-dashed border-emerald-500/20 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <Settings size={13} />
                        Charter Administrator Diagnostics
                      </h4>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded">Fast Config Option</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* State status dropdown selector */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-slate-400 block">Assess State Status</label>
                        <select 
                          id="admin-status-select"
                          value={editingStatusValue}
                          onChange={e => setEditingStatusValue(e.target.value as any)}
                          className="w-full text-xs p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                        >
                          <option value="Planning">Planning</option>
                          <option value="In Progress">In Progress</option>
                          <option value="On Hold">On Hold</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </div>

                      {/* Percentage slide bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[11px]">
                          <label className="text-slate-400 font-medium">Progress Metrics Assess</label>
                          <span className="font-mono font-bold text-emerald-400">{editingProgressValue}%</span>
                        </div>
                        <input 
                          id="admin-progress-slider"
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={editingProgressValue}
                          disabled={editingStatusValue === 'Completed'}
                          onChange={e => setEditingProgressValue(Number(e.target.value))}
                          className="w-full accent-emerald-500 bg-slate-950 h-2 rounded-lg cursor-pointer"
                        />
                        {editingStatusValue === 'Completed' && (
                          <p className="text-[9px] text-slate-500 italic block">Completed status overrides to 100%.</p>
                        )}
                      </div>
                    </div>

                    <button 
                      id="save-diagnostics-btn"
                      onClick={handleUpdateProgressConfig}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle size={13} /> Save Assessment Changes
                    </button>
                  </div>
                )}

                {/* THE IMAGES AND DOCUMENTS TREASURY SECTION (CORE REQUISITE) */}
                <div id="project-attachments-section" className="space-y-4">
                  
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-extrabold flex items-center gap-1.5">
                      <FileCheck2 size={15} className="text-emerald-500" />
                      Documents & Blueprints Specification Vault
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-800 text-slate-400">
                      {selectedProject.files.length} Saved Files
                    </span>
                  </div>

                  {/* FILE DROPZONE AND UPLOADER CAPABILITY */}
                  <div 
                    id="dropzone-area"
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onClick={triggerFileSelection}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-2 ${
                      isDragging 
                      ? 'border-emerald-400 bg-emerald-950/20' 
                      : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900/30'
                    }`}
                  >
                    <input 
                      id="file-input-raw"
                      type="file"
                      ref={fileInputRef}
                      onChange={onFileChange}
                      multiple
                      className="hidden"
                    />

                    <div className="h-10 w-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-400 border border-slate-800 group-hover:text-emerald-400 transition-colors">
                      <Upload size={18} className="animate-bounce" style={{ animationDuration: '3s' }} />
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-white">Drag & drop project files here, or <span className="text-emerald-400 hover:underline">browse files</span></p>
                      <p className="text-[10px] text-slate-500 mt-1 uppercase font-mono">Supports blueprints, spreadsheets, PDFs, audit sheets, JPG, PNG & WEBP</p>
                    </div>
                  </div>

                  {/* VISUAL LAYOUT CARDS LIST FOR SYSTEM RETRIEVED SECURE FILES */}
                  {selectedProject.files.length === 0 ? (
                    <div id="empty-vault-illustration" className="bg-slate-900/30 rounded-xl p-6 border border-slate-900 text-center text-slate-500 space-y-1">
                      <FileArchive className="mx-auto h-7 w-7 text-slate-700" />
                      <p className="text-xs font-medium">Specification vault currently empty.</p>
                      <p className="text-[10px] text-slate-600">Include project photo updates, land surveys, raw audits, or structural spreadsheets for accountability.</p>
                    </div>
                  ) : (
                    <div id="attachments-grid-list" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedProject.files.map(file => {
                        const isImg = file.type === 'image';
                        return (
                          <div 
                            key={file.id} 
                            id={`file-card-${file.id}`}
                            className="bg-slate-900 border border-slate-850 p-3.5 rounded-xl hover:bg-slate-900/80 transition flex items-center gap-3 relative group"
                          >
                            {/* file thumbnail */}
                            <div className="h-11 w-11 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden relative">
                              {isImg ? (
                                <img 
                                  src={file.dataUrl} 
                                  alt={file.name} 
                                  className="object-cover h-full w-full"
                                />
                              ) : (
                                <FileText className="h-5 w-5 text-emerald-400" />
                              )}
                            </div>

                            {/* file meta info */}
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-white truncate" title={file.name}>
                                {file.name}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 font-mono">
                                <span className="uppercase text-emerald-500 font-bold">{file.extension}</span>
                                <span>&bull;</span>
                                <span>{file.size}</span>
                              </div>
                              <p className="text-[9px] text-slate-500 mt-0.5">Uploaded {file.uploadedAt}</p>
                            </div>

                            {/* Actions overlay */}
                            <div className="flex items-center gap-1">
                              {isImg && (
                                <button 
                                  onClick={() => setActiveLightboxImage({ name: file.name, url: file.dataUrl })}
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors"
                                  title="Expand Lightbox Image"
                                >
                                  <Eye size={12} />
                                </button>
                              )}
                              
                              <button 
                                onClick={() => initiateMockDownload(file)}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors"
                                title="Download Safe File Specification"
                              >
                                <Download size={12} />
                              </button>

                              {/* Delete option */}
                              {isAdminMode && (
                                <button 
                                  id={`delete-file-${file.id}`}
                                  onClick={() => handleDeleteFile(selectedProject.id, file.id)}
                                  className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 rounded text-rose-400 transition-colors border border-rose-500/20"
                                  title="Purge Attachment"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>

                {/* PROGRESS MILESTONE TIMELINE / CHRONOLOGY */}
                <div id="project-timeline-chronicle" className="space-y-4">
                  
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-extrabold flex items-center gap-1.5">
                      <Clock size={15} className="text-emerald-500" />
                      Audited Development Chronology & Updates
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-800 text-slate-400">
                      {selectedProject.logs.length} Milestones
                    </span>
                  </div>

                  {/* Form to submit daily updates log inside Admin controls */}
                  {isAdminMode && (
                    <form 
                      id="log-addition-form"
                      onSubmit={handleAddLog} 
                      className="bg-slate-900/40 p-4 rounded-xl border border-slate-900 space-y-3.5"
                    >
                      <h4 className="text-[11px] font-semibold text-emerald-400 uppercase tracking-widest font-mono">Publish Live Progress Milestone</h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2 space-y-1">
                          <input 
                            id="log-title-input"
                            type="text"
                            placeholder="Brief Title (e.g. Completed foundation pour)"
                            value={logTitle}
                            onChange={e => setLogTitle(e.target.value)}
                            className="w-full text-xs p-2.5 bg-slate-950 border border-slate-850 rounded-lg focus:outline-none focus:border-emerald-500 text-slate-100"
                          />
                        </div>

                        <div className="space-y-1">
                          <select 
                            id="log-status-select"
                            value={logStatus}
                            onChange={e => setLogStatus(e.target.value as any)}
                            className="w-full text-xs p-2.5 bg-slate-950 border border-slate-850 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                          >
                            <option value="success">&bull; Success Update</option>
                            <option value="info">&bull; Informational Log</option>
                            <option value="alert">&bull; Operational Alert</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <textarea 
                          id="log-description-input"
                          rows={2}
                          placeholder="Provide descriptive audit comments detailing engineering specs, physical site photos, or supplier notes..."
                          value={logDesc}
                          onChange={e => setLogDesc(e.target.value)}
                          className="w-full text-xs p-2.5 bg-slate-950 border border-slate-850 rounded-lg focus:outline-none focus:border-emerald-500 text-slate-100 resize-none"
                        />
                      </div>

                      <div className="flex justify-end">
                        <button 
                          id="submit-log"
                          type="submit"
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-all shadow-md cursor-pointer"
                        >
                          Broadcast Update
                        </button>
                      </div>
                    </form>
                  )}

                  {/* THE TIMELINE CONTAINER */}
                  <div className="relative pl-6 border-l border-slate-800 space-y-5">
                    {selectedProject.logs.map((log) => {
                      return (
                        <div key={log.id} id={`timeline-item-${log.id}`} className="relative">
                          
                          {/* Circle status indicator */}
                          <div className={`absolute -left-[35px] top-1 p-1 rounded-full ${getTimelineLogIconStyle(log.status)}`}>
                            {log.status === 'success' && <CheckCircle size={10} />}
                            {log.status === 'info' && <Info size={10} />}
                            {log.status === 'alert' && <AlertCircle size={10} />}
                          </div>

                          <div className="bg-slate-900 border border-slate-850/70 p-3.5 rounded-xl hover:border-slate-800 transition relative group/log">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                              <h4 className="text-xs font-bold text-white tracking-wide">
                                {log.title}
                              </h4>
                              <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1 shrink-0">
                                <Calendar size={10} />
                                {log.date}
                              </span>
                            </div>
                            
                            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                              {log.description}
                            </p>

                            {/* Admin Delete Log */}
                            {isAdminMode && (
                              <button 
                                id={`delete-log-${log.id}`}
                                onClick={() => handleDeleteLog(selectedProject.id, log.id)}
                                className="absolute right-3.5 top-3.5 p-1 text-slate-600 hover:text-rose-400 opacity-0 group-hover/log:opacity-100 transition-opacity"
                                title="Remove Log entry"
                              >
                                <X size={10} />
                              </button>
                            )}

                          </div>

                        </div>
                      );
                    })}
                  </div>

                </div>

                {/* Dynamic Google-OAuth Sign Up Verified Feedback & Comments Feed */}
                <div id="project-community-discussion-vault" className="space-y-4 bg-slate-900/30 p-5 rounded-xl border border-slate-900 mt-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Users size={15} className="text-emerald-500 animate-pulse-slow" />
                      <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-extrabold">
                        Verified Community Discussion (Google Sign-Up)
                      </h3>
                    </div>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-mono font-bold">
                      {(projectComments[selectedProject.id] || []).length} Comments
                    </span>
                  </div>

                  {/* Comments presentation timeline */}
                  {(!projectComments[selectedProject.id] || projectComments[selectedProject.id].length === 0) ? (
                    <div className="py-2 text-center text-slate-500 text-xs italic">
                      No discussions recorded from verified Google sign-ups yet. Be the first to reply!
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                      {projectComments[selectedProject.id].map((comm) => (
                        <div key={comm.id} className="p-3 bg-slate-950/40 rounded-lg border border-slate-850 flex gap-3 items-start">
                          <img 
                            src={comm.userAvatar} 
                            alt={comm.userName} 
                            referrerPolicy="no-referrer"
                            className="w-7 h-7 rounded-md object-cover border border-slate-800 shrink-0" 
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-emerald-400 truncate">{comm.userName}</span>
                              <span className="text-[9px] font-mono text-slate-500 shrink-0">{comm.date}</span>
                            </div>
                            <p className="text-slate-300 text-xs mt-1 leading-relaxed">
                              {comm.text}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Comment box form or Auth call-to-action */}
                  {currentUser ? (
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        const inp = e.currentTarget.elements.namedItem('commentText') as HTMLInputElement;
                        if (inp && inp.value.trim()) {
                          handleAddComment(inp.value.trim());
                          inp.value = '';
                        }
                      }}
                      className="pt-3 border-t border-slate-900 flex gap-2"
                    >
                      <input 
                        type="text"
                        name="commentText"
                        placeholder="মাশাল্লাহ বলুন অথবা মতামত দিন..."
                        className="flex-1 bg-slate-950 border border-slate-850 text-xs p-2.5 rounded-lg focus:outline-none focus:border-emerald-500 text-slate-100 font-medium font-sans"
                        required
                      />
                      <button 
                        type="submit"
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition"
                      >
                        মতামত
                      </button>
                    </form>
                  ) : (
                    <div className="pt-3 border-t border-slate-900 bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10 text-center space-y-2">
                      <p className="text-xs text-slate-300 leading-snug">
                        নতুন ইউজার হিসেবে এপে মতামত কিংবা প্রজেক্ট সংক্রান্ত রিভিউ প্রকাশ করতে জাস্ট নিচের গুগল বোতামে চাপ দিয়ে সাইন আপ করুন:
                      </p>
                      <button
                        onClick={() => setShowAuthModal(true)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-emerald-500/25 hover:border-emerald-500/60 rounded-md text-[11px] font-bold text-slate-100 transition cursor-pointer font-sans"
                      >
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                        </svg>
                        <span>জাস্ট ৩ সেকেন্ডে গুগল সাইন আপ</span>
                      </button>
                    </div>
                  )}
                </div>

              </div>
              
              {/* Cockpit active footer */}
              <div className="p-4 bg-slate-950 border-t border-slate-850 flex items-center justify-between text-[10px] text-slate-400 shrink-0 uppercase font-mono font-bold tracking-widest bg-pattern-stripes">
                <span>Database Status: Active Vault Storage</span>
                <span>Authorized ID: HAIBARI-SEC-{selectedProject.id}</span>
              </div>

            </div>
          )}

        </section>

      </main>

      {/* CREATE NEW CHARTER DIALOG MODAL (COMPLEX FORM OUTCOMES) */}
      {showCreateModal && (
        <div id="create-modal-overlay" className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          
          <div id="create-project-form-container" className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6 animate-zoomIn">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="font-display font-extrabold text-white text-lg flex items-center gap-2">
                  <Plus className="text-emerald-500" />
                  Initiate Foundation Charter
                </h2>
                <p className="text-[11px] text-slate-400 mt-1 uppercase font-mono font-bold">New Hazi Bari community progress outline</p>
              </div>
              <button 
                id="close-create-modal"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
              
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300 block">Project Headline/Title *</label>
                <input 
                  id="new-title-input"
                  required
                  type="text"
                  placeholder="e.g. Village Solar Microgrid Setup"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-850 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300 block">Secter Group Category *</label>
                  <select 
                    id="new-category-select"
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-850 rounded-lg text-slate-100"
                  >
                    <option value="Infrastructure">Infrastructure</option>
                    <option value="Health">Health</option>
                    <option value="Education">Education</option>
                    <option value="Disaster Relief">Disaster Relief</option>
                    <option value="Agriculture">Agriculture</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300 block">Assigned Location *</label>
                  <input 
                    id="new-location-input"
                    required
                    type="text"
                    placeholder="e.g. Satkhira Main East"
                    value={newLocation}
                    onChange={e => setNewLocation(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-850 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300 block">Brief Pitch Summary *</label>
                <input 
                  id="new-description-input"
                  required
                  type="text"
                  placeholder="A concise, 1-sentence synopsis displayed inside cards..."
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-850 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300 block">In-Depth Background Charter (Details)</label>
                <textarea 
                  id="new-details-input"
                  rows={3}
                  placeholder="Provide comprehensive objectives, specifications, and layout guidelines..."
                  value={newDetails}
                  onChange={e => setNewDetails(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-850 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500 resize-none font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300 block">Target Budget (৳ BDT) *</label>
                  <input 
                    id="new-target-fund-input"
                    required
                    type="number"
                    placeholder="e.g. 500000"
                    value={newTargetFund}
                    onChange={e => setNewTargetFund(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-850 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300 block">Initial Raised Fund (৳ BDT)</label>
                  <input 
                    id="new-raised-fund-input"
                    type="number"
                    placeholder="e.g. 10000"
                    value={newRaisedFund}
                    onChange={e => setNewRaisedFund(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-850 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300 block">Target Beneficiaries Count</label>
                  <input 
                    id="new-beneficiaries-input"
                    type="number"
                    placeholder="e.g. 800"
                    value={newBeneficiaries}
                    onChange={e => setNewBeneficiaries(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-850 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300 block">Visual Backdrop Skin</label>
                  <select 
                    id="new-gradient-select"
                    value={newGradient}
                    onChange={e => setNewGradient(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-850 rounded-lg text-slate-100"
                  >
                    <option value="from-emerald-900 via-teal-950 to-slate-950">Emerald Mosqe Deep</option>
                    <option value="from-cyan-900 via-blue-950 to-slate-950">Cyan Aqua Drills</option>
                    <option value="from-indigo-900 via-slate-900 to-zinc-950">Midnight Classrooms</option>
                    <option value="from-amber-900 via-stone-900 to-slate-950">Warm Amber Blankets</option>
                    <option value="from-lime-900 via-emerald-950 to-slate-950">Lime Field Grow</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  id="cancel-create-btn"
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-1/3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg transition text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  id="save-create-btn"
                  type="submit"
                  className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-lg transition shadow-lg shadow-emerald-950/40 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle size={14} /> Incorporate Project Charter
                </button>
              </div>

            </form>
          </div>

        </div>
      )}

      {/* Structured Minimalist Footer */}
      <footer id="main-footer" className="border-t border-slate-850 bg-slate-950/80 py-6 mt-12 transition bg-cover">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500 font-mono">
            &copy; 2026 Hazi Bari Foundation. Built for communal upliftment and radical execution transparency.
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Mainnet Active
            </span>
            <span className="text-slate-650">|</span>
            <span>Local Vault Persistent Storage</span>
          </div>
        </div>
      </footer>

      {/* Real Google One Tap Pop-up Prompt (নতুন ইউজার এপে জাস্ট অপশনে ট্যাপ সাইন আপ) */}
      {showOneTap && !currentUser && (
        <div id="google-onetap-prompt" className="fixed bottom-4 right-4 z-50 max-w-sm w-[340px] bg-slate-950/95 backdrop-blur-md rounded-xl border border-slate-800 shadow-2xl p-4 space-y-3.5 text-left animate-slide-up transition-all duration-300">
          
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              <div>
                <h4 className="text-xs font-bold text-white tracking-tight leading-none">Sign in with Google</h4>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-none">to Hazi Bari Foundation</p>
              </div>
            </div>
            
            <button 
              id="dismiss-onetap"
              onClick={() => {
                setShowOneTap(false);
                setOneTapDismissed(true);
                localStorage.setItem('hazibari_onetap_dismissed', 'true');
              }}
              className="text-slate-500 hover:text-slate-300 p-0.5 rounded transition"
              title="Dismiss One Tap"
            >
              <X size={14} />
            </button>
          </div>

          <p className="text-[11px] text-slate-300 font-sans">
            নতুন ইউজার হিসেবে এপের সব ফিচার ব্যবহারের জন্য জাস্ট নিচের অপশনে ট্যাপ করুন:
          </p>

          <div className="bg-slate-900/60 rounded-lg p-2.5 border border-slate-850 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <img 
                src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100" 
                alt="Monir Ahamed Arfin Avatar"
                className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0" 
              />
              <div className="min-w-0 text-left">
                <p className="text-xs font-bold text-slate-100 truncate">Md. Monir Ahamed Arfin</p>
                <p className="text-[10px] text-slate-400 truncate font-mono">mdmonirahamedarfin@gmail.com</p>
              </div>
            </div>
          </div>

          <button
            id="onetap-continue-btn"
            disabled={isSigningIn}
            onClick={() => handleGoogleSignInSimulated({
              name: 'Md. Monir Ahamed Arfin',
              email: 'mdmonirahamedarfin@gmail.com',
              avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100'
            })}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-950/20 animate-pulse font-sans"
          >
            {isSigningIn ? (
              <span className="flex items-center gap-1.5 font-mono">
                <Activity size={12} className="animate-spin" /> Connection Secure...
              </span>
            ) : (
              <span>Continue as Md. Monir</span>
            )}
          </button>
          
          <div className="text-center">
            <button 
              onClick={() => {
                setShowOneTap(false);
                setShowAuthModal(true);
              }}
              className="text-[10px] text-slate-400 hover:text-emerald-400 hover:underline transition font-semibold"
            >
              Use another Google account
            </button>
          </div>

        </div>
      )}

      {/* Immersive Google Account Chooser & Auth Center Modal */}
      {showAuthModal && (
        <div id="google-auth-modal-overlay" className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full shadow-2xl p-6 sm:p-8 space-y-6 text-left relative">
            
            <button 
              id="close-auth-modal"
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full transition bg-slate-950 border border-slate-850"
            >
              <X size={16} />
            </button>

            <div className="text-center space-y-2">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-slate-950 border border-slate-850 flex items-center justify-center text-white shadow-xl">
                <svg viewBox="0 0 24 24" className="w-6 h-6">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
              </div>
              <h3 className="font-display font-black text-white text-base tracking-tight">গুগল সাইন-আপ সেন্টার</h3>
              <p className="text-xs text-slate-400 font-sans">Hazi Bari Foundation Development Portal এ আপনাকে স্বাগতম</p>
            </div>

            {isSigningIn ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-3.5">
                <div className="h-9 w-9 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                <p className="text-xs font-mono text-slate-400 uppercase tracking-widest animate-pulse font-bold">Connecting Google Node...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">Select a Google Account to sign up:</p>
                
                {/* Account list items */}
                <div className="space-y-2.5">
                  {[
                    { name: 'Md. Monir Ahamed Arfin', email: 'mdmonirahamedarfin@gmail.com', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100' },
                    { name: 'Amina Al-Hasan', email: 'amina.alhasan@gmail.com', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100' },
                    { name: 'Guest Developer', email: 'guest.dev@gmail.com', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100' }
                  ].map((account, i) => (
                    <button
                      key={i}
                      disabled={isSigningIn}
                      type="button"
                      onClick={() => handleGoogleSignInSimulated(account)}
                      className="w-full p-2.5 bg-slate-950 hover:bg-slate-950/80 border border-slate-850 hover:border-emerald-500/40 rounded-xl transition flex items-center justify-between gap-3 text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img 
                          src={account.avatar} 
                          alt={account.name} 
                          className="w-7.5 h-7.5 rounded-full object-cover border border-slate-855 shrink-0 group-hover:scale-105 transition" 
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-200 truncate group-hover:text-emerald-400 transition">{account.name}</p>
                          <p className="text-[9px] text-slate-500 font-mono truncate">{account.email}</p>
                        </div>
                      </div>
                      <span className="text-[10px] uppercase font-mono tracking-wider font-bold bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded shrink-0 group-hover:border-emerald-500/20 group-hover:text-emerald-400 transition">
                        Tap
                      </span>
                    </button>
                  ))}
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-850"></div>
                  <span className="flex-shrink mx-3 text-[9px] font-mono text-slate-500 uppercase tracking-widest">Or mock input</span>
                  <div className="flex-grow border-t border-slate-850"></div>
                </div>

                {/* Custom Mock Account Form */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const name = (fd.get('custName') as string).trim();
                    const email = (fd.get('custEmail') as string).trim();
                    if (name && email) {
                      handleGoogleSignInSimulated({
                        name,
                        email,
                        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100'
                      });
                    }
                  }}
                  className="space-y-2.5"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="text"
                      name="custName"
                      required
                      placeholder="আপনার নাম (Name)"
                      className="w-full text-xs p-2 bg-slate-950 border border-slate-850 rounded-lg text-slate-100 placeholder:text-slate-650 focus:outline-none focus:border-emerald-500 font-sans"
                    />
                    <input 
                      type="email"
                      name="custEmail"
                      required
                      placeholder="গুগল ইমেইল (Gmail)"
                      className="w-full text-xs p-2 bg-slate-950 border border-slate-850 rounded-lg text-slate-100 placeholder:text-slate-650 focus:outline-none focus:border-emerald-500 font-sans"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-2 bg-slate-950 border border-slate-800 hover:border-emerald-500/60 font-bold text-[10px] text-emerald-400 rounded-lg transition text-center cursor-pointer uppercase tracking-wider font-sans"
                  >
                    + Tap Custom Google SignUp
                  </button>
                </form>

              </div>
            )}

            <div className="pt-1 text-center text-[9px] text-slate-500 leading-snug font-sans">
              Secure simulated Google Node powered by Hazi Bari Cryptographic Vault protocols.
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
