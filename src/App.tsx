import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Settings, MapPin, Calendar, Heart, MessageCircle, Sparkles, Camera, Pencil, X, LogOut, 
  Github, Twitter, Instagram, Globe, Trash2, Image as ImageIcon, Send, Home, Users, User, 
  Menu, Search, UserPlus, UserCheck, Clock, Shield, BadgeCheck, Plus, UsersRound, Video, Music, ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from './firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp, collection, query, orderBy, addDoc, updateDoc, deleteDoc, increment, where, getDocs } from 'firebase/firestore';

// --- Error Handling ---
enum OperationType { CREATE = 'create', UPDATE = 'update', DELETE = 'delete', LIST = 'list', GET = 'get', WRITE = 'write' }
interface FirestoreErrorInfo {
  error: string; operationType: OperationType; path: string | null;
  authInfo: { userId: string | undefined; email: string | null | undefined; emailVerified: boolean | undefined; isAnonymous: boolean | undefined; tenantId: string | null | undefined; providerInfo: any[]; }
}
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid, email: auth.currentUser?.email, emailVerified: auth.currentUser?.emailVerified, isAnonymous: auth.currentUser?.isAnonymous, tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(p => ({ providerId: p.providerId, displayName: p.displayName, email: p.email, photoUrl: p.photoURL })) || []
    },
    operationType, path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // In a real app, we might show a toast here.
}

