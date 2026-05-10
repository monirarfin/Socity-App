import React, { useEffect, useState, FormEvent, useRef } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db, signInWithGoogle } from './lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, collection, query, orderBy, limit, addDoc, serverTimestamp, updateDoc, arrayUnion, arrayRemove, increment, where, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { UserProfile, Post, OperationType, Notification, Contribution, BudgetLineItem, Conversation, Message, Call } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Home, 
  CreditCard, 
  User as UserIcon, 
  ShieldCheck, 
  LogOut, 
  Mail,
  Plus, 
  Bell, 
  Menu, 
  X,
  Megaphone,
  BookOpen,
  Heart,
  Calendar,
  Hammer,
  LifeBuoy,
  ThumbsUp,
  MessageCircle,
  Share2,
  Send,
  GitGraph,
  Search,
  ChevronRight,
  ChevronDown,
  Network,
  DollarSign,
  CheckCircle2,
  Clock,
  ExternalLink,
  PieChart,
  Image as ImageIcon,
  Trash2,
  Smartphone,
  Lock,
  ArrowLeft,
  Loader2,
  Link2,
  GitBranch,
  Minus,
  MapPin,
  Mic,
  Square,
  Play,
  Volume2,
  Sparkles,
  Zap,
  Bot,
  Brain,
  Camera,
  MoreVertical,
  Pencil,
  Save,
  Undo2,
  Phone,
  Video,
  VideoOff,
  MicOff,
  PhoneOff,
  Maximize2,
  Minimize2,
  Smile,
  Paperclip,
  FileText,
  XCircle,
  MoreHorizontal,
  RefreshCw,
  File,
  Download,
  Eye,
  Unlock,
  Settings2,
  UserPlus,
  Flag,
  Copy,
  ArrowRight,
  CheckCircle,
  Scan,
  Fingerprint,
  Edit3,
  Shield
} from 'lucide-react';
import { format } from 'date-fns';
import * as d3 from 'd3';
import { detectLineage, answerTreeQuestion, analyzeLineageImage, refineBlogPost, generatePostImage, transcribeAudio, explainFamilyTree } from './services/geminiService';

// Helper for string similarity (Levenshtein Distance)
function getSimilarity(s1: string, s2: string) {
  if (!s1 || !s2) return 0;
  let longer = s1;
  let shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  let longerLength = longer.length;
  if (longerLength === 0) return 1.0;
  
  const editDistance = (str1: string, str2: string) => {
    str1 = str1.toLowerCase();
    str2 = str2.toLowerCase();
    let costs = [];
    for (let i = 0; i <= str1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= str2.length; j++) {
        if (i === 0) costs[j] = j;
        else {
          if (j > 0) {
            let newValue = costs[j - 1];
            if (str1.charAt(i - 1) !== str2.charAt(j - 1))
              newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
      }
      if (i > 0) costs[str2.length] = lastValue;
    }
    return costs[str2.length];
  };

  return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength.toString());
}

function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setAudioBlob(null);
    }
  };

  return { isRecording, startRecording, stopRecording, cancelRecording, audioBlob, recordingTime };
}
import { BlockEditor, Block as BlockData } from './components/BlockEditor';

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // In a real app we'd show a toast here
}

