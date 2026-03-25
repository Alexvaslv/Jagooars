import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Settings, MapPin, Calendar, Heart, MessageCircle, Sparkles, Camera, Pencil, X, LogOut, 
  Github, Twitter, Instagram, Globe, Trash2, Image as ImageIcon, Send, Home, Users, User, 
  Menu, Search, UserPlus, UserCheck, Clock, Shield, BadgeCheck, Plus, UsersRound, Video, Music, ChevronLeft, UserMinus, ArrowLeft, ImagePlus, Share2,
  Zap, MessageSquare, ChevronRight, Save, Award
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
  const [profileViewUserId, setProfileViewUserId] = useState<string | null>(null);
  const [activeCommunityId, setActiveCommunityId] = useState<string | null>(null);
  const [communityTab, setCommunityTab] = useState<'posts' | 'members' | 'settings'>('posts');
  const [isNavOpen, setIsNavOpen] = useState(false);

  // Global Data
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [follows, setFollows] = useState<any[]>([]);

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

  // Comment Modal State
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [commentingPostId, setCommentingPostId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);

  const viewingUserData = useMemo(() => {
    if (!profileViewUserId) return currentUserData;
    return allUsers.find(u => u.id === profileViewUserId);
  }, [profileViewUserId, currentUserData, allUsers]);

  const activeCommunity = useMemo(() => {
    if (!activeCommunityId) return null;
    return communities.find(c => c.id === activeCommunityId);
  }, [activeCommunityId, communities]);

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
      setFriends(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)).filter(f => f.user1 === user.uid || f.user2 === user.uid));
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

    // Follows
    const followsUnsub = onSnapshot(collection(db, 'follows'), (snap) => {
      setFollows(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, e => handleFirestoreError(e, OperationType.LIST, 'follows'));

    return () => { userUnsub(); usersUnsub(); postsUnsub(); friendsUnsub(); chatsUnsub(); commUnsub(); followsUnsub(); };
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

  const handleCreatePost = async (communityId?: string) => {
    if (!user || (!newPostText.trim() && !newPostImage) || !currentUserData || currentUserData.isFrozen || currentUserData.isMuted) return;
    setIsPosting(true);
    try {
      await addDoc(collection(db, 'posts'), {
        userId: user.uid, 
        authorName: currentUserData.name, 
        authorUsername: currentUserData.username,
        authorImage: currentUserData.profileImage, 
        text: newPostText.trim(), 
        image: newPostImage,
        likes: 0, 
        comments: 0, 
        createdAt: serverTimestamp(),
        communityId: communityId || null
      });
      setNewPostText(''); 
      setNewPostImage('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) { handleFirestoreError(error, OperationType.CREATE, 'posts'); } 
    finally { setIsPosting(false); }
  };

  const handleLikePost = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || currentUserData?.isFrozen) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    const isLiked = post.likes?.includes(user.uid);
    const newLikes = isLiked 
      ? post.likes.filter((id: string) => id !== user.uid)
      : [...(post.likes || []), user.uid];

    try { 
      await updateDoc(doc(db, 'posts', postId), { likes: newLikes }); 
    } catch (error) { 
      handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`); 
    }
  };

  const handleCommentPost = async () => {
    if (!user || !commentingPostId || !newCommentText.trim() || currentUserData?.isFrozen) return;
    setIsCommenting(true);
    try {
      const post = posts.find(p => p.id === commentingPostId);
      if (!post) return;

      const newComment = {
        id: Math.random().toString(36).substr(2, 9),
        userId: user.uid,
        userName: currentUserData.name,
        userAvatar: currentUserData.profileImage,
        text: newCommentText.trim(),
        createdAt: new Date().toISOString()
      };

      const newComments = [...(post.comments || []), newComment];
      await updateDoc(doc(db, 'posts', commentingPostId), { comments: newComments });
      setNewCommentText('');
      setIsCommentModalOpen(false);
      setCommentingPostId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${commentingPostId}`);
    } finally {
      setIsCommenting(false);
    }
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
        name: newCommunityName.trim(), username: cleanUsername, description: newCommunityDesc.trim(), ownerId: user.uid, followersCount: 1, createdAt: serverTimestamp()
      });
      // Automatically follow the community you created
      await addDoc(collection(db, 'follows'), {
        followerId: user.uid,
        followingId: commRef.id,
        type: 'community',
        createdAt: serverTimestamp()
      });
      setIsCreateCommunityModalOpen(false);
      setNewCommunityName(''); setNewCommunityUsername(''); setNewCommunityDesc('');
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'communities'); }
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

  const handleFollow = async (followingId: string, type: 'user' | 'community') => {
    if (!user || currentUserData?.isFrozen) return;
    try {
      await addDoc(collection(db, 'follows'), {
        followerId: user.uid,
        followingId,
        type,
        createdAt: serverTimestamp()
      });
      // Increment followers count
      const ref = doc(db, type === 'user' ? 'users' : 'communities', followingId);
      await updateDoc(ref, { followersCount: increment(1) });
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'follows'); }
  };

  const handleUnfollow = async (followingId: string, type: 'user' | 'community') => {
    if (!user || currentUserData?.isFrozen) return;
    try {
      const q = query(collection(db, 'follows'), where('followerId', '==', user.uid), where('followingId', '==', followingId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await deleteDoc(doc(db, 'follows', snap.docs[0].id));
        // Decrement followers count
        const ref = doc(db, type === 'user' ? 'users' : 'communities', followingId);
        await updateDoc(ref, { followersCount: increment(-1) });
      }
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, 'follows'); }
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
    if (vipStatus === 'gold') return <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 shadow-[0_0_15px_rgba(250,204,21,0.1)] uppercase tracking-tighter ml-1">Gold</span>;
    if (vipStatus === 'silver') return <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-slate-400/10 text-slate-300 border border-slate-400/20 shadow-[0_0_15px_rgba(148,163,184,0.1)] uppercase tracking-tighter ml-1">Silver</span>;
    if (vipStatus === 'bronze') return <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-600/10 text-amber-500 border border-amber-600/20 shadow-[0_0_15px_rgba(245,158,11,0.1)] uppercase tracking-tighter ml-1">Bronze</span>;
    return null;
  };

  // --- UI Components ---
  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-gradient-fixed"></div>
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-t-indigo-600 rounded-full animate-spin mb-4 shadow-lg"></div>
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
          <div className="w-20 h-20 bg-[#25252D] text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Settings size={40} />
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-2">Jagooars</h1>
          <p className="text-slate-400 mb-6 font-medium">Войдите, чтобы присоединиться к сообществу.</p>
          {loginError && (
            <div className="mb-6 p-4 bg-red-900/30 text-red-600 text-sm rounded-xl text-left">
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
          <div className="w-20 h-20 bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
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
    <div className="min-h-screen text-white font-sans flex justify-center selection:bg-indigo-500/20">
      <div className="bg-gradient-fixed"></div>
      <div className="bg-mesh"></div>
      
      {/* Animated Floating Navigation Toggle (Mobile) */}
      <div className="md:hidden fixed bottom-6 right-6 z-[60]">
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsNavOpen(!isNavOpen)}
          className="w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl shadow-slate-900/40"
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
            className="md:hidden fixed bottom-24 right-6 glass-panel p-3 rounded-3xl flex flex-col gap-2 z-[50] shadow-2xl"
          >
            {navItems.map(item => (
              <button key={item.id} onClick={() => { 
                setActiveTab(item.id as TabType); 
                setProfileViewUserId(null); 
                setActiveCommunityId(null);
                setIsNavOpen(false); 
              }}
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
      <nav className="hidden md:flex flex-col w-72 fixed left-0 h-screen glass-sidebar p-8 z-40">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20 rounded-2xl flex items-center justify-center text-white">
            <Zap size={24} fill="currentColor" />
          </div>
          <span className="text-3xl font-black tracking-tighter text-white">VIBE</span>
        </div>
        <div className="flex flex-col gap-2">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => { 
              setActiveTab(item.id as TabType); 
              setProfileViewUserId(null); 
              setActiveCommunityId(null);
            }}
              className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all duration-300 group ${
                activeTab === item.id 
                  ? 'bg-white/10 shadow-xl text-white' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon size={22} className={`transition-colors ${activeTab === item.id ? 'text-indigo-400' : 'group-hover:text-indigo-400'}`} />
              <span className="text-[17px]">{item.label}</span>
              {activeTab === item.id && <motion.div layoutId="activeTab" className="ml-auto w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.8)]" />}
            </button>
          ))}
        </div>
        
        <div className="mt-auto pt-8">
          {user && (
            <div className="mb-6 p-4 rounded-3xl bg-white/5 border border-white/5 flex items-center gap-3">
              <img src={currentUserData?.profileImage} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-white/10" />
              <div className="flex-1 overflow-hidden">
                <div className="font-bold text-sm text-white truncate">{currentUserData?.name}</div>
                <div className="text-xs text-slate-500 truncate">@{currentUserData?.username}</div>
              </div>
              <button onClick={() => setIsAdminPanelOpen(true)} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white">
                <Settings size={18} />
              </button>
            </div>
          )}
          <button onClick={handleLogout} className="flex items-center gap-4 px-5 py-4 w-full text-slate-500 hover:text-red-400 hover:bg-red-400/5 rounded-2xl transition-all font-bold">
            <LogOut size={22} />
            <span className="text-[17px]">Выйти</span>
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
                <div className="flex justify-between items-center mb-8 px-2">
                  <h1 className="text-4xl font-black tracking-tighter text-white">Лента</h1>
                  <div className="flex bg-white/5 backdrop-blur-md rounded-2xl p-1.5 border border-white/5 shadow-inner">
                    <button onClick={() => setFeedTab('friends')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${feedTab === 'friends' ? 'bg-white/10 text-white shadow-xl ring-1 ring-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Друзья</button>
                    <button onClick={() => setFeedTab('global')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${feedTab === 'global' ? 'bg-white/10 text-white shadow-xl ring-1 ring-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Глобальная</button>
                  </div>
                </div>
                
                {/* Create Post Bento Card */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bento-card mb-10">
                  <div className="flex gap-5">
                    <div className="relative">
                      <img src={currentUserData.profileImage} alt="Avatar" className="w-14 h-14 rounded-full object-cover ring-2 ring-white/10 shadow-lg" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-4 border-[#16161D] shadow-sm"></div>
                    </div>
                    <div className="flex-1">
                      <textarea 
                        value={newPostText} 
                        onChange={(e) => setNewPostText(e.target.value)} 
                        placeholder="Что у вас нового?" 
                        className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-slate-500 text-lg font-medium resize-none min-h-[100px] py-2" 
                      />
                      
                      {newPostImage && (
                        <div className="relative mb-6 mt-4 rounded-[2rem] overflow-hidden inline-block shadow-2xl ring-1 ring-white/10">
                          <img src={newPostImage} alt="Preview" className="max-h-80 object-contain rounded-[2rem]" />
                          <button onClick={() => setNewPostImage('')} className="absolute top-3 right-3 p-2.5 bg-black/40 hover:bg-red-500/80 text-white rounded-full transition-all backdrop-blur-xl shadow-xl"><X size={18} /></button>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-6 border-t border-white/5">
                        <div className="flex gap-3">
                          <label className="glass-icon-btn cursor-pointer p-3"><ImageIcon size={22} /><input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => handleImageUpload(e, 'post')} disabled={currentUserData.isFrozen || currentUserData.isMuted} /></label>
                          <button className="glass-icon-btn p-3"><Video size={22} /></button>
                          <button className="glass-icon-btn p-3"><Music size={22} /></button>
                        </div>
                        <button 
                          onClick={handleCreatePost} 
                          disabled={isPosting || (!newPostText.trim() && !newPostImage) || currentUserData.isFrozen || currentUserData.isMuted} 
                          className="glass-button-primary px-10 py-3.5 rounded-2xl font-black text-sm tracking-wide uppercase disabled:opacity-50 flex items-center gap-3"
                        >
                          {isPosting ? 'Публикация...' : 'Опубликовать'} <Send size={18} fill="currentColor" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>

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
                      const isLiked = post.likes?.includes(user?.uid);
                      return (
                        <motion.div 
                          key={post.id} 
                          initial={{ opacity: 0, scale: 0.98, y: 20 }} 
                          whileInView={{ opacity: 1, scale: 1, y: 0 }} 
                          viewport={{ once: true }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          className="bento-card group"
                        >
                          <div className="flex justify-between items-start mb-6">
                            <div className="flex gap-4 items-center">
                              <div className="relative">
                                <img src={community ? community.coverImage || author.profileImage : author.profileImage || post.authorImage} alt="Author" className="w-12 h-12 rounded-full object-cover ring-2 ring-white/10 shadow-md" />
                                {author.isOnline && !community && <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-[3px] border-[#16161D]"></div>}
                              </div>
                              <div>
                                <div className="font-black text-white flex items-center gap-2 text-[17px] tracking-tight">
                                  <span className="hover:text-indigo-400 transition-colors cursor-pointer">{community ? community.name : author.name || post.authorName}</span>
                                  {(community ? community.isVerified : author.isVerified) && <div className="bg-indigo-500/20 p-0.5 rounded-full"><BadgeCheck size={16} className="text-indigo-400" /></div>}
                                  {(community ? community.isAdmin : author.isAdmin) && <Shield size={14} className="text-purple-500" />}
                                  {!community && renderVipBadge(author.vipStatus)}
                                </div>
                                <div className="text-xs text-slate-500 font-bold flex items-center gap-2 tracking-wide uppercase">
                                  @{community ? community.username : author.username || post.authorUsername} • {formatTimeAgo(post.createdAt)}
                                </div>
                              </div>
                            </div>
                            {user.uid === post.userId && (
                              <button onClick={(e) => handleDeletePost(post.id, e)} className="p-2.5 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-2xl transition-all opacity-0 group-hover:opacity-100"><Trash2 size={20} /></button>
                            )}
                          </div>
                          
                          {post.text && <p className="text-slate-100 font-medium mb-6 whitespace-pre-wrap text-[17px] leading-relaxed break-words">{post.text}</p>}
                          
                          {post.image && (
                            <div className="rounded-[2rem] overflow-hidden mb-6 shadow-2xl ring-1 ring-white/10">
                              <img src={post.image} alt="Post content" className="w-full h-auto max-h-[600px] object-cover hover:scale-105 transition-transform duration-1000" />
                            </div>
                          )}
                          
                          <div className="flex gap-10 pt-6 border-t border-white/5">
                            <button onClick={(e) => handleLikePost(post.id, e)} className={`flex items-center gap-2.5 transition-all duration-300 group/btn ${isLiked ? 'text-rose-500 scale-105' : 'text-slate-400 hover:text-rose-400'}`}>
                              <div className={`p-2.5 rounded-2xl transition-all duration-300 ${isLiked ? 'bg-rose-500/10' : 'group-hover/btn:bg-rose-500/10'}`}>
                                <Heart size={22} fill={isLiked ? "currentColor" : "none"} className="group-active/btn:scale-75 transition-transform" />
                              </div>
                              <span className="text-base font-black tracking-tight">{post.likes?.length || 0}</span>
                            </button>
                            <button className="flex items-center gap-2.5 text-slate-400 hover:text-indigo-400 transition-all duration-300 group/btn">
                              <div className="p-2.5 rounded-2xl group-hover/btn:bg-indigo-500/10 transition-all duration-300">
                                <MessageCircle size={22} />
                              </div>
                              <span className="text-base font-black tracking-tight">{post.comments || 0}</span>
                            </button>
                            <button className="flex items-center gap-2 text-slate-400 hover:text-emerald-400 transition-all duration-300 ml-auto p-2.5 rounded-2xl hover:bg-emerald-500/10">
                              <Share2 size={22} />
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
              <div className="max-w-5xl mx-auto px-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                  <div>
                    <h1 className="text-5xl font-black tracking-tighter text-white mb-2">Друзья</h1>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">Управление контактами и поиск</p>
                  </div>
                  <div className="flex bg-white/5 backdrop-blur-xl rounded-2xl p-1.5 border border-white/10 shadow-2xl ring-1 ring-white/5">
                    {[
                      { id: 'all', label: 'Все' },
                      { id: 'online', label: 'Онлайн' },
                      { id: 'requests', label: 'Заявки', count: friends.filter(f => f.user2 === user.uid && f.status === 'pending').length }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setFriendsTab(tab.id as any)}
                        className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-500 relative group ${
                          friendsTab === tab.id 
                            ? 'bg-white/10 text-white shadow-xl ring-1 ring-white/20' 
                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        <span className="relative z-10">{tab.label}</span>
                        {tab.count !== undefined && tab.count > 0 && (
                          <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-indigo-500/40 border-2 border-[#0D0D12] z-20">
                            {tab.count}
                          </span>
                        )}
                        {friendsTab === tab.id && (
                          <motion.div layoutId="friendsTabActive" className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl -z-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="glass-panel p-2 rounded-[2rem] flex items-center mb-12 shadow-2xl ring-1 ring-white/10 group focus-within:ring-indigo-500/30 transition-all bg-white/5">
                  <div className="w-14 h-14 flex items-center justify-center text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                    <Search size={24} />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Поиск по имени или @username..." 
                    value={friendSearch} 
                    onChange={e => setFriendSearch(e.target.value)} 
                    className="bg-transparent border-none outline-none px-2 py-4 w-full text-white font-bold placeholder-slate-600 text-lg tracking-tight" 
                  />
                </div>

                <div className="space-y-8">
                  {/* Friend Requests */}
                  {friendsTab === 'requests' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                      <h2 className="text-2xl font-black text-white mb-8 px-2 tracking-tight flex items-center gap-3">
                        Заявки в друзья
                        <span className="h-px flex-1 bg-white/5"></span>
                      </h2>
                      {friends.filter(f => f.user2 === user.uid && f.status === 'pending').length === 0 ? (
                        <div className="text-center py-24 text-slate-500 font-bold glass-panel rounded-[3rem] border border-dashed border-white/10 bg-white/5">
                          <UserPlus size={48} className="mx-auto mb-4 opacity-20" />
                          <p className="uppercase tracking-widest text-xs">Нет новых заявок</p>
                        </div>
                      ) : (
                        <div className="grid gap-6">
                          {friends.filter(f => f.user2 === user.uid && f.status === 'pending').map(req => {
                            const reqUser = allUsers.find(u => u.id === req.user1);
                            if (!reqUser) return null;
                            return (
                              <motion.div key={req.id} layout className="glass-panel p-6 rounded-[2.5rem] flex items-center justify-between group hover:bg-white/5 transition-all ring-1 ring-white/5 shadow-xl">
                                <div className="flex items-center gap-6">
                                  <div className="relative">
                                    <img src={reqUser.profileImage} alt="" className="w-20 h-20 rounded-3xl object-cover ring-2 ring-white/10 shadow-2xl group-hover:scale-105 transition-transform duration-500" />
                                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-[#0D0D12] ${reqUser.isOnline ? 'bg-green-500' : 'bg-slate-600'}`}></div>
                                  </div>
                                  <div>
                                    <div className="font-black text-white text-xl flex items-center gap-2 tracking-tight mb-1">
                                      {reqUser.name} 
                                      {renderVipBadge(reqUser.vipStatus)}
                                    </div>
                                    <div className="text-xs text-slate-500 font-black tracking-[0.2em] uppercase">@{reqUser.username}</div>
                                  </div>
                                </div>
                                <div className="flex gap-3">
                                  <button onClick={() => handleAcceptFriend(req.id)} className="glass-button-primary px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">Принять</button>
                                  <button onClick={() => handleRemoveFriend(req.id)} className="glass-button px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-white active:scale-95 transition-all">Отклонить</button>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* My Friends */}
                  {(friendsTab === 'all' || friendsTab === 'online') && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                      <h2 className="text-2xl font-black text-white mb-8 px-2 tracking-tight flex items-center gap-3">
                        {friendsTab === 'online' ? 'Друзья онлайн' : 'Мои друзья'}
                        <span className="h-px flex-1 bg-white/5"></span>
                      </h2>
                      <div className="grid gap-6 sm:grid-cols-2">
                        {friends.filter(f => f.status === 'accepted').map(f => {
                          const friendId = f.user1 === user.uid ? f.user2 : f.user1;
                          const friendUser = allUsers.find(u => u.id === friendId);
                          if (!friendUser) return null;
                          if (friendSearch && !friendUser.name.toLowerCase().includes(friendSearch.toLowerCase())) return null;
                          if (friendsTab === 'online' && !friendUser.isOnline) return null;
                          return (
                            <motion.div key={f.id} layout className="glass-panel p-5 rounded-[2.5rem] flex items-center justify-between group hover:bg-white/5 transition-all ring-1 ring-white/5 shadow-xl">
                              <div className="flex items-center gap-5 overflow-hidden">
                                <div className="relative cursor-pointer group/avatar shrink-0" onClick={() => { setActiveTab('profile'); setProfileViewUserId(friendUser.id); }}>
                                  <img src={friendUser.profileImage} alt="" className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white/10 shadow-xl group-hover/avatar:scale-105 transition-transform duration-500" />
                                  {friendUser.isOnline && <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 bg-green-500 rounded-full border-[3.5px] border-[#0D0D12]"></div>}
                                </div>
                                <div className="overflow-hidden">
                                  <div className="font-black text-white flex items-center gap-2 cursor-pointer hover:text-indigo-400 transition-colors tracking-tight truncate text-lg" onClick={() => { setActiveTab('profile'); setProfileViewUserId(friendUser.id); }}>
                                    {friendUser.name} 
                                    {friendUser.isVerified && <BadgeCheck size={18} className="text-indigo-400" />} 
                                    {renderVipBadge(friendUser.vipStatus)}
                                  </div>
                                  <div className="truncate opacity-80 group-hover:opacity-100 transition-opacity">{getUserStatus(friendUser)}</div>
                                </div>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <button onClick={() => handleStartChat(friendUser.id)} className="glass-icon-btn w-12 h-12 flex items-center justify-center rounded-xl text-slate-400 hover:text-indigo-400 transition-all active:scale-90"><MessageCircle size={22} /></button>
                                <button onClick={() => handleRemoveFriend(f.id)} className="glass-icon-btn w-12 h-12 flex items-center justify-center rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-90"><UserMinus size={22} /></button>
                              </div>
                            </motion.div>
                          );
                        })}
                        {friends.filter(f => f.status === 'accepted').filter(f => {
                          if (friendsTab !== 'online') return true;
                          const friendId = f.user1 === user.uid ? f.user2 : f.user1;
                          const friendUser = allUsers.find(u => u.id === friendId);
                          return friendUser?.isOnline;
                        }).length === 0 && (
                          <div className="text-center py-24 text-slate-500 font-bold glass-panel rounded-[3rem] border border-dashed border-white/10 bg-white/5 col-span-full">
                            <UsersRound size={48} className="mx-auto mb-4 opacity-20" />
                            <p className="uppercase tracking-widest text-xs">У вас пока нет {friendsTab === 'online' ? 'друзей онлайн' : 'друзей'}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Find Users */}
                  {friendsTab === 'all' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                      <h2 className="text-2xl font-black text-white mb-8 px-2 tracking-tight flex items-center gap-3">
                        Найти людей
                        <span className="h-px flex-1 bg-white/5"></span>
                      </h2>
                      <div className="grid gap-6 sm:grid-cols-2">
                        {allUsers.filter(u => u.id !== user.uid && (!friendSearch || u.name.toLowerCase().includes(friendSearch.toLowerCase()))).slice(0, 10).map(u => {
                          const isFriend = friends.some(f => (f.user1 === u.id && f.user2 === user.uid) || (f.user2 === u.id && f.user1 === user.uid));
                          if (isFriend) return null;
                          return (
                            <motion.div key={u.id} layout className="glass-panel p-5 rounded-[2.5rem] flex items-center justify-between group hover:bg-white/5 transition-all ring-1 ring-white/5 shadow-xl">
                              <div className="flex items-center gap-5 overflow-hidden">
                                <div className="relative cursor-pointer group/avatar shrink-0" onClick={() => { setActiveTab('profile'); setProfileViewUserId(u.id); }}>
                                  <img src={u.profileImage} alt="" className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white/10 shadow-xl group-hover/avatar:scale-105 transition-transform duration-500" />
                                  {u.isOnline && <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 bg-green-500 rounded-full border-[3.5px] border-[#0D0D12]"></div>}
                                </div>
                                <div className="overflow-hidden">
                                  <div className="font-black text-white flex items-center gap-2 cursor-pointer hover:text-indigo-400 transition-colors tracking-tight truncate text-lg" onClick={() => { setActiveTab('profile'); setProfileViewUserId(u.id); }}>
                                    {u.name} 
                                    {u.isVerified && <BadgeCheck size={18} className="text-indigo-400" />} 
                                    {renderVipBadge(u.vipStatus)}
                                  </div>
                                  <div className="text-xs text-slate-500 font-black tracking-[0.2em] uppercase truncate">@{u.username}</div>
                                </div>
                              </div>
                              <button onClick={() => handleAddFriend(u.id)} className="glass-icon-btn w-12 h-12 flex items-center justify-center rounded-xl text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-all active:scale-90"><UserPlus size={22} /></button>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {/* MESSAGES TAB */}
            {activeTab === 'messages' && (
              <div className="h-[calc(100vh-120px)] flex flex-col max-w-5xl mx-auto px-4">
                {!activeChatId ? (
                  <>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                      <div>
                        <h1 className="text-5xl font-black tracking-tighter text-white mb-2">Сообщения</h1>
                        <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">Ваши личные диалоги и чаты</p>
                      </div>
                    </div>

                    <div className="glass-panel p-2 rounded-[2rem] flex items-center mb-12 shadow-2xl ring-1 ring-white/10 group focus-within:ring-indigo-500/30 transition-all bg-white/5">
                      <div className="w-14 h-14 flex items-center justify-center text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                        <Search size={24} />
                      </div>
                      <input 
                        type="text" 
                        placeholder="Поиск по диалогам..." 
                        value={messageSearch} 
                        onChange={e => setMessageSearch(e.target.value)} 
                        className="bg-transparent border-none outline-none px-2 py-4 w-full text-white font-bold placeholder-slate-600 text-lg tracking-tight" 
                      />
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2 pb-10">
                      {chats.length === 0 ? (
                        <div className="text-center py-32 text-slate-500 font-black glass-panel rounded-[3rem] border border-dashed border-white/10 bg-white/5">
                          <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
                          <p className="uppercase tracking-widest text-xs">У вас пока нет диалогов</p>
                        </div>
                      ) : (
                        chats.map(chat => {
                          const otherUserId = chat.participants.find((p: string) => p !== user.uid);
                          const otherUser = allUsers.find(u => u.id === otherUserId);
                          if (!otherUser) return null;
                          if (messageSearch && !otherUser.name.toLowerCase().includes(messageSearch.toLowerCase())) return null;
                          return (
                            <motion.div 
                              key={chat.id} 
                              initial={{ opacity: 0, y: 10 }} 
                              animate={{ opacity: 1, y: 0 }} 
                              onClick={() => setActiveChatId(chat.id)} 
                              className="glass-panel p-6 flex items-center gap-6 cursor-pointer group hover:bg-white/5 transition-all ring-1 ring-white/5 shadow-xl rounded-[2.5rem]"
                            >
                              <div className="relative shrink-0">
                                <img src={otherUser.profileImage} alt="" className="w-20 h-20 rounded-3xl object-cover ring-2 ring-white/10 shadow-2xl group-hover:ring-indigo-500/50 transition-all duration-500" />
                                {otherUser.isOnline && <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-[4px] border-[#0D0D12] shadow-lg"></div>}
                              </div>
                              <div className="flex-1 overflow-hidden">
                                <div className="flex justify-between items-center mb-2">
                                  <div className="font-black text-white text-xl tracking-tight group-hover:text-indigo-400 transition-colors flex items-center gap-2">
                                    {otherUser.name}
                                    {otherUser.isVerified && <BadgeCheck size={18} className="text-indigo-400" />}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">{formatTimeAgo(chat.updatedAt)}</div>
                                </div>
                                <div className="text-slate-400 text-[15px] truncate font-bold tracking-tight opacity-80 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                                  {chat.lastMessageSenderId === user.uid && <span className="text-indigo-400 text-xs font-black uppercase tracking-widest">Вы:</span>}
                                  {chat.lastMessage || 'Нет сообщений'}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </>
                ) : (
                  // Active Chat View
                  <div className="flex flex-col h-full glass-panel rounded-[3rem] overflow-hidden shadow-2xl ring-1 ring-white/10 bg-black/40 backdrop-blur-3xl">
                    {/* Chat Header */}
                    <div className="p-6 flex items-center gap-6 bg-white/5 backdrop-blur-3xl border-b border-white/10">
                      <button onClick={() => setActiveChatId(null)} className="p-4 glass-icon-btn rounded-2xl text-white/70 hover:text-white transition-all active:scale-90"><ChevronLeft size={24} /></button>
                      {(() => {
                        const chat = chats.find(c => c.id === activeChatId);
                        const otherUserId = chat?.participants.find((p: string) => p !== user.uid);
                        const otherUser = allUsers.find(u => u.id === otherUserId);
                        return otherUser ? (
                          <div className="flex items-center gap-5">
                            <div className="relative">
                              <img src={otherUser.profileImage} alt="" className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white/10 shadow-xl" />
                              {otherUser.isOnline && <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 bg-green-500 rounded-full border-[3.5px] border-[#0D0D12]"></div>}
                            </div>
                            <div>
                              <div className="font-black text-white text-xl tracking-tight flex items-center gap-2">
                                {otherUser.name}
                                {otherUser.isVerified && <BadgeCheck size={20} className="text-indigo-400" />}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${otherUser.isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{otherUser.isOnline ? 'В сети' : 'Не в сети'}</span>
                              </div>
                            </div>
                          </div>
                        ) : <div className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Загрузка...</div>;
                      })()}
                    </div>
                    
                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-mesh bg-opacity-5">
                      {chatMessages.map((msg, idx) => {
                        const isMe = msg.senderId === user.uid;
                        const prevMsg = idx > 0 ? chatMessages[idx - 1] : null;
                        const isSameSender = prevMsg?.senderId === msg.senderId;
                        
                        return (
                          <motion.div 
                            key={msg.id} 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }} 
                            animate={{ opacity: 1, scale: 1, y: 0 }} 
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isSameSender ? '-mt-6' : ''}`}
                          >
                            <div className={`max-w-[70%] group`}>
                              <div className={`p-5 rounded-[2rem] shadow-2xl relative ${
                                isMe 
                                  ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-md shadow-indigo-500/20 ring-1 ring-white/10' 
                                  : 'glass-panel text-white rounded-tl-md ring-1 ring-white/5 bg-white/5'
                              }`}>
                                <p className="font-bold text-[15px] leading-relaxed break-words tracking-tight">{msg.text}</p>
                                <div className={`text-[9px] mt-3 font-black uppercase tracking-[0.2em] opacity-40 ${isMe ? 'text-indigo-100' : 'text-slate-500'} text-right`}>
                                  {msg.createdAt?.toDate().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                    
                    {/* Input Area */}
                    <div className="p-6 bg-white/5 backdrop-blur-3xl border-t border-white/10 flex items-center gap-5">
                      <div className="flex gap-2">
                        <button className="glass-icon-btn w-12 h-12 flex items-center justify-center rounded-xl text-slate-400 hover:text-indigo-400 transition-all active:scale-90"><ImageIcon size={22} /></button>
                        <button className="glass-icon-btn w-12 h-12 flex items-center justify-center rounded-xl text-slate-400 hover:text-indigo-400 transition-all active:scale-90"><Video size={22} /></button>
                      </div>
                      <div className="flex-1 relative group">
                        <input 
                          type="text" 
                          value={newMessageText} 
                          onChange={e => setNewMessageText(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                          placeholder={currentUserData?.isMuted || currentUserData?.isFrozen ? "Отправка сообщений ограничена" : "Написать сообщение..."}
                          disabled={currentUserData?.isMuted || currentUserData?.isFrozen}
                          className="w-full glass-input rounded-2xl px-8 py-5 font-bold text-white placeholder-slate-600 disabled:opacity-50 focus:ring-2 focus:ring-indigo-500/30 transition-all bg-white/5 border-white/5"
                        />
                      </div>
                      <button 
                        onClick={handleSendMessage} 
                        disabled={!newMessageText.trim() || currentUserData?.isMuted || currentUserData?.isFrozen} 
                        className="w-16 h-16 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl transition-all disabled:opacity-50 shadow-2xl shadow-indigo-500/40 active:scale-90 flex items-center justify-center group"
                      >
                        <Send size={24} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* COMMUNITIES TAB */}
            {activeTab === 'communities' && (
              <div className="max-w-6xl mx-auto px-4">
                {!activeCommunityId ? (
                  <>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                      <div>
                        <h1 className="text-5xl font-black tracking-tighter text-white mb-2">Сообщества</h1>
                        <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">Исследуйте и вступайте в группы по интересам</p>
                      </div>
                      <button 
                        onClick={() => setIsCreateCommunityModalOpen(true)} 
                        disabled={currentUserData?.isFrozen || currentUserData?.isMuted} 
                        className="glass-button-primary px-10 py-4 rounded-2xl font-black flex items-center gap-3 text-xs uppercase tracking-widest disabled:opacity-50 shadow-2xl shadow-indigo-500/30 active:scale-95 transition-all"
                      >
                        <Plus size={20} /> Создать
                      </button>
                    </div>

                    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                      {communities.map(comm => {
                        const isFollowing = follows.some(f => f.followerId === user.uid && f.followingId === comm.id);
                        return (
                          <motion.div 
                            key={comm.id} 
                            initial={{ opacity: 0, y: 30 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            onClick={() => { setActiveCommunityId(comm.id); setCommunityTab('posts'); }} 
                            className="glass-panel rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all group ring-1 ring-white/5 bg-white/5"
                          >
                            <div className="h-40 relative overflow-hidden">
                              {comm.coverImage ? (
                                <img src={comm.coverImage} alt="" className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-1000" />
                              ) : (
                                <div className="w-full h-full bg-mesh opacity-20 group-hover:scale-110 transition-transform duration-1000"></div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D12] via-[#0D0D12]/40 to-transparent"></div>
                              <div className="absolute bottom-4 left-6">
                                <div className="flex items-center gap-2">
                                  <h3 className="text-2xl font-black text-white tracking-tight group-hover:text-indigo-400 transition-colors">
                                    {comm.name}
                                  </h3>
                                  {comm.isVerified && <BadgeCheck size={20} className="text-indigo-400" />}
                                </div>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">@{comm.username}</p>
                              </div>
                            </div>
                            <div className="p-7 flex-1 flex flex-col">
                              <p className="text-slate-400 font-bold mb-8 line-clamp-3 flex-1 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity text-sm">{comm.description || 'Нет описания'}</p>
                              <div className="flex justify-between items-center mt-auto pt-6 border-t border-white/5">
                                <div className="flex items-center gap-4">
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <UsersRound size={16} className="text-indigo-500" /> 
                                    {comm.followersCount || 0}
                                  </span>
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <MessageSquare size={16} className="text-purple-500" /> 
                                    {comm.postsCount || 0}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  {isFollowing ? (
                                    <button onClick={(e) => { e.stopPropagation(); handleUnfollow(comm.id, 'community'); }} className="glass-button px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest">Отписаться</button>
                                  ) : (
                                    <button onClick={(e) => { e.stopPropagation(); handleFollow(comm.id, 'community'); }} className="glass-button-primary px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest">Подписаться</button>
                                  )}
                                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                    <ChevronRight size={20} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="space-y-12">
                    {/* Community Header */}
                    <div className="glass-panel rounded-[3rem] overflow-hidden shadow-2xl ring-1 ring-white/10 bg-black/40 backdrop-blur-3xl">
                      <div className="h-80 relative overflow-hidden">
                        {activeCommunity?.coverImage ? (
                          <img src={activeCommunity.coverImage} alt="" className="w-full h-full object-cover opacity-60" />
                        ) : (
                          <div className="w-full h-full bg-mesh opacity-20"></div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D12] via-[#0D0D12]/20 to-transparent"></div>
                        <button 
                          onClick={() => setActiveCommunityId(null)} 
                          className="absolute top-8 left-8 glass-icon-btn w-14 h-14 flex items-center justify-center rounded-2xl text-white/70 hover:text-white transition-all active:scale-90"
                        >
                          <ArrowLeft size={24} />
                        </button>
                      </div>
                      <div className="px-12 pb-12 -mt-24 relative">
                        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10">
                          <div className="flex flex-col md:flex-row items-center md:items-end gap-10 text-center md:text-left">
                            <div className="w-48 h-48 rounded-[3rem] overflow-hidden bg-[#16161D] shadow-2xl ring-8 ring-[#0D0D12] group shrink-0">
                              {activeCommunity?.photoURL ? (
                                <img src={activeCommunity.photoURL} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-700 bg-white/5">
                                  <UsersRound size={80} />
                                </div>
                              )}
                            </div>
                            <div className="mb-4">
                              <h2 className="text-5xl font-black text-white flex items-center justify-center md:justify-start gap-4 tracking-tighter mb-2">
                                {activeCommunity?.name}
                                {activeCommunity?.isVerified && <BadgeCheck size={32} className="text-indigo-400" />}
                                {activeCommunity?.isAdmin && <Shield size={32} className="text-purple-500" />}
                              </h2>
                              <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-xs">@{activeCommunity?.username}</p>
                            </div>
                          </div>
                          <div className="flex justify-center md:justify-start gap-4 mb-4">
                            {follows.some(f => f.followerId === user.uid && f.followingId === activeCommunityId) ? (
                              <button 
                                onClick={() => handleUnfollow(activeCommunityId!, 'community')} 
                                className="glass-button px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-3 active:scale-95 transition-all text-slate-400 hover:text-white"
                              >
                                <UserMinus size={20} /> Отписаться
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleFollow(activeCommunityId!, 'community')} 
                                className="glass-button-primary px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-3 shadow-2xl shadow-indigo-500/30 active:scale-95 transition-all"
                              >
                                <UserPlus size={20} /> Подписаться
                              </button>
                            )}
                            {activeCommunity?.creatorId === user.uid && (
                              <button 
                                onClick={() => setCommunityTab('settings')} 
                                className="glass-button w-14 h-14 flex items-center justify-center rounded-2xl font-black active:scale-95 transition-all text-slate-400 hover:text-white"
                              >
                                <Settings size={24} />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="mt-12 grid lg:grid-cols-3 gap-12">
                          <div className="lg:col-span-2">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">О сообществе</h4>
                            <p className="text-slate-300 font-bold leading-relaxed text-xl tracking-tight opacity-90">{activeCommunity?.description || 'Нет описания'}</p>
                          </div>
                          <div className="flex flex-wrap gap-8 lg:justify-end items-center">
                            <div className="text-center">
                              <p className="text-3xl font-black text-white tracking-tighter">{activeCommunity?.followersCount || 0}</p>
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Подписчики</p>
                            </div>
                            <div className="w-px h-10 bg-white/5 hidden sm:block"></div>
                            <div className="text-center">
                              <p className="text-3xl font-black text-white tracking-tighter">{activeCommunity?.postsCount || 0}</p>
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Публикации</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Community Tabs */}
                    <div className="flex gap-2 p-2 glass-panel rounded-[1.5rem] w-fit border border-white/10 shadow-2xl bg-black/20 backdrop-blur-xl">
                      <button 
                        onClick={() => setCommunityTab('posts')} 
                        className={`px-10 py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all relative ${
                          communityTab === 'posts' ? 'bg-white/10 text-white shadow-2xl ring-1 ring-white/10' : 'text-slate-500 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        Лента
                      </button>
                      <button 
                        onClick={() => setCommunityTab('members')} 
                        className={`px-10 py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all relative ${
                          communityTab === 'members' ? 'bg-white/10 text-white shadow-2xl ring-1 ring-white/10' : 'text-slate-500 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        Подписчики
                      </button>
                      {activeCommunity?.creatorId === user.uid && (
                        <button 
                          onClick={() => setCommunityTab('settings')} 
                          className={`px-10 py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all relative ${
                            communityTab === 'settings' ? 'bg-white/10 text-white shadow-2xl ring-1 ring-white/10' : 'text-slate-500 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          Настройки
                        </button>
                      )}
                    </div>

                    {/* Community Content */}
                    <div className="space-y-12">
                      {communityTab === 'posts' && (
                        <div className="space-y-12">
                          {(follows.some(f => f.followerId === user.uid && f.followingId === activeCommunityId) || activeCommunity?.creatorId === user.uid) && (
                            <div className="glass-panel p-10 rounded-[3rem] shadow-2xl ring-1 ring-white/10 bg-black/40 backdrop-blur-3xl">
                              <div className="flex gap-8">
                                <div className="relative shrink-0">
                                  <img src={currentUserData?.photoURL || ''} alt="" className="w-16 h-16 rounded-2xl object-cover ring-4 ring-white/5 shadow-2xl" />
                                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-4 border-[#0D0D12] rounded-full shadow-lg"></div>
                                </div>
                                <div className="flex-1">
                                  <textarea
                                    value={newPostText}
                                    onChange={(e) => setNewPostText(e.target.value)}
                                    placeholder="Что нового в сообществе?"
                                    className="w-full bg-white/5 border border-white/5 rounded-[2rem] p-8 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all min-h-[160px] resize-none font-bold text-lg leading-relaxed shadow-inner"
                                  />
                                  <div className="flex justify-between items-center mt-8">
                                    <div className="flex gap-3">
                                      <input type="file" id="community-post-image" className="hidden" onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const reader = new FileReader();
                                          reader.onloadend = () => setNewPostImage(reader.result as string);
                                          reader.readAsDataURL(file);
                                        }
                                      }} />
                                      <label htmlFor="community-post-image" className="glass-icon-btn w-12 h-12 flex items-center justify-center rounded-xl text-slate-400 hover:text-indigo-400 cursor-pointer transition-all active:scale-95">
                                        <ImagePlus size={24} />
                                      </label>
                                    </div>
                                    <button 
                                      onClick={() => handleCreatePost(activeCommunityId!)}
                                      disabled={!newPostText.trim() && !newPostImage}
                                      className="glass-button-primary px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-3 disabled:opacity-50 shadow-2xl shadow-indigo-500/30 active:scale-95 transition-all"
                                    >
                                      <Send size={18} /> Опубликовать
                                    </button>
                                  </div>
                                  {newPostImage && (
                                    <div className="mt-8 relative group inline-block">
                                      <img src={newPostImage} alt="" className="max-h-80 rounded-[2rem] object-cover ring-4 ring-white/5 shadow-2xl" />
                                      <button onClick={() => setNewPostImage('')} className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-black/60 backdrop-blur-md text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 shadow-xl">
                                        <X size={20} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="space-y-10">
                            {posts.filter(p => p.communityId === activeCommunityId).length > 0 ? (
                              posts.filter(p => p.communityId === activeCommunityId).map(post => {
                                const author = allUsers.find(u => u.id === post.userId);
                                const isLiked = post.likes?.includes(user.uid);
                                return (
                                  <motion.div 
                                    key={post.id} 
                                    initial={{ opacity: 0, y: 30 }} 
                                    animate={{ opacity: 1, y: 0 }} 
                                    className="glass-panel p-10 rounded-[3rem] shadow-2xl ring-1 ring-white/10 bg-black/20 group"
                                  >
                                    <div className="flex justify-between items-start mb-8">
                                      <div className="flex items-center gap-5 cursor-pointer" onClick={() => { setProfileViewUserId(post.userId); setActiveTab('profile'); }}>
                                        <div className="relative">
                                          <img src={author?.photoURL || ''} alt="" className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white/5 shadow-lg" />
                                        </div>
                                        <div>
                                          <h4 className="text-xl font-black text-white tracking-tight group-hover:text-indigo-400 transition-colors flex items-center gap-2">
                                            {author?.displayName}
                                            {renderVipBadge(author?.vipStatus)}
                                            {author?.isVerified && <BadgeCheck size={20} className="text-indigo-400" />}
                                          </h4>
                                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{new Date(post.createdAt?.toDate()).toLocaleString()}</p>
                                        </div>
                                      </div>
                                      {(post.userId === user.uid || activeCommunity?.creatorId === user.uid || currentUserData?.role === 'admin') && (
                                        <button 
                                          onClick={(e) => handleDeletePost(post.id, e)} 
                                          className="glass-icon-btn w-10 h-10 flex items-center justify-center rounded-xl text-slate-600 hover:text-red-500 transition-all"
                                        >
                                          <Trash2 size={18} />
                                        </button>
                                      )}
                                    </div>
                                    <p className="text-slate-300 font-bold text-lg leading-relaxed mb-8 opacity-90 whitespace-pre-wrap">{post.content}</p>
                                    {post.image && (
                                      <div className="mb-8 rounded-[2rem] overflow-hidden ring-1 ring-white/10 shadow-2xl">
                                        <img src={post.image} alt="" className="w-full h-auto max-h-[600px] object-cover" />
                                      </div>
                                    )}
                                    <div className="flex items-center gap-8 pt-8 border-t border-white/5">
                                      <button 
                                        onClick={(e) => handleLikePost(post.id, e)}
                                        className={`flex items-center gap-3 transition-all group/btn ${isLiked ? 'text-indigo-400' : 'text-slate-500 hover:text-indigo-400'}`}
                                      >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isLiked ? 'bg-indigo-500/20' : 'bg-white/5 group-hover/btn:bg-indigo-500/20'}`}>
                                          <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-widest">{post.likes?.length || 0}</span>
                                      </button>
                                      <div className="flex items-center gap-3 text-slate-500 hover:text-purple-400 transition-all group/btn">
                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover/btn:bg-purple-500/20 transition-all">
                                          <MessageCircle size={18} />
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-widest">0</span>
                                      </div>
                                      <button className="flex items-center gap-3 text-slate-500 hover:text-indigo-400 transition-all group/btn ml-auto">
                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover/btn:bg-indigo-500/20 transition-all">
                                          <Share2 size={18} />
                                        </div>
                                      </button>
                                    </div>
                                  </motion.div>
                                );
                              })
                            ) : (
                              <div className="glass-panel p-20 rounded-[3rem] text-center border border-dashed border-white/10 bg-black/10">
                                <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-slate-700">
                                  <MessageSquare size={48} />
                                </div>
                                <h3 className="text-2xl font-black text-white tracking-tight mb-3">Здесь пока пусто</h3>
                                <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">Станьте первым, кто опубликует пост!</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {communityTab === 'members' && (
                        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                          {follows.filter(f => f.followingId === activeCommunityId && f.type === 'community').map(follow => {
                            const followerData = allUsers.find(u => u.id === follow.followerId);
                            return (
                              <motion.div 
                                key={follow.id} 
                                initial={{ opacity: 0, scale: 0.95 }} 
                                animate={{ opacity: 1, scale: 1 }} 
                                className="glass-panel p-6 rounded-[2rem] flex items-center justify-between group hover:scale-[1.02] transition-all ring-1 ring-white/5 bg-white/5"
                              >
                                <div className="flex items-center gap-4 cursor-pointer" onClick={() => { setProfileViewUserId(follow.followerId); setActiveTab('profile'); }}>
                                  <div className="relative">
                                    <img src={followerData?.photoURL || ''} alt="" className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white/10" />
                                    {followerData?.isOnline && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-4 border-[#0D0D12] rounded-full"></div>}
                                  </div>
                                  <div>
                                    <h5 className="font-black text-white flex items-center gap-2 tracking-tight group-hover:text-indigo-400 transition-colors">
                                      {followerData?.displayName}
                                      {renderVipBadge(followerData?.vipStatus)}
                                    </h5>
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Подписчик</p>
                                  </div>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                  <ChevronRight size={20} />
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}

                      {communityTab === 'settings' && activeCommunity?.creatorId === user.uid && (
                        <div className="glass-panel p-8 rounded-3xl space-y-8">
                          <h3 className="text-2xl font-extrabold text-white">Настройки сообщества</h3>
                          <div className="space-y-6">
                            <div className="grid gap-6 md:grid-cols-2">
                              <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-400 ml-1">Название</label>
                                <input
                                  type="text"
                                  value={activeCommunity?.name}
                                  onChange={(e) => {
                                    const updated = communities.map(c => c.id === activeCommunityId ? { ...c, name: e.target.value } : c);
                                    setCommunities(updated);
                                  }}
                                  className="w-full glass-input rounded-xl px-4 py-3 text-white font-medium"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-400 ml-1">ID сообщества</label>
                                <input
                                  type="text"
                                  value={activeCommunity?.username}
                                  onChange={(e) => {
                                    const updated = communities.map(c => c.id === activeCommunityId ? { ...c, username: e.target.value } : c);
                                    setCommunities(updated);
                                  }}
                                  className="w-full glass-input rounded-xl px-4 py-3 text-white font-medium"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-bold text-slate-400 ml-1">Описание</label>
                              <textarea
                                value={activeCommunity?.description}
                                onChange={(e) => {
                                  const updated = communities.map(c => c.id === activeCommunityId ? { ...c, description: e.target.value } : c);
                                  setCommunities(updated);
                                }}
                                className="w-full glass-input rounded-xl px-4 py-3 text-white font-medium min-h-[100px] resize-none"
                              />
                            </div>
                            <div className="flex gap-4">
                              <button
                                onClick={async () => {
                                  await updateDoc(doc(db, 'communities', activeCommunityId!), {
                                    name: activeCommunity?.name,
                                    username: activeCommunity?.username,
                                    description: activeCommunity?.description
                                  });
                                  alert('Настройки сохранены');
                                }}
                                className="glass-button-primary px-8 py-3 rounded-xl font-bold"
                              >
                                Сохранить изменения
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PROFILE TAB */}
            {activeTab === 'profile' && viewingUserData && (
              <div className="pb-8 space-y-8">
                {/* Profile Header Card */}
                <div className="glass-panel rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5 relative group">
                  {/* Cover Image Section */}
                  <div className="relative h-56 sm:h-80 w-full overflow-hidden bg-[#0A0A0F]">
                    <motion.img 
                      initial={{ scale: 1.1, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.8 }}
                      src={viewingUserData.coverImage} 
                      alt="Cover" 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                      referrerPolicy="no-referrer" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F]/20 to-transparent"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.1),transparent_70%)]"></div>
                    
                    {(profileViewUserId === null || profileViewUserId === user?.uid) && (
                      <label className="absolute top-6 right-6 p-3.5 bg-white/5 hover:bg-white/10 backdrop-blur-xl rounded-2xl text-white transition-all cursor-pointer shadow-2xl border border-white/10 group/btn">
                        <Camera size={20} className="group-hover/btn:scale-110 transition-transform" />
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'cover')} />
                      </label>
                    )}
                  </div>

                  {/* Profile Content Section */}
                  <div className="px-6 sm:px-12 pb-12 relative">
                    {/* Avatar & Actions Row */}
                    <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end -mt-20 sm:-mt-24 mb-8 gap-6">
                      <div className="relative">
                        <motion.div 
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          className="w-36 h-36 sm:w-48 sm:h-48 rounded-[3rem] border-[8px] border-[#0A0A0F] bg-[#1A1B22] overflow-hidden shadow-2xl relative group/avatar"
                        >
                          <img src={viewingUserData.profileImage} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          {(profileViewUserId === null || profileViewUserId === user?.uid) && (
                            <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-all duration-300 cursor-pointer backdrop-blur-sm">
                              <Camera size={32} className="text-white scale-90 group-hover/avatar:scale-100 transition-transform" />
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'profile')} />
                            </label>
                          )}
                        </motion.div>
                        {/* Online Status Indicator */}
                        <div className="absolute bottom-4 right-4 w-6 h-6 bg-green-500 border-4 border-[#0A0A0F] rounded-full shadow-lg"></div>
                      </div>

                      <div className="flex flex-wrap justify-center gap-3">
                        {(profileViewUserId === null || profileViewUserId === user?.uid) ? (
                          <>
                            <button 
                              onClick={() => {
                                setEditForm({ 
                                  name: currentUserData.name, username: currentUserData.username, location: currentUserData.location, status: currentUserData.status,
                                  github: currentUserData.github || '', twitter: currentUserData.twitter || '', instagram: currentUserData.instagram || '', website: currentUserData.website || ''
                                });
                                setIsEditModalOpen(true);
                              }} 
                              disabled={currentUserData.isFrozen} 
                              className="glass-button px-8 py-3 rounded-2xl font-bold flex items-center gap-2.5 transition-all hover:bg-white/10 active:scale-95 disabled:opacity-50"
                            >
                              <Settings size={18} className="text-indigo-400" /> 
                              <span>Настройки</span>
                            </button>
                            {(currentUserData.isAdmin || user.email === 'alexeivasilev270819942@gmail.com') && (
                              <button 
                                onClick={() => setIsAdminPanelOpen(true)} 
                                className="glass-button-primary px-8 py-3 rounded-2xl font-bold flex items-center gap-2.5 shadow-lg shadow-indigo-500/20 active:scale-95"
                              >
                                <Shield size={18} /> 
                                <span>Админ Панель</span>
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => handleStartChat(viewingUserData.id)} 
                              className="glass-button-primary px-8 py-3 rounded-2xl font-bold flex items-center gap-2.5 shadow-lg shadow-indigo-500/20 active:scale-95"
                            >
                              <MessageCircle size={18} /> 
                              <span>Сообщение</span>
                            </button>
                            {friends.some(f => (f.user1 === viewingUserData.id && f.user2 === user.uid) || (f.user2 === viewingUserData.id && f.user1 === user.uid)) ? (
                              <button className="glass-button px-8 py-3 rounded-2xl font-bold flex items-center gap-2.5 opacity-60 cursor-default border-white/5">
                                <UserCheck size={18} className="text-green-400" /> 
                                <span>В друзьях</span>
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleAddFriend(viewingUserData.id)} 
                                className="glass-button px-8 py-3 rounded-2xl font-bold flex items-center gap-2.5 hover:bg-white/10 active:scale-95"
                              >
                                <UserPlus size={18} className="text-indigo-400" /> 
                                <span>Добавить</span>
                              </button>
                            )}
                            {follows.some(f => f.followerId === user.uid && f.followingId === viewingUserData.id) ? (
                              <button 
                                onClick={() => handleUnfollow(viewingUserData.id, 'user')} 
                                className="glass-button px-8 py-3 rounded-2xl font-bold flex items-center gap-2.5 hover:bg-red-500/10 hover:text-red-400 border-red-500/20 active:scale-95"
                              >
                                <UserMinus size={18} /> 
                                <span>Отписаться</span>
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleFollow(viewingUserData.id, 'user')} 
                                className="glass-button-primary px-8 py-3 rounded-2xl font-bold flex items-center gap-2.5 shadow-lg shadow-indigo-500/20 active:scale-95"
                              >
                                <UserPlus size={18} /> 
                                <span>Подписаться</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* User Info Section */}
                    <div className="max-w-3xl">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h1 className="text-4xl sm:text-5xl font-black tracking-tighter flex flex-wrap items-center gap-3">
                          <span className="text-gradient">{viewingUserData.name}</span>
                          <div className="flex gap-2">
                            {viewingUserData.isVerified && <BadgeCheck className="w-8 h-8 text-indigo-400 drop-shadow-[0_0_10px_rgba(129,140,248,0.5)]" />}
                            {viewingUserData.isAdmin && <Shield className="w-8 h-8 text-purple-500 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]" />}
                            {renderVipBadge(viewingUserData.vipStatus)}
                          </div>
                        </h1>
                      </div>
                      
                      <p className="text-indigo-400/80 font-bold text-xl mb-6 tracking-tight">@{viewingUserData.username}</p>
                      
                      {viewingUserData.status && (
                        <div className="relative mb-8">
                          <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500/50 to-transparent rounded-full"></div>
                          <p className="text-slate-300 font-medium text-lg leading-relaxed whitespace-pre-wrap break-words italic pl-2">
                            "{viewingUserData.status}"
                          </p>
                        </div>
                      )}

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="glass-panel p-4 rounded-3xl text-center border-white/5 hover:bg-white/5 transition-colors">
                          <div className="text-2xl font-black text-white">{posts.filter(p => p.userId === viewingUserData.id).length}</div>
                          <div className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Постов</div>
                        </div>
                        <div className="glass-panel p-4 rounded-3xl text-center border-white/5 hover:bg-white/5 transition-colors">
                          <div className="text-2xl font-black text-white">{follows.filter(f => f.followingId === viewingUserData.id).length}</div>
                          <div className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Подписчиков</div>
                        </div>
                        <div className="glass-panel p-4 rounded-3xl text-center border-white/5 hover:bg-white/5 transition-colors">
                          <div className="text-2xl font-black text-white">{follows.filter(f => f.followerId === viewingUserData.id).length}</div>
                          <div className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Подписок</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-slate-400 mb-8 font-bold">
                        {viewingUserData.location && (
                          <div className="flex items-center gap-2.5 bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
                            <MapPin size={16} className="text-indigo-400"/>
                            <span>{viewingUserData.location}</span>
                          </div>
                        )}
                        {viewingUserData.createdAt && (
                          <div className="flex items-center gap-2.5 bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
                            <Calendar size={16} className="text-indigo-400"/>
                            <span>В Jagooars с {viewingUserData.createdAt.toDate().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-3">
                        {viewingUserData.github && <a href={viewingUserData.github} target="_blank" rel="noreferrer" className="glass-icon-btn w-12 h-12 rounded-2xl"><Github size={20} /></a>}
                        {viewingUserData.twitter && <a href={viewingUserData.twitter} target="_blank" rel="noreferrer" className="glass-icon-btn w-12 h-12 rounded-2xl"><Twitter size={20} /></a>}
                        {viewingUserData.instagram && <a href={viewingUserData.instagram} target="_blank" rel="noreferrer" className="glass-icon-btn w-12 h-12 rounded-2xl"><Instagram size={20} /></a>}
                        {viewingUserData.website && <a href={viewingUserData.website} target="_blank" rel="noreferrer" className="glass-icon-btn w-12 h-12 rounded-2xl"><Globe size={20} /></a>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Posts Section */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between px-2">
                    <h2 className="text-3xl font-black text-white tracking-tight">Записи</h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent ml-6"></div>
                  </div>
                  
                  <div className="grid gap-6">
                    {posts.filter(p => p.userId === viewingUserData.id).length === 0 ? (
                      <div className="glass-panel py-24 rounded-[2.5rem] border-white/5 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                          <MessageSquare size={32} className="text-slate-600" />
                        </div>
                        <p className="text-slate-500 font-bold text-sm uppercase tracking-[0.2em]">Здесь пока нет постов</p>
                      </div>
                    ) : (
                        posts.filter(p => p.userId === viewingUserData.id).map(post => {
                          const isLiked = post.likes?.includes(user?.uid);
                          return (
                            <motion.div 
                              key={post.id} 
                              initial={{ opacity: 0, y: 20 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              viewport={{ once: true }}
                              className="bento-card p-6 sm:p-8 group"
                            >
                              <div className="flex justify-between items-start mb-6">
                                <div className="flex gap-4 items-center">
                                  <div className="relative">
                                    <img src={viewingUserData.profileImage} alt="Author" className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white/10 shadow-xl transition-transform group-hover:scale-105" />
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-[#0A0A0F] rounded-full"></div>
                                  </div>
                                  <div>
                                    <div className="font-black text-white flex items-center gap-2 text-lg tracking-tight">
                                      {viewingUserData.name}
                                      {viewingUserData.isVerified && <BadgeCheck size={18} className="text-indigo-400" />}
                                      {viewingUserData.isAdmin && <Shield size={16} className="text-purple-500" />}
                                      {renderVipBadge(viewingUserData.vipStatus)}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-indigo-400/80 tracking-tight">@{viewingUserData.username}</span>
                                      <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest">• {formatTimeAgo(post.createdAt)}</span>
                                    </div>
                                  </div>
                                </div>
                                {user.uid === post.userId && (
                                  <button 
                                    onClick={(e) => handleDeletePost(post.id, e)} 
                                    className="p-2.5 rounded-xl bg-white/5 text-slate-500 hover:bg-red-500/10 hover:text-red-500 transition-all active:scale-90"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                )}
                              </div>
                              
                              {post.text && <p className="text-slate-200 text-lg leading-relaxed mb-6 whitespace-pre-wrap font-medium break-words">{post.text}</p>}
                              
                              {post.image && (
                                <div className="rounded-[2.5rem] overflow-hidden mb-6 border border-white/5 shadow-2xl relative group/img ring-1 ring-white/10">
                                  <img src={post.image} alt="Post content" className="w-full h-auto object-cover max-h-[600px] transition-transform duration-700 group-hover/img:scale-105" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity"></div>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-8 pt-6 border-t border-white/5">
                                <button onClick={(e) => handleLikePost(post.id, e)} className={`flex items-center gap-3 transition-all group/btn ${post.likes?.includes(user.uid) ? 'text-rose-500' : 'text-slate-500 hover:text-rose-400'}`}>
                                  <div className={`p-3 rounded-2xl transition-all duration-300 ${post.likes?.includes(user.uid) ? 'bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.2)]' : 'bg-white/5 group-hover/btn:bg-rose-500/10'}`}>
                                    <Heart size={20} fill={post.likes?.includes(user.uid) ? "currentColor" : "none"} className={post.likes?.includes(user.uid) ? 'scale-110' : 'group-hover/btn:scale-110 transition-transform'} />
                                  </div>
                                  <span className="font-black text-sm tracking-tighter">{post.likes?.length || 0}</span>
                                </button>
                                
                                <button onClick={() => { setCommentingPostId(post.id); setIsCommentModalOpen(true); }} className="flex items-center gap-3 text-slate-500 hover:text-indigo-400 transition-all group/btn">
                                  <div className="p-3 rounded-2xl bg-white/5 group-hover/btn:bg-indigo-500/10 transition-all duration-300">
                                    <MessageCircle size={20} className="group-hover/btn:scale-110 transition-transform" />
                                  </div>
                                  <span className="font-black text-sm tracking-tighter">{post.comments?.length || 0}</span>
                                </button>
                                
                                <button className="flex items-center gap-3 text-slate-500 hover:text-emerald-400 transition-all group/btn ml-auto">
                                  <div className="p-3 rounded-2xl bg-white/5 group-hover/btn:bg-emerald-500/10 transition-all duration-300">
                                    <Share2 size={20} className="group-hover/btn:scale-110 transition-transform" />
                                  </div>
                                </button>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

          </motion.div>
        </AnimatePresence>
      </main>

      {/* Comment Modal */}
      <AnimatePresence>
        {isCommentModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsCommentModalOpen(false); setCommentingPostId(null); }}
              className="absolute inset-0 bg-black/60 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 40 }} 
              className="glass-panel rounded-[3rem] w-full max-w-2xl overflow-hidden max-h-[85vh] flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.5)] ring-1 ring-white/10 relative z-10"
            >
              <div className="flex justify-between items-center p-8 sm:p-10 pb-6 border-b border-white/5">
                <div>
                  <h2 className="text-3xl font-black tracking-tighter text-white mb-1">Комментарии</h2>
                  <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Обсуждение публикации</p>
                </div>
                <button onClick={() => { setIsCommentModalOpen(false); setCommentingPostId(null); }} className="glass-icon-btn p-3 rounded-2xl text-slate-400 hover:text-white transition-all active:scale-90">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-8 sm:p-10 space-y-8">
                {posts.find(p => p.id === commentingPostId)?.comments?.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center text-center opacity-50">
                    <MessageCircle size={48} className="text-slate-600 mb-4" />
                    <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Комментариев пока нет</p>
                  </div>
                ) : (
                  posts.find(p => p.id === commentingPostId)?.comments?.map((comment: any) => (
                    <div key={comment.id} className="flex gap-4 group">
                      <img src={comment.userAvatar} alt={comment.userName} className="w-12 h-12 rounded-2xl object-cover ring-2 ring-white/5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-black text-white text-sm tracking-tight">{comment.userName}</span>
                          <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                            {formatTimeAgo({ toDate: () => new Date(comment.createdAt) } as any)}
                          </span>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed bg-white/5 p-4 rounded-2xl rounded-tl-none border border-white/5 group-hover:bg-white/10 transition-colors">
                          {comment.text}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-8 sm:p-10 pt-6 bg-black/40 backdrop-blur-2xl border-t border-white/5">
                <div className="relative group">
                  <textarea 
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Напишите комментарий..."
                    rows={2}
                    className="w-full glass-input rounded-3xl pl-6 pr-20 py-5 text-white font-medium text-sm resize-none focus:ring-2 ring-indigo-500/50 transition-all placeholder:text-slate-700 leading-relaxed"
                  />
                  <button 
                    onClick={handleCommentPost}
                    disabled={!newCommentText.trim() || isCommenting}
                    className="absolute right-4 bottom-4 p-4 rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-400 active:scale-90 transition-all disabled:opacity-50 disabled:scale-100"
                  >
                    {isCommenting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send size={20} />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 40 }} 
              className="glass-panel rounded-[3rem] w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.5)] ring-1 ring-white/10 relative z-10"
            >
              <div className="flex justify-between items-center p-8 sm:p-12 pb-6">
                <div>
                  <h2 className="text-4xl font-black tracking-tighter text-white mb-2">Настройки профиля</h2>
                  <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Персонализируйте свой аккаунт</p>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="glass-icon-btn p-4 rounded-2xl text-slate-400 hover:text-white transition-all active:scale-90">
                  <X size={24} />
                </button>
              </div>

              <div className="px-8 sm:px-12 py-0 space-y-10 overflow-y-auto custom-scrollbar flex-1">
                {profileError && (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-5 bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold rounded-2xl flex items-center gap-3"
                  >
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    {profileError}
                  </motion.div>
                )}

                <div className="space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400/80 ml-1">Имя и фамилия</label>
                      <input 
                        type="text" 
                        value={editForm.name} 
                        onChange={e => setEditForm({...editForm, name: e.target.value})} 
                        className="w-full glass-input rounded-2xl px-6 py-4 text-white font-bold text-lg focus:ring-2 ring-indigo-500/50 transition-all placeholder:text-slate-700"
                        placeholder="Ваше имя"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400/80 ml-1">Имя пользователя</label>
                      <div className="relative">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 font-black text-lg">@</span>
                        <input 
                          type="text" 
                          value={editForm.username} 
                          onChange={e => setEditForm({...editForm, username: e.target.value})} 
                          className="w-full glass-input rounded-2xl pl-12 pr-6 py-4 text-white font-bold text-lg focus:ring-2 ring-indigo-500/50 transition-all placeholder:text-slate-700"
                          placeholder="username"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400/80 ml-1">Местоположение</label>
                    <div className="relative group">
                      <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
                      <input 
                        type="text" 
                        value={editForm.location} 
                        onChange={e => setEditForm({...editForm, location: e.target.value})} 
                        className="w-full glass-input rounded-2xl pl-14 pr-6 py-4 text-white font-bold text-lg focus:ring-2 ring-indigo-500/50 transition-all placeholder:text-slate-700"
                        placeholder="Город, Страна"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400/80 ml-1">О себе</label>
                    <textarea 
                      value={editForm.status} 
                      onChange={e => setEditForm({...editForm, status: e.target.value})} 
                      rows={4} 
                      className="w-full glass-input rounded-3xl px-6 py-5 text-white font-medium text-lg resize-none focus:ring-2 ring-indigo-500/50 transition-all placeholder:text-slate-700 leading-relaxed"
                      placeholder="Расскажите немного о себе..."
                    />
                  </div>
                  
                  <div className="pt-4 space-y-6">
                    <div className="flex items-center gap-4">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Социальные сети</h3>
                      <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/20 to-transparent"></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-slate-500 group-focus-within:text-white group-focus-within:bg-indigo-500/20 transition-all">
                          <Github size={20} />
                        </div>
                        <input type="text" placeholder="GitHub URL" value={editForm.github} onChange={e => setEditForm({...editForm, github: e.target.value})} className="w-full glass-input rounded-2xl pl-18 pr-6 py-4 text-white font-bold transition-all placeholder:text-slate-700" />
                      </div>
                      <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-slate-500 group-focus-within:text-white group-focus-within:bg-indigo-500/20 transition-all">
                          <Twitter size={20} />
                        </div>
                        <input type="text" placeholder="Twitter URL" value={editForm.twitter} onChange={e => setEditForm({...editForm, twitter: e.target.value})} className="w-full glass-input rounded-2xl pl-18 pr-6 py-4 text-white font-bold transition-all placeholder:text-slate-700" />
                      </div>
                      <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-slate-500 group-focus-within:text-white group-focus-within:bg-indigo-500/20 transition-all">
                          <Instagram size={20} />
                        </div>
                        <input type="text" placeholder="Instagram URL" value={editForm.instagram} onChange={e => setEditForm({...editForm, instagram: e.target.value})} className="w-full glass-input rounded-2xl pl-18 pr-6 py-4 text-white font-bold transition-all placeholder:text-slate-700" />
                      </div>
                      <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-slate-500 group-focus-within:text-white group-focus-within:bg-indigo-500/20 transition-all">
                          <Globe size={20} />
                        </div>
                        <input type="text" placeholder="Website URL" value={editForm.website} onChange={e => setEditForm({...editForm, website: e.target.value})} className="w-full glass-input rounded-2xl pl-18 pr-6 py-4 text-white font-bold transition-all placeholder:text-slate-700" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 sm:p-12 pt-6 flex flex-col sm:flex-row justify-end gap-4 bg-black/40 backdrop-blur-2xl border-t border-white/5">
                <button 
                  onClick={() => setIsEditModalOpen(false)} 
                  className="glass-button px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all order-2 sm:order-1"
                >
                  Отмена
                </button>
                <button 
                  onClick={handleSaveProfile} 
                  disabled={isSaving} 
                  className="glass-button-primary px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-50 shadow-2xl shadow-indigo-500/20 active:scale-95 transition-all order-1 sm:order-2 flex items-center justify-center gap-3"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Сохранение</span>
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      <span>Сохранить</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Community Modal */}
      <AnimatePresence>
        {isCreateCommunityModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateCommunityModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 40 }} 
              className="glass-panel rounded-[3rem] w-full max-w-lg overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] ring-1 ring-white/10 relative z-10"
            >
              <div className="flex justify-between items-center p-10 pb-6">
                <div>
                  <h2 className="text-3xl font-black tracking-tighter text-white mb-1">Новое сообщество</h2>
                  <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Создайте свое пространство</p>
                </div>
                <button onClick={() => setIsCreateCommunityModalOpen(false)} className="glass-icon-btn p-3 rounded-2xl text-slate-400 hover:text-white transition-all active:scale-90">
                  <X size={24} />
                </button>
              </div>

              <div className="p-10 pt-0 space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400/80 ml-1">Название</label>
                  <input 
                    type="text" 
                    value={newCommunityName} 
                    onChange={e => setNewCommunityName(e.target.value)} 
                    className="w-full glass-input rounded-2xl px-6 py-4 text-white font-bold text-lg focus:ring-2 ring-indigo-500/50 transition-all placeholder:text-slate-700"
                    placeholder="Название сообщества"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400/80 ml-1">Уникальный @id</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 font-black text-lg">@</span>
                    <input 
                      type="text" 
                      value={newCommunityUsername} 
                      onChange={e => setNewCommunityUsername(e.target.value)} 
                      placeholder="my_group" 
                      className="w-full glass-input rounded-2xl pl-12 pr-6 py-4 text-white font-bold text-lg focus:ring-2 ring-indigo-500/50 transition-all placeholder:text-slate-700"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400/80 ml-1">Описание</label>
                  <textarea 
                    value={newCommunityDesc} 
                    onChange={e => setNewCommunityDesc(e.target.value)} 
                    rows={4} 
                    className="w-full glass-input rounded-3xl px-6 py-5 text-white font-medium text-lg resize-none focus:ring-2 ring-indigo-500/50 transition-all placeholder:text-slate-700 leading-relaxed"
                    placeholder="О чем ваше сообщество?"
                  />
                </div>
              </div>

              <div className="p-10 pt-6 flex justify-end gap-4 bg-black/20 backdrop-blur-md border-t border-white/5">
                <button 
                  onClick={() => setIsCreateCommunityModalOpen(false)} 
                  className="glass-button px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
                >
                  Отмена
                </button>
                <button 
                  onClick={handleCreateCommunity} 
                  disabled={!newCommunityName.trim() || !newCommunityUsername.trim()} 
                  className="glass-button-primary px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-50 shadow-xl shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-3"
                >
                  <Plus size={18} />
                  <span>Создать</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Panel Modal */}
      <AnimatePresence>
        {isAdminPanelOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 40 }} className="glass-panel rounded-[3rem] w-full max-w-5xl overflow-hidden max-h-[90vh] flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.5)] ring-1 ring-white/10">
              <div className="flex justify-between items-center p-10 pb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center shadow-inner ring-1 ring-indigo-500/20">
                    <Shield size={32} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tighter text-white">Админ Панель</h2>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Управление платформой</p>
                  </div>
                </div>
                <button onClick={() => setIsAdminPanelOpen(false)} className="glass-icon-btn p-3 rounded-2xl text-slate-400 hover:text-white transition-all active:scale-90"><X size={24} /></button>
              </div>
              
              <div className="flex px-10 border-b border-white/5 bg-black/20">
                <button onClick={() => setAdminTab('users')} className={`px-8 py-5 font-black text-xs uppercase tracking-[0.2em] transition-all relative ${adminTab === 'users' ? 'text-indigo-400' : 'text-slate-500 hover:text-white'}`}>
                  Пользователи
                  {adminTab === 'users' && <motion.div layoutId="adminTab" className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500 rounded-full" />}
                </button>
                <button onClick={() => setAdminTab('communities')} className={`px-8 py-5 font-black text-xs uppercase tracking-[0.2em] transition-all relative ${adminTab === 'communities' ? 'text-indigo-400' : 'text-slate-500 hover:text-white'}`}>
                  Сообщества
                  {adminTab === 'communities' && <motion.div layoutId="adminTab" className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500 rounded-full" />}
                </button>
              </div>

              <div className="p-10 overflow-y-auto custom-scrollbar flex-1 bg-black/10">
                <div className="grid grid-cols-1 gap-4">
                  {adminTab === 'users' && allUsers.map(u => (
                    <div key={u.id} className="glass-panel p-6 rounded-3xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 hover:bg-white/5 transition-all ring-1 ring-white/5">
                      <div className="flex items-center gap-5">
                        <div className="relative">
                          <img src={u.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`} alt={u.name} className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white/10 shadow-lg" />
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-[#16161D] ${u.isOnline ? 'bg-green-500' : 'bg-slate-600'}`}></div>
                        </div>
                        <div>
                          <p className="font-black text-white text-lg flex items-center gap-2 tracking-tight">
                            {u.name}
                            {u.isVerified && <BadgeCheck size={18} className="text-indigo-400" />}
                            {u.isAdmin && <Shield size={18} className="text-purple-500" />}
                            {renderVipBadge(u.vipStatus)}
                          </p>
                          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">@{u.username}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => handleToggleUserStatus(u.id, 'isAdmin', u.isAdmin)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${u.isAdmin ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}>Admin</button>
                        <button onClick={() => handleToggleUserStatus(u.id, 'isVerified', u.isVerified)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${u.isVerified ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}>Verified</button>
                        <button onClick={() => handleToggleUserStatus(u.id, 'isMuted', u.isMuted)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${u.isMuted ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}>Muted</button>
                        <button onClick={() => handleToggleUserStatus(u.id, 'isFrozen', u.isFrozen)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${u.isFrozen ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}>Frozen</button>
                        <button onClick={() => handleToggleUserStatus(u.id, 'isBanned', u.isBanned)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${u.isBanned ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}>Banned</button>
                        <div className="h-8 w-px bg-white/5 mx-2 self-center hidden lg:block"></div>
                        <div className="flex gap-1">
                          <button onClick={() => handleSetUserVip(u.id, u.vipStatus === 'bronze' ? 'none' : 'bronze')} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${u.vipStatus === 'bronze' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' : 'bg-white/5 text-slate-500 hover:bg-white/10 hover:text-white'}`} title="VIP Bronze"><Award size={18} /></button>
                          <button onClick={() => handleSetUserVip(u.id, u.vipStatus === 'silver' ? 'none' : 'silver')} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${u.vipStatus === 'silver' ? 'bg-slate-400 text-white shadow-lg shadow-slate-400/20' : 'bg-white/5 text-slate-500 hover:bg-white/10 hover:text-white'}`} title="VIP Silver"><Award size={18} /></button>
                          <button onClick={() => handleSetUserVip(u.id, u.vipStatus === 'gold' ? 'none' : 'gold')} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${u.vipStatus === 'gold' ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/20' : 'bg-white/5 text-slate-500 hover:bg-white/10 hover:text-white'}`} title="VIP Gold"><Award size={18} /></button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {adminTab === 'communities' && communities.map(c => (
                    <div key={c.id} className="glass-panel p-6 rounded-3xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 hover:bg-white/5 transition-all ring-1 ring-white/5">
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 font-black text-2xl shadow-inner ring-1 ring-indigo-500/20">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-white text-lg tracking-tight">
                            {c.name}
                            {c.isVerified && <BadgeCheck size={18} className="text-indigo-400" />}
                            {c.isAdmin && <Shield size={18} className="text-purple-500" />}
                          </p>
                          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">@{c.username}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => handleToggleCommunityStatus(c.id, 'isAdmin', c.isAdmin)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${c.isAdmin ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}>Admin</button>
                        <button onClick={() => handleToggleCommunityStatus(c.id, 'isVerified', c.isVerified)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${c.isVerified ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}>Verified</button>
                        <button onClick={() => handleToggleCommunityStatus(c.id, 'isMuted', c.isMuted)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${c.isMuted ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}>Muted</button>
                        <button onClick={() => handleToggleCommunityStatus(c.id, 'isFrozen', c.isFrozen)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${c.isFrozen ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}>Frozen</button>
                        <button onClick={() => handleToggleCommunityStatus(c.id, 'isBanned', c.isBanned)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${c.isBanned ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}>Banned</button>
                        <div className="h-8 w-px bg-white/5 mx-2 self-center hidden lg:block"></div>
                        <button onClick={() => {
                          if (confirm(`Вы уверены, что хотите удалить сообщество "${c.name}"?`)) {
                            deleteDoc(doc(db, 'communities', c.id));
                          }
                        }} className="glass-button px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-red-400 hover:bg-red-400/10 hover:text-red-300 transition-all active:scale-95">
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-10 pt-6 flex justify-end bg-black/20 backdrop-blur-md border-t border-white/5">
                <button onClick={() => setIsAdminPanelOpen(false)} className="glass-button-primary px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95 transition-all">Закрыть</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
