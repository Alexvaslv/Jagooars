import React, { useState, useEffect, useRef } from 'react';
import { Settings, MapPin, Calendar, Heart, MessageCircle, BadgeCheck, Camera, Pencil, X, LogOut, Github, Twitter, Instagram, Globe, Trash2, Image as ImageIcon, Send, Home, Users, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from './firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
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

type TabType = 'feed' | 'friends' | 'messages' | 'communities' | 'profile';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // Navigation
  const [activeTab, setActiveTab] = useState<TabType>('feed');

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

  const navItems = [
    { id: 'feed', label: 'Лента', icon: Home },
    { id: 'friends', label: 'Друзья', icon: Users },
    { id: 'messages', label: 'Сообщения', icon: MessageCircle },
    { id: 'communities', label: 'Сообщества', icon: Globe },
    { id: 'profile', label: 'Профиль', icon: User },
  ];

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-medium">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white border border-slate-200 p-8 rounded-3xl shadow-xl max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Settings size={40} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Jagooars</h1>
          <p className="text-slate-500 mb-6">Войдите, чтобы создать и настроить свой профиль.</p>
          
          {loginError && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 text-left">
              <p className="font-semibold mb-1">Ошибка входа:</p>
              <p>{loginError}</p>
            </div>
          )}

          <button 
            onClick={handleLogin}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all active:scale-95 shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
          >
            Войти через Google
          </button>
        </motion.div>
      </div>
    );
  }

  const renderPost = (post: any) => (
    <motion.div 
      key={post.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex gap-3 items-center cursor-pointer" onClick={() => setActiveTab('profile')}>
          <img src={post.authorImage || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback'} alt="Author" className="w-10 h-10 rounded-full object-cover border border-slate-100" />
          <div>
            <div className="font-bold text-slate-900 flex items-center gap-1">
              {post.authorName}
              <BadgeCheck size={16} className="text-white fill-indigo-500" />
            </div>
            <div className="text-sm text-slate-500">@{post.authorUsername} • {post.createdAt?.toDate().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>
        
        {user.uid === post.userId && (
          <button 
            onClick={(e) => handleDeletePost(post.id, e)}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
            title="Удалить пост"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
      
      {post.text && (
        <p className="text-slate-700 mb-4 whitespace-pre-wrap text-[15px] leading-relaxed break-words">
          {post.text}
        </p>
      )}
      
      {post.image && (
        <div className="rounded-xl overflow-hidden border border-slate-100 mb-4 bg-slate-50">
          <img src={post.image} alt="Post content" className="w-full h-auto max-h-[500px] object-contain" />
        </div>
      )}
      
      <div className="flex gap-6 pt-3 border-t border-slate-100">
        <button 
          onClick={(e) => handleLikePost(post.id, e)}
          className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors group"
        >
          <div className="p-2 rounded-full group-hover:bg-indigo-50 transition-colors">
            <Heart size={20} className="group-active:scale-75 transition-transform" />
          </div>
          <span className="font-medium">{post.likes || 0}</span>
        </button>
        <button className="flex items-center gap-2 text-slate-500 hover:text-blue-500 transition-colors group">
          <div className="p-2 rounded-full group-hover:bg-blue-50 transition-colors">
            <MessageCircle size={20} />
          </div>
          <span className="font-medium">{post.comments || 0}</span>
        </button>
      </div>
    </motion.div>
  );

  const CreatePostWidget = () => (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm mb-6">
      <div className="flex gap-4">
        <img src={profileImage} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-slate-100" />
        <div className="flex-1">
          <textarea
            value={newPostText}
            onChange={(e) => setNewPostText(e.target.value)}
            placeholder="Что у вас нового?"
            className="w-full bg-transparent text-slate-900 placeholder-slate-400 resize-none focus:outline-none min-h-[80px] text-[15px]"
          />
          
          {newPostImage && (
            <div className="relative mb-4 rounded-xl overflow-hidden border border-slate-200 inline-block bg-slate-50">
              <img src={newPostImage} alt="Upload preview" className="max-h-64 object-contain" />
              <button 
                onClick={() => setNewPostImage('')}
                className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500 text-white rounded-full transition-colors backdrop-blur-sm"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div className="flex justify-between items-center pt-3 border-t border-slate-100 mt-2">
            <div className="flex gap-2">
              <label className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full cursor-pointer transition-colors">
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
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
            >
              {isPosting ? 'Публикация...' : 'Опубликовать'}
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex justify-center selection:bg-indigo-100">
      
      {/* Sidebar Navigation (Desktop) */}
      <nav className="hidden md:flex flex-col w-64 fixed left-0 h-screen border-r border-slate-200 bg-white p-4 z-40">
        <div className="flex items-center gap-3 px-4 py-6 mb-4">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
            J
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">Jagooars</span>
        </div>
        
        <div className="flex flex-col gap-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as TabType)}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-xl font-medium transition-all ${
                activeTab === item.id 
                  ? 'bg-indigo-50 text-indigo-600' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon size={22} className={activeTab === item.id ? 'stroke-[2.5px]' : ''} />
              <span className="text-[15px]">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-auto px-4 pb-6">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-4 px-4 py-3 w-full text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
          >
            <LogOut size={22} />
            <span className="text-[15px]">Выйти</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-2xl w-full md:ml-64 pb-20 md:pb-8 min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            {/* FEED TAB */}
            {activeTab === 'feed' && (
              <div className="p-4 sm:p-6">
                <h1 className="text-2xl font-bold text-slate-900 mb-6 px-1">Лента новостей</h1>
                <CreatePostWidget />
                <div className="space-y-4">
                  {posts.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-200">
                      Здесь пока нет постов. Напишите что-нибудь!
                    </div>
                  ) : (
                    posts.map(renderPost)
                  )}
                </div>
              </div>
            )}

            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="pb-8">
                {/* Cover Photo */}
                <div className="relative h-48 sm:h-64 w-full overflow-hidden bg-slate-200">
                  <img src={coverImage} alt="Cover" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                  <label className="absolute top-4 right-4 p-2.5 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white transition-all cursor-pointer flex items-center justify-center border border-white/30 shadow-sm" title="Изменить обложку">
                    <Camera size={20} />
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'cover')} />
                  </label>
                </div>

                <div className="px-4 sm:px-6 max-w-3xl mx-auto">
                  {/* Header Row: Avatar & Actions */}
                  <div className="relative flex justify-between items-end -mt-16 mb-4">
                    <div className="relative z-10">
                      <div className="w-32 h-32 rounded-full border-4 border-slate-50 bg-white overflow-hidden shadow-md flex items-center justify-center relative group">
                        <img src={profileImage} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full" title="Изменить фото">
                          <Camera size={32} className="text-white drop-shadow-md" />
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'profile')} />
                        </label>
                      </div>
                    </div>
                    
                    <button 
                      onClick={openEditModal}
                      className="px-5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-full transition-all active:scale-95 shadow-sm border border-slate-200 flex items-center gap-2 mb-2"
                    >
                      <Pencil size={16} />
                      <span className="hidden sm:inline">Редактировать</span>
                    </button>
                  </div>

                  {/* Info Section */}
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-1">
                      <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{name}</h1>
                      <BadgeCheck className="w-6 h-6 text-white fill-indigo-500 drop-shadow-sm" />
                    </div>
                    <p className="text-slate-500 font-medium text-[15px] mb-4">@{username}</p>
                    
                    {status && (
                      <p className="text-slate-700 text-[15px] mb-5 leading-relaxed whitespace-pre-wrap break-words">
                        {status}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-y-2 gap-x-5 text-sm text-slate-500 mb-5 font-medium">
                      {location && (
                        <div className="flex items-center gap-1.5">
                          <MapPin size={16} />
                          <span>{location}</span>
                        </div>
                      )}
                      {createdAt && (
                        <div className="flex items-center gap-1.5">
                          <Calendar size={16} />
                          <span>В Jagooars с {createdAt.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</span>
                        </div>
                      )}
                    </div>

                    {/* Social Links */}
                    <div className="flex gap-3">
                      {socials.github && (
                        <a href={socials.github} target="_blank" rel="noreferrer" className="p-2 bg-white rounded-full text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors border border-slate-200 shadow-sm">
                          <Github size={18} />
                        </a>
                      )}
                      {socials.twitter && (
                        <a href={socials.twitter} target="_blank" rel="noreferrer" className="p-2 bg-white rounded-full text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors border border-slate-200 shadow-sm">
                          <Twitter size={18} />
                        </a>
                      )}
                      {socials.instagram && (
                        <a href={socials.instagram} target="_blank" rel="noreferrer" className="p-2 bg-white rounded-full text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors border border-slate-200 shadow-sm">
                          <Instagram size={18} />
                        </a>
                      )}
                      {socials.website && (
                        <a href={socials.website} target="_blank" rel="noreferrer" className="p-2 bg-white rounded-full text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors border border-slate-200 shadow-sm">
                          <Globe size={18} />
                        </a>
                      )}
                    </div>
                  </div>

                  <h2 className="text-xl font-bold text-slate-900 mb-4 px-1">Мои записи</h2>
                  <div className="space-y-4">
                    {posts.filter(p => p.userId === user.uid).length === 0 ? (
                      <div className="text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-200">
                        У вас пока нет постов.
                      </div>
                    ) : (
                      posts.filter(p => p.userId === user.uid).map(renderPost)
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* PLACEHOLDER TABS */}
            {(activeTab === 'friends' || activeTab === 'messages' || activeTab === 'communities') && (
              <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-300 mb-6">
                  {activeTab === 'friends' && <Users size={48} />}
                  {activeTab === 'messages' && <MessageCircle size={48} />}
                  {activeTab === 'communities' && <Globe size={48} />}
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  {activeTab === 'friends' && 'Друзья'}
                  {activeTab === 'messages' && 'Сообщения'}
                  {activeTab === 'communities' && 'Сообщества'}
                </h2>
                <p className="text-slate-500 max-w-sm">
                  Этот раздел находится в разработке. Скоро здесь появится много интересного!
                </p>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-slate-200 flex justify-around p-2 pb-safe z-50">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as TabType)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${
              activeTab === item.id 
                ? 'text-indigo-600' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <item.icon size={24} className={activeTab === item.id ? 'stroke-[2.5px]' : ''} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="flex justify-between items-center p-5 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-900">Редактировать профиль</h2>
                <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Имя и фамилия</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Имя пользователя (@iduser)</label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Город, Страна</label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">О себе</label>
                  <textarea
                    value={editForm.status}
                    onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                    rows={3}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 resize-none transition-all"
                  />
                </div>
                
                <h3 className="text-sm font-bold text-slate-900 pt-4 border-t border-slate-100">Социальные сети (ссылки)</h3>
                
                <div className="relative">
                  <Github className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input
                    type="text" placeholder="https://github.com/..."
                    value={editForm.github} onChange={(e) => setEditForm({...editForm, github: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 text-sm transition-all"
                  />
                </div>
                <div className="relative">
                  <Twitter className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input
                    type="text" placeholder="https://twitter.com/..."
                    value={editForm.twitter} onChange={(e) => setEditForm({...editForm, twitter: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 text-sm transition-all"
                  />
                </div>
                <div className="relative">
                  <Instagram className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input
                    type="text" placeholder="https://instagram.com/..."
                    value={editForm.instagram} onChange={(e) => setEditForm({...editForm, instagram: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 text-sm transition-all"
                  />
                </div>
                <div className="relative">
                  <Globe className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input
                    type="text" placeholder="https://вассайт.com"
                    value={editForm.website} onChange={(e) => setEditForm({...editForm, website: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 text-sm transition-all"
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
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm cursor-pointer disabled:opacity-70"
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