type TabType = 'feed' | 'friends' | 'messages' | 'communities' | 'profile';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  
  // Navigation
  const [activeTab, setActiveTab] = useState<TabType>('feed');
  const [feedTab, setFeedTab] = useState<'friends' | 'global'>('friends');
  const [friendsTab, setFriendsTab] = useState<'all' | 'online' | 'requests'>('all');
  const [activeCommunityId, setActiveCommunityId] = useState<string | null>(null);
  const [isNavOpen, setIsNavOpen] = useState(false);

  // Global Data
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);

  // Feed State
  const [newPostText, setNewPostText] = useState('');
  const [newPostImage, setNewPostImage] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Friends State
  const [friendSearch, setFriendSearch] = useState('');

  // Messages State
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [messageSearch, setMessageSearch] = useState('');

  // Communities State
  const [isCreateCommunityModalOpen, setIsCreateCommunityModalOpen] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState('');
  const [newCommunityUsername, setNewCommunityUsername] = useState('');
  const [newCommunityDesc, setNewCommunityDesc] = useState('');

  // Profile State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', username: '', location: '', status: '', github: '', twitter: '', instagram: '', website: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Admin Panel State
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<'users' | 'communities'>('users');

  // --- Auth & Presence ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (currentUser) {
        // Update online status
        const userRef = doc(db, 'users', currentUser.uid);
        try {
          await updateDoc(userRef, { isOnline: true, lastSeen: serverTimestamp() });
        } catch (e) { /* might fail if user doc doesn't exist yet */ }
      }
    });
    return () => unsubscribe();
  }, []);

  // Handle beforeunload for offline status
  useEffect(() => {
    const handleUnload = () => {
      if (user) {
        // Note: this is a best-effort approach. Realtime DB is better for presence.
        const userRef = doc(db, 'users', user.uid);
        updateDoc(userRef, { isOnline: false, lastSeen: serverTimestamp() }).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [user]);

  // --- Data Fetching ---
  useEffect(() => {
    if (!isAuthReady || !user) return;

    // Current User Profile
    const userUnsub = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setCurrentUserData(docSnap.data());
      } else {
        const initialData = {
          uid: user.uid,
          name: user.displayName || 'New User',
          username: user.email?.split('@')[0] || 'user',
          location: '', status: 'Привет! Я использую Jagooars 🐆',
          profileImage: user.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jaguar',
          coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop',
          isOnline: true, lastSeen: serverTimestamp(),
          isAdmin: false, isVerified: false,
          createdAt: serverTimestamp()
        };
        setDoc(doc(db, 'users', user.uid), initialData).catch(e => handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}`));
      }
    }, e => handleFirestoreError(e, OperationType.GET, `users/${user.uid}`));

    // All Users (for search/friends)
    const usersUnsub = onSnapshot(collection(db, 'users'), (snap) => {
      setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, e => handleFirestoreError(e, OperationType.LIST, 'users'));

    // Posts
    const postsUnsub = onSnapshot(query(collection(db, 'posts'), orderBy('createdAt', 'desc')), (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, e => handleFirestoreError(e, OperationType.LIST, 'posts'));

    // Friends
    const friendsUnsub = onSnapshot(collection(db, 'friends'), (snap) => {
      setFriends(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(f => f.user1 === user.uid || f.user2 === user.uid));
    }, e => handleFirestoreError(e, OperationType.LIST, 'friends'));

    // Chats
    const chatsUnsub = onSnapshot(query(collection(db, 'chats'), where('participants', 'array-contains', user.uid)), (snap) => {
      const fetchedChats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      fetchedChats.sort((a: any, b: any) => {
        const timeA = a.updatedAt?.toMillis() || 0;
        const timeB = b.updatedAt?.toMillis() || 0;
        return timeB - timeA;
      });
      setChats(fetchedChats);
    }, e => handleFirestoreError(e, OperationType.LIST, 'chats'));

    // Communities
    const commUnsub = onSnapshot(query(collection(db, 'communities'), orderBy('createdAt', 'desc')), (snap) => {
      setCommunities(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, e => handleFirestoreError(e, OperationType.LIST, 'communities'));

    // Memberships
    const memUnsub = onSnapshot(collection(db, 'communityMembers'), (snap) => {
      setMemberships(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, e => handleFirestoreError(e, OperationType.LIST, 'communityMembers'));

    return () => { userUnsub(); usersUnsub(); postsUnsub(); friendsUnsub(); chatsUnsub(); commUnsub(); memUnsub(); };
  }, [user, isAuthReady]);

  // Fetch Messages for Active Chat
  useEffect(() => {
    if (!activeChatId) return;
    const q = query(collection(db, `chats/${activeChatId}/messages`), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setChatMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, e => handleFirestoreError(e, OperationType.LIST, `chats/${activeChatId}/messages`));
    return () => unsub();
  }, [activeChatId]);

  // --- Actions ---
  const handleLogin = async () => {
    setLoginError(null);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error: any) {
      setLoginError(error.message || "Произошла ошибка при авторизации.");
    }
  };

  const handleLogout = async () => {
    if (user) {
      await updateDoc(doc(db, 'users', user.uid), { isOnline: false, lastSeen: serverTimestamp() }).catch(()=>{});
    }
    await signOut(auth);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover' | 'post') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        if (type === 'post') { setNewPostImage(base64String); return; }
        if (!user) return;
        try {
          await updateDoc(doc(db, 'users', user.uid), { [type === 'profile' ? 'profileImage' : 'coverImage']: base64String });
        } catch (error) { handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`); }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePost = async () => {
    if (!user || (!newPostText.trim() && !newPostImage) || !currentUserData || currentUserData.isFrozen || currentUserData.isMuted) return;
    setIsPosting(true);
    try {
      await addDoc(collection(db, 'posts'), {
        userId: user.uid, authorName: currentUserData.name, authorUsername: currentUserData.username,
        authorImage: currentUserData.profileImage, text: newPostText.trim(), image: newPostImage,
        likes: 0, comments: 0, createdAt: serverTimestamp()
      });
      setNewPostText(''); setNewPostImage('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) { handleFirestoreError(error, OperationType.CREATE, 'posts'); } 
    finally { setIsPosting(false); }
  };

  const handleLikePost = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || currentUserData?.isFrozen) return;
    try { await updateDoc(doc(db, 'posts', postId), { likes: increment(1) }); } 
    catch (error) { handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`); }
  };

  const handleDeletePost = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || currentUserData?.isFrozen) return;
    try { await deleteDoc(doc(db, 'posts', postId)); } 
    catch (error) { handleFirestoreError(error, OperationType.DELETE, `posts/${postId}`); }
  };

  const checkUsernameUnique = async (username: string, currentId?: string) => {
    const cleanUsername = username.replace(/^@/, '').trim();
    if (!cleanUsername) return false;
    
    // Check users
    const userQ = query(collection(db, 'users'), where('username', '==', cleanUsername));
    const userSnap = await getDocs(userQ);
    const isUsedByUser = userSnap.docs.some(d => d.id !== currentId);
    
    // Check communities
    const commQ = query(collection(db, 'communities'), where('username', '==', cleanUsername));
    const commSnap = await getDocs(commQ);
    const isUsedByComm = commSnap.docs.some(d => d.id !== currentId);
    
    return !(isUsedByUser || isUsedByComm);
  };

  const handleSaveProfile = async () => {
    if (!user || currentUserData?.isFrozen) return;
    setProfileError(null);
    setIsSaving(true);
    try {
      const cleanUsername = editForm.username.replace(/^@/, '').trim();
      const isUnique = await checkUsernameUnique(cleanUsername, user.uid);
      if (!isUnique) {
        setProfileError('Этот @id уже занят. Пожалуйста, выберите другой.');
        setIsSaving(false);
        return;
      }

      await updateDoc(doc(db, 'users', user.uid), {
        name: editForm.name, username: cleanUsername, location: editForm.location, status: editForm.status,
        github: editForm.github, twitter: editForm.twitter, instagram: editForm.instagram, website: editForm.website,
      });
      setIsEditModalOpen(false);
    } catch (error) { handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`); } 
    finally { setIsSaving(false); }
  };

  // --- Friends Actions ---
  const handleAddFriend = async (targetUserId: string) => {
    if (!user || currentUserData?.isFrozen) return;
    try {
      await addDoc(collection(db, 'friends'), {
        user1: user.uid, user2: targetUserId, status: 'pending', createdAt: serverTimestamp()
      });
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'friends'); }
  };

  const handleAcceptFriend = async (friendId: string) => {
    if (currentUserData?.isFrozen) return;
    try { await updateDoc(doc(db, 'friends', friendId), { status: 'accepted' }); } 
    catch (e) { handleFirestoreError(e, OperationType.UPDATE, `friends/${friendId}`); }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (currentUserData?.isFrozen) return;
    try { await deleteDoc(doc(db, 'friends', friendId)); } 
    catch (e) { handleFirestoreError(e, OperationType.DELETE, `friends/${friendId}`); }
  };

  // --- Chat Actions ---
  const handleStartChat = async (targetUserId: string) => {
    if (!user || currentUserData?.isFrozen) return;
    // Check if chat exists
    const existingChat = chats.find(c => c.participants.includes(user.uid) && c.participants.includes(targetUserId));
    if (existingChat) {
      setActiveChatId(existingChat.id);
      setActiveTab('messages');
      return;
    }
    try {
      const chatRef = await addDoc(collection(db, 'chats'), {
        participants: [user.uid, targetUserId], updatedAt: serverTimestamp(), lastMessage: ''
      });
      setActiveChatId(chatRef.id);
      setActiveTab('messages');
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'chats'); }
  };

  const handleSendMessage = async () => {
    if (!user || !activeChatId || !newMessageText.trim() || currentUserData?.isMuted || currentUserData?.isFrozen) return;
    try {
      await addDoc(collection(db, `chats/${activeChatId}/messages`), {
        chatId: activeChatId, senderId: user.uid, text: newMessageText.trim(), createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'chats', activeChatId), {
        lastMessage: newMessageText.trim(), updatedAt: serverTimestamp()
      });
      setNewMessageText('');
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, `chats/${activeChatId}/messages`); }
  };

  // --- Community Actions ---
  const handleCreateCommunity = async () => {
    if (!user || !newCommunityName.trim() || !newCommunityUsername.trim() || currentUserData?.isFrozen || currentUserData?.isMuted) return;
    try {
      const cleanUsername = newCommunityUsername.replace(/^@/, '').trim();
      const isUnique = await checkUsernameUnique(cleanUsername);
      if (!isUnique) {
        alert('Этот @id уже занят. Пожалуйста, выберите другой.');
        return;
      }

      const commRef = await addDoc(collection(db, 'communities'), {
        name: newCommunityName.trim(), username: cleanUsername, description: newCommunityDesc.trim(), ownerId: user.uid, membersCount: 1, createdAt: serverTimestamp()
      });
      await addDoc(collection(db, 'communityMembers'), {
        userId: user.uid, communityId: commRef.id, role: 'owner', joinedAt: serverTimestamp()
      });
      setIsCreateCommunityModalOpen(false);
      setNewCommunityName(''); setNewCommunityUsername(''); setNewCommunityDesc('');
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'communities'); }
  };

  const handleJoinCommunity = async (communityId: string) => {
    if (!user || currentUserData?.isFrozen) return;
    try {
      await addDoc(collection(db, 'communityMembers'), {
        userId: user.uid, communityId, role: 'member', joinedAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'communities', communityId), { membersCount: increment(1) });
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'communityMembers'); }
  };

  const handleLeaveCommunity = async (communityId: string, memberId: string) => {
    if (!user || currentUserData?.isFrozen) return;
    try {
      await deleteDoc(doc(db, 'communityMembers', memberId));
      await updateDoc(doc(db, 'communities', communityId), { membersCount: increment(-1) });
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, `communityMembers/${memberId}`); }
  };

  // --- Admin Actions ---
  const handleToggleUserStatus = async (userId: string, field: 'isAdmin' | 'isVerified' | 'isMuted' | 'isBanned' | 'isFrozen', currentValue: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { [field]: !currentValue });
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `users/${userId}`); }
  };

  const handleSetUserVip = async (userId: string, vipStatus: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { vipStatus });
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `users/${userId}`); }
  };

  const handleToggleCommunityStatus = async (commId: string, field: 'isAdmin' | 'isVerified' | 'isMuted' | 'isBanned' | 'isFrozen', currentValue: boolean) => {
    try {
      await updateDoc(doc(db, 'communities', commId), { [field]: !currentValue });
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `communities/${commId}`); }
  };

  // --- Render Helpers ---
  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} м. назад`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ч. назад`;
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  const getUserStatus = (u: any) => {
    if (u.isOnline) return <span className="text-green-500 font-semibold text-xs flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>Онлайн</span>;
    return <span className="text-slate-400 text-xs flex items-center gap-1"><Clock size={12}/>Был(а) {formatTimeAgo(u.lastSeen)}</span>;
  };

  const renderVipBadge = (vipStatus: string) => {
    if (vipStatus === 'gold') return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-900/40 text-yellow-400 border border-yellow-500/30 ml-1">VIP GOLD</span>;
    if (vipStatus === 'silver') return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-300/20 text-slate-300 border border-slate-400/30 ml-1">VIP SILVER</span>;
    if (vipStatus === 'bronze') return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-900/40 text-amber-500 border border-amber-600/30 ml-1">VIP BRONZE</span>;
    return null;
  };

  // --- UI Components ---
  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-gradient-fixed"></div>
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-indigo-500/40 border-t-indigo-600 rounded-full animate-spin mb-4 shadow-lg"></div>
          <p className="text-slate-300 font-semibold">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user || !currentUserData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-gradient-fixed"></div>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-8 rounded-3xl max-w-md w-full text-center">
          <div className="w-20 h-20 bg-[#2A2B36] border border-indigo-100 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Settings size={40} />
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-2">Jagooars</h1>
          <p className="text-slate-400 mb-6 font-medium">Войдите, чтобы присоединиться к сообществу.</p>
          {loginError && (
            <div className="mb-6 p-4 bg-red-900/30 text-red-600 text-sm rounded-xl border border-red-100 text-left">
              <p className="font-bold mb-1">Ошибка входа:</p><p>{loginError}</p>
            </div>
          )}
          <button onClick={handleLogin} className="glass-button-primary w-full py-3.5 font-bold rounded-xl flex items-center justify-center gap-2 text-lg">
            Войти через Google
          </button>
        </motion.div>
      </div>
    );
  }

  if (currentUserData.isBanned) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-gradient-fixed"></div>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-8 rounded-3xl max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-900/30 border border-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Shield size={40} />
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-2">Аккаунт заблокирован</h1>
          <p className="text-slate-400 mb-6 font-medium">Ваш аккаунт был заблокирован администрацией за нарушение правил сообщества.</p>
          <button onClick={handleLogout} className="glass-button w-full py-3.5 font-bold rounded-xl flex items-center justify-center gap-2 text-lg">
            Выйти
          </button>
        </motion.div>
      </div>
    );
  }

  const navItems = [
    { id: 'feed', label: 'Лента', icon: Home },
    { id: 'friends', label: 'Друзья', icon: Users },
    { id: 'messages', label: 'Сообщения', icon: MessageCircle },
    { id: 'communities', label: 'Сообщества', icon: UsersRound },
    { id: 'profile', label: 'Профиль', icon: User },
  ];

  return (
    <div className="min-h-screen text-white font-sans flex justify-center selection:bg-[#2A2B36]0/20">
      <div className="bg-gradient-fixed"></div>
      
      {/* Animated Floating Navigation Toggle (Mobile) */}
      <div className="md:hidden fixed bottom-6 right-6 z-[60]">
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsNavOpen(!isNavOpen)}
          className="w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl shadow-slate-900/40 border border-slate-700"
        >
          <motion.div animate={{ rotate: isNavOpen ? 90 : 0 }} transition={{ type: "spring", stiffness: 200, damping: 15 }}>
            {isNavOpen ? <X size={24} /> : <Menu size={24} />}
          </motion.div>
        </motion.button>
      </div>

      {/* Mobile Navigation Overlay */}
      <AnimatePresence>
        {isNavOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="md:hidden fixed bottom-24 right-6 glass-panel p-3 rounded-3xl flex flex-col gap-2 z-[50] shadow-2xl border border-[#1A1B22]"
          >
            {navItems.map(item => (
              <button key={item.id} onClick={() => { setActiveTab(item.id as TabType); setIsNavOpen(false); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === item.id ? 'bg-[#2A2B36] text-indigo-400 shadow-sm' : 'text-slate-300 hover:bg-[#1A1B22]'}`}
              >
                <item.icon size={20} className={activeTab === item.id ? 'stroke-[2.5px]' : ''} />
                <span>{item.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Navigation (Desktop) */}
      <nav className="hidden md:flex flex-col w-72 fixed left-0 h-screen glass-sidebar p-6 z-40 border-r border-[#3A3B4C]/50">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/30 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl">J</div>
          <span className="text-3xl font-extrabold tracking-tight text-white">Jagooars</span>
        </div>
        <div className="flex flex-col gap-3">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id as TabType)}
              className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all ${activeTab === item.id ? 'bg-[#22232E] shadow-md text-indigo-400 border border-[#2A2B36]' : 'text-slate-400 hover:bg-[#22232E]/50 hover:text-white'}`}
            >
              <item.icon size={24} className={activeTab === item.id ? 'stroke-[2.5px]' : ''} />
              <span className="text-lg">{item.label}</span>
            </button>
          ))}
        </div>
        <div className="mt-auto pt-6 border-t border-[#3A3B4C]/50">
          <button onClick={handleLogout} className="flex items-center gap-4 px-5 py-4 w-full text-slate-400 hover:text-red-500 hover:bg-red-900/30 rounded-2xl transition-colors font-bold">
            <LogOut size={24} />
            <span className="text-lg">Выйти</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl w-full md:ml-72 pb-24 md:pb-10 min-h-screen px-3 sm:px-6 pt-6 sm:pt-10">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="w-full">
            
            {/* FEED TAB */}
            {activeTab === 'feed' && (
              <div>
                <div className="flex justify-between items-center mb-6 px-2">
                  <h1 className="text-3xl font-extrabold text-white">Лента новостей</h1>
                  <div className="flex bg-[#2A2B36] rounded-xl p-1">
                    <button onClick={() => setFeedTab('friends')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${feedTab === 'friends' ? 'bg-[#454656] text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>Друзья</button>
                    <button onClick={() => setFeedTab('global')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${feedTab === 'global' ? 'bg-[#454656] text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>Глобальная</button>
                  </div>
                </div>
                
                {/* Create Post */}
                <div className="glass-panel rounded-3xl p-5 mb-8 shadow-sm">
                  <div className="flex gap-4">
                    <img src={currentUserData.profileImage} alt="Avatar" className="w-12 h-12 rounded-full object-cover border-2 border-[#1A1B22] shadow-sm" />
                    <div className="flex-1">
                      <textarea value={newPostText} onChange={(e) => setNewPostText(e.target.value)} placeholder="Что у вас нового?" className="glass-input rounded-2xl px-5 py-4 w-full resize-none min-h-[100px] text-base font-medium" />
                      {newPostImage && (
                        <div className="relative mb-4 mt-4 rounded-2xl overflow-hidden border border-[#3A3B4C] inline-block shadow-sm">
                          <img src={newPostImage} alt="Preview" className="max-h-64 object-contain" />
                          <button onClick={() => setNewPostImage('')} className="absolute top-2 right-2 p-2 bg-[#22232E]/80 hover:bg-red-900/300 hover:text-white rounded-full transition-colors backdrop-blur-md shadow-sm"><X size={16} /></button>
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-4 mt-2">
                        <div className="flex gap-2">
                          <label className="glass-icon-btn cursor-pointer"><ImageIcon size={22} /><input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => handleImageUpload(e, 'post')} disabled={currentUserData.isFrozen || currentUserData.isMuted} /></label>
                        </div>
                        <button onClick={handleCreatePost} disabled={isPosting || (!newPostText.trim() && !newPostImage) || currentUserData.isFrozen || currentUserData.isMuted} className="glass-button-primary px-8 py-3 rounded-full font-bold disabled:opacity-50 flex items-center gap-2">
                          {isPosting ? 'Публикация...' : 'Опубликовать'} <Send size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Posts List */}
                <div className="space-y-6">
                  {posts.filter(post => {
                    if (feedTab === 'friends') {
                      const myFriendIds = friends.filter(f => f.status === 'accepted').map(f => f.user1 === user.uid ? f.user2 : f.user1);
                      return !post.communityId && (post.userId === user.uid || myFriendIds.includes(post.userId));
                    } else {
                      if (post.communityId) {
                        const comm = communities.find(c => c.id === post.communityId);
                        return comm?.isVerified;
                      } else {
                        const author = allUsers.find(u => u.id === post.userId) || post;
                        return author.isVerified;
                      }
                    }
                  }).length === 0 ? (
                    <div className="text-center py-16 text-slate-400 font-semibold glass-panel rounded-3xl">Здесь пока нет постов.</div>
                  ) : (
                    posts.filter(post => {
                      if (feedTab === 'friends') {
                        const myFriendIds = friends.filter(f => f.status === 'accepted').map(f => f.user1 === user.uid ? f.user2 : f.user1);
                        return !post.communityId && (post.userId === user.uid || myFriendIds.includes(post.userId));
                      } else {
                        if (post.communityId) {
                          const comm = communities.find(c => c.id === post.communityId);
                          return comm?.isVerified;
                        } else {
                          const author = allUsers.find(u => u.id === post.userId) || post;
                          return author.isVerified;
                        }
                      }
                    }).map(post => {
                      const author = allUsers.find(u => u.id === post.userId) || post;
                      const community = post.communityId ? communities.find(c => c.id === post.communityId) : null;
                      return (
                        <motion.div key={post.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-3xl p-6 shadow-sm">
                          <div className="flex justify-between items-start mb-5">
                            <div className="flex gap-4 items-center">
                              <img src={community ? community.coverImage || author.profileImage : author.profileImage || post.authorImage} alt="Author" className="w-12 h-12 rounded-full object-cover border-2 border-[#1A1B22] shadow-sm" />
                              <div>
                                <div className="font-extrabold text-white flex items-center gap-1.5 text-lg">
                                  {community ? community.name : author.name || post.authorName}
                                  {(community ? community.isVerified : author.isVerified) && <BadgeCheck size={18} className="text-indigo-400" />}
                                  {(community ? community.isAdmin : author.isAdmin) && <Shield size={16} className="text-purple-500" />}
                                  {!community && renderVipBadge(author.vipStatus)}
                                </div>
                                <div className="text-sm text-slate-400 font-medium flex items-center gap-2">
                                  @{community ? community.username : author.username || post.authorUsername} • {formatTimeAgo(post.createdAt)}
                                </div>
                              </div>
                            </div>
                            {user.uid === post.userId && (
                              <button onClick={(e) => handleDeletePost(post.id, e)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-900/30 rounded-full transition-colors"><Trash2 size={20} /></button>
                            )}
                          </div>
                          {post.text && <p className="text-slate-200 font-medium mb-5 whitespace-pre-wrap text-[16px] leading-relaxed break-words">{post.text}</p>}
                          {post.image && <div className="rounded-2xl overflow-hidden border border-[#2A2B36] mb-5 shadow-sm"><img src={post.image} alt="Post content" className="w-full h-auto max-h-[500px] object-cover" /></div>}
                          <div className="flex gap-8 pt-4 border-t border-[#2A2B36]">
                            <button onClick={(e) => handleLikePost(post.id, e)} className="flex items-center gap-2 text-slate-400 hover:text-pink-500 transition-colors group font-bold">
                              <div className="p-2 rounded-full group-hover:bg-pink-50 transition-colors"><Heart size={22} className="group-active:scale-75 transition-transform" /></div>
                              <span className="text-lg">{post.likes || 0}</span>
                            </button>
                            <button className="flex items-center gap-2 text-slate-400 hover:text-indigo-400 transition-colors group font-bold">
                              <div className="p-2 rounded-full group-hover:bg-[#2A2B36] transition-colors"><MessageCircle size={22} /></div>
                              <span className="text-lg">{post.comments || 0}</span>
                            </button>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* FRIENDS TAB */}
            {activeTab === 'friends' && (
              <div>
                <div className="flex justify-between items-center mb-6 px-2">
                  <h1 className="text-3xl font-extrabold text-white">Друзья</h1>
                  <div className="flex bg-[#2A2B36] rounded-xl p-1">
                    <button onClick={() => setFriendsTab('all')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${friendsTab === 'all' ? 'bg-[#454656] text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>Все</button>
                    <button onClick={() => setFriendsTab('online')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${friendsTab === 'online' ? 'bg-[#454656] text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>Онлайн</button>
                    <button onClick={() => setFriendsTab('requests')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${friendsTab === 'requests' ? 'bg-[#454656] text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>
                      Заявки
                      {friends.filter(f => f.user2 === user.uid && f.status === 'pending').length > 0 && (
                        <span className="ml-2 bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{friends.filter(f => f.user2 === user.uid && f.status === 'pending').length}</span>
                      )}
                    </button>
                  </div>
                </div>
                <div className="glass-panel p-2 rounded-2xl flex items-center mb-8 shadow-sm">
                  <Search className="text-slate-400 ml-3" size={20} />
                  <input type="text" placeholder="Поиск друзей..." value={friendSearch} onChange={e => setFriendSearch(e.target.value)} className="bg-transparent border-none outline-none px-4 py-3 w-full text-slate-200 font-medium placeholder-slate-400" />
                </div>

                <div className="space-y-8">
                  {/* Friend Requests */}
                  {friendsTab === 'requests' && (
                    <div>
                      <h2 className="text-xl font-bold text-slate-200 mb-4 px-2">Заявки в друзья</h2>
                      {friends.filter(f => f.user2 === user.uid && f.status === 'pending').length === 0 ? (
                        <div className="text-center py-8 text-slate-400 font-medium glass-panel rounded-3xl">Нет новых заявок</div>
                      ) : (
                        <div className="grid gap-4">
                          {friends.filter(f => f.user2 === user.uid && f.status === 'pending').map(req => {
                            const reqUser = allUsers.find(u => u.id === req.user1);
                            if (!reqUser) return null;
                            return (
                              <div key={req.id} className="glass-panel p-4 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <img src={reqUser.profileImage} alt="" className="w-12 h-12 rounded-full object-cover" />
                                  <div>
                                    <div className="font-bold text-white flex items-center gap-1">{reqUser.name} {renderVipBadge(reqUser.vipStatus)}</div>
                                    <div className="text-sm text-slate-400">@{reqUser.username}</div>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => handleAcceptFriend(req.id)} className="glass-button-primary px-4 py-2 rounded-xl font-bold text-sm">Принять</button>
                                  <button onClick={() => handleRemoveFriend(req.id)} className="glass-button px-4 py-2 rounded-xl font-bold text-sm">Отклонить</button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* My Friends */}
                  {(friendsTab === 'all' || friendsTab === 'online') && (
                    <div>
                      <h2 className="text-xl font-bold text-slate-200 mb-4 px-2">{friendsTab === 'online' ? 'Друзья онлайн' : 'Мои друзья'}</h2>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {friends.filter(f => f.status === 'accepted').map(f => {
                          const friendId = f.user1 === user.uid ? f.user2 : f.user1;
                          const friendUser = allUsers.find(u => u.id === friendId);
                          if (!friendUser) return null;
                          if (friendSearch && !friendUser.name.toLowerCase().includes(friendSearch.toLowerCase())) return null;
                          if (friendsTab === 'online' && !friendUser.isOnline) return null;
                          return (
                            <div key={f.id} className="glass-panel p-4 rounded-2xl flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="relative cursor-pointer" onClick={() => { setActiveTab('profile'); setProfileViewUserId(friendUser.id); }}>
                                  <img src={friendUser.profileImage} alt="" className="w-12 h-12 rounded-full object-cover" />
                                  {friendUser.isOnline && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[#1A1B22] rounded-full"></div>}
                                </div>
                                <div>
                                  <div className="font-bold text-white flex items-center gap-1 cursor-pointer" onClick={() => { setActiveTab('profile'); setProfileViewUserId(friendUser.id); }}>
                                    {friendUser.name} {friendUser.isVerified && <BadgeCheck size={14} className="text-indigo-400" />} {renderVipBadge(friendUser.vipStatus)}
                                  </div>
                                  {getUserStatus(friendUser)}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => handleStartChat(friendUser.id)} className="glass-icon-btn"><MessageCircle size={18} /></button>
                                <button onClick={() => handleRemoveFriend(f.id)} className="glass-icon-btn text-red-400 hover:text-red-500 hover:bg-red-900/30"><UserMinus size={18} /></button>
                              </div>
                            </div>
                          );
                        })}
                        {friends.filter(f => f.status === 'accepted').filter(f => {
                          if (friendsTab !== 'online') return true;
                          const friendId = f.user1 === user.uid ? f.user2 : f.user1;
                          const friendUser = allUsers.find(u => u.id === friendId);
                          return friendUser?.isOnline;
                        }).length === 0 && (
                          <div className="text-center py-8 text-slate-400 font-medium glass-panel rounded-3xl col-span-full">У вас пока нет {friendsTab === 'online' ? 'друзей онлайн' : 'друзей'}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Find Users */}
                  {friendsTab === 'all' && (
                    <div>
                      <h2 className="text-xl font-bold text-slate-200 mb-4 px-2">Найти людей</h2>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {allUsers.filter(u => u.id !== user.uid && (!friendSearch || u.name.toLowerCase().includes(friendSearch.toLowerCase()))).slice(0, 10).map(u => {
                          const isFriend = friends.some(f => (f.user1 === u.id && f.user2 === user.uid) || (f.user2 === u.id && f.user1 === user.uid));
                          if (isFriend) return null;
                          return (
                            <div key={u.id} className="glass-panel p-4 rounded-2xl flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <img src={u.profileImage} alt="" className="w-12 h-12 rounded-full object-cover cursor-pointer" onClick={() => { setActiveTab('profile'); setProfileViewUserId(u.id); }} />
                                <div>
                                  <div className="font-bold text-white flex items-center gap-1 cursor-pointer" onClick={() => { setActiveTab('profile'); setProfileViewUserId(u.id); }}>
                                    {u.name} {u.isVerified && <BadgeCheck size={14} className="text-indigo-400" />} {renderVipBadge(u.vipStatus)}
                                  </div>
                                  <div className="text-sm text-slate-400">@{u.username}</div>
                                </div>
                              </div>
                              <button onClick={() => handleAddFriend(u.id)} className="glass-icon-btn"><UserPlus size={18} /></button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MESSAGES TAB */}
            {activeTab === 'messages' && (
              <div className="h-[calc(100vh-120px)] flex flex-col">
                {!activeChatId ? (
                  <>
                    <h1 className="text-3xl font-extrabold text-white mb-6 px-2">Сообщения</h1>
                    <div className="glass-panel p-2 rounded-2xl flex items-center mb-6 shadow-sm">
                      <Search className="text-slate-400 ml-3" size={20} />
                      <input type="text" placeholder="Поиск диалогов..." value={messageSearch} onChange={e => setMessageSearch(e.target.value)} className="bg-transparent border-none outline-none px-4 py-3 w-full text-slate-200 font-medium placeholder-slate-400" />
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                      {chats.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 font-semibold">У вас пока нет диалогов.</div>
                      ) : (
                        chats.map(chat => {
                          const otherUserId = chat.participants.find((p: string) => p !== user.uid);
                          const otherUser = allUsers.find(u => u.id === otherUserId);
                          if (!otherUser) return null;
                          if (messageSearch && !otherUser.name.toLowerCase().includes(messageSearch.toLowerCase())) return null;
                          return (
                            <div key={chat.id} onClick={() => setActiveChatId(chat.id)} className="glass-panel p-4 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-[#22232E]/90 transition-all">
                              <div className="relative">
                                <img src={otherUser.profileImage} alt="" className="w-14 h-14 rounded-full object-cover" />
                                {otherUser.isOnline && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[#1A1B22] rounded-full"></div>}
                              </div>
                              <div className="flex-1 overflow-hidden">
                                <div className="flex justify-between items-center mb-1">
                                  <div className="font-bold text-white text-lg">{otherUser.name}</div>
                                  <div className="text-xs text-slate-400 font-medium">{formatTimeAgo(chat.updatedAt)}</div>
                                </div>
                                <div className="text-slate-400 text-sm truncate font-medium">{chat.lastMessage || 'Нет сообщений'}</div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                ) : (
                  // Active Chat View
                  <div className="flex flex-col h-full glass-panel rounded-3xl overflow-hidden shadow-md border border-[#1A1B22]/60">
                    {/* Chat Header */}
                    <div className="p-4 border-b border-[#3A3B4C]/50 flex items-center gap-4 bg-[#22232E]/50 backdrop-blur-md">
                      <button onClick={() => setActiveChatId(null)} className="p-2 hover:bg-[#2A2B36] rounded-full transition-colors"><ChevronLeft size={24} /></button>
                      {(() => {
                        const chat = chats.find(c => c.id === activeChatId);
                        const otherUserId = chat?.participants.find((p: string) => p !== user.uid);
                        const otherUser = allUsers.find(u => u.id === otherUserId);
                        return otherUser ? (
                          <div className="flex items-center gap-3">
                            <img src={otherUser.profileImage} alt="" className="w-10 h-10 rounded-full object-cover" />
                            <div>
                              <div className="font-bold text-white">{otherUser.name}</div>
                              {getUserStatus(otherUser)}
                            </div>
                          </div>
                        ) : <div>Загрузка...</div>;
                      })()}
                    </div>
                    
                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#1A1B22]/30">
                      {chatMessages.map(msg => {
                        const isMe = msg.senderId === user.uid;
                        return (
                          <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] p-4 rounded-2xl ${isMe ? 'bg-[#2A2B36]0 text-white rounded-br-sm shadow-md shadow-indigo-500/20' : 'bg-[#22232E] text-white rounded-bl-sm shadow-sm border border-[#2A2B36]'}`}>
                              <p className="font-medium text-[15px] leading-relaxed break-words">{msg.text}</p>
                              <div className={`text-[10px] mt-2 font-semibold ${isMe ? 'text-indigo-200' : 'text-slate-400'} text-right`}>
                                {msg.createdAt?.toDate().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Input Area */}
                    <div className="p-4 bg-[#22232E]/50 backdrop-blur-md border-t border-[#3A3B4C]/50 flex items-center gap-3">
                      <button className="p-2.5 text-slate-400 hover:text-indigo-400 hover:bg-[#2A2B36] rounded-full transition-colors"><ImageIcon size={22} /></button>
                      <button className="p-2.5 text-slate-400 hover:text-indigo-400 hover:bg-[#2A2B36] rounded-full transition-colors"><Video size={22} /></button>
                      <button className="p-2.5 text-slate-400 hover:text-indigo-400 hover:bg-[#2A2B36] rounded-full transition-colors"><Music size={22} /></button>
                      <input 
                        type="text" value={newMessageText} onChange={e => setNewMessageText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                        placeholder={currentUserData?.isMuted || currentUserData?.isFrozen ? "Отправка сообщений ограничена" : "Написать сообщение..."}
                        disabled={currentUserData?.isMuted || currentUserData?.isFrozen}
                        className="flex-1 glass-input rounded-full px-5 py-3 font-medium disabled:opacity-50"
                      />
                      <button onClick={handleSendMessage} disabled={!newMessageText.trim() || currentUserData?.isMuted || currentUserData?.isFrozen} className="p-3 bg-[#2A2B36]0 hover:bg-[#555666] text-white rounded-full transition-colors disabled:opacity-50 shadow-md shadow-indigo-500/30"><Send size={20} /></button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* COMMUNITIES TAB */}
            {activeTab === 'communities' && (
              <div>
                <div className="flex justify-between items-center mb-6 px-2">
                  <h1 className="text-3xl font-extrabold text-white">Сообщества</h1>
                  <button onClick={() => setIsCreateCommunityModalOpen(true)} disabled={currentUserData?.isFrozen || currentUserData?.isMuted} className="glass-button-primary px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm disabled:opacity-50">
                    <Plus size={18} /> Создать
                  </button>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  {communities.map(comm => {
                    const isMember = memberships.some(m => m.communityId === comm.id && m.userId === user.uid);
                    const myMembership = memberships.find(m => m.communityId === comm.id && m.userId === user.uid);
                    return (
                      <div key={comm.id} className="glass-panel rounded-3xl overflow-hidden shadow-sm flex flex-col">
                        <div className="h-24 bg-gradient-to-r from-indigo-400 to-purple-400 relative">
                          {comm.coverImage && <img src={comm.coverImage} alt="" className="w-full h-full object-cover opacity-60 mix-blend-overlay" />}
                        </div>
                        <div className="p-5 flex-1 flex flex-col">
                          <h3 className="text-xl font-extrabold text-white mb-1 flex items-center gap-1">
                            {comm.name}
                            {comm.isVerified && <BadgeCheck size={16} className="text-indigo-400" />}
                            {comm.isAdmin && <Shield size={16} className="text-purple-500" />}
                          </h3>
                          <p className="text-sm text-slate-400 font-medium mb-2">@{comm.username}</p>
                          <p className="text-sm text-slate-400 font-medium mb-4 line-clamp-2 flex-1">{comm.description || 'Нет описания'}</p>
                          <div className="flex justify-between items-center mt-auto">
                            <span className="text-sm font-bold text-slate-400 flex items-center gap-1.5"><UsersRound size={16}/> {comm.membersCount} участников</span>
                            {isMember ? (
                              <button onClick={() => handleLeaveCommunity(comm.id, myMembership.id)} className="glass-button px-4 py-2 rounded-xl font-bold text-sm">Покинуть</button>
                            ) : (
                              <button onClick={() => handleJoinCommunity(comm.id)} className="glass-button-primary px-4 py-2 rounded-xl font-bold text-sm">Вступить</button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="pb-8">
                <div className="glass-panel rounded-[2.5rem] overflow-hidden shadow-xl border border-[#1A1B22]/60">
                  <div className="relative h-48 sm:h-72 w-full overflow-hidden bg-slate-200">
                    <img src={currentUserData.coverImage} alt="Cover" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent"></div>
                    <label className="absolute top-4 right-4 p-3 bg-[#22232E]/20 hover:bg-[#22232E]/40 backdrop-blur-md rounded-full text-white transition-all cursor-pointer shadow-sm">
                      <Camera size={22} />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'cover')} />
                    </label>
                  </div>

                  <div className="px-6 sm:px-10 pb-10">
                    <div className="relative flex justify-between items-end -mt-16 sm:-mt-20 mb-6">
                      <div className="relative z-10">
                        <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-[6px] border-[#1A1B22] bg-[#2A2B36] overflow-hidden shadow-xl group">
                          <img src={currentUserData.profileImage} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <Camera size={36} className="text-white" />
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'profile')} />
                          </label>
                        </div>
                      </div>
                      <button onClick={() => {
                        setEditForm({ 
                          name: currentUserData.name, username: currentUserData.username, location: currentUserData.location, status: currentUserData.status,
                          github: currentUserData.github || '', twitter: currentUserData.twitter || '', instagram: currentUserData.instagram || '', website: currentUserData.website || ''
                        });
                        setIsEditModalOpen(true);
                      }} disabled={currentUserData.isFrozen} className="glass-button px-6 py-2.5 rounded-full font-bold flex items-center gap-2 mb-2 disabled:opacity-50">
                        <Settings size={18} /> <span className="hidden sm:inline">Настройки</span>
                      </button>
                      {(currentUserData.isAdmin || user.email === 'alexeivasilev270819942@gmail.com') && (
                        <button onClick={() => setIsAdminPanelOpen(true)} className="glass-button-primary px-6 py-2.5 rounded-full font-bold flex items-center gap-2 mb-2 ml-2">
                          <Shield size={18} /> <span className="hidden sm:inline">Админ Панель</span>
                        </button>
                      )}
                    </div>

                    <div className="mb-10">
                      <motion.div className="flex items-center gap-2 mb-2 flex-wrap" initial="hidden" animate="visible" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } }}>
                        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight flex flex-wrap">
                          {currentUserData.name.split('').map((char: string, i: number) => (
                            <motion.span key={i} variants={{ hidden: { opacity: 0, y: 10, filter: 'blur(4px)' }, visible: { opacity: 1, y: 0, filter: 'blur(0px)' } }} className={char === ' ' ? 'w-2 sm:w-3' : 'text-gradient'}>
                              {char}
                            </motion.span>
                          ))}
                        </h1>
                        <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", delay: 0.5, bounce: 0.5 }} className="flex gap-1.5 ml-1">
                          {currentUserData.isVerified && <BadgeCheck className="w-8 h-8 text-indigo-400 drop-shadow-sm" />}
                          {currentUserData.isAdmin && <Shield className="w-8 h-8 text-purple-500 drop-shadow-sm" />}
                        </motion.div>
                      </motion.div>
                      
                      <p className="text-slate-400 font-bold text-lg mb-5">@{currentUserData.username}</p>
                      
                      {currentUserData.status && <p className="text-slate-200 font-medium text-[16px] mb-6 leading-relaxed whitespace-pre-wrap break-words">{currentUserData.status}</p>}

                      <div className="flex flex-wrap gap-y-3 gap-x-6 text-sm text-slate-400 mb-6 font-bold bg-[#1A1B22]/50 p-4 rounded-2xl border border-[#2A2B36]">
                        {currentUserData.location && <div className="flex items-center gap-2"><MapPin size={18} className="text-indigo-400"/><span>{currentUserData.location}</span></div>}
                        {currentUserData.createdAt && <div className="flex items-center gap-2"><Calendar size={18} className="text-indigo-400"/><span>В Jagooars с {currentUserData.createdAt.toDate().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</span></div>}
                      </div>

                      <div className="flex gap-4">
                        {currentUserData.github && <a href={currentUserData.github} target="_blank" rel="noreferrer" className="glass-icon-btn"><Github size={20} /></a>}
                        {currentUserData.twitter && <a href={currentUserData.twitter} target="_blank" rel="noreferrer" className="glass-icon-btn"><Twitter size={20} /></a>}
                        {currentUserData.instagram && <a href={currentUserData.instagram} target="_blank" rel="noreferrer" className="glass-icon-btn"><Instagram size={20} /></a>}
                        {currentUserData.website && <a href={currentUserData.website} target="_blank" rel="noreferrer" className="glass-icon-btn"><Globe size={20} /></a>}
                      </div>
                    </div>

                    <h2 className="text-2xl font-extrabold text-white mb-6 px-1">Мои записи</h2>
                    <div className="space-y-6">
                      {posts.filter(p => p.userId === user.uid).length === 0 ? (
                        <div className="text-center py-12 text-slate-400 font-bold bg-[#1A1B22]/50 rounded-3xl border border-[#2A2B36]">У вас пока нет постов.</div>
                      ) : (
                        posts.filter(p => p.userId === user.uid).map(post => {
                          return (
                            <div key={post.id} className="glass-panel rounded-3xl p-6 shadow-sm">
                              <div className="flex justify-between items-start mb-5">
                                <div className="flex gap-4 items-center">
                                  <img src={currentUserData.profileImage} alt="Author" className="w-12 h-12 rounded-full object-cover border-2 border-[#1A1B22] shadow-sm" />
                                  <div>
                                    <div className="font-extrabold text-white flex items-center gap-1.5 text-lg">
                                      {currentUserData.name}
                                      {currentUserData.isVerified && <BadgeCheck size={18} className="text-indigo-400" />}
                                      {currentUserData.isAdmin && <Shield size={16} className="text-purple-500" />}
                                      {renderVipBadge(currentUserData.vipStatus)}
                                    </div>
                                    <div className="text-sm text-slate-400 font-medium">@{currentUserData.username} • {formatTimeAgo(post.createdAt)}</div>
                                  </div>
                                </div>
                                <button onClick={(e) => handleDeletePost(post.id, e)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-900/30 rounded-full transition-colors"><Trash2 size={20} /></button>
                              </div>
                              {post.text && <p className="text-slate-200 font-medium mb-5 whitespace-pre-wrap text-[16px] leading-relaxed break-words">{post.text}</p>}
                              {post.image && <div className="rounded-2xl overflow-hidden border border-[#2A2B36] mb-5 shadow-sm"><img src={post.image} alt="Post content" className="w-full h-auto max-h-[500px] object-cover" /></div>}
                              <div className="flex gap-8 pt-4 border-t border-[#2A2B36]">
                                <div className="flex items-center gap-2 text-slate-400 font-bold"><Heart size={22} /> <span className="text-lg">{post.likes || 0}</span></div>
                                <div className="flex items-center gap-2 text-slate-400 font-bold"><MessageCircle size={22} /> <span className="text-lg">{post.comments || 0}</span></div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </main>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-[#22232E] rounded-[2rem] w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col shadow-2xl">
              <div className="flex justify-between items-center p-6 border-b border-[#2A2B36]">
                <h2 className="text-2xl font-extrabold text-white">Настройки профиля</h2>
                <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-200 bg-[#1A1B22] hover:bg-[#2A2B36] p-2 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                {profileError && (
                  <div className="p-4 bg-red-900/30 text-red-600 text-sm rounded-xl border border-red-100">
                    {profileError}
                  </div>
                )}
                <div><label className="block text-sm font-bold text-slate-300 mb-2">Имя и фамилия</label><input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="glass-input rounded-xl px-4 py-3 w-full font-medium" /></div>
                <div><label className="block text-sm font-bold text-slate-300 mb-2">Имя пользователя (@iduser)</label><input type="text" value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} className="glass-input rounded-xl px-4 py-3 w-full font-medium" /></div>
                <div><label className="block text-sm font-bold text-slate-300 mb-2">Город, Страна</label><input type="text" value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} className="glass-input rounded-xl px-4 py-3 w-full font-medium" /></div>
                <div><label className="block text-sm font-bold text-slate-300 mb-2">О себе</label><textarea value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} rows={3} className="glass-input rounded-xl px-4 py-3 w-full resize-none font-medium" /></div>
                <h3 className="text-sm font-bold text-white pt-4 border-t border-[#2A2B36]">Социальные сети</h3>
                <div className="relative"><Github className="absolute left-4 top-3.5 text-slate-400" size={20} /><input type="text" placeholder="https://github.com/..." value={editForm.github} onChange={e => setEditForm({...editForm, github: e.target.value})} className="glass-input rounded-xl pl-12 pr-4 py-3 w-full font-medium" /></div>
                <div className="relative"><Twitter className="absolute left-4 top-3.5 text-slate-400" size={20} /><input type="text" placeholder="https://twitter.com/..." value={editForm.twitter} onChange={e => setEditForm({...editForm, twitter: e.target.value})} className="glass-input rounded-xl pl-12 pr-4 py-3 w-full font-medium" /></div>
                <div className="relative"><Instagram className="absolute left-4 top-3.5 text-slate-400" size={20} /><input type="text" placeholder="https://instagram.com/..." value={editForm.instagram} onChange={e => setEditForm({...editForm, instagram: e.target.value})} className="glass-input rounded-xl pl-12 pr-4 py-3 w-full font-medium" /></div>
                <div className="relative"><Globe className="absolute left-4 top-3.5 text-slate-400" size={20} /><input type="text" placeholder="https://вассайт.com" value={editForm.website} onChange={e => setEditForm({...editForm, website: e.target.value})} className="glass-input rounded-xl pl-12 pr-4 py-3 w-full font-medium" /></div>
              </div>
              <div className="p-6 border-t border-[#2A2B36] flex justify-end gap-3 bg-[#1A1B22]">
                <button onClick={() => setIsEditModalOpen(false)} className="glass-button px-6 py-3 rounded-xl font-bold">Отмена</button>
                <button onClick={handleSaveProfile} disabled={isSaving} className="glass-button-primary px-8 py-3 rounded-xl font-bold disabled:opacity-70">{isSaving ? 'Сохранение...' : 'Сохранить'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Community Modal */}
      <AnimatePresence>
        {isCreateCommunityModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-[#22232E] rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl">
              <div className="flex justify-between items-center p-6 border-b border-[#2A2B36]">
                <h2 className="text-2xl font-extrabold text-white">Новое сообщество</h2>
                <button onClick={() => setIsCreateCommunityModalOpen(false)} className="text-slate-400 hover:text-slate-200 bg-[#1A1B22] hover:bg-[#2A2B36] p-2 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-5">
                <div><label className="block text-sm font-bold text-slate-300 mb-2">Название</label><input type="text" value={newCommunityName} onChange={e => setNewCommunityName(e.target.value)} className="glass-input rounded-xl px-4 py-3 w-full font-medium" /></div>
                <div><label className="block text-sm font-bold text-slate-300 mb-2">Уникальный @id</label><input type="text" value={newCommunityUsername} onChange={e => setNewCommunityUsername(e.target.value)} placeholder="Например: my_group" className="glass-input rounded-xl px-4 py-3 w-full font-medium" /></div>
                <div><label className="block text-sm font-bold text-slate-300 mb-2">Описание</label><textarea value={newCommunityDesc} onChange={e => setNewCommunityDesc(e.target.value)} rows={3} className="glass-input rounded-xl px-4 py-3 w-full resize-none font-medium" /></div>
              </div>
              <div className="p-6 border-t border-[#2A2B36] flex justify-end gap-3 bg-[#1A1B22]">
                <button onClick={() => setIsCreateCommunityModalOpen(false)} className="glass-button px-6 py-3 rounded-xl font-bold">Отмена</button>
                <button onClick={handleCreateCommunity} disabled={!newCommunityName.trim() || !newCommunityUsername.trim()} className="glass-button-primary px-8 py-3 rounded-xl font-bold disabled:opacity-70">Создать</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Panel Modal */}
      <AnimatePresence>
        {isAdminPanelOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-[#22232E] rounded-[2rem] w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col shadow-2xl">
              <div className="flex justify-between items-center p-6 border-b border-[#2A2B36]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#2A2B36] text-indigo-400 rounded-xl flex items-center justify-center">
                    <Shield size={24} />
                  </div>
                  <h2 className="text-2xl font-extrabold text-white">Админ Панель</h2>
                </div>
                <button onClick={() => setIsAdminPanelOpen(false)} className="text-slate-400 hover:text-slate-200 bg-[#1A1B22] hover:bg-[#2A2B36] p-2 rounded-full transition-colors"><X size={20} /></button>
              </div>
              
              <div className="flex border-b border-[#2A2B36] px-6">
                <button onClick={() => setAdminTab('users')} className={`px-6 py-4 font-bold text-sm transition-colors border-b-2 ${adminTab === 'users' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-white'}`}>Пользователи</button>
                <button onClick={() => setAdminTab('communities')} className={`px-6 py-4 font-bold text-sm transition-colors border-b-2 ${adminTab === 'communities' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-white'}`}>Сообщества</button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-[#1A1B22]/50">
                <div className="space-y-4">
                  {adminTab === 'users' && allUsers.map(u => (
                    <div key={u.id} className="bg-[#22232E] p-4 rounded-2xl border border-[#2A2B36] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <img src={u.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`} alt={u.name} className="w-12 h-12 rounded-full object-cover" />
                        <div>
                          <p className="font-bold text-white flex items-center gap-1">
                            {u.name}
                            {u.isVerified && <BadgeCheck size={16} className="text-indigo-400" />}
                            {u.isAdmin && <Shield size={16} className="text-purple-500" />}
                            {renderVipBadge(u.vipStatus)}
                          </p>
                          <p className="text-sm text-slate-400">@{u.username}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => handleToggleUserStatus(u.id, 'isAdmin', u.isAdmin)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${u.isAdmin ? 'bg-purple-900/30 text-purple-300' : 'bg-[#2A2B36] text-slate-300 hover:bg-[#3A3B4C]'}`}>Admin</button>
                        <button onClick={() => handleToggleUserStatus(u.id, 'isVerified', u.isVerified)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${u.isVerified ? 'bg-indigo-900/30 text-indigo-300' : 'bg-[#2A2B36] text-slate-300 hover:bg-[#3A3B4C]'}`}>Verified</button>
                        <button onClick={() => handleToggleUserStatus(u.id, 'isMuted', u.isMuted)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${u.isMuted ? 'bg-orange-900/30 text-orange-300' : 'bg-[#2A2B36] text-slate-300 hover:bg-[#3A3B4C]'}`}>Muted</button>
                        <button onClick={() => handleToggleUserStatus(u.id, 'isFrozen', u.isFrozen)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${u.isFrozen ? 'bg-cyan-900/30 text-cyan-300' : 'bg-[#2A2B36] text-slate-300 hover:bg-[#3A3B4C]'}`}>Frozen</button>
                        <button onClick={() => handleToggleUserStatus(u.id, 'isBanned', u.isBanned)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${u.isBanned ? 'bg-red-900/30 text-red-300' : 'bg-[#2A2B36] text-slate-300 hover:bg-[#3A3B4C]'}`}>Banned</button>
                        <div className="h-4 w-px bg-[#3A3B4C] mx-1 self-center"></div>
                        <button onClick={() => handleSetUserVip(u.id, u.vipStatus === 'bronze' ? 'none' : 'bronze')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${u.vipStatus === 'bronze' ? 'bg-amber-900/40 text-amber-500' : 'bg-[#2A2B36] text-slate-300 hover:bg-[#3A3B4C]'}`}>VIP Bronze</button>
                        <button onClick={() => handleSetUserVip(u.id, u.vipStatus === 'silver' ? 'none' : 'silver')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${u.vipStatus === 'silver' ? 'bg-slate-300/20 text-slate-300' : 'bg-[#2A2B36] text-slate-300 hover:bg-[#3A3B4C]'}`}>VIP Silver</button>
                        <button onClick={() => handleSetUserVip(u.id, u.vipStatus === 'gold' ? 'none' : 'gold')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${u.vipStatus === 'gold' ? 'bg-yellow-900/40 text-yellow-400' : 'bg-[#2A2B36] text-slate-300 hover:bg-[#3A3B4C]'}`}>VIP Gold</button>
                      </div>
                    </div>
                  ))}

                  {adminTab === 'communities' && communities.map(c => (
                    <div key={c.id} className="bg-[#22232E] p-4 rounded-2xl border border-[#2A2B36] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-[#2A2B36] rounded-xl flex items-center justify-center text-indigo-400 font-bold text-xl">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-white flex items-center gap-1">
                            {c.name}
                            {c.isVerified && <BadgeCheck size={16} className="text-indigo-400" />}
                            {c.isAdmin && <Shield size={16} className="text-purple-500" />}
                          </p>
                          <p className="text-sm text-slate-400">@{c.username}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => handleToggleCommunityStatus(c.id, 'isAdmin', c.isAdmin)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${c.isAdmin ? 'bg-purple-900/30 text-purple-300' : 'bg-[#2A2B36] text-slate-300 hover:bg-[#3A3B4C]'}`}>Admin</button>
                        <button onClick={() => handleToggleCommunityStatus(c.id, 'isVerified', c.isVerified)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${c.isVerified ? 'bg-indigo-900/30 text-indigo-300' : 'bg-[#2A2B36] text-slate-300 hover:bg-[#3A3B4C]'}`}>Verified</button>
                        <button onClick={() => handleToggleCommunityStatus(c.id, 'isMuted', c.isMuted)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${c.isMuted ? 'bg-orange-900/30 text-orange-300' : 'bg-[#2A2B36] text-slate-300 hover:bg-[#3A3B4C]'}`}>Muted</button>
                        <button onClick={() => handleToggleCommunityStatus(c.id, 'isFrozen', c.isFrozen)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${c.isFrozen ? 'bg-cyan-900/30 text-cyan-300' : 'bg-[#2A2B36] text-slate-300 hover:bg-[#3A3B4C]'}`}>Frozen</button>
                        <button onClick={() => handleToggleCommunityStatus(c.id, 'isBanned', c.isBanned)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${c.isBanned ? 'bg-red-900/30 text-red-300' : 'bg-[#2A2B36] text-slate-300 hover:bg-[#3A3B4C]'}`}>Banned</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