export default function App() {
  const [user, loading, error] = useAuthState(auth);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('members');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'director' || profile?.email === 'mdmonirahamedarfin@gmail.com';

  const { isRecording, startRecording, stopRecording, cancelRecording, audioBlob, recordingTime } = useAudioRecorder();

  useEffect(() => {
    if (user) {
      // Listen for incoming calls
      const q = query(
        collection(db, 'calls'),
        where('receiverId', '==', user.uid),
        where('status', '==', 'ringing'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      const unsubscribe = onSnapshot(q, (snap) => {
        if (!snap.empty) {
          const callData = { id: snap.docs[0].id, ...snap.docs[0].data() } as Call;
          setIncomingCall(callData);
        } else {
          setIncomingCall(null);
        }
      });

      // Listen for active call updates
      let unsubscribeActive: (() => void) | undefined;
      if (activeCall) {
        unsubscribeActive = onSnapshot(doc(db, 'calls', activeCall.id), (docSnap) => {
          if (docSnap.exists()) {
            const data = { id: docSnap.id, ...docSnap.data() } as Call;
            if (data.status === 'ended' || data.status === 'rejected' || data.status === 'missed') {
              setActiveCall(null);
            } else {
              setActiveCall(data);
            }
          } else {
            setActiveCall(null);
          }
        });
      }

      return () => {
        unsubscribe();
        if (unsubscribeActive) unsubscribeActive();
      };
    }
  }, [user, activeCall?.id]);

  useEffect(() => {
    if (user && activeCall && activeCall.callerId === user.uid) {
       // Support for caller to listen for answer
       const unsubscribe = onSnapshot(doc(db, 'calls', activeCall.id), (docSnap) => {
          if (docSnap.exists()) {
            const data = { id: docSnap.id, ...docSnap.data() } as Call;
            if (data.status === 'accepted') {
               setActiveCall(data);
            }
          }
       });
       return () => unsubscribe();
    }
  }, [user, activeCall?.id]);

  useEffect(() => {
    if (user && isAdmin) {
      const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(10));
      const unsubscribe = onSnapshot(q, (snap) => {
        setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));
      });
      return () => unsubscribe();
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (user) {
      const docRef = doc(db, 'users', user.uid);
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          // New user creation
          const newProfile: Partial<UserProfile> = {
            uid: user.uid,
            displayName: user.displayName || 'Member',
            email: user.email || '',
            photoURL: user.photoURL || undefined,
            role: 'member',
            isApproved: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          setDoc(docRef, newProfile).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`));
        }
      }, (err) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}`));
      return () => unsubscribe();
    }
  }, [user]);

  const handleStartCall = async (receiverId: string, type: 'voice' | 'video') => {
    if (!profile) return;
    try {
      const callData = {
        callerId: profile.uid,
        receiverId: receiverId,
        type: type,
        status: 'ringing',
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, 'calls'), callData);
      setActiveCall({ id: docRef.id, ...callData } as Call);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'calls');
    }
  };

  const handleAcceptCall = async (call: Call) => {
    try {
      await updateDoc(doc(db, 'calls', call.id), {
        status: 'accepted',
        acceptedAt: serverTimestamp()
      });
      setActiveCall(call);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `calls/${call.id}`);
    }
  };

  const handleRejectCall = async (call: Call) => {
    try {
      await updateDoc(doc(db, 'calls', call.id), {
        status: 'rejected',
        endedAt: serverTimestamp()
      });
      setIncomingCall(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `calls/${call.id}`);
    }
  };

  const handleEndCall = async (call: Call) => {
    try {
      await updateDoc(doc(db, 'calls', call.id), {
        status: 'ended',
        endedAt: serverTimestamp()
      });
      setActiveCall(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `calls/${call.id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-foundation-200">
        <div className="w-12 h-12 border-4 border-foundation-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage onSignIn={signInWithGoogle} />;
  }

  if (profile && !profile.houseName) {
    return <RegistrationPage profile={profile} />;
  }

  if (profile && !profile.isApproved && profile.role !== 'admin' && profile.role !== 'director' && profile.email !== 'mdmonirahamedarfin@gmail.com') {
    return (
      <div className="min-h-screen bg-foundation-100 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 text-center border border-foundation-200"
        >
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock size={40} className="text-amber-600 animate-pulse" />
          </div>
          <h2 className="text-2xl font-display font-bold text-foundation-900 mb-4">Registration Pending</h2>
          <p className="text-foundation-600 text-sm leading-relaxed mb-8">
            আসসালামু আলাইকুম, <strong>{profile.displayName}</strong>। আপনার মেম্বারশিপ আবেদনটি সফলভাবে জমা হয়েছে। আমাদের অ্যাডমিন প্যানেল আপনার দেওয়া তথ্য যাচাই করছে। 
          </p>
          <div className="bg-foundation-50 rounded-2xl p-4 mb-8 border border-foundation-100">
             <p className="text-[10px] text-foundation-400 font-black uppercase tracking-widest mb-1">Application ID</p>
             <p className="text-xs font-mono font-bold text-foundation-900">{profile.uid.substring(0, 8).toUpperCase()}</p>
          </div>
          <button 
            onClick={() => auth.signOut()}
            className="w-full py-4 bg-foundation-900 text-white rounded-xl font-bold hover:bg-foundation-800 transition-all"
          >
            Log Out
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-foundation-200 flex">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-foundation-900 text-white transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6">
          <h1 className="text-xl font-display font-bold text-foundation-400">HAZI BARI</h1>
          <p className="text-[10px] tracking-widest text-foundation-600 uppercase mb-8">Foundation</p>
          
          <nav className="space-y-1">
            <NavItem 
              icon={<Home size={20} />} 
              label="Family Feed" 
              active={activeTab === 'feed'} 
              onClick={() => { setActiveTab('feed'); setIsSidebarOpen(false); }} 
            />
            <NavItem 
              icon={<GitGraph size={20} />} 
              label="Bongsho Tree" 
              active={activeTab === 'tree'} 
              onClick={() => { setActiveTab('tree'); setIsSidebarOpen(false); }} 
            />
            <NavItem 
              icon={<Users size={20} />} 
              label="Members" 
              active={activeTab === 'members'} 
              onClick={() => { setActiveTab('members'); setIsSidebarOpen(false); }} 
            />
            <NavItem 
              icon={<CreditCard size={20} />} 
              label="Subscriptions" 
              active={activeTab === 'finance'} 
              onClick={() => { setActiveTab('finance'); setIsSidebarOpen(false); }} 
            />
            <NavItem 
              icon={<ShieldCheck size={20} />} 
              label="Committee" 
              active={activeTab === 'committee'} 
              onClick={() => { setActiveTab('committee'); setIsSidebarOpen(false); }} 
            />
            <NavItem 
              icon={<UserIcon size={20} />} 
              label="My Profile" 
              active={activeTab === 'profile'} 
              onClick={() => { setActiveTab('profile'); setIsSidebarOpen(false); }} 
            />
            <NavItem 
              icon={<MessageCircle size={20} />} 
              label="Messages" 
              active={activeTab === 'messages'} 
              onClick={() => { setActiveTab('messages'); setIsSidebarOpen(false); }} 
            />
          </nav>
        </div>

        <div className="absolute bottom-0 w-full p-6 bg-black/20">
          <button 
            onClick={() => auth.signOut()}
            className="flex items-center gap-3 text-foundation-400 hover:text-white transition-colors w-full"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Log out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-foundation-300 flex items-center justify-between px-6 sticky top-0 z-40">
          <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-foundation-800">
            <Menu size={24} />
          </button>
          
          <div className="flex-1 px-4">
            <h2 className="text-lg font-medium text-foundation-900 capitalize">{activeTab.replace('-', ' ')}</h2>
          </div>

          <div className="flex items-center gap-4 relative">
            <button 
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="p-2 text-foundation-600 hover:bg-foundation-200 rounded-full transition-colors relative"
            >
              <Bell size={20} />
              {notifications.filter(n => !n.read).length > 0 && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></div>
              )}
            </button>

            <AnimatePresence>
              {isNotifOpen && (
                <NotificationDropdown 
                  notifications={notifications} 
                  onClose={() => setIsNotifOpen(false)} 
                />
              )}
            </AnimatePresence>

            <img src={profile?.photoURL || undefined} alt="" className="w-8 h-8 rounded-full border border-foundation-300" />
          </div>
        </header>

        {!profile?.isApproved && profile?.role !== 'admin' && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
              <Clock size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900">Account Pending Approval</p>
              <p className="text-[10px] text-amber-700">Your profile is being reviewed by the Haji Bari Foundation directors. Some features will be restricted until verified.</p>
            </div>
          </div>
        )}

        <section className="p-6 max-w-4xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'feed' && <Feed profile={profile} setActiveTab={setActiveTab} />}
              {activeTab === 'tree' && <FamilyTree profile={profile} />}
              {activeTab === 'members' && <MembersList profile={profile} setActiveTab={setActiveTab} isAdmin={profile?.role === 'admin' || profile?.role === 'director' || profile?.email === 'mdmonirahamedarfin@gmail.com'} />}
              {activeTab === 'committee' && <Committee profile={profile} isAdmin={profile?.role === 'admin' || profile?.role === 'director' || profile?.email === 'mdmonirahamedarfin@gmail.com'} />}
              {activeTab === 'profile' && <ProfileComponent profile={profile} />}
              {activeTab === 'finance' && <Subscriptions profile={profile} />}
              {activeTab === 'messages' && <Messenger profile={profile} onStartCall={handleStartCall} />}
            </motion.div>
          </AnimatePresence>
        </section>

        <AnimatePresence>
          {incomingCall && !activeCall && (
            <IncomingCallOverlay 
              call={incomingCall} 
              onAccept={() => handleAcceptCall(incomingCall)} 
              onReject={() => handleRejectCall(incomingCall)} 
            />
          )}
          {activeCall && (
            <ActiveCallOverlay 
              call={activeCall} 
              profile={profile}
              onEnd={() => handleEndCall(activeCall)} 
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function IncomingCallOverlay({ call, onAccept, onReject }: { call: Call, onAccept: () => void, onReject: () => void }) {
  const [callerProfile, setCallerProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    getDoc(doc(db, 'users', call.callerId)).then(snap => {
      if (snap.exists()) setCallerProfile(snap.data() as UserProfile);
    });
  }, [call.callerId]);

  return (
    <motion.div 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-6 right-6 z-[100] w-80 bg-foundation-900 text-white rounded-3xl shadow-2xl p-6 border border-white/10 ring-4 ring-foundation-500/20"
    >
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-4">
          <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20"></div>
          <img 
            src={callerProfile?.photoURL || `https://ui-avatars.com/api/?name=${callerProfile?.displayName || '...'}`} 
            className="w-20 h-20 rounded-full border-4 border-foundation-50 relative z-10" 
            alt="" 
          />
        </div>
        <h4 className="text-lg font-display font-bold">{callerProfile?.displayName || 'Incoming Call...'}</h4>
        <p className="text-[10px] text-foundation-400 uppercase tracking-widest mt-1 mb-6">
          Incoming {call.type} call
        </p>
        
        <div className="flex gap-4 w-full">
          <button 
            onClick={onReject}
            className="flex-1 bg-red-500 hover:bg-red-600 p-3 rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-95"
          >
            <PhoneOff size={20} />
          </button>
          <button 
            onClick={onAccept}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 p-3 rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-95"
          >
            <Phone size={20} className="animate-bounce" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function ActiveCallOverlay({ call, onEnd, profile }: { call: Call, onEnd: () => void, profile: UserProfile | null }) {
  const [otherProfile, setOtherProfile] = useState<UserProfile | null>(null);
  const otherId = call.callerId === profile?.uid ? call.receiverId : call.callerId;

  useEffect(() => {
    getDoc(doc(db, 'users', otherId)).then(snap => {
      if (snap.exists()) setOtherProfile(snap.data() as UserProfile);
    });
  }, [otherId]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-[200] bg-foundation-900 flex flex-col items-center justify-center p-6"
    >
      <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full">
        {call.status === 'ringing' ? (
          <div className="mb-12">
            <div className="relative">
               <div className="absolute inset-0 bg-white/20 rounded-full animate-ping"></div>
               <img 
                 src={otherProfile?.photoURL || undefined} 
                 className="w-32 h-32 rounded-full border-4 border-foundation-50 shadow-2xl relative z-10" 
                 alt="" 
               />
            </div>
            <h3 className="text-2xl font-display font-bold text-white mt-6">Calling...</h3>
            <p className="text-foundation-400 text-sm mt-2">{otherProfile?.displayName}</p>
          </div>
        ) : (
          <div className="w-full flex-1 flex flex-col items-center justify-center">
            {call.type === 'video' ? (
              <div className="w-full aspect-[3/4] bg-foundation-800 rounded-3xl relative overflow-hidden shadow-2xl border border-white/10 mb-8">
                <img src={otherProfile?.photoURL} className="w-full h-full object-cover opacity-50 blur-sm" alt="" />
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="flex flex-col items-center gap-4">
                      <img src={otherProfile?.photoURL} className="w-24 h-24 rounded-full border-2 border-white/20" alt="" />
                      <p className="text-white font-bold text-lg">{otherProfile?.displayName}</p>
                   </div>
                </div>
                <div className="absolute bottom-4 right-4 w-24 h-32 bg-white/10 rounded-xl border border-white/20 backdrop-blur-md overflow-hidden">
                   <img src={profile?.photoURL} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="absolute top-4 left-4 flex gap-2">
                   <div className="px-2 py-1 bg-red-500 rounded text-[8px] font-bold text-white uppercase tracking-widest flex items-center gap-1">
                      <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div> LIVE
                   </div>
                </div>
              </div>
            ) : (
              <div className="mb-12">
                 <img src={otherProfile?.photoURL} className="w-40 h-40 rounded-full border-4 border-indigo-500/30 shadow-2xl mx-auto" alt="" />
                 <h3 className="text-2xl font-display font-bold text-white mt-8">{otherProfile?.displayName}</h3>
                 <p className="text-emerald-400 text-sm font-bold mt-2 uppercase tracking-widest flex items-center justify-center gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div> Active Call
                 </p>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-6 w-full justify-center">
          <button className="w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all backdrop-blur-md">
             <MicOff size={20} />
          </button>
          {call.type === 'video' && (
            <button className="w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all backdrop-blur-md">
               <VideoOff size={20} />
            </button>
          )}
          <button 
            onClick={onEnd}
            className="w-12 h-12 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all shadow-xl active:scale-95"
          >
             <PhoneOff size={24} />
          </button>
          <button className="w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all backdrop-blur-md">
             <Volume2 size={20} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`
        flex items-center gap-4 w-full p-3 rounded-lg transition-all
        ${active ? 'bg-foundation-500 text-white shadow-md shadow-foundation-900/50' : 'text-foundation-400 hover:bg-white/5 hover:text-white'}
      `}
    >
      {icon}
      <span className="font-medium text-sm">{label}</span>
    </button>
  );
}

function LandingPage({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="min-h-screen bg-foundation-200 flex flex-col items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-foundation-300"
      >
        <div className="bg-foundation-900 p-12 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-foundation-500/20 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="relative">
            <h1 className="text-3xl font-display mb-2">HAZI BARI</h1>
            <p className="text-xs uppercase tracking-[0.3em] font-medium text-foundation-400">Foundation</p>
            <div className="mt-4 w-12 h-1 bg-foundation-500 mx-auto rounded-full"></div>
            <p className="mt-6 text-foundation-300 text-sm italic">"Let's Run Together"</p>
          </div>
        </div>

        <div className="p-10 space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-xl font-bold text-foundation-900">Welcome Back</h2>
            <p className="text-foundation-600 text-sm">Sign in to stay connected with the family foundation.</p>
          </div>

          <button 
            onClick={onSignIn}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-foundation-300 p-4 rounded-xl font-semibold text-foundation-900 hover:bg-foundation-200 transition-all active:scale-95"
          >
            <img src="https://www.google.com/favicon.ico" alt="google" className="w-5 h-5" />
            Continue with Google
          </button>

          <p className="text-[10px] text-center text-foundation-500 uppercase tracking-widest mt-8">
            Established for Unity & Welfare
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function RegistrationPage({ profile }: { profile: UserProfile }) {
  const [isSmartScanOpen, setIsSmartScanOpen] = useState(true);
  const [scannedData, setScannedData] = useState<any>(null);
  const [formData, setFormData] = useState({
    displayName: '',
    photoURL: '',
    fatherName: '',
    motherName: '',
    houseName: '',
    village: '',
    district: '',
    nidNumber: '',
    familyHead: '',
    mobile: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const onPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const base64 = await handleImageUpload(file);
      setFormData(prev => ({ ...prev, photoURL: base64 }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAIResult = (child: string, father: string, fullSuggestion?: any) => {
    setScannedData(fullSuggestion);
    setIsSmartScanOpen(false);
    
    // Function to handle missing data
    const getValue = (val: any) => (val && val !== 'null' && val !== 'NULL' ? val : 'তথ্য পাওয়া যায়নি');

    setFormData(prev => ({
      ...prev,
      displayName: getValue(fullSuggestion?.subject?.name),
      fatherName: getValue(fullSuggestion?.father?.name),
      motherName: getValue(fullSuggestion?.mother?.name),
      village: getValue(fullSuggestion?.village),
      district: getValue(fullSuggestion?.district),
      nidNumber: getValue(fullSuggestion?.nidNumber),
      houseName: getValue(fullSuggestion?.house),
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSubmitting(true);
    try {
      // Auto-linking logic: check if fatherName exists in the system
      let autoFatherId = undefined;
      const q = query(collection(db, 'users'), where('displayName', '==', formData.fatherName), limit(1));
      const fatherSnap = await getDocs(q);
      if (!fatherSnap.empty) {
        autoFatherId = fatherSnap.docs[0].id;
      }

      const slug = formData.displayName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(2, 6);

      const updateData = {
        ...formData,
        uid: profile.uid,
        memberSlug: slug,
        memberId: `HB-${formData.displayName.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
        fatherId: autoFatherId || profile.fatherId,
        isApproved: false,
        role: 'member' as const,
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', profile.uid), updateData, { merge: true });

      // Create notification for admins
      await addDoc(collection(db, 'notifications'), {
        type: 'registration',
        userId: profile.uid,
        userName: formData.displayName || profile.displayName,
        userPhotoURL: profile.photoURL || '',
        message: `${formData.displayName || profile.displayName} has applied for membership.${autoFatherId ? ' System auto-linked their lineage.' : ''}`,
        read: false,
        createdAt: serverTimestamp()
      });
      
      window.location.reload();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${profile.uid}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSmartScanOpen) {
    return (
      <div className="min-h-screen bg-foundation-100 p-4 sm:p-8 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full bg-white rounded-[2.5rem] shadow-2xl border border-foundation-200 overflow-hidden"
        >
          <div className="p-10 border-b border-foundation-100 bg-indigo-900 text-white relative overflow-hidden text-center">
             <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
             <div className="relative z-10 space-y-2">
               <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/30 backdrop-blur-sm">
                 <ShieldCheck size={24} className="text-emerald-400" />
               </div>
               <h2 className="text-3xl font-display">Identity Verification</h2>
               <p className="text-indigo-200 text-sm font-medium">Verify your identity to join Hazi Bari Foundation</p>
             </div>
          </div>
          
          <div className="p-10">
            <div className="mb-10 text-center space-y-4">
              <h3 className="text-xl font-bold text-foundation-900">Step 1: Smart Document Scan</h3>
              <p className="text-sm text-foundation-500 leading-relaxed max-w-md mx-auto">
                Scan your NID, Birth Certificate, or Passport. Our AI will detect your lineage and suggest root connections automatically.
              </p>
            </div>

            <AIBongshoSuite onResult={handleAIResult} />

            <div className="mt-12 pt-8 border-t border-foundation-100 text-center">
              <button 
                onClick={() => setIsSmartScanOpen(false)}
                className="group flex items-center justify-center gap-2 mx-auto text-foundation-400 text-[10px] font-black uppercase tracking-widest hover:text-indigo-600 transition-all"
              >
                Skip to manual form <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-foundation-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-foundation-100"
        >
          <div className="bg-gradient-to-br from-indigo-900 to-foundation-900 px-10 py-12 text-white">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-white/10 rounded-2xl backdrop-blur-md flex items-center justify-center border border-white/20">
                <UserPlus size={24} />
              </div>
              <div>
                <p className="text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-1">Step 2: Profile Setup</p>
                <h2 className="text-3xl font-display">Review & Submit</h2>
              </div>
            </div>
            <p className="text-indigo-200 text-sm leading-relaxed max-w-md">
              We've pre-filled your details from the document scan. Please correct any inaccuracies before submitting.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-10 space-y-8">
            <div className="flex flex-col items-center gap-4 py-4 bg-foundation-50 rounded-3xl border-2 border-dashed border-foundation-200">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg relative bg-white">
                  {formData.photoURL ? (
                    <img src={formData.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-foundation-300">
                      <Camera size={40} />
                    </div>
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 w-8 h-8 bg-indigo-600 rounded-full border-2 border-white flex items-center justify-center text-white cursor-pointer hover:bg-indigo-700 transition-colors shadow-md">
                  <Camera size={14} />
                  <input type="file" className="hidden" accept="image/*" onChange={onPhotoUpload} />
                </label>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-foundation-400">Profile Photo</p>
                <p className="text-[9px] text-foundation-400 mt-0.5">Click camera icon to upload</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <Input 
                  label="Full Name (English)" 
                  required 
                  value={formData.displayName} 
                  onChange={(e: any) => setFormData({...formData, displayName: e.target.value})}
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Input 
                    label="Father's Name" 
                    required 
                    value={formData.fatherName} 
                    onChange={(e: any) => setFormData({...formData, fatherName: e.target.value})} 
                  />
                  <Input 
                    label="Mother's Name" 
                    value={formData.motherName} 
                    onChange={(e: any) => setFormData({...formData, motherName: e.target.value})} 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Input 
                    label="Village (গ্রাম)" 
                    required 
                    value={formData.village} 
                    onChange={(e: any) => setFormData({...formData, village: e.target.value})} 
                  />
                  <Input 
                    label="District (জেলা)" 
                    required 
                    value={formData.district} 
                    onChange={(e: any) => setFormData({...formData, district: e.target.value})} 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Input 
                    label="House Name (বাড়ির নাম)" 
                    required 
                    value={formData.houseName} 
                    onChange={(e: any) => setFormData({...formData, houseName: e.target.value})} 
                  />
                  <Input 
                    label="Voter ID / NID Index (ভোটার আইডি নাম্বার)" 
                    value={formData.nidNumber} 
                    onChange={(e: any) => setFormData({...formData, nidNumber: e.target.value})} 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Input 
                    label="Head of Family (পরিবারের কর্তা)" 
                    required 
                    value={formData.familyHead} 
                    onChange={(e: any) => setFormData({...formData, familyHead: e.target.value})} 
                  />
                  <Input 
                    label="Mobile Number (মোবাইল নম্বর)" 
                    required 
                    value={formData.mobile} 
                    onChange={(e: any) => setFormData({...formData, mobile: e.target.value})} 
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-foundation-100">
              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 text-white rounded-2xl px-8 py-5 text-sm font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Processing Application...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    Register as a family member
                  </>
                )}
              </button>
              <p className="text-center text-[10px] text-foundation-400 mt-4 uppercase font-bold">
                Your application will be reviewed by foundation administrators
              </p>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

function Input({ label, ...props }: any) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold text-foundation-700 uppercase tracking-wider">{label}</label>
      <input {...props} className="w-full p-3 rounded-lg border-2 border-foundation-200 focus:border-foundation-500 focus:outline-none transition-all placeholder-foundation-400" />
    </div>
  );
}

function Feed({ profile, setActiveTab }: { profile: UserProfile | null, setActiveTab: (tab: string) => void }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [editorBlocks, setEditorBlocks] = useState<BlockData[]>([]);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [fullScreenMedia, setFullScreenMedia] = useState<{ url: string, type: 'image' | 'video' } | null>(null);
  const [editorMode, setEditorMode] = useState<'classic' | 'blocks'>('blocks');
  const [isRefining, setIsRefining] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const [postType, setPostType] = useState<Post['type']>('news');
  const [searchQuery, setSearchQuery] = useState('');
  const [projectData, setProjectData] = useState({
    startDate: '',
    endDate: '',
    budget: '',
    summary: ''
  });
  const [projectBreakdown, setProjectBreakdown] = useState<BudgetLineItem[]>([]);
  const [breakdownItem, setBreakdownItem] = useState('');
  const [breakdownAmount, setBreakdownAmount] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Post)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'posts'));
    return () => unsubscribe();
  }, []);

  const handlePost = async () => {
    if ((!newPost.trim() && editorBlocks.length === 0 && !recordedAudio && !generatedImageUrl && !uploadedImageUrl) || !profile) return;
    try {
      const postPayload: any = {
        authorId: profile.uid,
        authorName: profile.displayName,
        authorPhotoURL: profile.photoURL || '',
        content: newPost || (recordedAudio ? '[Voice Message]' : (generatedImageUrl || uploadedImageUrl ? '[Image]' : (editorBlocks.length > 0 ? '[Block Post]' : ''))),
        blocks: editorBlocks,
        type: postType,
        likes: editingPostId ? undefined : [],
        commentCount: editingPostId ? undefined : 0,
        updatedAt: serverTimestamp()
      };

      if (!editingPostId) {
        postPayload.createdAt = serverTimestamp();
      }

      if (recordedAudio) {
        postPayload.audioUrl = recordedAudio;
      }

      const finalImageUrl = uploadedImageUrl || generatedImageUrl;
      if (finalImageUrl) {
        postPayload.imageUrl = finalImageUrl;
      }

      if (postType === 'project') {
        postPayload.projectStartDate = projectData.startDate;
        postPayload.projectEndDate = projectData.endDate;
        postPayload.projectBudget = parseFloat(projectData.budget) || 0;
        postPayload.projectSummary = projectData.summary;
        postPayload.projectProgress = editingPostId ? undefined : 0;
        postPayload.projectBudgetBreakdown = projectBreakdown;
      }

      // Remove undefined fields for update
      if (editingPostId) {
        Object.keys(postPayload).forEach(key => postPayload[key] === undefined && delete postPayload[key]);
        await updateDoc(doc(db, 'posts', editingPostId), postPayload);
      } else {
        await addDoc(collection(db, 'posts'), postPayload);
      }

      setNewPost('');
      setEditorBlocks([]);
      setEditingPostId(null);
      setRecordedAudio(null);
      setGeneratedImageUrl(null);
      setUploadedImageUrl(null);
      setProjectData({ startDate: '', endDate: '', budget: '', summary: '' });
      setProjectBreakdown([]);
    } catch (err) {
      handleFirestoreError(err, editingPostId ? OperationType.UPDATE : OperationType.WRITE, 'posts');
    }
  };

  const handleEditPost = (post: Post) => {
    setEditingPostId(post.id);
    setNewPost(post.content);
    setEditorBlocks(post.blocks || []);
    setPostType(post.type);
    setRecordedAudio(post.audioUrl || null);
    if (post.imageUrl) {
      setUploadedImageUrl(post.imageUrl);
    }
    if (post.type === 'project') {
      setProjectData({
        startDate: post.projectStartDate || '',
        endDate: post.projectEndDate || '',
        budget: post.projectBudget?.toString() || '',
        summary: post.projectSummary || ''
      });
      setProjectBreakdown(post.projectBudgetBreakdown || []);
    }
    
    // Switch editor mode based on content
    if (post.blocks && post.blocks.length > 0) {
      setEditorMode('blocks');
    } else {
      setEditorMode('classic');
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `posts/${postId}`);
    }
  };

  const handleGenerateImage = async () => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = newPost;
    const plainText = tempDiv.textContent || tempDiv.innerText || "";
    
    if (!plainText.trim()) {
      alert("Please write something first to generate a relevant image!");
      return;
    }

    setIsGeneratingImage(true);
    const imageUrl = await generatePostImage(plainText);
    setIsGeneratingImage(false);

    if (imageUrl) {
      if (editorMode === 'blocks') {
        const newBlock: BlockData = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'image',
          content: imageUrl,
        };
        setEditorBlocks([...editorBlocks, newBlock]);
      } else {
        setGeneratedImageUrl(imageUrl);
        setUploadedImageUrl(null);
      }
    } else {
      alert("Failed to generate image. Please try again.");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image should be less than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (editorMode === 'blocks') {
          const newBlock: BlockData = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'image',
            content: reader.result as string,
          };
          setEditorBlocks([...editorBlocks, newBlock]);
        } else {
          setUploadedImageUrl(reader.result as string);
          setGeneratedImageUrl(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAIRefine = async () => {
    if (!newPost || newPost === '<p><br></p>') return;
    
    setIsRefining(true);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = newPost;
    const plainText = tempDiv.textContent || tempDiv.innerText || "";
    
    const refined = await refineBlogPost(plainText);
    setIsRefining(false);
    
    if (refined) {
      // Process the refined content to handle Hazi Bari specific formatting
      const lines = refined.split('\n');
      let htmlFormatted = '';
      let inList = false;
      let metaDescription = '';

      lines.forEach(line => {
        const trimmed = line.trim();
        
        // Extract Meta Description
        if (trimmed.toLowerCase().startsWith('meta description:')) {
          metaDescription = trimmed.substring(17).trim();
          return;
        }

        // Handle Headings
        if (trimmed.startsWith('## ')) {
          if (inList) { htmlFormatted += '</ul>'; inList = false; }
          htmlFormatted += `<h2>${trimmed.substring(3)}</h2>`;
        } else if (trimmed.startsWith('### ')) {
          if (inList) { htmlFormatted += '</ul>'; inList = false; }
          htmlFormatted += `<h3>${trimmed.substring(4)}</h3>`;
        } 
        // Handle Bullet Points
        else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          if (!inList) { htmlFormatted += '<ul class="list-disc ml-6 space-y-1 mb-4">'; inList = true; }
          htmlFormatted += `<li>${trimmed.substring(2)}</li>`;
        }
        // Handle Image Placeholders
        else if (trimmed.includes('[Insert Image Here:')) {
          if (inList) { htmlFormatted += '</ul>'; inList = false; }
          const desc = trimmed.match(/\[Insert Image Here: (.*?)\]/)?.[1] || "Image suggestion";
          htmlFormatted += `<div class="my-6 p-4 bg-foundation-100 rounded-2xl border-2 border-dashed border-foundation-300 flex flex-col items-center gap-2 text-center">
            <div class="w-10 h-10 rounded-full bg-foundation-200 flex items-center justify-center text-foundation-500">
              <i class="lucide-image"></i>
            </div>
            <p class="text-[10px] font-bold text-foundation-400 uppercase tracking-widest">AI Image Suggestion</p>
            <p class="text-xs text-foundation-700 italic font-medium">"${desc}"</p>
          </div>`;
        }
        // Filter out SEO keywords or Meta info from actual post body if present as headers
        else if (trimmed.toLowerCase().startsWith('keywords:') || trimmed.toLowerCase().startsWith('seo:')) {
          // Skip these lines in the main post content
        }
        // Handle Paragraphs
        else if (trimmed !== '') {
          if (inList) { htmlFormatted += '</ul>'; inList = false; }
          // Handle Bold/Emoji/Link style
          const processed = trimmed
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
          htmlFormatted += `<p>${processed}</p>`;
        } else {
          if (inList) { htmlFormatted += '</ul>'; inList = false; }
        }
      });

      if (inList) htmlFormatted += '</ul>';

      // Add meta description as a note at the top if found
      if (metaDescription) {
        const metaBlock = `<div class="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-2xl">
          <p class="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mb-1 flex items-center gap-2">
            <span class="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span> SEO Meta Description
          </p>
          <p class="text-xs text-indigo-900 font-medium">${metaDescription}</p>
        </div>`;
        htmlFormatted = metaBlock + htmlFormatted;
      }

      setNewPost(htmlFormatted);
      
      // Feedback to user
      const n = document.createElement('div');
      n.innerHTML = '✨ Post Refined & Optimized for SEO!';
      n.className = 'fixed top-20 right-4 bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-2xl z-[1000] font-bold text-sm animate-bounce';
      document.body.appendChild(n);
      setTimeout(() => n.remove(), 3000);
    }
  };

  const filteredPosts = posts.filter(post => 
    post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.authorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPostStyles = (type: Post['type']) => {
    switch (type) {
      case 'event': return { 
        bg: 'bg-blue-50', 
        border: 'border-blue-200', 
        tag: 'bg-blue-600', 
        icon: <Calendar size={14} className="text-blue-600" />,
        label: 'Event'
      };
      case 'project': return { 
        bg: 'bg-emerald-50', 
        border: 'border-emerald-200', 
        tag: 'bg-emerald-600', 
        icon: <Hammer size={14} className="text-emerald-600" />,
        label: 'Project'
      };
      case 'help': return { 
        bg: 'bg-rose-50', 
        border: 'border-rose-200', 
        tag: 'bg-rose-600', 
        icon: <LifeBuoy size={14} className="text-rose-600" />,
        label: 'Help Request'
      };
      default: return { 
        bg: 'bg-foundation-200/50', 
        border: 'border-foundation-300', 
        tag: 'bg-foundation-700', 
        icon: <Megaphone size={14} className="text-foundation-600" />,
        label: 'Announcement'
      };
    }
  };

  return (
    <div className="space-y-6">
      {(profile?.isApproved || profile?.role === 'admin') ? (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-foundation-300">
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-4 items-center">
              <img src={profile?.photoURL || undefined} alt="" className="w-10 h-10 rounded-full shrink-0" />
              <div>
                <h3 className="font-bold text-foundation-900 leading-none">
                  {editingPostId ? 'Edit Community Post' : 'Create Engagement'}
                </h3>
                <p className="text-[10px] text-foundation-400 font-bold uppercase tracking-widest mt-1">
                  {editingPostId ? 'Modifying existing entry' : 'Hazi Bari Community Board'}
                </p>
              </div>
            </div>
            <div className="flex bg-foundation-100 p-1 rounded-xl">
              <button 
                onClick={() => setEditorMode('blocks')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${editorMode === 'blocks' ? 'bg-white shadow-sm text-foundation-900' : 'text-foundation-500'}`}
              >
                Block Editor
              </button>
              <button 
                onClick={() => setEditorMode('classic')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${editorMode === 'classic' ? 'bg-white shadow-sm text-foundation-900' : 'text-foundation-500'}`}
              >
                Classic
              </button>
            </div>
          </div>

          <div className="rich-text-editor">
            {editorMode === 'classic' ? (
              <ReactQuill 
                theme="snow"
                value={newPost}
                onChange={setNewPost}
                placeholder="What's happening in the family?"
                modules={{
                  toolbar: [
                    ['bold', 'italic'],
                    [{ 'list': 'bullet' }],
                    ['clean']
                  ],
                }}
                className="bg-foundation-50 rounded-lg overflow-hidden"
              />
            ) : (
              <BlockEditor blocks={editorBlocks} onChange={setEditorBlocks} />
            )}
              
              <AnimatePresence>
                {postType === 'project' && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pb-3 border-b border-foundation-200">
                      <Input 
                        type="date" 
                        label="Start Date" 
                        value={projectData.startDate} 
                        onChange={(e: any) => setProjectData({...projectData, startDate: e.target.value})} 
                      />
                      <Input 
                        type="date" 
                        label="End Date" 
                        value={projectData.endDate} 
                        onChange={(e: any) => setProjectData({...projectData, endDate: e.target.value})} 
                      />
                      <Input 
                        type="number" 
                        label="Estimated Budget (BDT)" 
                        placeholder="e.g. 50000"
                        value={projectData.budget} 
                        onChange={(e: any) => setProjectData({...projectData, budget: e.target.value})} 
                      />
                      <Input 
                        label="Short Project Summary" 
                        placeholder="Goal of the project..."
                        value={projectData.summary} 
                        onChange={(e: any) => setProjectData({...projectData, summary: e.target.value})} 
                      />
                    </div>

                    <div className="mt-3 p-3 bg-foundation-200 rounded-lg space-y-3">
                      <p className="text-[10px] font-bold text-foundation-700 uppercase tracking-wider">Detailed Budget Breakdown</p>
                      <div className="flex gap-2">
                        <input 
                          placeholder="Item name (e.g. Masonry)"
                          value={breakdownItem}
                          onChange={e => setBreakdownItem(e.target.value)}
                          className="flex-1 p-2 bg-white rounded border border-foundation-300 text-xs focus:ring-1 focus:ring-foundation-500 outline-none"
                        />
                        <input 
                          type="number"
                          placeholder="Amount"
                          value={breakdownAmount}
                          onChange={e => setBreakdownAmount(e.target.value)}
                          className="w-24 p-2 bg-white rounded border border-foundation-300 text-xs focus:ring-1 focus:ring-foundation-500 outline-none"
                        />
                        <button 
                          onClick={() => {
                            if (breakdownItem && breakdownAmount) {
                              setProjectBreakdown([...projectBreakdown, { item: breakdownItem, amount: Number(breakdownAmount) }]);
                              setBreakdownItem('');
                              setBreakdownAmount('');
                            }
                          }}
                          className="p-2 bg-foundation-900 text-white rounded hover:bg-foundation-800 transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      {projectBreakdown.length > 0 && (
                        <div className="space-y-1">
                          {projectBreakdown.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white/50 p-2 rounded text-[10px]">
                              <span className="font-medium">{item.item}</span>
                              <div className="flex items-center gap-3 font-mono">
                                <span>{item.amount.toLocaleString()} BDT</span>
                                <button 
                                  onClick={() => setProjectBreakdown(projectBreakdown.filter((_, i) => i !== idx))}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            </div>
                          ))}
                          <div className="pt-2 border-t border-foundation-300 flex justify-between font-bold text-foundation-900 text-[10px]">
                            <span>Calculated Total</span>
                            <span>{projectBreakdown.reduce((s, i) => s + i.amount, 0).toLocaleString()} BDT</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {recordedAudio && (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="mt-4 p-4 bg-foundation-200/50 rounded-2xl border border-foundation-300 relative group"
                  >
                    <button 
                      onClick={() => setRecordedAudio(null)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20"
                    >
                      <X size={12} />
                    </button>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-foundation-900 text-white rounded-full flex items-center justify-center shadow-md">
                        <Volume2 size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-foundation-600 uppercase tracking-widest mb-1">Recorded Voice Note</p>
                        <AudioPlayer src={recordedAudio} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {(generatedImageUrl || uploadedImageUrl) && (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="mt-4 relative group rounded-2xl overflow-hidden border-2 border-foundation-300 shadow-xl"
                  >
                    <img src={(uploadedImageUrl || generatedImageUrl) as string} alt="Post visual" className="w-full aspect-video object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full ${generatedImageUrl ? 'bg-amber-500' : 'bg-indigo-500'} flex items-center justify-center text-white`}>
                          {generatedImageUrl ? <Sparkles size={16} /> : <Camera size={16} />}
                        </div>
                        <p className="text-white text-xs font-bold">{generatedImageUrl ? 'AI Generated Context Visual' : 'Uploaded Image'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => { setGeneratedImageUrl(null); setUploadedImageUrl(null); }}
                      className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white p-2 rounded-full shadow-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'news', label: 'News', icon: <Megaphone size={14} /> },
                    { id: 'event', label: 'Event', icon: <Calendar size={14} /> },
                    { id: 'project', label: 'Project', icon: <Hammer size={14} /> },
                    { id: 'help', label: 'Help', icon: <LifeBuoy size={14} /> },
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => setPostType(item.id as Post['type'])}
                      className={`
                        flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all
                        ${postType === item.id 
                          ? 'bg-foundation-900 text-white shadow-md' 
                          : 'bg-foundation-200 text-foundation-600 hover:bg-foundation-300'}
                      `}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  ))}
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    onClick={handleAIRefine}
                    disabled={isRefining || !newPost || newPost === '<p><br></p>'}
                    className="group bg-gradient-to-r from-amber-50 to-indigo-50 border border-indigo-100 px-3 py-2 rounded-full text-[10px] font-bold text-indigo-600 hover:border-indigo-300 transition-all flex items-center gap-2 disabled:opacity-50 shadow-sm active:scale-95"
                  >
                    {isRefining ? <Loader2 size={12} className="animate-spin text-indigo-500" /> : <Sparkles size={12} className="text-amber-500 group-hover:animate-pulse" />}
                    {isRefining ? 'Refining...' : 'AI Refine'}
                  </button>

                  <button 
                    onClick={handleGenerateImage}
                    disabled={isGeneratingImage || !newPost || newPost === '<p><br></p>'}
                    className="group bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 px-3 py-2 rounded-full text-[10px] font-bold text-indigo-700 hover:border-indigo-300 transition-all flex items-center gap-2 disabled:opacity-50 shadow-sm active:scale-95"
                  >
                    {isGeneratingImage ? <Loader2 size={12} className="animate-spin text-indigo-500" /> : <ImageIcon size={12} className="text-indigo-600" />}
                    {isGeneratingImage ? 'Generating...' : 'AI Image'}
                  </button>

                  <label className="cursor-pointer group bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 px-3 py-2 rounded-full text-[10px] font-bold text-emerald-700 hover:border-emerald-300 transition-all flex items-center gap-2 shadow-sm active:scale-95">
                    <Camera size={12} className="text-emerald-600" />
                    Upload Image
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </label>

                  <VoiceRecorder onRecordingComplete={(data) => {
                    if (editorMode === 'blocks') {
                      const newBlock: BlockData = {
                        id: Math.random().toString(36).substr(2, 9),
                        type: 'audio',
                        content: data,
                      };
                      setEditorBlocks([...editorBlocks, newBlock]);
                    } else {
                      setRecordedAudio(data);
                    }
                  }} />
                  {editingPostId && (
                    <button 
                      onClick={() => {
                        setEditingPostId(null);
                        setNewPost('');
                        setEditorBlocks([]);
                        setRecordedAudio(null);
                        setGeneratedImageUrl(null);
                        setUploadedImageUrl(null);
                        setProjectData({ startDate: '', endDate: '', budget: '', summary: '' });
                        setProjectBreakdown([]);
                      }}
                      className="px-4 py-2 text-[10px] font-bold text-foundation-500 uppercase tracking-widest hover:bg-foundation-200 rounded-full transition-all"
                    >
                      Cancel
                    </button>
                  )}
                  <button 
                    onClick={handlePost}
                    disabled={!newPost.trim() && !recordedAudio && !generatedImageUrl && !uploadedImageUrl}
                    className="bg-foundation-900 text-white px-6 py-2 rounded-full font-bold text-sm hover:focus:bg-foundation-800 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-lg active:scale-95"
                  >
                    {editingPostId ? <Save size={16} /> : <Plus size={16} />}
                    {editingPostId ? 'Save Changes' : 'Post'}
                  </button>
                </div>
              </div>
            </div>
          </div>
      ) : (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-foundation-300 text-center space-y-4">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-600">
            <Lock size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-display font-medium text-foundation-900">Post Submission Restricted</h3>
            <p className="text-foundation-500 text-xs max-w-sm mx-auto">
              You must be a verified family member to share news or projects. Your account is currently pending approval by the directors.
            </p>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foundation-400" size={18} />
        <input 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search posts by content or author..."
          className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border border-foundation-300 focus:ring-2 focus:ring-foundation-500 focus:outline-none shadow-sm text-sm"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-foundation-400 hover:text-foundation-600"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="space-y-4">
        {filteredPosts.map(post => (
          <SocialPost 
            key={post.id} 
            post={post} 
            profile={profile} 
            isOwner={post.authorId === profile?.uid} 
            setActiveTab={setActiveTab}
            onEdit={() => handleEditPost(post)}
            onDelete={() => handleDeletePost(post.id)}
            onPreviewMedia={(url, type) => setFullScreenMedia({ url, type })}
          />
        ))}
        {filteredPosts.length === 0 && (
          <div className="p-12 text-center text-foundation-500 bg-white rounded-xl border border-foundation-300 italic">
            No posts match your search.
          </div>
        )}

        <AnimatePresence>
          {fullScreenMedia && (
            <div 
              className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12"
              onClick={() => setFullScreenMedia(null)}
            >
              <motion.button 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all z-10"
                onClick={() => setFullScreenMedia(null)}
              >
                <X size={24} />
              </motion.button>
              
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="max-w-7xl max-h-full relative"
                onClick={e => e.stopPropagation()}
              >
                {fullScreenMedia.type === 'image' ? (
                  <img 
                    src={fullScreenMedia.url} 
                    className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" 
                    alt="Full screen preview" 
                  />
                ) : (
                  <video 
                    src={fullScreenMedia.url} 
                    controls 
                    autoPlay
                    className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl"
                  />
                )}
                <div className="mt-6 flex justify-center">
                  <a 
                    href={fullScreenMedia.url} 
                    download 
                    className="px-8 py-3 bg-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-snap-yellow transition-all flex items-center gap-2"
                  >
                    <Download size={16} /> Download Original
                  </a>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface SocialPostProps {
  key?: string | number | null;
  post: Post;
  profile: UserProfile | null;
  isOwner: boolean;
  setActiveTab: (tab: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onPreviewMedia: (url: string, type: 'image' | 'video') => void;
}

function AudioPlayer({ src }: { src: string }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const toggle = () => {
    if (playing) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const p = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(p);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  return (
    <div className="flex items-center gap-3 bg-foundation-100/80 backdrop-blur-sm rounded-2xl px-4 py-2 w-full max-w-[240px] mt-2 border border-foundation-200 shadow-inner">
      <button 
        onClick={(e) => { e.stopPropagation(); toggle(); }} 
        className={`w-8 h-8 flex items-center justify-center rounded-full transition-all shadow-md active:scale-95 ${playing ? 'bg-foundation-900 text-white' : 'bg-white text-foundation-900 border border-foundation-200'}`}
      >
        {playing ? <Square size={12} fill="currentColor" /> : <Play size={12} className="ml-0.5" fill="currentColor" />}
      </button>
      
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between text-[8px] font-bold text-foundation-500 uppercase tracking-tighter">
          <span>{playing ? 'Playing' : 'Voice Note'}</span>
          <span>{duration ? `${Math.floor(duration)}s` : '...'}</span>
        </div>
        <div className="h-1.5 bg-foundation-200 rounded-full overflow-hidden relative">
          <motion.div 
            className="absolute top-0 left-0 h-full bg-foundation-600"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', bounce: 0, duration: 0.1 }}
          />
          <div className="absolute inset-0 flex items-center justify-around opacity-20 pointer-events-none">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="w-0.5 h-1 bg-foundation-900 rounded-full" />
            ))}
          </div>
        </div>
      </div>

      <audio 
        ref={audioRef} 
        src={src} 
        onEnded={() => { setPlaying(false); setProgress(0); }} 
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        className="hidden" 
      />
    </div>
  );
}

function VoiceRecorder({ onRecordingComplete }: { onRecordingComplete: (audioData: string) => void }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [duration, setDuration] = useState(0);
  const [wave, setWave] = useState<number[]>([]);

  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setDuration(d => d + 1);
        setWave(prev => [...prev.slice(-15), Math.random() * 20 + 5]);
      }, 100);
    } else {
      setDuration(0);
      setWave([]);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(s);
      const chunks: BlobPart[] = [];
      
      r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          onRecordingComplete(base64data);
        };
        s.getTracks().forEach(track => track.stop());
      };
      
      r.start();
      setRecorder(r);
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      // alert("Microphone access denied or not supported.");
    }
  };

  const stopRecording = () => {
    if (recorder) {
      recorder.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <AnimatePresence>
        {isRecording && (
          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-full border border-red-100"
          >
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
            <span className="text-[10px] font-mono text-red-600 font-bold">
              {Math.floor(duration / 600)}:{((duration / 10) % 60).toFixed(0).padStart(2, '0')}
            </span>
            <div className="flex gap-0.5 items-end h-3">
              {wave.map((h, i) => (
                <div key={i} className="w-0.5 bg-red-400 rounded-full" style={{ height: `${h}px` }} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <button 
        onClick={isRecording ? stopRecording : startRecording}
        className={`w-10 h-10 flex items-center justify-center rounded-full transition-all shadow-md active:scale-90 ${isRecording ? 'bg-red-600 text-white animate-pulse' : 'bg-white text-foundation-500 hover:text-foundation-900 border border-foundation-300 hover:border-foundation-900'}`}
        title={isRecording ? "Stop Recording" : "Record Voice Message"}
      >
        {isRecording ? <Square size={16} fill="white" /> : <Mic size={20} />}
      </button>
    </div>
  );
}

function CommentComponent({ comment, profile, onReply }: { comment: any, profile: UserProfile | null, onReply: (parentId: string, authorName: string) => void }) {
  return (
    <div className="flex gap-3 group animate-in fade-in slide-in-from-left-2">
      <img src={comment.authorPhotoURL || `https://ui-avatars.com/api/?name=${comment.authorName}`} className="w-9 h-9 rounded-full shrink-0 border border-foundation-200 shadow-sm mt-0.5" alt="" />
      <div className="flex-1 min-w-0">
        <div className="bg-white border border-foundation-200 rounded-2xl rounded-tl-none p-3 shadow-sm inline-block max-w-full">
          <div className="flex items-center justify-between gap-6 mb-1">
            <h5 className="text-[11px] font-extrabold text-foundation-900 underline decoration-foundation-200 underline-offset-2">{comment.authorName}</h5>
            <span className="text-[9px] text-foundation-400 font-mono whitespace-nowrap">
              {comment.createdAt?.toDate ? format(comment.createdAt.toDate(), 'h:mm a') : 'Just now'}
            </span>
          </div>
          {comment.audioUrl ? (
            <AudioPlayer src={comment.audioUrl} />
          ) : (
            <p className="text-xs text-foundation-800 leading-relaxed break-words whitespace-pre-wrap">
              {comment.content}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4 mt-1.5 ml-2">
          <button 
            onClick={() => onReply(comment.id, comment.authorName)}
            className="text-[10px] font-bold text-foundation-500 hover:text-foundation-900 transition-colors uppercase tracking-widest"
          >
            Reply
          </button>
          <div className="w-1 h-1 bg-foundation-300 rounded-full" />
          <span className="text-[10px] text-foundation-400">{comment.audioUrl ? 'Voice Note' : 'Text'}</span>
        </div>
      </div>
    </div>
  );
}


function SocialPost({ post, profile, isOwner, setActiveTab, onEdit, onDelete, onPreviewMedia }: SocialPostProps) {
  const [showComments, setShowComments] = useState(false);
  const [showContributions, setShowContributions] = useState(false);
  const [showBudgetBreakdown, setShowBudgetBreakdown] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string, name: string } | null>(null);
  const [isLiking, setIsLiking] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'director' || profile?.email === 'mdmonirahamedarfin@gmail.com';

  const hasLiked = profile && post.likes?.includes(profile.uid);

  useEffect(() => {
    if (showComments) {
      const q = query(
        collection(db, 'comments'), 
        where('postId', '==', post.id), 
        orderBy('createdAt', 'asc')
      );
      const unsubscribe = onSnapshot(q, (snap) => {
        setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsubscribe();
    }
  }, [showComments, post.id]);

  useEffect(() => {
    if (post.type === 'project') {
      const q = query(
        collection(db, 'contributions'), 
        where('postId', '==', post.id), 
        orderBy('createdAt', 'desc')
      );
      const unsubscribe = onSnapshot(q, (snap) => {
        setContributions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Contribution)));
      });
      return () => unsubscribe();
    }
  }, [post.id, post.type]);

  const toggleLike = async () => {
    if (!profile || isLiking) return;
    setIsLiking(true);
    const docRef = doc(db, 'posts', post.id);
    try {
      if (hasLiked) {
        await updateDoc(docRef, { likes: arrayRemove(profile.uid) });
      } else {
        await updateDoc(docRef, { likes: arrayUnion(profile.uid) });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${post.id}`);
    } finally {
      setIsLiking(false);
    }
  };

  const handleComment = async (audioData?: string) => {
    if (!audioData && !newComment.trim()) return;
    if (!profile) return;
    
    try {
      const commentData: any = {
        postId: post.id,
        authorId: profile.uid,
        authorName: profile.displayName,
        authorPhotoURL: profile.photoURL || '',
        content: newComment,
        createdAt: serverTimestamp(),
      };

      if (replyTo) {
        commentData.parentId = replyTo.id;
        if (!audioData) {
          commentData.content = `@${replyTo.name} ${newComment}`;
        }
      }

      if (audioData) {
        commentData.audioUrl = audioData;
        commentData.content = '[ভয়েস রিপ্লাই]';
      }

      await addDoc(collection(db, 'comments'), commentData);
      
      await updateDoc(doc(db, 'posts', post.id), {
        commentCount: increment(1)
      });
      
      setNewComment('');
      setReplyTo(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'comments');
    }
  };

  const parentComments = comments.filter(c => !c.parentId);
  const getReplies = (parentId: string) => comments.filter(c => c.parentId === parentId);

  const handleShare = () => {
    if (navigator.share) {
      const plainText = post.content.replace(/<[^>]*>/g, '');
      navigator.share({
        title: 'Hazi Bari Foundation Post',
        text: plainText,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(`${window.location.href} (Post by ${post.authorName})`);
      alert('Link copied to clipboard!');
    }
  };

  const getPostStyles = (type: Post['type']) => {
    switch (type) {
      case 'event': return { 
        bg: 'bg-blue-50', 
        border: 'border-blue-200', 
        tag: 'bg-blue-600', 
        icon: <Calendar size={14} className="text-blue-600" />,
        label: 'Event'
      };
      case 'project': return { 
        bg: 'bg-emerald-50', 
        border: 'border-emerald-200', 
        tag: 'bg-emerald-600', 
        icon: <Hammer size={14} className="text-emerald-600" />,
        label: 'Project'
      };
      case 'help': return { 
        bg: 'bg-rose-50', 
        border: 'border-rose-200', 
        tag: 'bg-rose-600', 
        icon: <LifeBuoy size={14} className="text-rose-600" />,
        label: 'Help Request'
      };
      default: return { 
        bg: 'bg-white', 
        border: 'border-foundation-300', 
        tag: 'bg-foundation-700', 
        icon: <Megaphone size={14} className="text-foundation-600" />,
        label: 'Announcement'
      };
    }
  };

  const styles = getPostStyles(post.type);

  return (
    <div className={`rounded-xl shadow-sm border ${styles.border} ${styles.bg} transition-all relative overflow-hidden`}>
      <div className="absolute -right-6 -bottom-6 opacity-[0.03] rotate-12 pointer-events-none">
        {React.cloneElement(styles.icon as any, { size: 120 })}
      </div>

      <div className="p-6">
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <img src={post.authorPhotoURL || `https://ui-avatars.com/api/?name=${post.authorName}`} className="w-10 h-10 rounded-full border border-foundation-200" alt="" />
            <div>
              <h4 className="font-bold text-foundation-900 text-sm">{post.authorName}</h4>
              <p className="text-[10px] text-foundation-500 uppercase tracking-widest">
                {post.createdAt?.toDate ? format(post.createdAt.toDate(), 'PPP p') : 'Just now'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 relative">
            <div className={`px-3 py-1 rounded-full ${styles.tag} text-white text-[9px] font-bold uppercase tracking-[0.15em]`}>
              {React.cloneElement(styles.icon as any, { size: 10, className: 'text-white' })}
              {styles.label}
            </div>
            {(isOwner || isAdmin) && (
              <div className="relative">
                <button 
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className={`p-2 transition-all rounded-full ${showMoreMenu ? 'bg-foundation-900 text-white shadow-lg rotate-90' : 'text-foundation-400 hover:text-foundation-900 hover:bg-foundation-200'}`}
                >
                  <MoreVertical size={16} />
                </button>
                <AnimatePresence>
                  {showMoreMenu && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setShowMoreMenu(false)} />
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -10 }}
                        className="absolute right-0 mt-2 w-48 bg-white/95 backdrop-blur-md border border-foundation-200 rounded-2xl shadow-2xl z-30 py-3 overflow-hidden origin-top-right"
                      >
                        <div className="px-4 py-1 mb-2 border-b border-foundation-100 flex items-center justify-between">
                           <span className="text-[8px] font-black uppercase tracking-[0.2em] text-foundation-400">Post Actions</span>
                           <div className="w-1 h-1 bg-snap-blue rounded-full animate-pulse" />
                        </div>
                        {isOwner && (
                          <button 
                            onClick={() => { onEdit(); setShowMoreMenu(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-black text-foundation-600 hover:bg-foundation-50 hover:text-snap-blue transition-all uppercase tracking-widest group"
                          >
                            <div className="w-8 h-8 rounded-xl bg-foundation-50 flex items-center justify-center group-hover:bg-snap-blue/10 transition-colors">
                              <Pencil size={14} />
                            </div>
                            <span>Edit Context</span>
                          </button>
                        )}
                        <button 
                          onClick={() => { 
                            navigator.clipboard.writeText(window.location.href);
                            setShowMoreMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-black text-foundation-600 hover:bg-foundation-50 transition-all uppercase tracking-widest group"
                        >
                          <div className="w-8 h-8 rounded-xl bg-foundation-50 flex items-center justify-center group-hover:bg-foundation-100 transition-colors">
                             <Copy size={14} />
                          </div>
                          <span>Copy Link</span>
                        </button>
                        <div className="mx-4 my-2 border-t border-foundation-100" />
                        <button 
                          onClick={() => { setShowMoreMenu(false); onDelete(); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-black text-red-500 hover:bg-red-50 transition-all uppercase tracking-widest group"
                        >
                          <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                            <Trash2 size={14} />
                          </div>
                          <span>Remove Post</span>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        <div 
          className="text-foundation-800 leading-relaxed relative z-10 text-sm mb-4 rich-text-content"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

            {post.blocks && post.blocks.length > 0 && (
              <div className="space-y-4 mb-4">
                {post.blocks.map((block) => (
                  <div key={block.id} className="relative z-10">
                    {block.type === 'text' && (
                      <div className="text-sm text-foundation-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: block.content }} />
                    )}
                    {block.type === 'image' && block.content && (
                      <div 
                        onClick={() => onPreviewMedia(block.content!, 'image')}
                        className="rounded-2xl overflow-hidden border border-foundation-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                      >
                        <img src={block.content} alt="" className="w-full aspect-video object-cover" />
                      </div>
                    )}
                    {block.type === 'audio' && block.content && (
                      <div className="p-4 bg-foundation-50 rounded-2xl border border-foundation-200">
                        <AudioPlayer src={block.content} />
                      </div>
                    )}
                    {block.type === 'video' && block.content && (
                      <div className="aspect-video rounded-2xl overflow-hidden shadow-sm bg-black relative group">
                        {block.content.startsWith('data:') ? (
                          <>
                            <video src={block.content} className="w-full h-full" />
                            <button 
                              onClick={() => onPreviewMedia(block.content!, 'video')}
                              className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-all"
                            >
                               <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white scale-90 group-hover:scale-100 transition-transform">
                                  <Maximize2 size={24} />
                               </div>
                            </button>
                          </>
                        ) : (
                          <iframe 
                            src={block.content.includes('youtube.com') || block.content.includes('youtu.be') 
                              ? block.content.replace('watch?v=', 'embed/').split('&')[0] 
                              : block.content} 
                            className="w-full h-full border-0" 
                            allowFullScreen 
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

        {post.imageUrl && (
          <div 
            onClick={() => onPreviewMedia(post.imageUrl!, 'image')}
            className="mb-4 relative rounded-2xl overflow-hidden border border-foundation-200 shadow-md group cursor-pointer transition-transform hover:scale-[1.01]"
          >
            <img 
              src={post.imageUrl} 
              alt="Community Visual" 
              className="w-full aspect-video object-cover" 
              referrerPolicy="no-referrer" 
            />
            <div className="absolute top-2 left-2 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full text-[9px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border border-white/20">
              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
              AI Context Visual
            </div>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
               <Maximize2 size={32} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        )}

        {post.audioUrl && (
          <div className="mb-6 bg-white/40 p-4 rounded-3xl border border-foundation-200 backdrop-blur-sm relative z-10 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-foundation-900 text-white flex items-center justify-center animate-pulse-slow">
                <Mic size={14} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-foundation-500 uppercase tracking-widest mb-1">Attached Voice Note</p>
                <AudioPlayer src={post.audioUrl} />
              </div>
            </div>
          </div>
        )}

        {post.type === 'project' && (
          <div className="mb-4 grid grid-cols-2 gap-4 p-4 rounded-lg bg-emerald-100/50 border border-emerald-200 relative z-10">
            {post.projectSummary && (
              <div className="col-span-2">
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">Project Summary</p>
                <p className="text-xs text-emerald-900 italic">"{post.projectSummary}"</p>
              </div>
            )}
            <div>
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Timeline</p>
              <p className="text-xs text-emerald-900">
                {post.projectStartDate ? format(new Date(post.projectStartDate), 'MMM d, yyyy') : 'TBD'} — {post.projectEndDate ? format(new Date(post.projectEndDate), 'MMM d, yyyy') : 'TBD'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Estimated Budget</p>
              <p className="text-xs text-emerald-900 font-bold">{post.projectBudget?.toLocaleString()} BDT</p>
            </div>

            {post.projectProgress !== undefined && (
              <div className="col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Construction/Work Progress</p>
                  <p className="text-[10px] font-bold text-emerald-900">{post.projectProgress}%</p>
                </div>
                <div className="w-full bg-emerald-200 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-600 h-full transition-all duration-1000" 
                    style={{ width: `${post.projectProgress}%` }}
                  />
                </div>
                {post.projectStatusUpdate && (
                  <p className="text-[9px] text-emerald-800 mt-2 italic bg-white/50 p-2 rounded border border-emerald-100">
                    <span className="font-bold uppercase tracking-tighter mr-1 text-[8px]">Status:</span> {post.projectStatusUpdate}
                  </p>
                )}
              </div>
            )}
            
            <div className="col-span-2 pt-2 border-t border-emerald-200 space-y-3">
              {(isOwner || isAdmin) && <ProjectProgressUpdater post={post} />}
              
              <button 
                onClick={() => setShowCheckout(true)}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 group"
              >
                <div className="bg-white/20 p-1.5 rounded-lg group-hover:rotate-12 transition-transform">
                  <DollarSign size={18} />
                </div>
                Contribute Now for this Project
              </button>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowContributions(!showContributions)}
                  className="flex-1 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 border border-emerald-100"
                >
                  <Users size={12} />
                  {showContributions ? 'Hide History' : 'Donors List'}
                </button>
                {post.projectBudgetBreakdown && post.projectBudgetBreakdown.length > 0 && (
                  <button 
                    onClick={() => setShowBudgetBreakdown(!showBudgetBreakdown)}
                    className="flex-1 py-2 bg-white border border-emerald-100 text-emerald-600 rounded-lg text-[10px] font-bold hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
                  >
                    <PieChart size={12} />
                    {showBudgetBreakdown ? 'Hide Budget' : 'View Budget'}
                  </button>
                )}
              </div>
            </div>

            <AnimatePresence>
              {showCheckout && (
                <CheckoutGateway 
                  post={post} 
                  profile={profile} 
                  onClose={() => setShowCheckout(false)} 
                />
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showBudgetBreakdown && post.projectBudgetBreakdown && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="col-span-2 overflow-hidden bg-white/60 rounded-lg p-3 border border-emerald-100"
                >
                  <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest mb-2">Detailed Budget Items</p>
                  <div className="space-y-1">
                    {post.projectBudgetBreakdown.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[11px] py-1 border-b border-emerald-50 last:border-0">
                        <span className="text-emerald-700">{item.item}</span>
                        <span className="font-mono font-bold text-emerald-900">{item.amount.toLocaleString()} BDT</span>
                      </div>
                    ))}
                    <div className="pt-2 mt-2 border-t border-emerald-300 flex justify-between font-bold text-emerald-900 text-xs">
                      <span>Total Budget</span>
                      <span>{post.projectBudgetBreakdown.reduce((s, i) => s + i.amount, 0).toLocaleString()} BDT</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <AnimatePresence>
          {showContributions && post.type === 'project' && (
            <ProjectContributionPanel 
              post={post} 
              profile={profile} 
              contributions={contributions}
              isAdmin={isAdmin}
            />
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between border-t border-foundation-200 mt-4 pt-4 relative z-10">
          <div className="flex items-center gap-6">
            <button 
              onClick={toggleLike}
              className={`flex items-center gap-2 text-xs font-bold transition-all ${hasLiked ? 'text-blue-600 scale-110' : 'text-foundation-500 hover:text-foundation-900'}`}
            >
              <ThumbsUp size={16} fill={hasLiked ? 'currentColor' : 'none'} />
              {post.likes?.length || 0}
            </button>
            <button 
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-2 text-xs font-bold text-foundation-500 hover:text-foundation-900"
            >
              <MessageCircle size={16} />
              {post.commentCount || 0}
            </button>
            {!isOwner && profile && (
              <DirectMessageButton 
                currentUser={profile} 
                targetUser={{ 
                  uid: post.authorId, 
                  displayName: post.authorName, 
                  photoURL: post.authorPhotoURL || '' 
                }} 
                onStartChat={() => setActiveTab('messages')}
              />
            )}
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleShare}
              className="flex items-center gap-2 text-xs font-bold text-foundation-500 hover:text-foundation-900 transition-colors"
            >
              <Share2 size={16} />
              Share
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showComments && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-6 border-t border-foundation-200 pt-6 space-y-6"
            >
              <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar pb-4">
                {parentComments.length === 0 ? (
                  <div className="text-center py-6 text-foundation-400 italic text-xs">
                    Be the first to share your thoughts...
                  </div>
                ) : (
                  parentComments.map(comment => (
                    <div key={comment.id} className="space-y-4">
                      <CommentComponent 
                        comment={comment} 
                        profile={profile} 
                        onReply={(id, name) => {
                          setReplyTo({ id, name });
                          // Focus the input if possible or just show the indicator
                        }} 
                      />
                      
                      {/* Replies */}
                      <div className="ml-10 space-y-4 border-l-2 border-foundation-200 pl-4">
                        {getReplies(comment.id).map(reply => (
                          <div key={reply.id}>
                            <CommentComponent 
                              comment={reply} 
                              profile={profile} 
                              onReply={(id, name) => {
                                setReplyTo({ id: comment.id, name }); 
                              }} 
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2">
                <AnimatePresence>
                  {replyTo && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="flex items-center justify-between bg-foundation-200 px-4 py-1.5 rounded-t-lg text-[10px] font-bold text-foundation-600 border-b border-foundation-300"
                    >
                      <span>Replying to <span className="text-foundation-900">@{replyTo.name}</span></span>
                      <button onClick={() => setReplyTo(null)} className="text-foundation-400 hover:text-red-500">
                        <X size={12} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <div className={`flex gap-2 items-center bg-foundation-200 rounded-full pl-4 pr-1 py-1 transition-all border-2 ${replyTo ? 'rounded-tl-none border-foundation-300' : 'border-transparent'}`}>
                  <input 
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleComment()}
                    placeholder={replyTo ? `Reply to ${replyTo.name}...` : "Write a comment..."}
                    className="flex-1 bg-transparent border-none outline-none text-xs text-foundation-900 py-2"
                  />
                  
                  <div className="flex items-center gap-1">
                    <VoiceRecorder onRecordingComplete={(data) => handleComment(data)} />
                    
                    <button 
                      onClick={() => handleComment()}
                      disabled={!newComment.trim()}
                      className="bg-foundation-900 text-white p-2 rounded-full disabled:opacity-50 transition-all active:scale-95 shadow-md hover:bg-black"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function MembersList({ isAdmin, profile, setActiveTab }: { isAdmin: boolean, profile: UserProfile | null, setActiveTab: (tab: string) => void }) {
  const isApprovedMember = profile?.isApproved === true;
  const canApprove = isAdmin || isApprovedMember;
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
  const [editingMember, setEditingMember] = useState<UserProfile | null>(null);
  const [showSmartJoin, setShowSmartJoin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [registrationMode, setRegistrationMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState({
    displayName: '',
    fatherName: '',
    motherName: '',
    houseName: '',
    village: '',
    district: '',
    nidNumber: '',
    familyHead: '',
    mobile: '',
    photoURL: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setMembers(snap.docs.map(d => d.data() as UserProfile));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'users'));
    return () => unsubscribe();
  }, []);

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setRegistrationStatus('idle');
    try {
      const slug = formData.displayName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(2, 6);
      
      // Auto-linking logic
      let autoFatherId = undefined;
      const q = query(collection(db, 'users'), where('displayName', '==', formData.fatherName), limit(1));
      const fatherSnap = await getDocs(q);
      if (!fatherSnap.empty) {
        autoFatherId = fatherSnap.docs[0].id;
      }

      const newMemberData = {
        ...formData,
        uid: slug,
        memberSlug: slug,
        memberId: `HB-${formData.displayName.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
        fatherId: autoFatherId || '',
        isApproved: false,
        role: 'member' as const,
        photoURL: formData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.displayName)}&background=random&color=fff`,
        bio: '',
        tags: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        registeredBy: profile?.uid || 'system'
      };

      // USE SLUG AS DOCUMENT ID
      await setDoc(doc(db, 'users', slug), newMemberData);

      await addDoc(collection(db, 'notifications'), {
        type: 'registration',
        userId: slug,
        userName: formData.displayName,
        userPhotoURL: '',
        message: `${formData.displayName} has been registered.${autoFatherId ? ' System auto-linked their lineage.' : ''}`,
        read: false,
        createdAt: serverTimestamp()
      });

      setRegistrationStatus('success');
      setFormData({
        displayName: '',
        fatherName: '',
        motherName: '',
        houseName: '',
        village: '',
        district: '',
        nidNumber: '',
        familyHead: '',
        mobile: '',
        photoURL: ''
      });
    } catch (err) {
      console.error(err);
      setRegistrationStatus('error');
      setErrorMessage(err instanceof Error ? err.message : "নিবন্ধকরণ ব্যর্থ হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setIsSubmitting(false);
    }
  };

  const [editFormData, setEditFormData] = useState<any>(null);

  useEffect(() => {
    if (editingMember) {
      setEditFormData({
        displayName: editingMember.displayName || '',
        fatherName: editingMember.fatherName || '',
        motherName: editingMember.motherName || '',
        houseName: editingMember.houseName || '',
        village: editingMember.village || '',
        district: editingMember.district || '',
        nidNumber: editingMember.nidNumber || '',
        mobile: editingMember.mobile || '',
        familyHead: editingMember.familyHead || '',
        bio: editingMember.bio || '',
        photoURL: editingMember.photoURL || '',
      });
    }
  }, [editingMember]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !editFormData) return;
    setIsSubmitting(true);
    try {
      const docRef = doc(db, 'users', editingMember.uid);
      await updateDoc(docRef, {
        ...editFormData,
        updatedAt: serverTimestamp()
      });
      
      // Update local members state immediately for better UX
      setMembers(prev => prev.map(m => m.uid === editingMember.uid ? { ...m, ...editFormData } : m));
      
      // Refresh selected member if it's the one being edited
      if (selectedMember?.uid === editingMember.uid) {
        setSelectedMember({ ...selectedMember, ...editFormData });
      }
      
      setEditingMember(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${editingMember.uid}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAIResult = (child: string, father: string, fullSuggestion?: any) => {
    setShowSmartJoin(false);
    setRegistrationMode(true);
    setRegistrationStatus('idle');
    setErrorMessage('');
    
    // Function to handle missing data
    const getValue = (val: any) => (val && val !== 'null' && val !== 'NULL' ? val : 'তথ্য পাওয়া যায়নি');

    setFormData({
      displayName: getValue(fullSuggestion?.subject?.name || child),
      fatherName: getValue(fullSuggestion?.father?.name || father),
      motherName: getValue(fullSuggestion?.mother?.name),
      village: getValue(fullSuggestion?.village),
      district: getValue(fullSuggestion?.district),
      nidNumber: getValue(fullSuggestion?.nidNumber),
      houseName: getValue(fullSuggestion?.house),
      familyHead: getValue(fullSuggestion?.father?.name),
      mobile: ''
    });
  };

  const handleRoleChange = async (uid: string, newRole: 'member' | 'admin' | 'collector' | 'director') => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'users', uid), { 
        role: newRole,
        updatedAt: serverTimestamp() 
      });
      // Local state will be updated via onSnapshot
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
    }
  };

  const filteredMembers = members.filter(m => {
    const query = searchQuery.toLowerCase();
    return (
      m.displayName?.toLowerCase().includes(query) ||
      m.fatherName?.toLowerCase().includes(query) ||
      m.motherName?.toLowerCase().includes(query) ||
      m.houseName?.toLowerCase().includes(query) ||
      m.village?.toLowerCase().includes(query) ||
      m.district?.toLowerCase().includes(query) ||
      m.nidNumber?.toLowerCase().includes(query) ||
      m.memberId?.toLowerCase().includes(query) ||
      m.memberSlug?.toLowerCase().includes(query)
    );
  });

  const toggleApproval = async (uid: string, currentStatus: boolean) => {
    if (!canApprove) return;
    try {
      await setDoc(doc(db, 'users', uid), { 
        isApproved: !currentStatus,
        updatedAt: serverTimestamp() 
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
    }
  };

  if (loading) return <div className="p-12 text-center text-foundation-400">Scanning member database...</div>;

  return (
    <div className="space-y-6">
      {/* Smart Join CTA */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-foundation-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl group"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:scale-110 transition-transform duration-700" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
             <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20">
                <Sparkles size={12} className="text-amber-400" />
                <span className="text-[10px] font-black uppercase tracking-widest">AI Assisted Registration</span>
             </div>
             <h3 className="text-3xl font-display">Become a Member</h3>
             <p className="text-foundation-300 text-sm max-w-md leading-relaxed">
               Verify your position in the lineage using AI. Our scanner identifies your root from official documents instantly.
             </p>
          </div>
          <button 
            onClick={() => setShowSmartJoin(true)}
            className="px-10 py-5 bg-white text-foundation-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-50 transition-all shadow-2xl active:scale-95 group/btn"
          >
            Register as a Family Member
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {registrationMode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] grid place-items-center p-4 bg-foundation-900/95 backdrop-blur-2xl"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[3rem] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-foundation-100 flex items-center justify-between bg-indigo-900 text-white">
                <div>
                  <h3 className="text-xl font-display font-bold">Complete Registration</h3>
                  <p className="text-[10px] text-indigo-300 uppercase font-black">Step 2: Profile Review</p>
                </div>
                <button 
                  onClick={() => setRegistrationMode(false)}
                  className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {registrationStatus === 'idle' ? (
                  <form onSubmit={handleRegistrationSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <Input 
                          label="Full Name (English)" 
                          required 
                          value={formData.displayName} 
                          onChange={(e: any) => setFormData({...formData, displayName: e.target.value})}
                        />
                        <div className="flex flex-col">
                          <label className="block text-[10px] font-bold text-foundation-500 uppercase tracking-widest mb-1 ml-1">Profile Photo</label>
                          <div className="flex items-center gap-3 bg-foundation-50 p-2 rounded-xl border border-foundation-200">
                            <img 
                              src={formData.photoURL || `https://ui-avatars.com/api/?name=${formData.displayName}`} 
                              className="w-10 h-10 rounded-lg object-cover bg-white" 
                              alt="" 
                            />
                            <label className="flex-1 bg-white border border-foundation-300 rounded-lg py-2 text-[10px] text-center font-bold uppercase tracking-widest cursor-pointer hover:bg-foundation-50 transition-colors">
                              <Camera size={12} className="inline mr-2" /> Upload
                              <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  try {
                                    const base64 = await handleImageUpload(file);
                                    setFormData({...formData, photoURL: base64});
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }
                              }} />
                            </label>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <Input 
                          label="Father's Name" 
                          required 
                          value={formData.fatherName} 
                          onChange={(e: any) => setFormData({...formData, fatherName: e.target.value})} 
                        />
                        <Input 
                          label="Mother's Name" 
                          value={formData.motherName} 
                          onChange={(e: any) => setFormData({...formData, motherName: e.target.value})} 
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <Input 
                          label="Village (গ্রাম)" 
                          required 
                          value={formData.village} 
                          onChange={(e: any) => setFormData({...formData, village: e.target.value})} 
                        />
                        <Input 
                          label="District (জেলা)" 
                          required 
                          value={formData.district} 
                          onChange={(e: any) => setFormData({...formData, district: e.target.value})} 
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <Input 
                          label="House Name (বাড়ির নাম)" 
                          required 
                          value={formData.houseName} 
                          onChange={(e: any) => setFormData({...formData, houseName: e.target.value})} 
                        />
                        <Input 
                          label="Document Number (NID/Birth)" 
                          value={formData.nidNumber} 
                          onChange={(e: any) => setFormData({...formData, nidNumber: e.target.value})} 
                        />
                      </div>

                      <Input 
                        label="Mobile Contact" 
                        placeholder="+880..."
                        value={formData.mobile} 
                        onChange={(e: any) => setFormData({...formData, mobile: e.target.value})} 
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-indigo-600 text-white rounded-2xl px-8 py-5 text-sm font-black uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <UserPlus size={20} />
                          Register as Family Member
                        </>
                      )}
                    </button>
                  </form>
                ) : registrationStatus === 'success' ? (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="h-full flex flex-col items-center justify-center text-center p-4"
                  >
                    <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-sm border border-emerald-200">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
                      >
                        <CheckCircle2 size={48} className="text-emerald-500" />
                      </motion.div>
                    </div>
                    <h4 className="text-2xl font-display font-bold text-foundation-900 mb-2">সাফল্য! (Success)</h4>
                    <p className="text-foundation-600 mb-8 max-w-sm">
                      Your registration has been successful. The member profile is now pending verification for trust.
                    </p>
                    <button 
                      onClick={() => setRegistrationMode(false)}
                      className="bg-foundation-900 text-white px-10 py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all active:scale-95"
                    >
                      নিবন্ধকরণ সম্পন্ন করুন (Finish)
                    </button>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="h-full flex flex-col items-center justify-center text-center p-4"
                  >
                    <div className="w-24 h-24 bg-rose-100 rounded-full flex items-center justify-center mb-6 shadow-sm border border-rose-200 text-rose-500">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
                      >
                        <XCircle size={48} />
                      </motion.div>
                    </div>
                    <h4 className="text-2xl font-display font-bold text-foundation-900 mb-2">ত্রুটি! (Error)</h4>
                    <p className="text-rose-600 mb-8 max-w-sm font-medium">
                      {errorMessage || "নিবন্ধকরণ ব্যর্থ হয়েছে। দয়া করে আবার চেষ্টা করুন।"}
                    </p>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setRegistrationStatus('idle')}
                        className="bg-foundation-900 text-white px-10 py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all active:scale-95"
                      >
                        পুনরায় চেষ্টা করুন (Retry)
                      </button>
                      <button 
                        onClick={() => setRegistrationMode(false)}
                        className="bg-foundation-100 text-foundation-600 px-6 py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-foundation-200 transition-all active:scale-95"
                      >
                        বাতিল (Cancel)
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
        {editingMember && editFormData && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setEditingMember(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-display font-bold">প্রোফাইল সংশোধন (Update Profile)</h3>
                  <p className="text-xs text-indigo-100 mt-1">Update member information</p>
                </div>
                <button 
                  onClick={() => setEditingMember(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <Input 
                        label="Full Name (English)" 
                        required 
                        value={editFormData.displayName} 
                        onChange={(e: any) => setEditFormData({...editFormData, displayName: e.target.value})}
                      />
                      <div className="flex flex-col">
                        <label className="block text-[10px] font-bold text-foundation-500 uppercase tracking-widest mb-1 ml-1">Profile Photo</label>
                        <div className="flex items-center gap-3 bg-foundation-50 p-2 rounded-xl border border-foundation-200">
                          <img 
                            src={editFormData.photoURL || `https://ui-avatars.com/api/?name=${editFormData.displayName}`} 
                            className="w-10 h-10 rounded-lg object-cover bg-white" 
                            alt="" 
                          />
                          <label className="flex-1 bg-white border border-foundation-300 rounded-lg py-2 text-[10px] text-center font-bold uppercase tracking-widest cursor-pointer hover:bg-foundation-50 transition-colors">
                            <Camera size={12} className="inline mr-2" /> Change Photo
                            <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const base64 = await handleImageUpload(file);
                                  setEditFormData({...editFormData, photoURL: base64});
                                } catch (err) {
                                  console.error(err);
                                }
                              }
                            }} />
                          </label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <Input 
                        label="Father's Name" 
                        required 
                        value={editFormData.fatherName} 
                        onChange={(e: any) => setEditFormData({...editFormData, fatherName: e.target.value})} 
                      />
                      <Input 
                        label="Mother's Name" 
                        value={editFormData.motherName} 
                        onChange={(e: any) => setEditFormData({...editFormData, motherName: e.target.value})} 
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <Input 
                        label="Village (গ্রাম)" 
                        required 
                        value={editFormData.village} 
                        onChange={(e: any) => setEditFormData({...editFormData, village: e.target.value})} 
                      />
                      <Input 
                        label="District (জেলা)" 
                        required 
                        value={editFormData.district} 
                        onChange={(e: any) => setEditFormData({...editFormData, district: e.target.value})} 
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <Input 
                        label="House Name (বাড়ির নাম)" 
                        required 
                        value={editFormData.houseName} 
                        onChange={(e: any) => setEditFormData({...editFormData, houseName: e.target.value})} 
                      />
                      <Input 
                        label="Document Number (NID/Birth)" 
                        value={editFormData.nidNumber} 
                        onChange={(e: any) => setEditFormData({...editFormData, nidNumber: e.target.value})} 
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <Input 
                        label="Mobile Contact" 
                        placeholder="+880..."
                        value={editFormData.mobile} 
                        onChange={(e: any) => setEditFormData({...editFormData, mobile: e.target.value})} 
                      />
                      <Input 
                        label="Head of Family" 
                        value={editFormData.familyHead} 
                        onChange={(e: any) => setEditFormData({...editFormData, familyHead: e.target.value})} 
                      />
                    </div>

                    <div className="relative">
                      <label className="block text-[10px] font-bold text-foundation-500 uppercase tracking-widest mb-1 ml-1">Short Bio</label>
                      <textarea 
                        value={editFormData.bio} 
                        onChange={(e) => setEditFormData({...editFormData, bio: e.target.value})}
                        className="w-full bg-foundation-50 border border-foundation-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
                        placeholder="Tell us about yourself..."
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-indigo-600 text-white rounded-xl px-8 py-4 text-sm font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save size={18} />
                          Save Changes
                        </>
                      )}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setEditingMember(null)}
                      className="px-8 py-4 bg-foundation-100 text-foundation-600 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-foundation-200 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
        {showSmartJoin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] grid place-items-center p-4 bg-foundation-900/90 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              className="bg-white rounded-[3rem] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl border border-white/20 relative flex flex-col"
            >
              <div className="p-8 border-b border-foundation-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-display font-bold text-foundation-900">Document Scanner</h3>
                  <p className="text-[10px] text-foundation-400 uppercase font-black">Verify Identity & Lineage</p>
                </div>
                <button 
                  onClick={() => setShowSmartJoin(false)}
                  className="p-3 bg-foundation-50 hover:bg-foundation-100 text-foundation-600 rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <AIBongshoSuite onResult={handleAIResult} />
              </div>

              <div className="p-6 bg-foundation-50 border-t border-foundation-100 text-center">
                <p className="text-[10px] text-foundation-400 font-bold uppercase">Private & Secure • Data encrypted via AI</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-xl shadow-sm border border-foundation-300 overflow-hidden relative">
        <div className="p-6 border-b border-foundation-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-xl font-display font-medium text-foundation-900">Family Directory</h3>
            <div className="relative w-full md:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foundation-400" />
              <input 
                type="text"
                placeholder="Search profiles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-foundation-50 rounded-xl border-none text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 mt-6">
             <div className="text-right">
                <p className="text-[10px] text-foundation-400 font-black uppercase tracking-widest">Active Members</p>
                <p className="text-sm font-bold text-foundation-900">{members.filter(m => m.isApproved).length}</p>
             </div>
             <div className="h-8 w-px bg-foundation-200" />
             <div className="text-right">
                <p className="text-[10px] text-foundation-400 font-black uppercase tracking-widest">Pending</p>
                <p className="text-sm font-bold text-amber-600">{members.filter(m => !m.isApproved).length}</p>
             </div>
          </div>
        </div>
        <div className="divide-y divide-foundation-200">
        {filteredMembers.length === 0 ? (
          <div className="p-12 text-center text-foundation-500 italic">
            No members found matching your search.
          </div>
        ) : (
          filteredMembers.map(member => (
            <div key={member.uid} className={`relative p-4 flex items-center justify-between hover:bg-foundation-50 transition-colors group border-l-4 ${member.isApproved ? 'border-emerald-500' : 'border-amber-500 bg-amber-50/20'}`}>
              <div 
                className="flex items-center gap-4 cursor-pointer flex-1"
                onClick={() => setSelectedMember(member)}
              >
                <img src={member.photoURL || `https://ui-avatars.com/api/?name=${member.displayName}`} alt="" className="w-10 h-10 rounded-full border border-foundation-300 transition-transform group-hover:scale-105" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-foundation-900 text-sm group-hover:text-indigo-600 transition-colors">{member.displayName}</h4>
                    {member.isApproved && <ShieldCheck size={12} className="text-emerald-500" />}
                  </div>
                  <p className="text-[10px] text-foundation-500 uppercase tracking-widest">{member.houseName} • {member.houseSegment}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {profile && profile.uid !== member.uid && member.email && (
                  <DirectMessageButton 
                    currentUser={profile} 
                    targetUser={member} 
                    onStartChat={() => setActiveTab('messages')}
                  />
                )}
                {isAdmin && (
                  <div className="relative group/role">
                    <select 
                      value={member.role || 'member'}
                      onChange={(e) => handleRoleChange(member.uid, e.target.value as any)}
                      onClick={(e) => e.stopPropagation()}
                      className="appearance-none bg-foundation-100 text-foundation-700 text-[9px] font-black uppercase tracking-wider px-3 py-1 pr-6 rounded-full border border-foundation-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 hover:bg-foundation-200 transition-colors"
                    >
                      <option value="member">Member</option>
                      <option value="collector">Collector</option>
                      <option value="director">Director</option>
                      <option value="admin">Admin</option>
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Shield size={8} className="text-foundation-400" />
                    </div>
                  </div>
                )}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                  member.isApproved 
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm shadow-emerald-100' 
                    : 'bg-amber-100 text-amber-700 border border-amber-200 animate-pulse-subtle shadow-sm shadow-amber-100'
                }`}>
                  {member.isApproved ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                  {member.isApproved ? 'Verified' : 'Pending'}
                </div>
                {canApprove && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleApproval(member.uid, member.isApproved); }}
                    className="p-2 hover:bg-foundation-300 rounded-full text-foundation-700 transition-colors"
                    title={member.isApproved ? "Revoke" : "Approve"}
                  >
                    <ShieldCheck size={18} className={member.isApproved ? 'text-green-600' : 'text-foundation-400'} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>

    <AnimatePresence>
      {selectedMember && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedMember(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar"
              onClick={e => e.stopPropagation()}
            >
              <div className="relative h-32 bg-foundation-900 overflow-hidden">
                 <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-400 rounded-full -ml-16 -mb-16 blur-2xl"></div>
                 </div>
                 <button 
                  onClick={() => setSelectedMember(null)}
                  className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
                 >
                   <X size={20} />
                 </button>
              </div>
              
              <div className="px-8 pb-8">
                <div className="relative -mt-16 mb-6 flex flex-col items-center">
                  <img 
                    src={selectedMember.photoURL || `https://ui-avatars.com/api/?name=${selectedMember.displayName}`} 
                    className="w-32 h-32 rounded-full border-4 border-white shadow-xl"
                    alt="" 
                  />
                  <h3 className="text-2xl font-display font-bold text-foundation-900 mt-4">{selectedMember.displayName}</h3>
                  <div className="flex gap-2 mt-1">
                    <span className="px-3 py-1 bg-foundation-100 text-[10px] font-bold text-foundation-600 uppercase tracking-widest rounded-full">{selectedMember.houseName}</span>
                    {selectedMember.isApproved && (
                      <span className="px-3 py-1 bg-emerald-50 text-[10px] font-bold text-emerald-600 uppercase tracking-widest rounded-full flex items-center gap-1">
                        <ShieldCheck size={10} /> Verified Member
                      </span>
                    )}
                  </div>
                  {(isAdmin || profile?.uid === selectedMember.uid) && (
                    <button 
                      onClick={() => setEditingMember(selectedMember)}
                      className="mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors"
                    >
                      <Edit3 size={14} /> Edit Profile
                    </button>
                  )}
                </div>

                <div className="space-y-8">
                  <div className="bg-foundation-50 rounded-2xl p-6 border border-foundation-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-bold text-foundation-900 uppercase tracking-widest flex items-center gap-2">
                        <GitGraph size={16} className="text-indigo-600" /> Lineage Flow
                      </h4>
                    </div>
                    <LineageVisualizer user={selectedMember} />
                  </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white border border-foundation-200 p-4 rounded-xl shadow-sm">
                        <p className="text-[10px] font-bold text-foundation-500 uppercase tracking-tighter mb-1">Father's Name</p>
                        <p className="text-sm font-bold text-foundation-900">{selectedMember.fatherName || 'Not recorded'}</p>
                      </div>
                      <div className="bg-white border border-foundation-200 p-4 rounded-xl shadow-sm">
                        <p className="text-[10px] font-bold text-foundation-500 uppercase tracking-tighter mb-1">Mother's Name</p>
                        <p className="text-sm font-bold text-foundation-900">{selectedMember.motherName || 'Not recorded'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white border border-foundation-200 p-4 rounded-xl shadow-sm">
                        <p className="text-[10px] font-bold text-foundation-500 uppercase tracking-tighter mb-1">Village & House</p>
                        <p className="text-sm font-bold text-foundation-900 capitalize">{selectedMember.village || 'N/A'}, {selectedMember.houseName}</p>
                      </div>
                      <div className="bg-white border border-foundation-200 p-4 rounded-xl shadow-sm">
                        <p className="text-[10px] font-bold text-foundation-500 uppercase tracking-tighter mb-1">District</p>
                        <p className="text-sm font-bold text-foundation-900 capitalize">{selectedMember.district || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl shadow-sm flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-tighter mb-1">Document Index / NID</p>
                          <p className="text-sm font-bold text-indigo-900 font-mono">{selectedMember.nidNumber || 'Not provided'}</p>
                        </div>
                        <Fingerprint size={24} className="text-indigo-300" />
                      </div>
                      <div className="bg-foundation-50 border border-foundation-200 p-4 rounded-xl shadow-sm">
                        <p className="text-[10px] font-bold text-foundation-400 uppercase tracking-tighter mb-1">Member ID</p>
                        <p className="text-xs font-bold text-foundation-600">{selectedMember.memberId || 'HB-NEW-MEMBER'}</p>
                      </div>
                    </div>
                    <div className="bg-white border border-foundation-200 p-4 rounded-xl shadow-sm">
                      <p className="text-[10px] font-bold text-foundation-500 uppercase tracking-tighter mb-1">Head of Family</p>
                      <p className="text-sm font-bold text-foundation-900">{selectedMember.familyHead || 'Not Recorded'}</p>
                    </div>
                  </div>

                  <div className="bg-foundation-900 text-white p-6 rounded-2xl shadow-xl">
                    <h4 className="text-xs font-bold uppercase tracking-[0.2em] mb-4 text-foundation-300">Contact Information</h4>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                          <Mail size={14} /> 
                        </div>
                        <div>
                          <p className="text-[8px] uppercase font-bold text-foundation-400">Email Address</p>
                          <p className="text-xs font-medium">{selectedMember.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                          <Smartphone size={14} />
                        </div>
                        <div>
                          <p className="text-[8px] uppercase font-bold text-foundation-400">Phone Number</p>
                          <p className="text-xs font-mono font-bold tracking-wider">{selectedMember.mobile || 'Not Provided'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AdminDashboard() {
  const [adminTab, setAdminTab] = useState<'users' | 'contributions'>('users');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-foundation-300 self-start">
        <button 
          onClick={() => setAdminTab('users')}
          className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${adminTab === 'users' ? 'bg-foundation-900 text-white shadow-md' : 'text-foundation-500 hover:bg-foundation-100'}`}
        >
          User Approvals
        </button>
        <button 
          onClick={() => setAdminTab('contributions')}
          className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${adminTab === 'contributions' ? 'bg-foundation-900 text-white shadow-md' : 'text-foundation-500 hover:bg-foundation-100'}`}
        >
          Contributions
        </button>
      </div>

      {adminTab === 'users' ? <AdminApprovalList /> : <PendingContributionsList />}
    </div>
  );
}

function Committee({ profile, isAdmin }: { profile: UserProfile | null, isAdmin: boolean }) {
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const leaders = [
    { name: 'ফারুক আহাম্মাদ', role: 'প্রধান উপদেষ্টা', subTitle: 'হাজি বাড়ি ফাউন্ডেশন' },
    { name: 'মোঃ মনির আহমেদ (আরেফিন)', role: 'প্রতিষ্ঠাতা পরিচালক', subTitle: 'হাজি বাড়ি ফাউন্ডেশন' },
    { name: 'নূর আলম', role: 'উন্নয়ন পরিকল্পনাবিদ', subTitle: 'হাজি বাড়ি ফাউন্ডেশন' },
    { name: 'আরমান', role: 'উন্নয়ন পরিকল্পনাবিদ', subTitle: 'হাজি বাড়ি ফাউন্ডেশন' },
    { name: 'আশিক', role: 'শিক্ষাাবিদ', subTitle: 'হাজি বাড়ি ফাউন্ডেশন' },
    { name: 'আরিফ', role: 'শিক্ষাাবিদ', subTitle: 'হাজি বাড়ি ফাউন্ডেশন' },
  ];

  if (showAdminPanel && isAdmin) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-display font-medium text-foundation-900">Admin Dashboard</h3>
          <button 
            onClick={() => setShowAdminPanel(false)}
            className="text-xs font-bold text-foundation-600 hover:text-foundation-900 flex items-center gap-2"
          >
            <ArrowLeft size={16} /> Back to Committee
          </button>
        </div>
        <AdminDashboard />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="space-y-2">
          <h3 className="text-3xl font-display text-foundation-900">Administrative Committee</h3>
          <p className="text-foundation-600 italic">"Governance with Transparency & Dedication"</p>
        </div>
        
        {isAdmin && (
          <button 
            onClick={() => setShowAdminPanel(true)}
            className="flex items-center gap-2 px-6 py-2 bg-foundation-900 text-white rounded-full text-xs font-bold hover:bg-black transition-all shadow-lg hover:scale-105 active:scale-95"
          >
            <ShieldCheck size={16} /> Open Admin Panel
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {leaders.map((leader, i) => (
          <div key={i} className="bg-white p-8 rounded-2xl border border-foundation-300 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="w-20 h-20 rounded-full bg-foundation-200 border-2 border-foundation-400 mb-4 grid place-items-center">
              <UserIcon size={32} className="text-foundation-600" />
            </div>
            <h4 className="text-xl font-bold text-foundation-900 mb-1">{leader.name}</h4>
            <span className="px-4 py-1 bg-foundation-900 text-white text-[10px] uppercase tracking-[0.2em] rounded-full mb-2">
              {leader.role}
            </span>
            <p className="text-xs text-foundation-500 italic">{leader.subTitle}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PendingContributionsList() {
  const [pendingContributions, setPendingContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'contributions'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setPendingContributions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Contribution)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'contributions'));
    return () => unsubscribe();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await updateDoc(doc(db, 'contributions', id), { status: 'approved' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `contributions/${id}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this contribution record?')) {
      try {
        await deleteDoc(doc(db, 'contributions', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `contributions/${id}`);
      }
    }
  };

  if (loading) return <div className="p-12 text-center text-foundation-400">Scanning for pending contributions...</div>;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-foundation-300 overflow-hidden">
        <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-emerald-600" />
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">
              Pending Contributions ({pendingContributions.length})
            </span>
          </div>
        </div>
        
        <div className="divide-y divide-foundation-100">
          {pendingContributions.length === 0 ? (
            <div className="p-12 text-center text-foundation-400 italic text-xs">
              No pending project contributions found.
            </div>
          ) : (
            pendingContributions.map(c => (
              <div key={c.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-foundation-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img src={c.userPhotoURL || `https://ui-avatars.com/api/?name=${c.userName}`} alt="" className="w-12 h-12 rounded-full border border-foundation-200" />
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white
                      ${c.method === 'bkash' ? 'bg-[#D12053]' : 
                        c.method === 'nagad' ? 'bg-[#F34925]' : 
                        c.method === 'bank' ? 'bg-blue-600' : 'bg-emerald-600'}
                    `}>
                      <DollarSign size={10} />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-foundation-900 truncate">{c.userName}</h4>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="text-[12px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        {c.amount.toLocaleString()} BDT
                      </span>
                      <span className="text-[9px] uppercase font-bold text-foundation-500 bg-foundation-200 px-2 py-0.5 rounded">
                        {c.method}
                      </span>
                      <span className="text-[9px] font-mono text-foundation-400 bg-foundation-100 px-2 py-0.5 rounded border border-foundation-200">
                        TXID: {c.transactionId}
                      </span>
                    </div>
                    {c.createdAt && (
                      <p className="text-[9px] text-foundation-400 mt-1 flex items-center gap-1">
                        <Clock size={8} /> 
                        {c.createdAt?.toDate ? format(c.createdAt.toDate(), 'MMM d, h:mm a') : 'Just now'}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleApprove(c.id)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-medium hover:bg-emerald-700 transition-all shadow-sm active:scale-95"
                  >
                    <CheckCircle2 size={12} /> Approve
                  </button>
                  <button 
                    onClick={() => handleDelete(c.id)}
                    className="p-2 text-foundation-400 hover:text-red-600 transition-colors border border-foundation-200 hover:border-red-100 rounded-lg"
                    title="Reject Record"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function AdminApprovalList() {
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('isApproved', '==', false));
    const unsubscribe = onSnapshot(q, (snap) => {
      setPendingUsers(snap.docs.map(d => d.data() as UserProfile));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'users'));
    return () => unsubscribe();
  }, []);

  const handleApprove = async (uid: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), { isApproved: true });
      // Notify user? Maybe later.
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  };

  if (loading) return <div className="p-12 text-center text-foundation-400">Scanning for pending registrations...</div>;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-foundation-300 overflow-hidden">
        <div className="p-4 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest flex items-center gap-2">
            <Clock size={14} /> Pending Approvals ({pendingUsers.length})
          </span>
        </div>
        
        <div className="divide-y divide-foundation-100">
          {pendingUsers.length === 0 ? (
            <div className="p-12 text-center text-foundation-400 italic text-xs">
              All member requests have been processed.
            </div>
          ) : (
            pendingUsers.map(user => (
              <div key={user.uid} className="p-4 flex items-center justify-between hover:bg-foundation-50 transition-colors">
                <div className="flex items-center gap-4">
                  <img src={user.photoURL || undefined} alt="" className="w-12 h-12 rounded-full border border-foundation-200" />
                  <div>
                    <h4 className="text-sm font-bold text-foundation-900">{user.displayName}</h4>
                    <p className="text-[10px] text-foundation-500">{user.email}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-[9px] bg-foundation-200 text-foundation-600 px-1.5 py-0.5 rounded font-medium">{user.houseName}</span>
                      <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-medium">{user.village}, {user.district}</span>
                      <span className="text-[9px] bg-foundation-200 text-foundation-600 px-1.5 py-0.5 rounded font-medium">NID: {user.nidNumber}</span>
                      <span className="text-[9px] bg-foundation-200 text-foundation-600 px-1.5 py-0.5 rounded font-medium">{user.mobile}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleApprove(user.uid)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-700 transition-all"
                  >
                    <CheckCircle2 size={12} /> Approve
                  </button>
                  <button 
                    className="p-2 text-foundation-400 hover:text-red-600 transition-colors"
                    title="Reject (Delete Request)"
                    onClick={async () => {
                      if (confirm(`Reject registration for ${user.displayName}?`)) {
                        try {
                          await deleteDoc(doc(db, 'users', user.uid));
                        } catch (err) {
                          handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}`);
                        }
                      }
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function LineageVisualizer({ user }: { user: UserProfile }) {
  const [lineage, setLineage] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [potentialMatches, setPotentialMatches] = useState<UserProfile[]>([]);

  useEffect(() => {
    const fetchLineage = async () => {
      setIsLoading(true);
      let current: UserProfile | null = user;
      const path: UserProfile[] = [];
      const visited = new Set();
      visited.add(user.uid);

      while (current?.fatherId && !visited.has(current.fatherId)) {
        visited.add(current.fatherId);
        try {
          const snap = await getDoc(doc(db, 'users', current.fatherId));
          if (snap.exists()) {
            const father = snap.data() as UserProfile;
            path.push(father);
            current = father;
          } else {
            break;
          }
        } catch (err) {
          console.error("Error fetching lineage:", err);
          break;
        }
        if (path.length >= 12) break; // Deep lineage
      }
      setLineage(path);
      setIsLoading(false);

      // Look for matches for the last ancestor's father
      const lastKnown = path.length > 0 ? path[path.length - 1] : user;
      if (lastKnown.fatherName && !lastKnown.fatherId) {
        const q = query(
          collection(db, 'users'), 
          where('displayName', '==', lastKnown.fatherName),
          where('isApproved', '==', true),
          limit(3)
        );
        const matchSnap = await getDocs(q);
        setPotentialMatches(matchSnap.docs.map(d => d.data() as UserProfile));
      }
    };

    fetchLineage();
  }, [user.uid, user.fatherId]);

  const handleQuickLink = async (fatherUid: string, childUid: string) => {
    try {
      await updateDoc(doc(db, 'users', childUid), { fatherId: fatherUid });
      alert("Lineage linked successfully!");
      window.location.reload(); // Refresh to show new chain
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${childUid}`);
    }
  };

  if (isLoading) return <div className="animate-pulse flex flex-col items-center gap-4 py-8">
    <div className="w-12 h-12 bg-foundation-200 rounded-full" />
    <div className="w-1 h-8 bg-foundation-100" />
    <div className="w-10 h-10 bg-foundation-100 rounded-full" />
  </div>;

  const labels = ['বাবা (Father)', 'দাদা (Grandfather)', 'পরদাদা (G-Grandfather)', 'দাদার বাবা', 'তাঁর বাবা', 'তাঁর বাবা', 'তাঁর বাবা'];

  return (
    <div className="flex flex-col items-center py-6">
      <div className="flex flex-col items-center group mb-4">
        <div className="text-[10px] font-bold text-foundation-400 uppercase tracking-widest mb-2 italic">নিজ (Self)</div>
        <img src={user.photoURL || undefined} className="w-16 h-16 rounded-full border-4 border-foundation-900 p-1 shadow-lg ring-4 ring-foundation-100" alt="" />
        <span className="text-sm font-bold text-foundation-900 mt-2">{user.displayName}</span>
      </div>

      {lineage.map((anc, i) => (
        <React.Fragment key={anc.uid}>
          <div className="h-10 w-1 bg-gradient-to-b from-foundation-900 via-amber-400 to-amber-100 opacity-40 relative">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-amber-500 rounded-full border border-white" />
          </div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="flex flex-col items-center group py-2"
          >
            <div className="text-[9px] font-bold text-amber-600 uppercase tracking-tighter mb-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
              {labels[i] || `${i + 1}th Ancestor`}
            </div>
            <div className="relative hover:scale-110 transition-transform">
              <img src={anc.photoURL || `https://ui-avatars.com/api/?name=${anc.displayName}&background=fde68a&color=92400e`} className="w-14 h-14 rounded-full border-2 border-amber-400 p-0.5 shadow-md" alt="" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                <Sparkles size={10} className="text-white" />
              </div>
            </div>
            <span className="text-sm font-bold text-foundation-800 mt-2">{anc.displayName}</span>
            <div className="flex flex-col items-center">
              <p className="text-[9px] text-amber-700 font-medium px-2 py-0.5 bg-amber-50 rounded-md mt-1 italic">{anc.houseName} • {anc.houseSegment}</p>
              {anc.motherName && <p className="text-[8px] text-foundation-500 italic mt-0.5">M: {anc.motherName}</p>}
            </div>
          </motion.div>
        </React.Fragment>
      ))}

      {/* Suggestion for the top of the chain */}
      {(lineage.length === 0 || potentialMatches.length > 0) && (
        <div className="mt-6 w-full max-w-sm">
          <div className="h-6 w-px bg-foundation-300 mx-auto opacity-50 border-dashed border-l" />
          <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/30 text-center">
            {lineage.length === 0 && !user.fatherId ? (
              <>
                <p className="text-xs font-bold text-indigo-900 mb-1">বংশের ধারাবাহিকতা শুরু করুন</p>
                <p className="text-[10px] text-indigo-600 mb-4 italic">"{user.fatherName}" এর রেকর্ড আমাদের সিস্টেমে আছে কি না তা যাচাই করুন</p>
              </>
            ) : potentialMatches.length > 0 ? (
              <>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Brain size={16} className="text-indigo-600" />
                  <p className="text-xs font-bold text-indigo-900">অটো সাজেস্ট: {lineage.length > 0 ? lineage[lineage.length-1].fatherName : user.fatherName}</p>
                </div>
                <div className="space-y-2">
                  {potentialMatches.map(match => (
                    <div key={match.uid} className="flex items-center justify-between bg-white p-2 rounded-xl border border-indigo-100 shadow-sm">
                      <div className="flex items-center gap-2">
                        <img src={match.photoURL || ""} className="w-8 h-8 rounded-full border" alt="" />
                        <div className="text-left">
                          <p className="text-[10px] font-bold text-foundation-900">{match.displayName}</p>
                          <p className="text-[8px] text-foundation-500">{match.houseName}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleQuickLink(match.uid, lineage.length > 0 ? lineage[lineage.length-1].uid : user.uid)}
                        className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-[9px] font-bold hover:bg-indigo-700 transition-all"
                      >
                        Link
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-[10px] text-foundation-400 italic">No more automatic links found. Encourage your relatives to register!</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileComponent({ profile }: { profile: UserProfile | null }) {
  const [isUploading, setIsUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (profile && isEditing) {
      setEditFormData({
        displayName: profile.displayName || '',
        fatherName: profile.fatherName || '',
        motherName: profile.motherName || '',
        houseName: profile.houseName || '',
        village: profile.village || '',
        district: profile.district || '',
        nidNumber: profile.nidNumber || '',
        mobile: profile.mobile || '',
        familyHead: profile.familyHead || '',
        bio: profile.bio || '',
      });
    }
  }, [profile, isEditing]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !editFormData) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        ...editFormData,
        updatedAt: serverTimestamp()
      });
      setIsEditing(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setIsUploading(true);
    try {
      const base64 = await handleImageUpload(file);
      await updateDoc(doc(db, 'users', profile.uid), { photoURL: base64 });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white p-8 rounded-2xl border border-foundation-300 shadow-sm text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4">
          <button 
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-foundation-100 text-foundation-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-foundation-200 transition-all active:scale-95 border border-foundation-200"
          >
            <Edit3 size={14} /> Edit Profile
          </button>
        </div>
        
        <div className="relative w-32 h-32 mx-auto mb-6">
          <div className="w-full h-full rounded-full overflow-hidden border-4 border-foundation-100 shadow-inner bg-foundation-50 relative group">
            <img src={profile?.photoURL || undefined} alt="" className="w-full h-full object-cover" />
            <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
              <Camera size={24} className="text-white" />
              <input type="file" className="hidden" accept="image/*" onChange={onPhotoUpload} />
            </label>
            {isUploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          {profile?.isApproved && (
            <div className="absolute bottom-1 right-1 w-8 h-8 bg-foundation-500 rounded-full border-4 border-white flex items-center justify-center z-10 shadow-lg">
              <ShieldCheck size={14} className="text-white" />
            </div>
          )}
        </div>
        <h3 className="text-2xl font-display font-bold text-foundation-900">{profile?.displayName}</h3>
        <p className="text-sm text-foundation-500 flex items-center justify-center gap-2 mt-1">
          <Users size={14} /> {profile?.houseName}
        </p>
        
        <div className="mt-8 flex justify-center gap-4">
          <div className="px-4 py-2 bg-foundation-300 rounded-lg">
            <p className="text-[10px] uppercase font-bold text-foundation-600 tracking-wider">Status</p>
            <p className="text-sm font-bold text-foundation-900">{profile?.isApproved ? 'Verified' : 'Pending Approval'}</p>
          </div>
          <div className="px-4 py-2 bg-foundation-300 rounded-lg">
            <p className="text-[10px] uppercase font-bold text-foundation-600 tracking-wider">Role</p>
            <p className="text-sm font-bold text-foundation-900 capitalize">{profile?.role}</p>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-foundation-100">
          <label className="flex items-center justify-center gap-3 cursor-pointer group">
            <input 
              type="checkbox"
              checked={profile?.isPublicContribution ?? true}
              onChange={async (e) => {
                if (!profile) return;
                try {
                  await updateDoc(doc(db, 'users', profile.uid), { isPublicContribution: e.target.checked });
                } catch (err) {
                  handleFirestoreError(err, OperationType.UPDATE, `users/${profile.uid}`);
                }
              }}
              className="w-4 h-4 rounded border-foundation-300 text-foundation-900 focus:ring-foundation-500"
            />
            <span className="text-xs text-foundation-600 group-hover:text-foundation-900 transition-colors capitalize">
              Show my name publicly on project contributions
            </span>
          </label>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-foundation-300 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-foundation-200 pb-4">
          <h4 className="font-display font-medium text-xl">Lineage Flow (বংশের ধারাবাহিকতা)</h4>
          <GitGraph size={20} className="text-amber-500" />
        </div>
        
        {profile && <LineageVisualizer user={profile} />}
        
        {profile && !profile.fatherId && (
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-center">
            <p className="text-[11px] text-amber-700 font-bold mb-2">AUTO-LINK SUGGESTION</p>
            <p className="text-xs text-amber-900 border-b border-amber-100 pb-2 mb-2 italic">
              "Based on your record, you are the son of {profile.fatherName}"
            </p>
            <FatherLinkSelector profile={profile} />
          </div>
        )}
      </div>

      <div className="bg-white p-8 rounded-2xl border border-foundation-300 shadow-sm space-y-6">
        <h4 className="font-display font-medium text-xl border-b border-foundation-200 pb-4">Personal Records</h4>
        <dl className="grid grid-cols-2 gap-y-4">
          <dt className="text-xs font-bold text-foundation-500 uppercase">Father's Name</dt>
          <dd className="text-sm text-foundation-900">{profile?.fatherName}</dd>
          <dt className="text-xs font-bold text-foundation-500 uppercase">Mother's Name</dt>
          <dd className="text-sm text-foundation-900">{profile?.motherName || 'Not Recorded'}</dd>
          <dt className="text-xs font-bold text-foundation-500 uppercase">Head of Family</dt>
          <dd className="text-sm text-foundation-900">{profile?.familyHead}</dd>
          <dt className="text-xs font-bold text-foundation-500 uppercase">House Segment</dt>
          <dd className="text-sm text-foundation-900">{profile?.houseSegment}</dd>
          <dt className="text-xs font-bold text-foundation-500 uppercase">Mobile</dt>
          <dd className="text-sm text-foundation-900 font-mono italic">{profile?.mobile}</dd>
        </dl>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-foundation-300 shadow-sm space-y-6">
        <h4 className="font-display font-medium text-xl border-b border-foundation-200 pb-4">Contact Information</h4>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-foundation-100 flex items-center justify-center text-foundation-600">
              <Mail size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-foundation-500 uppercase tracking-tighter">Email Address</p>
              <p className="text-sm font-bold text-foundation-900 truncate" title={profile?.email}>{profile?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-foundation-100 flex items-center justify-center text-foundation-600">
              <Smartphone size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-foundation-500 uppercase tracking-tighter">Phone Number</p>
              <p className="text-sm font-bold text-foundation-900 font-mono">{profile?.mobile}</p>
            </div>
          </div>
        </div>
      </div>

      {!profile?.fatherId && (
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-2xl">
          <div className="flex gap-4">
            <GitGraph className="text-yellow-600 shrink-0" size={24} />
            <div>
              <h4 className="font-bold text-yellow-900 text-sm italic">Link your lineage!</h4>
              <p className="text-xs text-yellow-700 mt-1">Search for your father in the foundation records to build your family tree.</p>
              <FatherLinkSelector profile={profile} />
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isEditing && editFormData && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsEditing(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-display font-bold">প্রোফাইল সংশোধন (Update Profile)</h3>
                  <p className="text-xs text-indigo-100 mt-1">Update your member information</p>
                </div>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <Input 
                        label="Full Name (English)" 
                        required 
                        value={editFormData.displayName} 
                        onChange={(e: any) => setEditFormData({...editFormData, displayName: e.target.value})}
                      />
                      <div className="flex flex-col">
                        <label className="block text-[10px] font-bold text-foundation-500 uppercase tracking-widest mb-1 ml-1">Profile Photo</label>
                        <div className="flex items-center gap-3 bg-foundation-50 p-2 rounded-xl border border-foundation-200">
                          <img 
                            src={editFormData.photoURL || `https://ui-avatars.com/api/?name=${editFormData.displayName}`} 
                            className="w-10 h-10 rounded-lg object-cover bg-white" 
                            alt="" 
                          />
                          <label className="flex-1 bg-white border border-foundation-300 rounded-lg py-2 text-[10px] text-center font-bold uppercase tracking-widest cursor-pointer hover:bg-foundation-50 transition-colors">
                            <Camera size={12} className="inline mr-2" /> Change Photo
                            <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const base64 = await handleImageUpload(file);
                                  setEditFormData({...editFormData, photoURL: base64});
                                } catch (err) {
                                  console.error(err);
                                }
                              }
                            }} />
                          </label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <Input 
                        label="Father's Name" 
                        required 
                        value={editFormData.fatherName} 
                        onChange={(e: any) => setEditFormData({...editFormData, fatherName: e.target.value})} 
                      />
                      <Input 
                        label="Mother's Name" 
                        value={editFormData.motherName} 
                        onChange={(e: any) => setEditFormData({...editFormData, motherName: e.target.value})} 
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <Input 
                        label="Village (গ্রাম)" 
                        required 
                        value={editFormData.village} 
                        onChange={(e: any) => setEditFormData({...editFormData, village: e.target.value})} 
                      />
                      <Input 
                        label="District (জেলা)" 
                        required 
                        value={editFormData.district} 
                        onChange={(e: any) => setEditFormData({...editFormData, district: e.target.value})} 
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <Input 
                        label="House Name (বাড়ির নাম)" 
                        required 
                        value={editFormData.houseName} 
                        onChange={(e: any) => setEditFormData({...editFormData, houseName: e.target.value})} 
                      />
                      <Input 
                        label="Document Number (NID/Birth)" 
                        value={editFormData.nidNumber} 
                        onChange={(e: any) => setEditFormData({...editFormData, nidNumber: e.target.value})} 
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <Input 
                        label="Mobile Contact" 
                        placeholder="+880..."
                        value={editFormData.mobile} 
                        onChange={(e: any) => setEditFormData({...editFormData, mobile: e.target.value})} 
                      />
                      <Input 
                        label="Head of Family" 
                        value={editFormData.familyHead} 
                        onChange={(e: any) => setEditFormData({...editFormData, familyHead: e.target.value})} 
                      />
                    </div>

                    <div className="relative">
                      <label className="block text-[10px] font-bold text-foundation-500 uppercase tracking-widest mb-1 ml-1">Short Bio</label>
                      <textarea 
                        value={editFormData.bio} 
                        onChange={(e) => setEditFormData({...editFormData, bio: e.target.value})}
                        className="w-full bg-foundation-50 border border-foundation-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
                        placeholder="Tell us about yourself..."
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-indigo-600 text-white rounded-xl px-8 py-4 text-sm font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save size={18} />
                          Save Changes
                        </>
                      )}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-8 py-4 bg-foundation-100 text-foundation-600 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-foundation-200 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FatherLinkSelector({ profile }: { profile: UserProfile | null }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (search.length > 2) {
      const q = query(collection(db, 'users'), where('isApproved', '==', true));
      const unsub = onSnapshot(q, (snap) => {
        const found = snap.docs
          .map(d => d.data() as UserProfile)
          .filter(u => u.displayName.toLowerCase().includes(search.toLowerCase()) && u.uid !== profile?.uid);
        setResults(found);
      });
      return () => unsub();
    } else {
      setResults([]);
    }
  }, [search, profile?.uid]);

  const selectFather = async (father: UserProfile) => {
    if (!profile) return;
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        fatherId: father.uid,
        fatherName: father.displayName
      });
      setSearch('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${profile.uid}`);
    }
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foundation-400" size={14} />
        <input 
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search for father's name..."
          className="w-full pl-10 pr-4 py-2 bg-white rounded-lg border border-foundation-300 text-xs focus:ring-2 focus:ring-foundation-500 focus:outline-none"
        />
      </div>
      {results.length > 0 && (
        <div className="bg-white border border-foundation-300 rounded-lg overflow-hidden shadow-lg">
          {results.map(r => (
            <button 
              key={r.uid}
              onClick={() => selectFather(r)}
              className="w-full text-left p-3 hover:bg-foundation-200 flex items-center gap-3 transition-colors border-b last:border-none border-foundation-200"
            >
              <img src={r.photoURL || undefined} className="w-8 h-8 rounded-full" alt="" />
              <div>
                <p className="text-xs font-bold text-foundation-900">{r.displayName}</p>
                <p className="text-[10px] text-foundation-500">{r.houseName}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const handleImageUpload = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; // Limit size for Firestore
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

function AIBongshoSuite({ onResult }: { onResult: (child: string, parent: string, fullSuggestion?: any) => void }) {
  const [activeMode, setActiveMode] = useState<'dictator' | 'oracle' | 'scanner'>('dictator');
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [dbMatches, setDbMatches] = useState<any[]>([]);
  const [oracleAnswer, setOracleAnswer] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mergeSuggestions = (newSuggestions: any[]) => {
    const merged = { ...newSuggestions[0] };
    
    newSuggestions.slice(1).forEach(suggest => {
      // Merge logic: prefer non-null values
      if (!merged.subject?.name && suggest.subject?.name) merged.subject = suggest.subject;
      if (!merged.father?.name && suggest.father?.name) merged.father = suggest.father;
      if (!merged.mother?.name && suggest.mother?.name) merged.mother = suggest.mother;
      if ((!merged.village || merged.village === 'null') && suggest.village) merged.village = suggest.village;
      if ((!merged.district || merged.district === 'null') && suggest.district) merged.district = suggest.district;
      if (!merged.nidNumber && suggest.nidNumber) merged.nidNumber = suggest.nidNumber;
      if (!merged.house && suggest.house) merged.house = suggest.house;
    });

    return merged;
  };

  const handleAnalze = async () => {
    if (!input.trim()) return;
    setIsAnalyzing(true);
    setSuggestions([]);
    setOracleAnswer(null);

    if (activeMode === 'dictator') {
      const result = await detectLineage(input);
      if (result) setSuggestions([result]);
    } else if (activeMode === 'oracle') {
      // Gather context
      const q = query(collection(db, 'users'), where('isApproved', '==', true), limit(100));
      const snap = await getDocs(q);
      const context = snap.docs.map(d => {
        const u = d.data();
        return `${u.displayName} (son of ${u.fatherName || 'Unknown'})`;
      }).join(', ');
      
      const answer = await answerTreeQuestion(input, context);
      setOracleAnswer(answer);
    }
    
    setIsAnalyzing(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsAnalyzing(true);
    setSuggestions([]);
    setDbMatches([]);

    const newSuggestions: any[] = [];

    for (const fileObj of files) {
      const file = fileObj as File;
      try {
        const buffer = await file.arrayBuffer();
        const result = await analyzeLineageImage(buffer, file.type);
        if (result) newSuggestions.push(result);
      } catch (err) {
        console.error("Error analyzing file:", file.name, err);
      }
    }

    setIsAnalyzing(false);
    
    if (newSuggestions.length > 0) {
      const merged = mergeSuggestions(newSuggestions);
      setSuggestions(newSuggestions);
      
      // Use the merged data for the final result
      if (merged.confidence > 0.7) {
         setTimeout(() => {
           onResult(merged.subject?.name || '', merged.father?.name || '', merged);
         }, 2500);
      }
      
      // Search for potential database matches using any of the data
      const matches: any[] = [];
      const usersRef = collection(db, 'users');
      
      for (const res of newSuggestions) {
        try {
          if (res.father?.name) {
            const q = query(usersRef, where('displayName', '==', res.father.name));
            const snap = await getDocs(q);
            snap.forEach(doc => matches.push({ ...doc.data(), matchType: 'father' }));
          }
          if (res.mother?.name) {
            const q = query(usersRef, where('displayName', '==', res.mother.name));
            const snap = await getDocs(q);
            snap.forEach(doc => matches.push({ ...doc.data(), matchType: 'mother' }));
          }
        } catch (err) {
          console.error("Fetch match error:", err);
        }
      }
      setDbMatches(matches);
    }
  };

  const startDictation = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Dictation is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };
    recognition.start();
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-4 rounded-3xl border border-indigo-100 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex bg-indigo-100 p-1 rounded-xl">
          <button 
            onClick={() => { setActiveMode('dictator'); setInput(''); setSuggestions([]); setOracleAnswer(null); }}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${activeMode === 'dictator' ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-600 hover:bg-indigo-200'}`}
          >
            Dictator
          </button>
          <button 
            onClick={() => { setActiveMode('oracle'); setInput(''); setSuggestions([]); setOracleAnswer(null); }}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${activeMode === 'oracle' ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-600 hover:bg-indigo-200'}`}
          >
            Oracle
          </button>
          <button 
            onClick={() => { setActiveMode('scanner'); setInput(''); setSuggestions([]); setOracleAnswer(null); }}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${activeMode === 'scanner' ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-600 hover:bg-indigo-200'}`}
          >
            Scanner
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-indigo-600 animate-bounce" />
          <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-widest">Bongsho AI</span>
        </div>
      </div>
      
      {activeMode !== 'scanner' ? (
        <div className="relative">
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={activeMode === 'dictator' ? "Dictate: 'Arfin is the son of Monir Ahmed'..." : "Ask: 'Who is the father of Arfin?'..."}
            className="w-full bg-white/80 border border-indigo-200 rounded-2xl p-3 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[80px] pr-20"
          />
          <div className="absolute right-2 bottom-2 flex gap-1">
            <button 
              onClick={startDictation}
              className={`p-2 rounded-xl transition-all shadow-sm ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-100'}`}
            >
              <Mic size={14} />
            </button>
            <button 
              onClick={handleAnalze}
              disabled={isAnalyzing || !input.trim()}
              className="p-2 bg-indigo-600 text-white rounded-xl shadow-md hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
              {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-indigo-200 rounded-2xl bg-indigo-50/50 hover:bg-indigo-50 transition-colors">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            multiple
            className="hidden" 
          />
          <Camera className="text-indigo-400 mb-2" size={32} />
          <p className="text-[10px] font-bold text-indigo-600 uppercase mb-4 text-center">Scan NID, Birth Certificate, Passport<br/>or Hand-written Charts (Select Multiple)</p>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
            className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {isAnalyzing ? "Scanning Documents..." : "Select Documents"}
          </button>
          <p className="text-[8px] text-foundation-400 mt-4 uppercase text-center font-bold tracking-widest">Connect with your Root instantly using Multiple Docs</p>
        </div>
      )}

      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-4 rounded-2xl border border-indigo-200 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100">
                  <Brain size={20} className="text-indigo-600" />
                </div>
                <div>
                  <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">AI Extraction Result</p>
                  <p className="text-xs font-bold text-foundation-900">
                    {activeMode === 'scanner' ? (
                       `${suggestions.length} Document${suggestions.length > 1 ? 's' : ''} Scanned`
                    ) : (
                      suggestions[0].childName ? `${suggestions[0].childName} is son of ${suggestions[0].fatherName}` : 'Suggestion Found'
                    )}
                  </p>
                </div>
              </div>
            </div>

            {activeMode === 'scanner' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Show Merged Data Preview */}
                  <div className="col-span-full bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                    <p className="text-[9px] font-black text-indigo-600 uppercase mb-3 flex items-center gap-2">
                       <Sparkles size={12} /> Merged Profile Preview
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                         <p className="text-[8px] font-black text-foundation-400 uppercase">Self</p>
                         <p className="text-xs font-bold text-foundation-900">{mergeSuggestions(suggestions).subject?.name || 'N/A'}</p>
                       </div>
                       <div>
                         <p className="text-[8px] font-black text-foundation-400 uppercase">Father</p>
                         <p className="text-xs font-bold text-foundation-900">{mergeSuggestions(suggestions).father?.name || 'N/A'}</p>
                       </div>
                    </div>
                  </div>

                  {suggestions.map((s, idx) => (
                    <div key={idx} className="p-3 bg-foundation-50 rounded-xl border border-foundation-100 relative group">
                      <div className="absolute -top-2 -right-2 w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[8px] font-bold">
                        {idx + 1}
                      </div>
                      <p className="text-[8px] font-black text-indigo-400 uppercase mb-1">Doc {idx + 1} Snippet</p>
                      <p className="text-[10px] font-bold truncate">{s.subject?.name || 'N/A'}</p>
                      <p className="text-[9px] text-foundation-500 truncate">{s.father?.name || 'Father N/A'}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {mergeSuggestions(suggestions).nidNumber && (
                    <div className="p-3 bg-foundation-50 rounded-xl border border-foundation-100">
                      <p className="text-[8px] font-black text-indigo-400 uppercase mb-1">Extracted ID</p>
                      <p className="text-xs font-bold truncate">{mergeSuggestions(suggestions).nidNumber}</p>
                    </div>
                  )}
                  {mergeSuggestions(suggestions).village && (
                    <div className="p-3 bg-foundation-50 rounded-xl border border-foundation-100">
                      <p className="text-[8px] font-black text-indigo-400 uppercase mb-1">Village/Hous</p>
                      <p className="text-[10px] font-bold truncate">{mergeSuggestions(suggestions).village}, {mergeSuggestions(suggestions).house || 'N/A'}</p>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => {
                    const merged = mergeSuggestions(suggestions);
                    onResult(merged.subject?.name || '', merged.father?.name || '', merged);
                  }}
                  className="w-full bg-indigo-600 text-white rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  <Scan size={14} /> Continue with Registration
                </button>

                {dbMatches.length > 0 && (
                  <div className="pt-2 border-t border-indigo-50">
                    <div className="flex items-center gap-2 mb-3">
                       <GitBranch size={14} className="text-emerald-500" />
                       <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Database Connections Found</p>
                    </div>
                    <div className="space-y-2">
                       {dbMatches.map((match, idx) => (
                         <div key={idx} className="flex items-center justify-between p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                           <div className="flex items-center gap-3">
                             <img src={match.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${match.displayName}`} className="w-8 h-8 rounded-full" alt="" />
                             <div>
                               <p className="text-xs font-bold text-foundation-900">{match.displayName}</p>
                               <p className={`text-[9px] uppercase font-black ${match.matchType === 'sibling' ? 'text-amber-600' : 'text-emerald-600'}`}>
                                 {match.matchType === 'sibling' ? 'Possible Sibling (সহোদর)' : `Matched as ${match.matchType}`}
                               </p>
                             </div>
                           </div>
                           <button 
                             onClick={() => {
                               const merged = mergeSuggestions(suggestions);
                               if (match.matchType === 'father') {
                                 onResult(merged.subject?.name || '', match.displayName, merged);
                               } else if (match.matchType === 'sibling') {
                                 if (match.fatherName) {
                                   onResult(merged.subject?.name || '', match.fatherName, merged);
                                 }
                               } else {
                                 onResult(merged.father?.name || '', match.displayName, merged);
                               }
                             }}
                             className={`px-4 py-1.5 rounded-lg text-[9px] font-bold transition-all shadow-md ${match.matchType === 'sibling' ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                           >
                             {match.matchType === 'sibling' ? 'Connect Sibling' : 'Root Connect'}
                           </button>
                         </div>
                       ))}
                    </div>
                  </div>
                )}
                
                {suggestions[0]?.summary && (
                  <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-100 italic text-[9px] text-indigo-700">
                    AI Note: {suggestions[0].summary}
                  </div>
                )}
              </div>
            )}
            
            {activeMode !== 'scanner' && (
              <>
                <div className="flex items-center justify-between">
                  {suggestions[0]?.childName && suggestions[0]?.fatherName && (
                    <button 
                      onClick={() => onResult(suggestions[0].childName, suggestions[0].fatherName)}
                      className="w-full bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-bold hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
                    >
                      Connect Father-Son
                    </button>
                  )}
                </div>
                {suggestions[0]?.lineage && (
                  <div className="space-y-3 relative">
                    <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-indigo-100 border-l border-dashed border-indigo-300" />
                    {suggestions[0].lineage.map((item: any, idx: number) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-center gap-4 relative"
                      >
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center z-10 text-[10px] font-black ${idx === 0 ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-indigo-200 text-indigo-600'}`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 bg-foundation-50/50 p-2 rounded-xl border border-foundation-100 flex items-center justify-between">
                          <div>
                            <p className="text-[7px] font-black text-indigo-400 uppercase tracking-widest">{item.role}</p>
                            <p className="text-[11px] font-bold text-foundation-900">{item.name} {item.nameBengali && <span className="text-foundation-400 font-normal">({item.nameBengali})</span>}</p>
                          </div>
                          {idx < suggestions[0].lineage.length - 1 && (
                            <button 
                              onClick={() => {
                                const merged = mergeSuggestions(suggestions);
                                onResult(item.name, suggestions[0].lineage[idx + 1].name, merged);
                              }}
                              className="px-2 py-1 bg-white hover:bg-indigo-600 hover:text-white text-indigo-600 rounded-lg text-[8px] font-black uppercase transition-all shadow-sm border border-indigo-100"
                            >
                              Link Father
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </>
            )}
            
            {activeMode !== 'scanner' && suggestions[0]?.grandfatherName && (
              <div className="flex items-center gap-2 pt-2 border-t border-indigo-50">
                <GitBranch size={10} className="text-amber-500" />
                <p className="text-[9px] font-bold text-foundation-500 uppercase">
                  Grandfather: <span className="text-amber-600">{suggestions[0].grandfatherName}</span>
                </p>
              </div>
            )}
          </motion.div>
        )}

        {oracleAnswer && activeMode === 'oracle' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-indigo-900 border border-indigo-800 p-4 rounded-2xl shadow-xl text-white relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-40 transition-opacity">
              <Sparkles size={40} className="text-indigo-400" />
            </div>
            <div className="relative z-10 flex gap-3">
              <div className="shrink-0 w-8 h-8 bg-indigo-700 rounded-lg flex items-center justify-center border border-indigo-600 mt-1">
                <Bot size={16} className="text-indigo-300" />
              </div>
              <div>
                <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest mb-1">AI Oracle Insight</p>
                <p className="text-xs leading-relaxed text-indigo-50 italic">"{oracleAnswer}"</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function D3FamilyTree({ data }: { data: any[] }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    // Clear previous
    d3.select(svgRef.current).selectAll("*").remove();

    const width = 800;
    const height = 400;
    const margin = { top: 40, right: 90, bottom: 40, left: 90 };

    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const buildHierarchy = (nodes: any[]) => {
      if (!nodes.length) return null;
      let rootNode = { ...nodes[0], children: [] as any[] };
      let current = rootNode;
      for (let i = 1; i < nodes.length; i++) {
        const next = { ...nodes[i], children: [] as any[] };
        current.children.push(next);
        current = next;
      }
      return rootNode;
    };

    const rootData = buildHierarchy([...data].reverse());
    if (!rootData) return;

    const root = d3.hierarchy(rootData);
    const treeLayout = d3.tree().size([height - margin.top - margin.bottom, width - margin.left - margin.right]);
    treeLayout(root);

    svg.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("fill", "none")
      .attr("stroke", "#6366f1")
      .attr("stroke-width", 3)
      .attr("stroke-dasharray", "5,5")
      .attr("d", d3.linkHorizontal()
        .x((d: any) => d.y)
        .y((d: any) => d.x) as any);

    const node = svg.selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("transform", (d: any) => `translate(${d.y},${d.x})`);

    node.append("circle")
      .attr("r", 20)
      .attr("fill", (d, i) => d.depth === 0 ? "#1e293b" : "#6366f1")
      .attr("stroke", "white")
      .attr("stroke-width", 3);

    node.append("text")
      .attr("dy", "-1.5em")
      .attr("text-anchor", "middle")
      .text((d: any) => d.data.displayName)
      .attr("font-size", "12px")
      .attr("font-weight", "800")
      .attr("fill", "#1e293b");

    node.append("text")
      .attr("dy", "2.5em")
      .attr("text-anchor", "middle")
      .text((d: any) => d.depth === root.height ? "Root" : `Generation ${root.height - d.depth}`)
      .attr("font-size", "9px")
      .attr("font-weight", "bold")
      .attr("fill", "#64748b")
      .attr("class", "uppercase tracking-tighter");

  }, [data]);

  return (
    <div className="w-full h-[400px] bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 overflow-auto scrollbar-hide flex items-center justify-center">
      <svg ref={svgRef} className="w-full md:min-w-[800px] h-full"></svg>
    </div>
  );
}

function FamilyTree({ profile }: { profile: UserProfile | null }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(profile);
  const [ancestry, setAncestry] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [aiExplanation, setAiExplanation] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    if (search.length > 1) {
      const q = query(collection(db, 'users'), where('isApproved', '==', true));
      const unsub = onSnapshot(q, (snap) => {
        const found = snap.docs
          .map(d => d.data() as UserProfile)
          .filter(u => u.displayName.toLowerCase().includes(search.toLowerCase()));
        setResults(found);
      });
      return () => unsub();
    } else {
      setResults([]);
    }
  }, [search]);

  useEffect(() => {
    if (!selectedMember) return;
    
    const fetchAncestry = async () => {
      setIsLoading(true);
      let current = selectedMember;
      const path = [current];
      
      for (let i = 0; i < 15; i++) {
        if (!current.fatherId) break;
        const snap = await getDoc(doc(db, 'users', current.fatherId));
        if (snap.exists()) {
          const father = snap.data() as UserProfile;
          path.push(father);
          current = father;
        } else break;
      }
      setAncestry(path);
      setIsLoading(false);
      
      setIsAiLoading(true);
      try {
        const explanation = await explainFamilyTree(path, selectedMember.displayName);
        setAiExplanation(explanation || 'দুঃখিত, এই মুহূর্তে বংশ পরিচয় বিশ্লেষণ সম্ভব হয়নি।');
      } catch (err) {
        setAiExplanation('ত্রুটি ঘটেছে। আবার চেষ্টা করুন।');
      }
      setIsAiLoading(false);
    };

    fetchAncestry();
  }, [selectedMember]);

  return (
    <div className="space-y-8">
      {/* Hero Search Section */}
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-8 sm:p-12 rounded-[3rem] text-center relative overflow-hidden shadow-2xl border border-white/5">
        <div className="absolute top-0 right-0 p-8 opacity-10 blur-2xl bg-indigo-500 rounded-full w-64 h-64 -mr-32 -mt-32"></div>
        <div className="relative z-10 space-y-4">
          <h3 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">Interactive Lineage Visualizer</h3>
          <p className="text-indigo-200 text-sm max-w-lg mx-auto leading-relaxed">
            নাম লিখে সার্চ করুন এবং তাৎক্ষণিকভাবে আপনার বংশের ইতিহাস ও সম্পর্কের বিশ্লেষণ দেখুন।
          </p>
          
          <div className="max-w-xl mx-auto mt-8 relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-indigo-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
              placeholder="সদস্যের নাম দিয়ে সার্চ করুন..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            
            <AnimatePresence>
              {results.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl overflow-hidden shadow-2xl z-50 divide-y divide-slate-100 max-h-64 overflow-y-auto"
                >
                  {results.map(member => (
                    <button
                      key={member.uid}
                      onClick={() => {
                        setSelectedMember(member);
                        setSearch('');
                        setResults([]);
                      }}
                      className="w-full text-left px-5 py-4 hover:bg-slate-50 transition-colors flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <img 
                            src={member.photoURL || `https://ui-avatars.com/api/?name=${member.displayName}`} 
                            className="w-10 h-10 rounded-xl object-cover ring-2 ring-slate-100 group-hover:ring-indigo-100 transition-all" 
                            alt="" 
                          />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{member.displayName}</p>
                          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Father: {member.fatherName}</p>
                        </div>
                      </div>
                      <ArrowRight size={18} className="text-slate-300 group-hover:text-indigo-600 transition-colors group-hover:translate-x-1 duration-300" />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {selectedMember && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Main Visualization Card */}
          <div className="bg-white p-8 sm:p-10 rounded-[3rem] border border-slate-200 shadow-xl shadow-slate-100 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10 pb-8 border-b border-slate-100">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <img 
                    src={selectedMember.photoURL || `https://ui-avatars.com/api/?name=${selectedMember.displayName}`} 
                    className="w-20 h-20 rounded-3xl object-cover shadow-lg border-2 border-white" 
                    alt="" 
                  />
                  <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-2 rounded-xl shadow-xl border-2 border-white">
                    <Fingerprint size={16} />
                  </div>
                </div>
                <div className="space-y-1">
                  <h4 className="text-2xl font-display font-bold text-slate-900 tracking-tight">{selectedMember.displayName}</h4>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span> 
                    Root Member Profile
                  </p>
                </div>
              </div>
              
              <div className="bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                  <GitBranch size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Generations</p>
                  <p className="text-xl font-display font-bold text-slate-900 leading-tight">{ancestry.length} Traceable</p>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="h-[400px] flex items-center justify-center bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-200">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-indigo-600/30 rounded-full" />
                    <div className="absolute inset-0 w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                  <p className="text-sm text-slate-400 font-bold uppercase tracking-[0.2em] animate-pulse">Building Tree</p>
                </div>
              </div>
            ) : (
              <D3FamilyTree data={ancestry} />
            )}
          </div>

          {/* AI Analysis Card */}
          <div className="bg-indigo-900 rounded-[3.5rem] p-4 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
             <div className="bg-white rounded-[2.5rem] p-10 relative z-10 border border-white/20">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200">
                    <Sparkles size={28} className="animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-display font-bold text-slate-900">বংশালিপি বিশ্লেষণ (AI)</h4>
                    <p className="text-xs text-slate-400 font-medium italic">Powered by Gemini Intelligent Genealogy Engine</p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute left-0 top-0 w-1 h-full bg-slate-100 rounded-full"></div>
                  <div className="pl-8">
                    {isAiLoading ? (
                      <div className="space-y-6">
                        <div className="h-6 bg-slate-100 rounded-xl animate-pulse w-3/4" />
                        <div className="h-6 bg-slate-100 rounded-xl animate-pulse w-full" />
                        <div className="h-6 bg-slate-100 rounded-xl animate-pulse w-2/3" />
                      </div>
                    ) : (
                      <div className="text-slate-700 text-lg leading-[1.8] space-y-6 font-medium">
                        <p className="whitespace-pre-line bg-gradient-to-r from-slate-900 to-indigo-900 bg-clip-text text-transparent">
                          {aiExplanation}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
             </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function NotificationDropdown({ notifications, onClose }: { notifications: Notification[], onClose: () => void }) {
  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `notifications/${id}`);
    }
  };

  const deleteNotif = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `notifications/${id}`);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-foundation-300 overflow-hidden z-50 overflow-y-auto max-h-[400px]"
    >
      <div className="p-4 border-b border-foundation-200 flex justify-between items-center bg-foundation-900 text-white">
        <h4 className="text-xs font-bold uppercase tracking-widest">Notifications</h4>
        <button onClick={onClose}><X size={14} /></button>
      </div>

      <div className="divide-y divide-foundation-200">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-foundation-500 text-xs italic">No new notifications</div>
        ) : (
          notifications.map(n => (
            <div key={n.id} className={`p-4 hover:bg-foundation-200 transition-colors ${n.read ? 'opacity-60' : ''}`}>
              <div className="flex gap-3">
                <img src={n.userPhotoURL || undefined} className="w-8 h-8 rounded-full" alt="" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foundation-900 line-clamp-2">{n.message}</p>
                  <p className="text-[9px] text-foundation-500 mt-1">
                    {n.createdAt?.toDate ? format(n.createdAt.toDate(), 'PPP p') : 'Just now'}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                {!n.read && (
                  <button 
                    onClick={() => markAsRead(n.id)}
                    className="text-[9px] font-bold text-foundation-700 hover:underline uppercase"
                  >
                    Mark read
                  </button>
                )}
                <button 
                  onClick={() => deleteNotif(n.id)}
                  className="text-[9px] font-bold text-red-600 hover:underline uppercase"
                >
                  Clear
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

function ProjectProgressUpdater({ post }: { post: Post }) {
  const [isOpen, setIsOpen] = useState(false);
  const [progress, setProgress] = useState(post.projectProgress || 0);
  const [status, setStatus] = useState(post.projectStatusUpdate || '');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        projectProgress: Number(progress),
        projectStatusUpdate: status
      });
      setIsOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${post.id}`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="mb-2">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-1.5 border border-emerald-400 text-emerald-700 rounded text-[10px] font-bold hover:bg-emerald-100 transition-all uppercase tracking-wider"
      >
        {isOpen ? 'Close Updater' : 'Update Project Progress'}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-2 space-y-3 bg-white/60 p-3 rounded-lg border border-emerald-200 shadow-inner"
          >
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[9px] font-bold text-emerald-800 uppercase tracking-tighter">Completion Percentage</label>
                <span className="text-[10px] font-bold text-emerald-900">{progress}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={progress} 
                onChange={e => setProgress(Number(e.target.value))}
                className="w-full accent-emerald-600 h-1.5 bg-emerald-100 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-emerald-800 uppercase tracking-tighter">Status Message</label>
              <input 
                value={status}
                onChange={e => setStatus(e.target.value)}
                placeholder="e.g. Ground floor completed, pending painting..."
                className="w-full p-2 bg-white rounded border border-emerald-200 text-[10px] focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>

            <button 
              onClick={handleUpdate}
              disabled={isUpdating}
              className="w-full py-1.5 bg-emerald-800 text-white rounded text-[10px] font-bold hover:bg-emerald-900 transition-all flex items-center justify-center gap-2"
            >
              {isUpdating ? 'Updating...' : 'Publish Progress Update'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProjectContributionPanel({ post, profile, contributions, isAdmin }: { post: Post, profile: UserProfile | null, contributions: Contribution[], isAdmin: boolean }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'bkash' | 'nagad' | 'bank' | 'cash'>('bkash');
  const [transactionId, setTransactionId] = useState('');
  const [isPublic, setIsPublic] = useState(profile?.isPublicContribution ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (profile) setIsPublic(profile.isPublicContribution ?? true);
  }, [profile]);

  const totalRaised = contributions
    .filter(c => c.status === 'approved')
    .reduce((sum, c) => sum + c.amount, 0);

  const approvedContributions = contributions.filter(c => c.status === 'approved');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile || !amount || !transactionId) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'contributions'), {
        postId: post.id,
        userId: profile.uid,
        userName: profile.displayName,
        userPhotoURL: profile.photoURL || '',
        amount: Number(amount),
        method,
        transactionId,
        status: 'pending',
        isPublic: isPublic,
        createdAt: serverTimestamp()
      });
      setAmount('');
      setTransactionId('');
      alert('Your contribution record has been submitted for admin verification. Thank you!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'contributions');
    } finally {
      setIsSubmitting(false);
    }
  };

  const approveContribution = async (contribId: string) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'contributions', contribId), { status: 'approved' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `contributions/${contribId}`);
    }
  };

  return (
    <motion.div 
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="mt-4 bg-white/80 rounded-xl border border-emerald-200 overflow-hidden"
    >
      <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center">
        <div>
          <h4 className="text-sm font-bold text-emerald-900">Project Fund Tracking</h4>
          <p className="text-[10px] text-emerald-600 font-mono">Total Approved: {totalRaised.toLocaleString()} / {post.projectBudget?.toLocaleString()} BDT</p>
        </div>
        <div className="text-right">
          <div className="w-24 bg-emerald-200 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-600 h-full transition-all duration-1000" 
              style={{ width: `${Math.min(100, (totalRaised / (post.projectBudget || 1)) * 100)}%` }}
            />
          </div>
          <p className="text-[9px] text-emerald-700 font-bold mt-1">
            {Math.round((totalRaised / (post.projectBudget || 1)) * 100)}% Funded
          </p>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Contribution Form */}
        <form onSubmit={handleSubmit} className="space-y-3 bg-emerald-100/30 p-3 rounded-lg border border-emerald-200">
          <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-2">Record Payment</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-emerald-700">Amount (BDT)</label>
              <input 
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="500"
                className="w-full p-2 bg-white rounded border border-emerald-200 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-emerald-700">Method</label>
              <select 
                value={method}
                onChange={e => setMethod(e.target.value as any)}
                className="w-full p-2 bg-white rounded border border-emerald-200 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
              >
                <option value="bkash">Bkash</option>
                <option value="nagad">Nagad</option>
                <option value="bank">Bank</option>
                <option value="cash">Cash</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-emerald-700">TrxID / Reference</label>
            <input 
              value={transactionId}
              onChange={e => setTransactionId(e.target.value)}
              placeholder="Enter Transaction ID or Reference"
              className="w-full p-2 bg-white rounded border border-emerald-200 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
              required
            />
          </div>
          <div className="flex items-center gap-2 px-1">
            <input 
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={e => setIsPublic(e.target.checked)}
              className="w-3 h-3 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="isPublic" className="text-[9px] text-emerald-700 font-bold uppercase tracking-tighter cursor-pointer">
              Show my name publicly in the list
            </label>
          </div>
          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2 bg-emerald-600 text-white rounded font-bold text-[10px] hover:bg-emerald-700 transition-all disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Contribution Proof'}
          </button>
        </form>

        {/* Contributors List */}
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-foundation-500 uppercase tracking-[0.2em] mb-3">Verified Donors List</p>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {approvedContributions.length === 0 && <p className="text-center text-[10px] text-foundation-400 py-4 italic">No verified contributions yet.</p>}
              {approvedContributions.map(c => (
                <div key={c.id} className="bg-emerald-50/50 p-3 rounded border border-emerald-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 border border-emerald-200">
                      {c.isPublic ? <img src={c.userPhotoURL || undefined} className="w-full h-full rounded-full" alt="" /> : <Users size={14} />}
                    </div>
                    <div>
                      <h5 className="text-[10px] font-bold text-foundation-900">{c.isPublic ? c.userName : 'Anonymous Member'}</h5>
                      <p className="text-[9px] text-foundation-500">
                        {c.createdAt?.toDate ? format(c.createdAt.toDate(), 'PPP') : 'Recently'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-emerald-700">{c.amount.toLocaleString()} BDT</p>
                    <CheckCircle2 size={10} className="text-emerald-500 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-foundation-100">
            <p className="text-[10px] font-bold text-foundation-500 uppercase tracking-[0.2em] mb-3">All Records (incl. Pending)</p>
            <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {contributions.length === 0 && <p className="text-center text-[10px] text-foundation-400 py-4 italic">No contributions recorded yet.</p>}
              {contributions.map(c => (
              <div key={c.id} className="bg-white p-3 rounded-lg border border-foundation-200 flex items-center justify-between group shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-foundation-100 flex items-center justify-center text-foundation-400 border border-foundation-200 overflow-hidden">
                      {(c.isPublic || isAdmin) ? (
                        <img src={c.userPhotoURL || undefined} className="w-full h-full rounded-full" alt="" />
                      ) : (
                        <Users size={14} />
                      )}
                    </div>
                    {c.status === 'approved' ? (
                      <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                        <CheckCircle2 size={12} className="text-emerald-600" />
                      </div>
                    ) : (
                      <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                        <Clock size={12} className="text-amber-500" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="text-[10px] font-bold text-foundation-900">
                        {(c.isPublic || isAdmin) ? c.userName : 'Anonymous Member'}
                      </h5>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded-full uppercase font-bold tracking-tighter ${c.method === 'bkash' ? 'bg-pink-100 text-pink-700' : c.method === 'nagad' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                        {c.method}
                      </span>
                    </div>
                    <p className="text-[9px] text-foundation-500">
                      {c.amount.toLocaleString()} BDT • {c.createdAt?.toDate ? format(c.createdAt.toDate(), 'MMM d, p') : 'Just now'}
                    </p>
                    <p className="text-[8px] text-foundation-400 font-mono mt-0.5">Ref: {c.transactionId}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {c.status === 'pending' && isAdmin ? (
                    <button 
                      onClick={() => approveContribution(c.id)}
                      className="text-[9px] font-bold bg-foundation-900 text-white px-3 py-1 rounded hover:bg-emerald-600 transition-colors"
                    >
                      Approve
                    </button>
                  ) : (
                    <span className={`text-[9px] font-bold ${c.status === 'approved' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {c.status === 'approved' ? 'Verified' : 'Pending'}
                    </span>
                  )}
                  <ExternalLink size={10} className="text-foundation-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </motion.div>
  );
}

function CheckoutGateway({ post, profile, onClose }: { post: Post, profile: UserProfile | null, onClose: () => void }) {
  const [step, setStep] = useState<'amount' | 'method' | 'process' | 'success'>('amount');
  const [amount, setAmount] = useState('500');
  const [method, setMethod] = useState<'bkash' | 'nagad' | 'bank' | 'cash'>('bkash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [trxId, setTrxId] = useState('');

  const handlePay = async () => {
    setStep('process');
    setIsProcessing(true);
    
    // Simulate gateway delay
    const simulatedTrx = 'HAJI' + Math.random().toString(36).substring(2, 10).toUpperCase();
    setTrxId(simulatedTrx);

    setTimeout(async () => {
      try {
        if (!profile) return;
        await addDoc(collection(db, 'contributions'), {
          postId: post.id,
          userId: profile.uid,
          userName: profile.displayName,
          userPhotoURL: profile.photoURL || '',
          amount: Number(amount),
          method,
          transactionId: simulatedTrx,
          status: 'pending',
          isPublic: profile.isPublicContribution ?? true,
          createdAt: serverTimestamp()
        });
        setStep('success');
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'contributions');
        onClose();
      } finally {
        setIsProcessing(false);
      }
    }, 2500);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-emerald-600 p-6 text-white text-center relative">
          <button onClick={onClose} className="absolute left-6 top-6 text-white/80 hover:text-white">
            <ArrowLeft size={20} />
          </button>
          <div className="flex justify-center mb-4">
            <ShieldCheck size={40} className="text-emerald-200" />
          </div>
          <h2 className="text-lg font-bold">Secure Payment Gateway</h2>
          <p className="text-[10px] text-emerald-100 uppercase tracking-widest font-mono mt-1">Founders Secure Checkout</p>
        </div>

        <div className="p-6">
          {step === 'amount' && (
            <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-6">
              <div className="text-center">
                <p className="text-xs text-foundation-500 mb-1">Total Contribution Amount</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl font-bold text-foundation-900">৳</span>
                  <input 
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="text-4xl font-bold text-foundation-900 w-32 border-none focus:ring-0 text-center bg-transparent"
                    autoFocus
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {['500', '1000', '2000', '5000', '10000', '25000'].map(val => (
                  <button 
                    key={val}
                    onClick={() => setAmount(val)}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all ${amount === val ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-foundation-50 border-foundation-200 text-foundation-600 hover:border-emerald-400'}`}
                  >
                    ৳ {val}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setStep('method')}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
              >
                Continue to Payment
              </button>
            </motion.div>
          )}

          {step === 'method' && (
            <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-4">
              <p className="text-xs font-bold text-foundation-500 uppercase tracking-widest text-center">Select Payment Method</p>
              
              <div className="space-y-3">
                {[
                  { id: 'bkash', name: 'Bkash', color: 'bg-pink-600', icon: '৳' },
                  { id: 'nagad', name: 'Nagad', color: 'bg-orange-600', icon: '৳' },
                  { id: 'bank', name: 'Bank Transfer', color: 'bg-indigo-600', icon: <Smartphone size={20} /> },
                  { id: 'cash', name: 'Cash / Other', color: 'bg-slate-700', icon: '৳' }
                ].map(m => (
                  <button 
                    key={m.id}
                    onClick={() => setMethod(m.id as any)}
                    className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${method === m.id ? 'border-emerald-600 bg-emerald-50' : 'border-foundation-100 hover:border-emerald-200'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`${m.color} text-white w-10 h-10 rounded-xl flex items-center justify-center font-bold`}>
                        {m.icon}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-foundation-900">{m.name}</p>
                        <p className="text-[10px] text-foundation-400">Secure Instant Pay</p>
                      </div>
                    </div>
                    {method === m.id && <CheckCircle2 className="text-emerald-600" size={24} />}
                  </button>
                ))}
              </div>

              <div className="pt-4 space-y-3">
                <div className="flex justify-between items-center bg-foundation-50 p-3 rounded-xl border border-foundation-100">
                  <span className="text-[10px] uppercase font-bold text-foundation-400">Payable Amount</span>
                  <span className="text-lg font-bold text-foundation-900">৳ {Number(amount).toLocaleString()}</span>
                </div>
                <button 
                  onClick={handlePay}
                  className="w-full py-4 bg-foundation-900 text-white rounded-2xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2"
                >
                  <Lock size={16} />
                  Authorize & Pay Now
                </button>
              </div>
            </motion.div>
          )}

          {step === 'process' && (
            <div className="py-12 text-center space-y-6">
              <div className="flex justify-center">
                <Loader2 size={60} className="text-emerald-600 animate-spin" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-foundation-900">Securing Transaction</h3>
                <p className="text-xs text-foundation-500">Connecting to {method.toUpperCase()} secure servers...</p>
              </div>
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 animate-pulse">
                <p className="text-[10px] font-mono text-emerald-800">Processing: {Number(amount).toLocaleString()} BDT</p>
              </div>
            </div>
          )}

          {step === 'success' && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-8 text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={48} />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-foundation-900">Haji Bari Foundaton</h3>
                <p className="text-sm font-medium text-emerald-600">Contribution Successfully Recorded!</p>
              </div>
              <div className="bg-foundation-50 p-6 rounded-2xl border border-foundation-100 space-y-3 text-left">
                <div className="flex justify-between border-b border-foundation-200 pb-2">
                  <span className="text-[10px] font-bold text-foundation-400 uppercase">Transaction ID</span>
                  <span className="text-[10px] font-mono font-bold text-foundation-900">{trxId}</span>
                </div>
                <div className="flex justify-between border-b border-foundation-200 pb-2">
                  <span className="text-[10px] font-bold text-foundation-400 uppercase">Amount Paid</span>
                  <span className="text-[10px] font-bold text-foundation-900">৳ {Number(amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] font-bold text-foundation-400 uppercase">Status</span>
                  <span className="text-[10px] font-bold text-amber-600">Pending Verification</span>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all"
              >
                Back to Projects
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function DirectMessageButton({ currentUser, targetUser, onStartChat }: { currentUser: UserProfile, targetUser: { uid: string, displayName: string, photoURL: string }, onStartChat: () => void }) {
  const [isStarting, setIsStarting] = useState(false);

  const handleStartChat = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isStarting) return;
    setIsStarting(true);
    try {
      const convId = currentUser.uid < targetUser.uid ? `${currentUser.uid}_${targetUser.uid}` : `${targetUser.uid}_${currentUser.uid}`;
      const snap = await getDoc(doc(db, 'conversations', convId));
      
      if (!snap.exists()) {
        await setDoc(doc(db, 'conversations', convId), {
          participants: [currentUser.uid, targetUser.uid],
          participantDetails: {
            [currentUser.uid]: { displayName: currentUser.displayName, photoURL: currentUser.photoURL || '' },
            [targetUser.uid]: { displayName: targetUser.displayName, photoURL: targetUser.photoURL || '' }
          },
          updatedAt: serverTimestamp()
        });
      }
      onStartChat();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'conversations');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <button 
      onClick={handleStartChat}
      disabled={isStarting}
      className="flex items-center gap-2 px-3 py-1.5 bg-foundation-100 hover:bg-indigo-600 text-foundation-700 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm active:scale-95 disabled:opacity-50 group"
      title="Start Chat"
    >
      <MessageCircle size={14} className="group-hover:rotate-12 transition-transform" />
      {isStarting ? 'Connecting...' : 'Chat'}
    </button>
  );
}

function Messenger({ profile, onStartCall }: { profile: UserProfile | null, onStartCall: (receiverId: string, type: 'voice' | 'video') => void }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [showChatSettings, setShowChatSettings] = useState(false);
  const [showConvMenu, setShowConvMenu] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Message | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showNewChat && searchQuery.trim().length >= 2) {
      const fetchSearch = async () => {
        setIsSearching(true);
        try {
          const q = query(
            collection(db, 'users'),
            where('email', '!=', ''), // Critical: Only users with email
            limit(50)
          );
          const snap = await getDocs(q);
          const filtered = snap.docs
            .map(d => d.data() as UserProfile)
            .filter(u => 
              u.uid !== profile?.uid && 
              (u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) || 
               u.email.toLowerCase().includes(searchQuery.toLowerCase()))
            );
          setSearchResults(filtered);
        } catch (err) {
          console.error(err);
        } finally {
          setIsSearching(false);
        }
      };
      const timer = setTimeout(fetchSearch, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, showNewChat, profile?.uid]);

  const { isRecording, startRecording, stopRecording, cancelRecording, audioBlob, recordingTime } = useAudioRecorder();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!profile) return;
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', profile.uid),
      orderBy('updatedAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setConversations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'conversations'));
    return () => unsubscribe();
  }, [profile]);

  useEffect(() => {
    if (!selectedConv) return;
    const q = query(
      collection(db, 'messages'),
      where('conversationId', '==', selectedConv.id),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
    }, (err) => handleFirestoreError(err, OperationType.GET, `messages/${selectedConv.id}`));
    return () => unsubscribe();
  }, [selectedConv]);

  useEffect(() => {
    if (audioBlob && selectedConv && profile) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        await sendMessage('audio', '[ভয়েস মেসেজ]', base64);
      };
      reader.readAsDataURL(audioBlob);
    }
  }, [audioBlob]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      let type: Message['type'] = 'file';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';
      else if (file.type.startsWith('audio/')) type = 'audio';
      
      sendMessage(type, `[${type}] ${file.name}`, reader.result as string, {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);
  };

  const sendMessage = async (type: Message['type'] = 'text', content: string = newMessage, mediaUrl?: string, extraData: Partial<Message> = {}) => {
    if (!content.trim() && !mediaUrl) return;
    if (!selectedConv || !profile || isSending) return;
    setIsSending(true);
    try {
      const msgData = {
        conversationId: selectedConv.id,
        senderId: profile.uid,
        content: content,
        type: type,
        mediaUrl: mediaUrl || null,
        ...extraData,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'messages'), msgData);
      await updateDoc(doc(db, 'conversations', selectedConv.id), {
        lastMessage: type === 'text' ? content : `[${type}] ${extraData.fileName || ''}`,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setNewMessage('');
      setShowMediaMenu(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'messages');
    } finally {
      setIsSending(false);
    }
  };

  const handleUpdateMessage = async (messageId: string, data: Partial<Message>) => {
    try {
      await updateDoc(doc(db, 'messages', messageId), data);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `messages/${messageId}`);
    }
  };

  const handleReact = async (messageId: string, emoji: string) => {
    if (!profile) return;
    try {
      await updateDoc(doc(db, 'messages', messageId), {
        [`reactions.${profile.uid}`]: emoji
      });
    } catch (err) {
      console.error('Failed to react:', err);
    }
  };

  const otherUid = selectedConv ? selectedConv.participants.find(id => id !== profile?.uid) : null;
  const otherUser = otherUid && selectedConv ? selectedConv.participantDetails?.[otherUid] : null;

  if (!profile) return null;

  return (
    <div className="bg-white rounded-3xl shadow-2xl border border-foundation-200 overflow-hidden flex h-[700px] font-sans">
      {/* Sidebar */}
      <div className="w-80 border-r border-foundation-200 flex flex-col bg-foundation-50/30">
        <div className="p-6 border-b border-foundation-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-snap-yellow rounded-xl flex items-center justify-center shadow-sm">
                <Bot size={24} className="text-foundation-900" />
             </div>
             <h3 className="font-display font-black text-foundation-900 text-lg uppercase tracking-wider italic">Chats</h3>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowNewChat(true)}
              className="p-2 bg-snap-blue text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"
              title="New Chat"
            >
              <Plus size={20} />
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowChatSettings(!showChatSettings)}
                className={`p-2 rounded-full transition-all ${showChatSettings ? 'bg-snap-yellow text-foundation-900 shadow-lg' : 'bg-foundation-100 hover:bg-snap-yellow'}`}
              >
                 <MoreHorizontal size={20} />
              </button>
            <AnimatePresence>
              {showChatSettings && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowChatSettings(false)} />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 mt-3 w-56 bg-white border border-foundation-200 rounded-2xl shadow-2xl z-30 py-3 overflow-hidden origin-top-right"
                  >
                    <div className="px-4 py-1 mb-2 border-b border-foundation-100 flex items-center justify-between">
                       <span className="text-[8px] font-black uppercase tracking-[0.2em] text-foundation-400">Settings</span>
                       <div className="w-1.5 h-1.5 bg-snap-yellow rounded-full shadow-[0_0_8px_rgba(255,252,0,0.8)]" />
                    </div>
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-black text-foundation-600 hover:bg-foundation-50 transition-all uppercase tracking-widest group">
                       <div className="w-8 h-8 rounded-xl bg-foundation-50 flex items-center justify-center group-hover:bg-foundation-100 transition-colors">
                          <Settings2 size={14} />
                       </div>
                       Chat Preferences
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-black text-foundation-600 hover:bg-foundation-50 transition-all uppercase tracking-widest group">
                       <div className="w-8 h-8 rounded-xl bg-foundation-50 flex items-center justify-center group-hover:bg-foundation-100 transition-colors">
                          <UserPlus size={14} />
                       </div>
                       Invite Friends
                    </button>
                    <div className="mx-4 my-2 border-t border-foundation-100" />
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-black text-rose-500 hover:bg-rose-50 transition-all uppercase tracking-widest group">
                       <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center group-hover:bg-rose-100 transition-colors">
                          <Flag size={14} />
                       </div>
                       Report Issue
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
        
      <AnimatePresence>
          {showNewChat && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="p-4 border-b border-foundation-200 bg-white space-y-4"
            >
              <div className="flex justify-between items-center px-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-foundation-400">New Chat with Email User</p>
                <button onClick={() => setShowNewChat(false)}><X size={16} className="text-foundation-400" /></button>
              </div>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foundation-400" />
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Search members by email..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-foundation-50 rounded-xl py-2 pl-9 pr-4 text-xs focus:ring-2 focus:ring-snap-blue outline-none border border-foundation-100 font-bold"
                />
              </div>
              
              <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                {isSearching && (
                  <div className="p-4 text-center">
                    <Loader2 size={16} className="animate-spin mx-auto text-foundation-400" />
                  </div>
                )}
                {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
                   <p className="text-[10px] text-center text-foundation-400 py-4 uppercase font-black tracking-widest">No verified member found</p>
                )}
                {searchResults.map(user => (
                   <button 
                     key={user.uid}
                     onClick={async () => {
                       const convId = profile.uid < user.uid ? `${profile.uid}_${user.uid}` : `${user.uid}_${profile.uid}`;
                       const snap = await getDoc(doc(db, 'conversations', convId));
                       if (!snap.exists()) {
                         await setDoc(doc(db, 'conversations', convId), {
                           participants: [profile.uid, user.uid],
                           participantDetails: {
                             [profile.uid]: { displayName: profile.displayName, photoURL: profile.photoURL || '' },
                             [user.uid]: { displayName: user.displayName, photoURL: user.photoURL || '' }
                           },
                           updatedAt: serverTimestamp()
                         });
                       }
                       setShowNewChat(false);
                       setSearchQuery('');
                     }}
                     className="w-full flex items-center gap-3 p-2 hover:bg-foundation-50 rounded-xl transition-colors text-left"
                   >
                     <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} className="w-8 h-8 rounded-lg object-cover" alt="" />
                     <div className="min-w-0">
                       <p className="text-xs font-black text-foundation-900 truncate">{user.displayName}</p>
                       <p className="text-[9px] text-foundation-400 truncate tracking-tight">{user.email}</p>
                     </div>
                   </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {conversations.length === 0 && (
            <div className="p-12 text-center">
               <div className="w-16 h-16 bg-foundation-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-foundation-300 rotate-3">
                  <Mail size={32} />
               </div>
               <p className="text-[10px] uppercase font-black text-foundation-400 tracking-[0.2em]">Start a connection</p>
            </div>
          )}
          {conversations.map(conv => {
            const cOtherUid = conv.participants.find(id => id !== profile.uid)!;
            const cOtherUser = conv.participantDetails?.[cOtherUid];
            const isSelected = selectedConv?.id === conv.id;
            return (
              <button 
                key={conv.id}
                onClick={() => setSelectedConv(conv)}
                className={`w-full p-4 text-left transition-all flex items-center gap-4 rounded-2xl ${isSelected ? 'bg-white shadow-xl scale-[1.02] ring-1 ring-foundation-200' : 'hover:bg-foundation-100/50'}`}
              >
                <div className="relative">
                  <img src={cOtherUser?.photoURL || `https://ui-avatars.com/api/?name=${cOtherUser?.displayName}`} className="w-14 h-14 rounded-2xl border-2 border-white shadow-sm object-cover" alt="" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-lg border-2 border-white shadow-sm"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm font-black text-foundation-900 truncate uppercase tracking-tight">{cOtherUser?.displayName}</p>
                    {conv.updatedAt && (
                      <span className="text-[9px] text-foundation-400 font-bold">{format(conv.updatedAt.toDate ? conv.updatedAt.toDate() : new Date(), 'p')}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-foundation-500 truncate leading-snug font-medium italic">{conv.lastMessage || 'New connection'}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white relative">
        {selectedConv ? (
          <>
            {/* Chat Header */}
            <div className="p-5 border-b border-foundation-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-20">
               <div className="flex items-center gap-4">
                  <img 
                    src={otherUser?.photoURL || undefined} 
                    className="w-12 h-12 rounded-2xl border-2 border-snap-blue shadow-sm object-cover" 
                    alt="" 
                  />
                  <div>
                    <span className="font-black text-foundation-900 text-base uppercase tracking-wider italic block">{otherUser?.displayName}</span>
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                       <span className="text-[10px] text-foundation-400 font-bold uppercase tracking-widest">Active now</span>
                    </div>
                  </div>
               </div>
               <div className="flex items-center gap-3">
                  <button 
                    onClick={() => otherUid && onStartCall(otherUid, 'voice')}
                    className="w-12 h-12 rounded-2xl bg-foundation-50 text-foundation-500 hover:bg-snap-blue hover:text-white transition-all shadow-sm flex items-center justify-center p-0"
                  >
                    <Phone size={22} />
                  </button>
                  <button 
                    onClick={() => otherUid && onStartCall(otherUid, 'video')}
                    className="w-12 h-12 rounded-2xl bg-foundation-50 text-foundation-500 hover:bg-snap-purple hover:text-white transition-all shadow-sm flex items-center justify-center p-0"
                  >
                    <Video size={22} />
                  </button>
                  <div className="relative">
                    <button 
                      onClick={() => setShowConvMenu(!showConvMenu)}
                      className={`w-12 h-12 rounded-2xl border-2 transition-all flex items-center justify-center ${showConvMenu ? 'bg-foundation-900 border-foundation-900 text-white shadow-xl' : 'bg-white border-foundation-100 text-foundation-400 hover:border-foundation-200 hover:text-foundation-900'}`}
                    >
                      <MoreVertical size={20} />
                    </button>
                    <AnimatePresence>
                      {showConvMenu && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setShowConvMenu(false)} />
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            className="absolute right-0 mt-3 w-64 bg-white/95 backdrop-blur-md border border-foundation-200 rounded-3xl shadow-2xl z-30 py-4 overflow-hidden origin-top-right"
                          >
                             <div className="px-6 py-2 mb-2 border-b border-foundation-50 space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-foundation-400">Manage Chat</p>
                                <p className="text-sm font-black text-foundation-900 truncate">{otherUser?.displayName}</p>
                             </div>
                             <div className="p-2 space-y-1">
                                <button className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black text-foundation-600 hover:bg-foundation-50 hover:text-snap-blue transition-all uppercase tracking-[0.15em] rounded-2xl group">
                                   <div className="w-10 h-10 rounded-xl bg-foundation-50 flex items-center justify-center group-hover:bg-snap-blue/10">
                                      <UserIcon size={16} />
                                   </div>
                                   View Profile
                                </button>
                                <button className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black text-foundation-600 hover:bg-foundation-50 transition-all uppercase tracking-[0.15em] rounded-2xl group">
                                   <div className="w-10 h-10 rounded-xl bg-foundation-50 flex items-center justify-center group-hover:bg-foundation-100">
                                      <Bell size={16} />
                                   </div>
                                   Mute Session
                                </button>
                                <button className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black text-foundation-600 hover:bg-foundation-50 transition-all uppercase tracking-[0.15em] rounded-2xl group">
                                   <div className="w-10 h-10 rounded-xl bg-foundation-50 flex items-center justify-center group-hover:bg-foundation-100">
                                      <Clock size={16} />
                                   </div>
                                   Chat History
                                </button>
                                <div className="mx-4 my-2 border-t border-foundation-50" />
                                <button className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black text-rose-500 hover:bg-rose-50 transition-all uppercase tracking-[0.15em] rounded-2xl group">
                                   <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center group-hover:bg-rose-100">
                                      <Trash2 size={16} />
                                   </div>
                                   Clear Conversation
                                </button>
                             </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
               </div>
            </div>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-2 bg-[#F6F7F9] custom-scrollbar"
            >
              {messages.map((msg, idx) => {
                const isMine = msg.senderId === profile.uid;
                const prevMsg = messages[idx - 1];
                const showHeader = !prevMsg || prevMsg.senderId !== msg.senderId || 
                                (msg.createdAt?.toDate && prevMsg.createdAt?.toDate && 
                                 msg.createdAt.toDate().getTime() - prevMsg.createdAt.toDate().getTime() > 300000);

                return (
                  <MessageBubble 
                    key={msg.id} 
                    msg={msg} 
                    isMine={isMine} 
                    otherUser={otherUser} 
                    showHeader={showHeader}
                    onReact={(emoji) => handleReact(msg.id, emoji)} 
                    onUpdate={(data) => handleUpdateMessage(msg.id, data)}
                    onPreview={() => setPreviewDoc(msg)}
                  />
                );
              })}
              <div id="messages-end"></div>
            </div>

            {/* Floating Action Menu */}
            <AnimatePresence>
              {showMediaMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-24 left-6 z-40 flex gap-4"
                >
                  <MediaButton icon={<ImageIcon size={22} />} label="Gallery" color="bg-emerald-500" onClick={() => fileInputRef.current?.click()} />
                  <MediaButton icon={<Camera size={22} />} label="Snap" color="bg-snap-yellow !text-black" onClick={() => {}} />
                  <MediaButton icon={<FileText size={22} />} label="Doc" color="bg-snap-blue" onClick={() => fileInputRef.current?.click()} />
                </motion.div>
              )}
            </AnimatePresence>

            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />

            {/* Input Footer */}
            <div className="p-4 bg-white border-t border-foundation-100">
               <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setShowMediaMenu(!showMediaMenu)}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${showMediaMenu ? 'bg-foundation-900 text-white' : 'bg-foundation-100 text-foundation-500'}`}
                  >
                     {showMediaMenu ? <Plus size={24} className="rotate-45" /> : <Paperclip size={24} />}
                  </button>
                  
                  <div className="flex-1 bg-foundation-100 py-3 px-5 rounded-2xl border-2 border-transparent focus-within:border-snap-blue transition-all relative">
                     <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex items-center gap-3">
                        <button type="button" className="text-foundation-400 hover:text-snap-purple transition-colors">
                           <Smile size={22} />
                        </button>
                        <input 
                          value={newMessage}
                          onChange={e => setNewMessage(e.target.value)}
                          placeholder="Say something..."
                          className="flex-1 bg-transparent text-sm font-bold placeholder-foundation-400 outline-none"
                        />
                        {newMessage.trim() ? (
                          <button type="submit" className="text-snap-blue hover:scale-110 transition-transform">
                             <Send size={24} />
                          </button>
                        ) : (
                          <div className="flex items-center">
                             <RecordingButton 
                               isRecording={isRecording} 
                               onStart={startRecording} 
                               onEnd={stopRecording} 
                             />
                          </div>
                        )}
                     </form>
                     
                     {isRecording && (
                       <motion.div 
                         initial={{ opacity: 0, scale: 0.9 }}
                         animate={{ opacity: 1, scale: 1 }}
                         className="absolute inset-0 bg-snap-purple rounded-2xl flex items-center px-6 gap-4 text-white"
                       >
                          <div className="animate-pulse w-3 h-3 bg-red-400 rounded-full"></div>
                          <span className="font-mono text-sm">{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
                          <div className="flex-1 overflow-hidden">
                             <div className="flex gap-0.5 items-center">
                               {[...Array(12)].map((_, i) => (
                                 <motion.div 
                                   key={i}
                                   animate={{ height: [4, Math.random() * 20 + 4, 4] }}
                                   transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.05 }}
                                   className="w-1 bg-white/50 rounded-full"
                                 />
                               ))}
                             </div>
                          </div>
                          <button onClick={cancelRecording} className="text-[10px] font-black uppercase tracking-widest text-white/70 hover:text-white">Slide to cancel «</button>
                       </motion.div>
                     )}
                  </div>
               </div>
            </div>
            <AnimatePresence>
              {previewDoc && (
                <DocumentViewer 
                  doc={previewDoc} 
                  onClose={() => setPreviewDoc(null)} 
                />
              )}
            </AnimatePresence>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-foundation-400 p-12 bg-foundation-50/20">
             <motion.div 
               animate={{ y: [0, -10, 0] }}
               transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
               className="w-32 h-32 bg-snap-yellow rounded-[2.5rem] flex items-center justify-center shadow-2xl mb-12 relative"
             >
                <Bot size={64} className="text-foundation-900" />
                <div className="absolute -top-4 -right-4 w-12 h-12 bg-snap-blue rounded-2xl flex items-center justify-center text-white shadow-lg rotate-12">
                   <MessageCircle size={24} />
                </div>
             </motion.div>
             <h2 className="text-2xl font-display font-black text-foundation-900 uppercase tracking-[0.2em] italic text-center mb-4">Your Connections</h2>
             <p className="text-sm text-foundation-500 font-medium max-w-[280px] text-center mb-8 leading-relaxed">
                Connect with members in real-time through voice, video, and snaps.
             </p>
             <button className="px-10 py-4 bg-foundation-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-black transition-all shadow-xl active:scale-95 flex items-center gap-3">
                <Plus size={18} /> New Message
             </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MediaButton({ icon, label, color, onClick }: { icon: any, label: string, color: string, onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 group">
       <div className={`${color} w-14 h-14 rounded-2xl text-white flex items-center justify-center shadow-lg group-hover:scale-110 group-active:scale-95 transition-all`}>
          {icon}
       </div>
       <span className="text-[10px] font-black uppercase tracking-widest text-foundation-600 group-hover:text-foundation-900 transition-colors">{label}</span>
    </button>
  );
}

function RecordingButton({ isRecording, onStart, onEnd }: { isRecording: boolean, onStart: () => void, onEnd: () => void }) {
  return (
    <button 
      onMouseDown={onStart}
      onMouseUp={onEnd}
      onTouchStart={onStart}
      onTouchEnd={onEnd}
      className={`p-2 transition-all duration-300 ${isRecording ? 'text-snap-purple scale-150' : 'text-foundation-400 hover:text-snap-blue'}`}
    >
       <Mic size={24} />
    </button>
  );
}

function DocumentViewer({ doc, onClose }: { doc: Message, onClose: () => void }) {
  const isPDF = doc.mimeType === 'application/pdf';
  const isOffice = doc.mimeType?.includes('officedocument') || doc.mimeType?.includes('ms-excel') || doc.mimeType?.includes('ms-powerpoint') || doc.mimeType?.includes('msword');
  
  // For Office docs, we need a public URL for Google/MS viewers.
  // Since we have base64, we'll try to create a temporary Blob URL if possible, 
  // but Google Viewers won't work with local Blob URLs.
  // We'll show a friendly message if we can't preview.
  
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (doc.mediaUrl && (isPDF || doc.type === 'file')) {
      const fetchBlob = async () => {
        const response = await fetch(doc.mediaUrl!);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
      };
      fetchBlob();
    }
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [doc.mediaUrl]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col"
    >
      <div className="p-4 flex items-center justify-between text-white border-b border-white/10 bg-black/50">
        <div className="flex items-center gap-3">
           <FileText size={24} className="text-snap-yellow" />
           <div>
              <p className="text-sm font-black uppercase tracking-wider italic">{doc.fileName || 'Untitled Document'}</p>
              <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest">{doc.mimeType || 'Unknown Type'}</p>
           </div>
        </div>
        <div className="flex items-center gap-4">
           {doc.mediaUrl && (
             <a 
               href={doc.mediaUrl} 
               download={doc.fileName}
               className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
             >
                <Download size={20} />
             </a>
           )}
           <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
              <X size={20} />
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative bg-foundation-900/50">
        {isPDF && blobUrl ? (
          <iframe 
            src={`${blobUrl}#toolbar=0`} 
            className="w-full h-full border-none"
            title="PDF Preview"
            sandbox="allow-scripts allow-same-origin"
          />
        ) : isOffice ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center text-white space-y-6">
             <div className="w-24 h-24 bg-snap-blue rounded-[2.5rem] flex items-center justify-center shadow-2xl relative">
                <File size={48} />
                <div className="absolute -top-4 -right-4 w-12 h-12 bg-snap-yellow rounded-2xl flex items-center justify-center text-black shadow-lg">
                   <Lock size={24} />
                </div>
             </div>
             <div className="space-y-4 max-w-md">
                <h3 className="text-xl font-display font-black uppercase tracking-widest italic">Confidential File</h3>
                <p className="text-sm text-white/60 leading-relaxed">
                  Office documents require a public URL for full cloud previewing. For security, we've kept this file isolated.
                </p>
                <div className="flex flex-col gap-2 pt-4">
                   <a 
                     href={doc.mediaUrl} 
                     download={doc.fileName}
                     className="px-8 py-3 bg-white text-foundation-900 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-snap-yellow transition-all flex items-center justify-center gap-2"
                   >
                      <Download size={16} /> Open & Download
                   </a>
                </div>
             </div>
          </div>
        ) : doc.type === 'image' ? (
           <div className="w-full h-full flex items-center justify-center p-4">
              <img src={doc.mediaUrl} className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" alt="" />
           </div>
        ) : doc.type === 'video' ? (
           <div className="w-full h-full flex items-center justify-center p-4">
              <video src={doc.mediaUrl} controls autoPlay className="max-w-full max-h-full rounded-lg shadow-2xl" />
           </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/50 italic text-sm">
             Preview not supported for this file type.
          </div>
        )}
      </div>
    </motion.div>
  );
}

function MessageBubble({ msg, isMine, otherUser, onReact, showHeader, onUpdate, onPreview }: { 
  msg: Message, 
  isMine: boolean, 
  otherUser: any, 
  onReact: (emoji: string) => any, 
  showHeader: boolean, 
  onUpdate: (data: Partial<Message>) => any, 
  onPreview?: () => void,
  key?: any
}) {
  const [showReactions, setShowReactions] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const timerRef = useRef<number | null>(null);

  const emojiList = ['❤️', '😂', '😮', '😢', '🔥', '👍'];

  const handleTouchStart = () => {
    timerRef.current = window.setTimeout(() => {
      setShowReactions(true);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return (
    <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} ${showHeader ? 'mt-4' : 'mt-0.5'}`}>
      {!isMine && showHeader && (
        <span className="text-[9px] font-black text-foundation-400 uppercase tracking-widest mb-1 ml-11">
          {otherUser?.displayName}
        </span>
      )}
      <div 
        className={`flex items-end gap-2 group max-w-[85%] ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {!isMine && (
          <div className="w-8 h-8 flex-shrink-0">
             {showHeader ? (
               <img src={otherUser?.photoURL} className="w-8 h-8 rounded-xl object-cover border-2 border-white shadow-sm" alt="" />
             ) : null}
          </div>
        )}
        
        <div className="relative">
          <motion.div 
            whileTap={{ scale: 0.98 }}
            className={`p-3.5 shadow-sm text-sm font-medium leading-relaxed transition-all relative ${
              isMine 
                ? 'bg-snap-blue text-white rounded-3xl rounded-br-[0.25rem] shadow-snap-blue/10' 
                : 'bg-white text-foundation-900 border border-foundation-200 rounded-3xl rounded-bl-[0.25rem]'
            }`}
          >
            {msg.type === 'audio' && msg.mediaUrl && (
              <div className="space-y-3">
                <div className={isMine ? 'text-white' : 'text-indigo-600'}>
                  <AudioPlayer src={msg.mediaUrl} />
                </div>
                {msg.transcription ? (
                  <div className={`p-4 rounded-2xl text-[13px] leading-relaxed relative group/trans ${isMine ? 'bg-white/10 text-white/90' : 'bg-foundation-50 text-foundation-700 border border-foundation-200'}`}>
                    <div className="flex items-center gap-2 mb-2 opacity-50">
                       <Bot size={14} />
                       <span className="text-[10px] font-black uppercase tracking-widest">Transcription</span>
                    </div>
                    <p className="whitespace-pre-wrap font-medium">{msg.transcription}</p>
                    <button 
                      onClick={async () => {
                        setIsTranscribing(true);
                        const text = await transcribeAudio(msg.mediaUrl!);
                        if (text) onUpdate({ transcription: text });
                        setIsTranscribing(false);
                      }}
                      className="absolute top-3 right-3 opacity-0 group-hover/trans:opacity-100 transition-opacity p-1 hover:bg-foundation-200 rounded-lg text-foundation-400"
                    >
                      <RefreshCw size={14} className={isTranscribing ? 'animate-spin' : ''} />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={async () => {
                      setIsTranscribing(true);
                      const text = await transcribeAudio(msg.mediaUrl!);
                      if (text) onUpdate({ transcription: text });
                      setIsTranscribing(false);
                    }}
                    disabled={isTranscribing}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      isMine 
                        ? 'bg-white/20 text-white hover:bg-white/30' 
                        : 'bg-foundation-100 text-foundation-600 hover:bg-foundation-200'
                    }`}
                  >
                    {isTranscribing ? <RefreshCw size={14} className="animate-spin" /> : <Bot size={14} />}
                    {isTranscribing ? 'Transcribing...' : 'Convert to Text'}
                  </button>
                )}
              </div>
            )}
            {msg.type === 'image' && msg.mediaUrl && (
              <img 
                onClick={onPreview}
                src={msg.mediaUrl} 
                className="rounded-2xl max-h-72 w-full object-cover shadow-sm bg-foundation-100 cursor-pointer hover:opacity-90 transition-opacity" 
                alt="Snapped image" 
              />
            )}
            {msg.type === 'video' && msg.mediaUrl && (
              <div 
                onClick={onPreview}
                className="rounded-2xl overflow-hidden cursor-pointer relative group bg-black"
                style={{ maxHeight: '280px' }}
              >
                 <video src={msg.mediaUrl} className="w-full h-full object-cover opacity-80" />
                 <div className="absolute inset-0 flex items-center justify-center text-white scale-90 group-hover:scale-100 transition-transform">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                       <Play size={24} fill="white" />
                    </div>
                 </div>
              </div>
            )}
            {msg.type === 'file' && (
              <div 
                onClick={onPreview}
                className={`p-1 rounded-2xl cursor-pointer hover:bg-black/5 transition-all flex items-center gap-3 min-w-[200px] ${isMine ? 'text-white' : 'text-foundation-900'}`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${isMine ? 'bg-white/20' : 'bg-foundation-100'}`}>
                  <FileText size={24} />
                </div>
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-[11px] font-black uppercase tracking-wider truncate mb-0.5">{msg.fileName || 'Document'}</p>
                  <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">{msg.fileSize ? `${(msg.fileSize / 1024).toFixed(1)} KB` : 'File'}</p>
                </div>
                <div className={`p-2 rounded-lg ${isMine ? 'bg-white/10' : 'bg-foundation-50'}`}>
                   <Eye size={16} />
                </div>
              </div>
            )}
            {msg.type === 'text' && <p className="whitespace-pre-wrap">{msg.content}</p>}
          </motion.div>
          
          <AnimatePresence>
            {showReactions && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                animate={{ opacity: 1, y: -45, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.8 }}
                className="absolute left-1/2 -translate-x-1/2 z-50 bg-white/95 backdrop-blur-xl rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.15)] p-1.5 flex gap-1.5 border border-foundation-100"
                onMouseLeave={() => setShowReactions(false)}
              >
                {emojiList.map(emoji => (
                  <button 
                    key={emoji}
                    onClick={() => { onReact(emoji); setShowReactions(false); }}
                    className="hover:scale-150 transition-transform p-1.5 active:animate-ping"
                  >
                    {emoji}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
             <div className={`absolute -bottom-2 ${isMine ? 'left-0' : 'right-0'} flex -space-x-1`}>
                {Object.entries(msg.reactions).map(([uid, emoji]) => (
                   <div key={uid} className="bg-white rounded-full shadow-lg border border-foundation-100 px-1.5 py-0.5 text-[10px] animate-in zoom-in slide-in-from-bottom-1">
                      {emoji}
                   </div>
                ))}
             </div>
          )}
        </div>
        
        {isMine && <button className="opacity-0 group-hover:opacity-100 p-1.5 text-foundation-300 hover:text-foundation-900 transition-all"><X size={14} /></button>}
      </div>
    </div>
  );
}


function Subscriptions({ profile }: { profile: UserProfile | null }) {
  return (
    <div className="space-y-6">
      <div className="bg-foundation-900 text-white p-12 rounded-3xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-foundation-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative">
          <h3 className="text-3xl font-display mb-2">Benevolent Fund</h3>
          <p className="text-foundation-400 text-sm">Monthly Subscription: 100 BDT</p>
          
          <div className="mt-8 grid grid-cols-3 gap-8">
            <div>
              <p className="text-[10px] text-foundation-500 uppercase tracking-[0.2em] mb-1 font-bold">Total Contribution</p>
              <p className="text-2xl font-display">0 <span className="text-xs text-foundation-400">BDT</span></p>
            </div>
            <div>
              <p className="text-[10px] text-foundation-500 uppercase tracking-[0.2em] mb-1 font-bold">Current Status</p>
              <p className="text-2xl font-display text-foundation-400 italic">Clear</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-foundation-300 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-foundation-300 flex items-center justify-between">
          <h4 className="font-display font-medium text-lg">Transaction History</h4>
          <button className="text-xs font-bold text-foundation-600 hover:text-foundation-900 transition-colors underline">Download Statement</button>
        </div>
        <div className="p-12 text-center text-foundation-400 italic">
          <Heart className="mx-auto mb-4 opacity-10" size={48} />
          <p>No recent contributions found in your records.</p>
        </div>
      </div>
    </div>
  );
}
