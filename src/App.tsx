import React, { useState, useEffect, useRef } from 'react';
import { Settings, MapPin, Link as LinkIcon, Calendar, Heart, MessageCircle, BadgeCheck, Camera, Pencil, X, LogOut, Github, Twitter, Instagram, Globe, Trash2, Image as ImageIcon, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from './firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp, collection, query, orderBy, addDoc, updateDoc, deleteDoc, increment } from 'firebase/firestore';

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
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // Profile info state
  const [name, setName] = useState('New User');
  const [username, setUsername] = useState('user');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('');
  const [socials, setSocials] = useState({ github: '', twitter: '', instagram: '', website: '' });
  const [coverImage, setCoverImage] = useState('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop');
  const [profileImage, setProfileImage] = useState('https://api.dicebear.com/7.x/avataaars/svg?seed=Jaguar');
  const [createdAt, setCreatedAt] = useState<any>(null);

  // Posts state
  const [posts, setPosts] = useState<any[]>([]);
  const [newPostText, setNewPostText] = useState('');
  const [newPostImage, setNewPostImage] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', username: '', location: '', status: '', github: '', twitter: '', instagram: '', website: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Fetch User Profile
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
        setSocials({
          github: data.github || '',
          twitter: data.twitter || '',
          instagram: data.instagram || '',
          website: data.website || ''
        });
        if (data.profileImage) setProfileImage(data.profileImage);
        if (data.coverImage) setCoverImage(data.coverImage);
        if (data.createdAt) setCreatedAt(data.createdAt.toDate());
      } else {
        // Create initial profile
        const initialData = {
          uid: user.uid,
          name: user.displayName || 'New User',
          username: user.email?.split('@')[0] || 'user',
          location: '',
          status: 'Привет! Я использую Jagooars 🐆',
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

  // Fetch Posts
  useEffect(() => {
    if (!isAuthReady || !user) return;

    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(postsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
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
        setLoginError("Домен не разрешен в Firebase. Добавьте его в консоли Firebase (Authentication -> Settings -> Authorized domains).");
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
    setEditForm({ 
      name, 
      username, 
      location, 
      status,
      github: socials.github,
      twitter: socials.twitter,
      instagram: socials.instagram,
      website: socials.website
    });
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
        github: editForm.github,
        twitter: editForm.twitter,
        instagram: editForm.instagram,
        website: editForm.website,
      }, { merge: true });
      setIsEditModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover' | 'post') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        
        if (type === 'post') {
          setNewPostImage(base64String);
          return;
        }

        if (!user) return;
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

  const handleCreatePost = async () => {
    if (!user || (!newPostText.trim() && !newPostImage)) return;
    setIsPosting(true);
    try {
      await addDoc(collection(db, 'posts'), {
        userId: user.uid,
        authorName: name,
        authorUsername: username,
        authorImage: profileImage,
        text: newPostText.trim(),
        image: newPostImage,
        likes: 0,
        comments: 0,
        createdAt: serverTimestamp()
      });
      setNewPostText('');
      setNewPostImage('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'posts');
    } finally {
      setIsPosting(false);
    }
  };

  const handleLikePost = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        likes: increment(1)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
    }
  };

  const handleDeletePost = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `posts/${postId}`);
    }
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
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-zinc-500 font-medium">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Settings size={40} />
          </div>
          <h1 className="text-3xl font-bold text-zinc-100 mb-2">Jagooars</h1>
          <p className="text-zinc-400 mb-6">Войдите, чтобы создать и настроить свой профиль.</p>
          
          {loginError && (
            <div className="mb-6 p-4 bg-red-500/10 text-red-400 text-sm rounded-xl border border-red-500/20 text-left">
              <p className="font-semibold mb-1">Ошибка входа:</p>
              <p>{loginError}</p>
            </div>
          )}

          <button 
            onClick={handleLogin}
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
          >
            Войти через Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-20 selection:bg-amber-500/30">
      {/* Cover Photo Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-6xl mx-auto md:pt-6 md:px-6"
      >
        <div className="relative h-56 sm:h-72 md:h-80 w-full md:rounded-[2rem] overflow-hidden shadow-2xl border border-zinc-800/50">
          <img 
            src={coverImage} 
            alt="Cover" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/50 via-transparent to-transparent"></div>
          <div className="absolute top-4 right-4 md:top-6 md:right-6 flex gap-2 z-10">
            <label className="p-2.5 bg-zinc-900/60 hover:bg-zinc-900/80 backdrop-blur-md rounded-full text-zinc-200 transition-all cursor-pointer flex items-center justify-center border border-zinc-700/50" title="Изменить обложку">
              <Camera size={20} />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'cover')} />
            </label>
            <button onClick={handleLogout} className="p-2.5 bg-zinc-900/60 hover:bg-zinc-900/80 backdrop-blur-md rounded-full text-zinc-200 transition-all cursor-pointer border border-zinc-700/50" title="Выйти">
              <LogOut size={20} />
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
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-[6px] border-zinc-950 bg-zinc-900 overflow-hidden shadow-2xl flex items-center justify-center relative group">
              <img 
                src={profileImage} 
                alt="Profile" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 rounded-full shadow-inner pointer-events-none border border-zinc-800/50"></div>
              
              <label className="absolute inset-0 bg-zinc-950/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full" title="Изменить фото">
                <Camera size={32} className="text-zinc-200 drop-shadow-md" />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'profile')} />
              </label>
            </div>
          </motion.div>
          
          <motion.div variants={itemVariants} className="flex items-center gap-3 pb-2 sm:pb-4">
            <button 
              onClick={openEditModal}
              className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 font-medium rounded-full transition-all active:scale-95 shadow-lg border border-zinc-800 flex items-center gap-2"
            >
              <Pencil size={18} />
              <span>Редактировать</span>
            </button>
          </motion.div>
        </div>

        {/* Info Section */}
        <motion.div variants={itemVariants} className="mb-10">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl sm:text-4xl font-bold text-zinc-100 tracking-tight">{name}</h1>
            <BadgeCheck className="w-7 h-7 text-zinc-950 fill-amber-500 drop-shadow-sm" aria-label="Verified" />
          </div>
          <p className="text-amber-500/80 font-medium text-lg mb-5">@{username}</p>
          
          {status && (
            <p className="text-zinc-300 text-base sm:text-lg mb-6 leading-relaxed max-w-2xl whitespace-pre-wrap">
              {status}
            </p>
          )}

          <div className="flex flex-wrap gap-y-3 gap-x-6 text-sm sm:text-base text-zinc-500 mb-6 font-medium">
            {location && (
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-zinc-600" />
                <span>{location}</span>
              </div>
            )}
            {createdAt && (
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-zinc-600" />
                <span>В Jagooars с {createdAt.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</span>
              </div>
            )}
          </div>

          {/* Social Links */}
          <div className="flex gap-4">
            {socials.github && (
              <a href={socials.github} target="_blank" rel="noreferrer" className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-amber-500 hover:bg-zinc-800 transition-colors border border-zinc-800">
                <Github size={20} />
              </a>
            )}
            {socials.twitter && (
              <a href={socials.twitter} target="_blank" rel="noreferrer" className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-amber-500 hover:bg-zinc-800 transition-colors border border-zinc-800">
                <Twitter size={20} />
              </a>
            )}
            {socials.instagram && (
              <a href={socials.instagram} target="_blank" rel="noreferrer" className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-amber-500 hover:bg-zinc-800 transition-colors border border-zinc-800">
                <Instagram size={20} />
              </a>
            )}
            {socials.website && (
              <a href={socials.website} target="_blank" rel="noreferrer" className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-amber-500 hover:bg-zinc-800 transition-colors border border-zinc-800">
                <Globe size={20} />
              </a>
            )}
          </div>
        </motion.div>

        {/* Create Post Section */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-lg">
            <div className="flex gap-4">
              <img src={profileImage} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-zinc-800" />
              <div className="flex-1">
                <textarea
                  value={newPostText}
                  onChange={(e) => setNewPostText(e.target.value)}
                  placeholder="Что у вас нового?"
                  className="w-full bg-transparent text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none min-h-[80px]"
                />
                
                {newPostImage && (
                  <div className="relative mb-4 rounded-xl overflow-hidden border border-zinc-800 inline-block">
                    <img src={newPostImage} alt="Upload preview" className="max-h-64 object-contain" />
                    <button 
                      onClick={() => setNewPostImage('')}
                      className="absolute top-2 right-2 p-1.5 bg-zinc-950/70 hover:bg-red-500/80 text-white rounded-full transition-colors backdrop-blur-sm"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                <div className="flex justify-between items-center pt-3 border-t border-zinc-800/50 mt-2">
                  <div className="flex gap-2">
                    <label className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-full cursor-pointer transition-colors">
                      <ImageIcon size={20} />
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={(e) => handleImageUpload(e, 'post')} 
                      />
                    </label>
                  </div>
                  <button
                    onClick={handleCreatePost}
                    disabled={isPosting || (!newPostText.trim() && !newPostImage)}
                    className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isPosting ? 'Публикация...' : 'Опубликовать'}
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feed Section */}
        <motion.div variants={containerVariants} className="space-y-6">
          <h2 className="text-xl font-bold text-zinc-100 px-2">Лента</h2>
          
          <AnimatePresence>
            {posts.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-center py-12 text-zinc-500 bg-zinc-900/50 rounded-2xl border border-zinc-800/50"
              >
                Здесь пока нет постов. Напишите что-нибудь!
              </motion.div>
            ) : (
              posts.map((post) => (
                <motion.div 
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-3 items-center">
                      <img src={post.authorImage || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback'} alt="Author" className="w-10 h-10 rounded-full object-cover border border-zinc-800" />
                      <div>
                        <div className="font-bold text-zinc-100 flex items-center gap-1">
                          {post.authorName}
                          <BadgeCheck size={16} className="text-zinc-950 fill-amber-500" />
                        </div>
                        <div className="text-sm text-zinc-500">@{post.authorUsername} • {post.createdAt?.toDate().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                    
                    {user.uid === post.userId && (
                      <button 
                        onClick={(e) => handleDeletePost(post.id, e)}
                        className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                        title="Удалить пост"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                  
                  {post.text && (
                    <p className="text-zinc-300 mb-4 whitespace-pre-wrap text-[15px] leading-relaxed">
                      {post.text}
                    </p>
                  )}
                  
                  {post.image && (
                    <div className="rounded-xl overflow-hidden border border-zinc-800 mb-4">
                      <img src={post.image} alt="Post content" className="w-full h-auto max-h-[500px] object-cover" />
                    </div>
                  )}
                  
                  <div className="flex gap-6 pt-3 border-t border-zinc-800/50">
                    <button 
                      onClick={(e) => handleLikePost(post.id, e)}
                      className="flex items-center gap-2 text-zinc-500 hover:text-amber-500 transition-colors group"
                    >
                      <div className="p-2 rounded-full group-hover:bg-amber-500/10 transition-colors">
                        <Heart size={20} className="group-active:scale-75 transition-transform" />
                      </div>
                      <span className="font-medium">{post.likes || 0}</span>
                    </button>
                    <button className="flex items-center gap-2 text-zinc-500 hover:text-blue-500 transition-colors group">
                      <div className="p-2 rounded-full group-hover:bg-blue-500/10 transition-colors">
                        <MessageCircle size={20} />
                      </div>
                      <span className="font-medium">{post.comments || 0}</span>
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="flex justify-between items-center p-5 border-b border-zinc-800">
                <h2 className="text-xl font-bold text-zinc-100">Редактировать профиль</h2>
                <button onClick={() => setIsEditModalOpen(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Имя и фамилия</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Имя пользователя (@iduser)</label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Город, Страна</label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">О себе</label>
                  <textarea
                    value={editForm.status}
                    onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                    rows={3}
                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-zinc-100 resize-none"
                  />
                </div>
                
                <h3 className="text-sm font-bold text-zinc-100 pt-4 border-t border-zinc-800">Социальные сети (ссылки)</h3>
                
                <div className="relative">
                  <Github className="absolute left-3 top-2.5 text-zinc-500" size={18} />
                  <input
                    type="text" placeholder="https://github.com/..."
                    value={editForm.github} onChange={(e) => setEditForm({...editForm, github: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-zinc-100 text-sm"
                  />
                </div>
                <div className="relative">
                  <Twitter className="absolute left-3 top-2.5 text-zinc-500" size={18} />
                  <input
                    type="text" placeholder="https://twitter.com/..."
                    value={editForm.twitter} onChange={(e) => setEditForm({...editForm, twitter: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-zinc-100 text-sm"
                  />
                </div>
                <div className="relative">
                  <Instagram className="absolute left-3 top-2.5 text-zinc-500" size={18} />
                  <input
                    type="text" placeholder="https://instagram.com/..."
                    value={editForm.instagram} onChange={(e) => setEditForm({...editForm, instagram: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-zinc-100 text-sm"
                  />
                </div>
                <div className="relative">
                  <Globe className="absolute left-3 top-2.5 text-zinc-500" size={18} />
                  <input
                    type="text" placeholder="https://вассайт.com"
                    value={editForm.website} onChange={(e) => setEditForm({...editForm, website: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-zinc-100 text-sm"
                  />
                </div>
              </div>
              
              <div className="p-5 border-t border-zinc-800 flex justify-end gap-3 bg-zinc-900">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2 text-zinc-400 font-medium hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg transition-colors shadow-sm cursor-pointer disabled:opacity-70"
                >
                  {isSaving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
