import React, { useState, useMemo, useEffect } from 'react';
import { 
  BookOpen, 
  Video, 
  Award, 
  CheckCircle2, 
  ArrowRight, 
  PlayCircle, 
  Search, 
  Clock, 
  Check, 
  X, 
  Plus, 
  Sparkles, 
  ChevronRight, 
  Eye, 
  Calculator, 
  Truck, 
  Users, 
  Wrench, 
  Smartphone, 
  FolderOpen,
  HelpCircle
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { authStore } from '@/store/authStore';
import { learningService, type VideoTutorial } from '@/services/learningService';

const CATEGORY_ICON_MAP: Record<string, any> = {
  dispatch: Truck,
  payouts: Calculator,
  quotations: FolderOpen,
  fleet: Wrench,
  mobile: Smartphone,
};

export default function LearningPage() {
  const user = authStore.getUser();
  const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin' || (user as any)?.isSuperAdmin;

  const [tutorials, setTutorials] = useState<VideoTutorial[]>([]);
  const [watchedMap, setWatchedMap] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeVideo, setActiveVideo] = useState<VideoTutorial | null>(null);
  const [activeStepIdx, setActiveStepIdx] = useState<number>(0);

  // Add new video modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('dispatch');
  const [newDesc, setNewDesc] = useState('');
  const [newDuration, setNewDuration] = useState('3:30');
  const [newUrl, setNewUrl] = useState('');

  // Load dynamic data on mount
  useEffect(() => {
    const loaded = learningService.getAll();
    setTutorials(loaded);
    setWatchedMap(learningService.getWatchedMap());
  }, []);

  // Dynamic Category list & counts
  const categoryList = useMemo(() => {
    const uniqueCats = Array.from(new Set(tutorials.map(t => t.category)));
    const catLabels: Record<string, string> = {
      dispatch: 'Dispatch & Trips',
      payouts: 'Driver Payouts',
      quotations: 'Quotations & Rates',
      fleet: 'Fleet & Maint.',
      mobile: 'Mobile & POD',
    };

    const result = [
      { key: 'all', label: 'All Courses', icon: BookOpen, count: tutorials.length }
    ];

    uniqueCats.forEach(cat => {
      const count = tutorials.filter(t => t.category === cat).length;
      result.push({
        key: cat,
        label: catLabels[cat] || cat.toUpperCase(),
        icon: CATEGORY_ICON_MAP[cat] || Video,
        count
      });
    });

    return result;
  }, [tutorials]);

  // Dynamic Watched & Completion metrics
  const watchedCount = useMemo(() => {
    return Object.keys(watchedMap).filter(k => watchedMap[k]).length;
  }, [watchedMap]);

  // Filtered tutorials
  const filteredTutorials = useMemo(() => {
    return tutorials.filter(t => {
      const matchesCat = selectedCategory === 'all' || t.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = !q || 
        t.title.toLowerCase().includes(q) || 
        t.description.toLowerCase().includes(q) ||
        t.categoryLabel.toLowerCase().includes(q) ||
        t.steps.some(s => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
      return matchesCat && matchesQuery;
    });
  }, [tutorials, selectedCategory, searchQuery]);

  const handleToggleWatched = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = learningService.toggleWatched(id);
    setWatchedMap(updated);
  };

  const handleAddVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;

    const catLabels: Record<string, string> = {
      dispatch: 'Dispatch & Trips',
      payouts: 'Driver Payouts',
      quotations: 'Quotations & Rates',
      fleet: 'Fleet & Maintenance',
      mobile: 'Mobile & POD',
    };

    const gradients = [
      'from-amber-600 via-orange-600 to-red-700',
      'from-blue-600 via-indigo-600 to-purple-700',
      'from-emerald-600 via-teal-600 to-cyan-700',
      'from-violet-600 via-purple-600 to-pink-700'
    ];

    const updatedList = learningService.addTutorial({
      title: newTitle.trim(),
      category: newCategory,
      categoryLabel: catLabels[newCategory] || 'Operations',
      description: newDesc.trim(),
      duration: newDuration || '3:30',
      thumbnailGradient: gradients[Math.floor(Math.random() * gradients.length)],
      videoUrl: newUrl.trim() || undefined,
      steps: [
        { time: '00:00', title: '1. Operational Overview', description: newDesc.trim() },
        { time: '01:30', title: '2. Detailed Procedure', description: 'Follow step-by-step instructions shown in the video.' },
        { time: '03:00', title: '3. Verification & Save', description: 'Confirm operational accuracy in MERCON dashboard.' }
      ],
      keyTakeaways: [
        'Always double-check trip parameters before dispatch.',
        'Refer to saved rate cards for canonical pricing logic.'
      ]
    });

    setTutorials(updatedList);
    setShowAddModal(false);
    setNewTitle('');
    setNewDesc('');
    setNewUrl('');
  };

  return (
    <DashboardLayout active="/learning" title="Learning Center & Course Overview">
      <div className="space-y-8 pb-12 bg-[#F8FAFC] -m-6 p-6 sm:p-8 min-h-screen">
        
        {/* ── Page Header Title & Upload Button ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Course Overview
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Operational training, video walkthroughs, and driver certification library.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <Button 
                onClick={() => setShowAddModal(true)}
                className="bg-[#FA634E] hover:bg-[#DF4834] text-white shadow-sm font-medium text-xs sm:text-sm gap-2 rounded-xl h-10 px-4"
              >
                <Plus className="w-4 h-4" />
                <span>Upload Video Guide</span>
              </Button>
            )}
          </div>
        </div>

        {/* ── TOP SECTION: 4 Soft Pastel KPI Cards (Matches User Reference Image) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* Card 1: Total Courses (Mint Green) */}
          <div className="relative overflow-hidden rounded-2xl bg-[#E6F7F2] border border-[#C2EFE1] p-5 flex flex-col justify-between h-36 transition-all hover:shadow-md group">
            <div className="absolute right-[-10px] bottom-[-10px] w-24 h-24 rounded-full bg-[#00A884]/10 blur-xl pointer-events-none" />
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white text-[#00A884] flex items-center justify-center shadow-sm shrink-0">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {tutorials.length}
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-0.5">
                  Total Courses
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#C2EFE1]/60 flex items-center justify-between text-xs font-semibold text-[#00A884]">
              <span>See Details</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: Total Workshop / Video Guides (Lavender Purple) */}
          <div className="relative overflow-hidden rounded-2xl bg-[#F0ECFE] border border-[#DDD4FE] p-5 flex flex-col justify-between h-36 transition-all hover:shadow-md group">
            <div className="absolute right-[-10px] bottom-[-10px] w-24 h-24 rounded-full bg-[#7C4DFF]/10 blur-xl pointer-events-none" />
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white text-[#7C4DFF] flex items-center justify-center shadow-sm shrink-0">
                <Video className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {tutorials.length}
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-0.5">
                  Total Workshops
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#DDD4FE]/60 flex items-center justify-between text-xs font-semibold text-[#7C4DFF]">
              <span>See Details</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 3: Average Completion / Progress (Soft Peach / Orange) */}
          <div className="relative overflow-hidden rounded-2xl bg-[#FFF0E4] border border-[#FFE0C9] p-5 flex flex-col justify-between h-36 transition-all hover:shadow-md group">
            <div className="absolute right-[-10px] bottom-[-10px] w-24 h-24 rounded-full bg-[#FF8800]/10 blur-xl pointer-events-none" />
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white text-[#FF8800] flex items-center justify-center shadow-sm shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {watchedCount}/{tutorials.length}
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-0.5">
                  Completed Courses
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#FFE0C9]/60 flex items-center justify-between text-xs font-semibold text-[#FF8800]">
              <span>See Details</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 4: Total Certificates (Sky Blue) */}
          <div className="relative overflow-hidden rounded-2xl bg-[#E3F2FD] border border-[#BBDEFB] p-5 flex flex-col justify-between h-36 transition-all hover:shadow-md group">
            <div className="absolute right-[-10px] bottom-[-10px] w-24 h-24 rounded-full bg-[#0288D1]/10 blur-xl pointer-events-none" />
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white text-[#0288D1] flex items-center justify-center shadow-sm shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  3
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-0.5">
                  Total Certificates
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#BBDEFB]/60 flex items-center justify-between text-xs font-semibold text-[#0288D1]">
              <span>See Details</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

        </div>

        {/* ── MIDDLE SECTION: Recent Enrolled Course (Exact Match to User UI) ── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
          
          {/* Section Header + View All */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-slate-900">
                Recent Enrolled Course ({filteredTutorials.length})
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-xs font-semibold text-[#00A884] bg-[#E6F7F2] hover:bg-[#D3F3E8] hover:text-[#008F70] rounded-xl px-4"
              >
                View All
              </Button>
            </div>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                type="text"
                placeholder="Search course title, operational topic, or lesson step..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-8 h-10 border-slate-200 bg-slate-50 focus:bg-white focus:border-[#FA634E] text-xs rounded-xl"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dynamic Category Pill Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
              {categoryList.map(cat => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.key;

                return (
                  <button
                    key={cat.key}
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#FA634E]' : 'text-slate-500'}`} />
                    <span>{cat.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── COURSE CARDS GRID (Exact Layout & Aesthetics from Reference Image) ── */}
          {filteredTutorials.length === 0 ? (
            <div className="py-12 text-center max-w-md mx-auto">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">No Enrolled Courses Found</h3>
              <p className="text-xs text-slate-500 mt-1">
                Try adjusting your search terms or select a different course category.
              </p>
              <Button 
                variant="outline" 
                onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                className="mt-4 text-xs rounded-xl"
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredTutorials.map((course) => {
                const isWatched = !!watchedMap[course.id];
                const totalSteps = course.steps.length;
                const completedSteps = isWatched ? totalSteps : 1;
                const progressPct = Math.round((completedSteps / totalSteps) * 100);

                return (
                  <div 
                    key={course.id}
                    onClick={() => { setActiveVideo(course); setActiveStepIdx(0); }}
                    className="group cursor-pointer rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden p-4 space-y-4"
                  >
                    {/* Top Grey Illustration Container + Floating Badge (Matching Reference UI) */}
                    <div className="relative h-44 w-full bg-[#F4F5F9] rounded-xl flex items-center justify-center overflow-hidden p-4 group-hover:bg-[#EEF1F6] transition-colors">
                      
                      {/* Floating App Badge Top Right (Figma / Webflow aesthetic) */}
                      <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-slate-800 text-xs font-bold shrink-0">
                        <div className="w-5 h-5 rounded-md bg-[#FA634E] text-white flex items-center justify-center text-[10px] font-black">
                          M
                        </div>
                      </div>

                      {/* Center Play Graphic */}
                      <div className="w-14 h-14 rounded-full bg-white/90 text-slate-900 group-hover:scale-110 group-hover:bg-[#FA634E] group-hover:text-white shadow-lg flex items-center justify-center transition-all duration-300">
                        <PlayCircle className="w-8 h-8 ml-0.5" />
                      </div>

                      {/* Duration Pill Bottom Left */}
                      <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded-lg text-[11px] font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-300" />
                        <span>{course.duration} mins</span>
                      </div>
                    </div>

                    {/* Middle Info: Author & Course Title */}
                    <div className="space-y-1.5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="text-[11px] font-medium text-slate-400">
                          A Course by MERCON Logistics
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#FA634E] transition-colors line-clamp-2 mt-1 leading-snug">
                          {course.title}
                        </h3>
                      </div>
                    </div>

                    {/* Bottom Progress Bar & Step Counter (Exact match to Reference Image) */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-900">{progressPct}%</span>
                        <span className="text-slate-400 font-medium">{completedSteps}/{totalSteps} lessons</span>
                      </div>

                      {/* Smooth Progress Bar */}
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div 
                          className="h-full bg-[#00A884] rounded-full transition-all duration-500"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>

      {/* ── CINEMA VIDEO PLAYER MODAL ── */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl bg-[#1E1E1E] text-white rounded-2xl shadow-2xl overflow-hidden border border-white/10 flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#262626]">
              <div className="flex items-center gap-3">
                <Badge className="bg-[#FA634E] text-white border-0 text-xs">
                  {activeVideo.categoryLabel}
                </Badge>
                <h2 className="text-base sm:text-lg font-bold text-white truncate max-w-xl">
                  {activeVideo.title}
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleWatched(activeVideo.id)}
                  className={`text-xs gap-1.5 ${
                    watchedMap[activeVideo.id] 
                      ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' 
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{watchedMap[activeVideo.id] ? 'Reviewed' : 'Mark Reviewed'}</span>
                </Button>

                <button 
                  onClick={() => setActiveVideo(null)}
                  className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Player + Steps Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 overflow-y-auto">
              
              {/* Left Column: Interactive Video Player Screen (8 cols) */}
              <div className="lg:col-span-8 p-6 space-y-4 bg-black flex flex-col justify-between min-h-[320px]">
                {/* Simulated / Real Video Container */}
                <div className="relative w-full aspect-video rounded-xl bg-gradient-to-br from-gray-900 to-black overflow-hidden border border-white/10 flex flex-col items-center justify-center p-6 text-center group">
                  <div className="absolute inset-0 bg-cover bg-center opacity-30 blur-sm bg-gradient-to-r from-red-900 to-slate-900" />
                  
                  {/* Floating Step Banner Overlay */}
                  <div className="absolute top-4 left-4 right-4 bg-black/70 backdrop-blur-md p-3 rounded-lg border border-white/10 text-left">
                    <div className="flex items-center justify-between text-xs text-amber-400 font-semibold mb-1">
                      <span>STEP {activeStepIdx + 1} OF {activeVideo.steps.length}</span>
                      <span>TIMESTAMP: {activeVideo.steps[activeStepIdx]?.time || '00:00'}</span>
                    </div>
                    <div className="text-sm font-bold text-white">
                      {activeVideo.steps[activeStepIdx]?.title}
                    </div>
                    <div className="text-xs text-gray-300 mt-0.5 line-clamp-1">
                      {activeVideo.steps[activeStepIdx]?.description}
                    </div>
                  </div>

                  {/* Center Big Play Button */}
                  <div className="relative z-10 w-20 h-20 rounded-full bg-[#FA634E] text-white shadow-2xl flex items-center justify-center transform group-hover:scale-110 transition-all cursor-pointer">
                    <PlayCircle className="w-12 h-12 ml-1" />
                  </div>
                  <span className="relative z-10 text-xs text-gray-300 mt-3 font-medium">
                    Click to Play Full HD Walkthrough ({activeVideo.duration} mins)
                  </span>

                  {/* Bottom Video Timeline Simulation */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 bg-black/60 backdrop-blur-md px-3 py-2 rounded-lg text-xs text-gray-300">
                    <button className="hover:text-white"><PlayCircle className="w-4 h-4 text-[#FA634E]" /></button>
                    <span className="text-[11px] font-mono">{activeVideo.steps[activeStepIdx]?.time || '00:00'} / {activeVideo.duration}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-gray-700 overflow-hidden cursor-pointer">
                      <div 
                        className="h-full bg-[#FA634E] transition-all duration-300"
                        style={{ width: `${((activeStepIdx + 1) / activeVideo.steps.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Video Info & Summary */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-lg font-bold text-white">{activeVideo.title}</h3>
                  <p className="text-xs text-gray-300 leading-relaxed">{activeVideo.description}</p>
                </div>
              </div>

              {/* Right Column: Step-by-Step Timeline & Takeaways (4 cols) */}
              <div className="lg:col-span-4 p-6 bg-[#262626] border-l border-white/10 space-y-6 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#FA634E]" />
                    <span>TIMESTAMPE WORKFLOW STEPS</span>
                  </h4>

                  {/* Steps Timeline List */}
                  <div className="space-y-3">
                    {activeVideo.steps.map((step, idx) => {
                      const isActive = idx === activeStepIdx;
                      return (
                        <div 
                          key={idx}
                          onClick={() => setActiveStepIdx(idx)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer ${
                            isActive 
                              ? 'bg-[#3E3C3D] border-[#FA634E] text-white shadow-md' 
                              : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isActive ? 'bg-[#FA634E] text-white' : 'bg-white/10 text-gray-400'
                            }`}>
                              {step.time}
                            </span>
                            <span className="text-[11px] text-gray-400 font-medium">Step {idx + 1}</span>
                          </div>
                          <div className="text-xs font-bold text-white leading-snug">{step.title}</div>
                          <div className="text-[11px] text-gray-300 mt-1 line-clamp-2 leading-relaxed">
                            {step.description}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Key Takeaways Section */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                  <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>OPERATOR KEY TAKEAWAYS</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-gray-300">
                    {activeVideo.keyTakeaways.map((takeaway, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#FA634E] font-bold">•</span>
                        <span>{takeaway}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* ── UPLOAD VIDEO GUIDE MODAL (FOR ADMINS & OPS LEADS) ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
            <div className="flex items-center justify-between px-6 py-4 bg-[#3E3C3D] text-white">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-[#FA634E]" />
                <h3 className="text-base font-bold">Upload New Video Tutorial</h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-gray-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddVideo} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Video Title</Label>
                <Input 
                  type="text"
                  required
                  placeholder="e.g. How to Resolve Quotation Discrepancies"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Category</Label>
                  <select
                    value={newCategory}
                    onChange={(e: any) => setNewCategory(e.target.value)}
                    className="w-full h-10 px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#FA634E]"
                  >
                    <option value="dispatch">Dispatch & Trips</option>
                    <option value="payouts">Driver Payouts</option>
                    <option value="quotations">Quotations & Rates</option>
                    <option value="fleet">Fleet & Maintenance</option>
                    <option value="mobile">Mobile & POD</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Runtime Duration</Label>
                  <Input 
                    type="text"
                    required
                    placeholder="e.g. 4:15"
                    value={newDuration}
                    onChange={(e) => setNewDuration(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Operational Description</Label>
                <textarea 
                  required
                  rows={3}
                  placeholder="Briefly explain what operational task or doubt this video resolves for operators..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#FA634E]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Video Link / Embed URL (Optional)</Label>
                <Input 
                  type="url"
                  placeholder="https://youtube.com/... or Vimeo / MP4 link"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowAddModal(false)}
                  className="text-xs rounded-xl"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-[#FA634E] hover:bg-[#DF4834] text-white text-xs font-semibold px-5 rounded-xl"
                >
                  Publish Video Guide
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
