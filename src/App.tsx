import React, { useState, useEffect } from 'react';
import { Settings, MapPin, Link as LinkIcon, Calendar, Grid, Video, Bookmark, MoreHorizontal, Heart, MessageCircle, BadgeCheck, Camera, Pencil, X, LogOut } from 'lucide-react';
import { motion } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import { auth, db } from './firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // Real-time state
  const [followers, setFollowers] = useState(12500);
  const [posts, setPosts] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Image upload state
  const [coverImage, setCoverImage] = useState('https://storage.googleapis.com/aistudio-user-uploads/0d0325b3-0570-49b8-a159-45f866637311/image.png');
  const [profileImage, setProfileImage] = useState('https://storage.googleapis.com/aistudio-user-uploads/9b109315-9988-4e1b-b461-9c3a37d2f9d1/image.png');

  // Profile info state
  const [name, setName] = useState('Alexei Vasilev');
  const [username, setUsername] = useState('alexeiv');
  const [location, setLocation] = useState('San Francisco, CA');
  const [status, setStatus] = useState('Software Engineer & Designer. Passionate about creating beautiful and functional user interfaces. Exploring the intersection of AI and web development. 🚀✨');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', username: '', location: '', status: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !user) return;

    const userDocRef = doc(db, 'users', user.uid);
    
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setName(data.name || '');
        setUsername(data.username || '');
        setLocation(data.location || '');
        setStatus(data.status || '');
        if (data.profileImage) setProfileImage(data.profileImage);
        if (data.coverImage) setCoverImage(data.coverImage);
      } else {
        // Create initial profile if it doesn't exist
        const initialData = {
          uid: user.uid,
          name: user.displayName || 'New User',
          username: user.email?.split('@')[0] || 'user',
          location: '',
          status: '',
          profileImage: user.photoURL || profileImage,
          coverImage: coverImage,
          createdAt: serverTimestamp()
        };
        
        setDoc(userDocRef, initialData).catch(error => {
          handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

  const handleLogin = async () => {
    setLoginError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login failed", error);
      if (error.code === 'auth/unauthorized-domain') {
        setLoginError("Домен jagooars.vercel.app не разрешен в Firebase. Добавьте его в консоли Firebase (Authentication -> Settings -> Authorized domains).");
      } else {
        setLoginError(error.message || "Произошла ошибка при авторизации.");
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const openEditModal = () => {
    setEditForm({ name, username, location, status });
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        name: editForm.name,
        username: editForm.username,
        location: editForm.location,
        status: editForm.status,
      }, { merge: true });
      setIsEditModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover') => {
    if (!user) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        if (type === 'profile') setProfileImage(base64String);
        else setCoverImage(base64String);

        try {
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, {
            uid: user.uid,
            [type === 'profile' ? 'profileImage' : 'coverImage']: base64String
          }, { merge: true });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    // Connect to the WebSocket server
    const newSocket = io(window.location.origin);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('initial_state', (state) => {
      setFollowers(state.followers);
      setPosts(state.posts);
    });

    newSocket.on('followers_update', (newFollowersCount) => {
      setFollowers(newFollowersCount);
    });

    newSocket.on('post_updated', (updatedPost) => {
      setPosts(currentPosts => 
        currentPosts.map(p => p.id === updatedPost.id ? updatedPost : p)
      );
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleLikePost = (postId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (socket) {
      socket.emit('like_post', postId);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toLocaleString();
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-medium">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Settings size={40} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Добро пожаловать</h1>
          <p className="text-slate-500 mb-6">Войдите, чтобы создать и настроить свой профиль.</p>
          
          {loginError && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 text-left">
              <p className="font-semibold mb-1">Ошибка входа:</p>
              <p>{loginError}</p>
            </div>
          )}

          <button 
            onClick={handleLogin}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all active:scale-95 shadow-md flex items-center justify-center gap-2"
          >
            Войти через Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-900 font-sans pb-20 selection:bg-blue-200">
      {/* Live Indicator */}
      <div className="fixed top-4 left-4 z-50 flex items-center gap-2 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-slate-200/50">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
          {isConnected ? 'Live Sync' : 'Connecting...'}
        </span>
      </div>

      {/* Cover Photo Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-6xl mx-auto md:pt-6 md:px-6"
      >
        <div className="relative h-56 sm:h-72 md:h-80 w-full md:rounded-[2rem] overflow-hidden shadow-sm">
          <img 
            src={coverImage} 
            alt="Cover" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent"></div>
          <div className="absolute top-4 right-4 md:top-6 md:right-6 flex gap-2 z-10">
            <label className="p-2.5 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-all cursor-pointer flex items-center justify-center shadow-sm" title="Change Cover Photo">
              <Camera size={20} />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'cover')} />
            </label>
            <button onClick={handleLogout} className="p-2.5 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-all cursor-pointer shadow-sm" title="Выйти">
              <LogOut size={20} />
            </button>
            <button className="p-2.5 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-all cursor-pointer shadow-sm">
              <Settings size={20} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Profile Content */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto px-5 sm:px-8"
      >
        {/* Header Row: Avatar & Actions */}
        <div className="relative flex flex-col sm:flex-row sm:justify-between sm:items-end -mt-16 sm:-mt-20 mb-6 sm:mb-8 gap-4 sm:gap-0">
          <motion.div variants={itemVariants} className="relative z-10 self-start sm:self-auto">
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-[6px] border-[#f8f9fa] bg-white overflow-hidden shadow-xl flex items-center justify-center relative group">
              <img 
                src={profileImage} 
                alt="Profile" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 rounded-full shadow-inner pointer-events-none"></div>
              
              {/* Hover overlay for avatar */}
              <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full" title="Change Profile Photo">
                <Camera size={32} className="text-white drop-shadow-md" />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'profile')} />
              </label>
            </div>
          </motion.div>
          
          <motion.div variants={itemVariants} className="flex items-center gap-3 pb-2 sm:pb-4">
            <button 
              className="px-8 py-2.5 font-medium rounded-full transition-all active:scale-95 shadow-md hover:shadow-lg cursor-pointer bg-slate-900 text-white hover:bg-slate-800"
            >
              Опубликовать
            </button>
            <button 
              onClick={openEditModal}
              className="p-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-full transition-all active:scale-95 shadow-sm border border-slate-200 hover:border-slate-300 cursor-pointer"
              title="Редактировать профиль"
            >
              <Pencil size={20} />
            </button>
          </motion.div>
        </div>

        {/* Info Section */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">{name}</h1>
            <BadgeCheck className="w-7 h-7 text-white fill-blue-500 drop-shadow-sm" aria-label="Verified" />
          </div>
          <p className="text-slate-500 font-medium text-lg mb-5">@{username}</p>
          
          {status && (
            <p className="text-slate-700 text-base sm:text-lg mb-6 leading-relaxed max-w-2xl whitespace-pre-wrap">
              {status}
            </p>
          )}

          <div className="flex flex-wrap gap-y-3 gap-x-6 text-sm sm:text-base text-slate-500 mb-8 font-medium">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-slate-400" />
              <span>{location}</span>
            </div>
            <div className="flex items-center gap-2">
              <LinkIcon size={18} className="text-slate-400" />
              <a href="#" className="text-blue-600 hover:text-blue-700 hover:underline transition-colors">alexeiv.dev</a>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-slate-400" />
              <span>Joined March 2020</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-8 sm:gap-12 py-6 border-y border-slate-200/60">
            <div className="flex flex-col cursor-pointer group">
              <span className="font-bold text-2xl sm:text-3xl text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">248</span>
              <span className="text-xs sm:text-sm text-slate-500 font-semibold uppercase tracking-wider mt-1">Posts</span>
            </div>
            <div className="flex flex-col cursor-pointer group">
              <span className="font-bold text-2xl sm:text-3xl text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">
                <motion.span
                  key={followers}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-block"
                >
                  {formatNumber(followers)}
                </motion.span>
              </span>
              <span className="text-xs sm:text-sm text-slate-500 font-semibold uppercase tracking-wider mt-1">Followers</span>
            </div>
            <div className="flex flex-col cursor-pointer group">
              <span className="font-bold text-2xl sm:text-3xl text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">1,042</span>
              <span className="text-xs sm:text-sm text-slate-500 font-semibold uppercase tracking-wider mt-1">Following</span>
            </div>
          </div>
        </motion.div>

        {/* Grid Content */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-3 gap-2 sm:gap-4"
        >
          {posts.map((post) => (
            <motion.div 
              variants={itemVariants}
              key={post.id} 
              className="aspect-square bg-slate-100 rounded-xl sm:rounded-2xl overflow-hidden group relative cursor-pointer shadow-sm hover:shadow-md transition-shadow"
              onClick={(e) => handleLikePost(post.id, e)}
            >
              <img 
                src={`https://picsum.photos/seed/${post.seed}/400/400`} 
                alt={`Post ${post.id}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/40 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-[2px]">
                <div className="text-white font-bold flex gap-6 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                  <span className="flex items-center gap-2 drop-shadow-md hover:text-red-400 transition-colors">
                    <Heart size={20} className="fill-current" /> 
                    <motion.span key={post.likes} initial={{ scale: 1.5 }} animate={{ scale: 1 }}>
                      {post.likes}
                    </motion.span>
                  </span>
                  <span className="flex items-center gap-2 drop-shadow-md">
                    <MessageCircle size={20} className="fill-current" /> {post.comments}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
          >
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Редактировать профиль</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                <X size={24} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Имя и фамилия</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Имя пользователя (@iduser)</label>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Страна, область, город</label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Статус профиля (О себе)</label>
                <textarea
                  value={editForm.status}
                  onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Расскажите немного о себе..."
                />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-5 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm cursor-pointer disabled:opacity-70"
              >
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
