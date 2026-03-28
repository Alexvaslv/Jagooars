/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Home, Users, MessageCircle, LayoutGrid, User, Aperture, Settings, LogOut, Image as ImageIcon, Music, ChevronLeft, Camera, Plus, Heart, Share2, MoreHorizontal, Send, Pin, Search, Bell, X, Eye, EyeOff, UserPlus, UserMinus, Check, CheckCheck, Paperclip, Smile, Mic, MoreVertical, Copy, Reply, Trash2, Play, Newspaper, Coffee, Shield, Lock, Globe, Hash, UsersRound, ImagePlus, ShieldAlert, Activity, FileText, Award, CheckCircle, Ban, Eraser, Crown, Gem, Medal, MessageSquare, Edit } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { auth, db, googleProvider } from './firebase';
import { signInWithPopup, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, addDoc, onSnapshot, query, orderBy, updateDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './lib/firebase-utils';
import { Logo } from './components/Logo';

const Badge = ({ type, size = 16 }: { type: 'verified' | 'admin' | 'creator', size?: number }) => {
  const badges = {
    verified: { icon: CheckCircle, color: 'text-blue-500', label: 'Верифицирован' },
    admin: { icon: ShieldAlert, color: 'text-red-500', label: 'Администрация' },
    creator: { icon: Crown, color: 'text-yellow-500', label: 'Создатель проекта' },
  };

  const badge = badges[type];
  if (!badge) return null;
  const Icon = badge.icon;

  return (
    <div 
      className={`inline-flex items-center justify-center ${badge.color} cursor-help drop-shadow-[0_0_2px_rgba(0,0,0,0.1)] relative overflow-hidden`} 
      title={badge.label}
    >
      <Icon 
        size={size} 
        fill="currentColor" 
        fillOpacity={0.2} 
      />
    </div>
  );
};

const NAV_ITEMS = [
  { id: 'home', label: 'Лента', icon: Home },
  { id: 'friends', label: 'Друзья', icon: Users },
  { id: 'messages', label: 'Сообщения', icon: MessageCircle },
  { id: 'communities', label: 'Хаб', icon: LayoutGrid },
  { id: 'profile', label: 'Профиль', icon: User },
];

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' fill='%23e2e8f0'/%3E%3Ccircle cx='12' cy='9' r='4' fill='%2394a3b8'/%3E%3Cpath d='M20 21a8 8 0 0 0-16 0' fill='%2394a3b8'/%3E%3C/svg%3E";
const DEFAULT_COVER = "https://picsum.photos/seed/vkcover/1200/400";

// Оптимизированный компонент друга
const FriendItem = React.memo(({ friend, onClick }: { friend: any, onClick: () => void }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    whileHover={{ scale: 1.01 }}
    onClick={onClick}
    className="bg-white border border-black/5 rounded-3xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
  >
    <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 relative shadow-sm">
      <img src={friend.avatar} alt={friend.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      {friend.isOnline && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />}
    </div>
    <div className="flex-1">
      <h4 className="text-base font-bold text-vk-text flex items-center gap-1">
        {friend.name}
        {friend.isVerified && <Badge type="verified" size={14} />}
      </h4>
      <p className="text-[10px] font-bold text-vk-text-muted uppercase tracking-wider">{friend.isOnline ? 'Online' : friend.lastSeen}</p>
    </div>
    <button 
      className="w-10 h-10 rounded-full bg-[#120a8f]/5 text-[#120a8f] flex items-center justify-center hover:bg-[#120a8f]/10 transition-colors" 
      onClick={(e) => { 
        e.stopPropagation(); 
        onClick(); // In this case, onClick is setViewingProfile, but we might want to open chat directly
      }}
    >
      <MessageCircle size={20} />
    </button>
  </motion.div>
));

// Оптимизированный компонент сообщества
const CommunityItem = React.memo(({ community, onClick }: { community: any, onClick: () => void }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    whileHover={{ scale: 1.01 }}
    onClick={onClick}
    className="bg-white border border-black/5 rounded-3xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
  >
    <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 relative shadow-sm">
      <img src={community.avatar} alt={community.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="text-base font-bold text-vk-text truncate">{community.name}</h4>
      <p className="text-[10px] font-bold text-vk-text-muted uppercase tracking-wider">{community.members} • {community.category}</p>
    </div>
    <button className="px-4 py-1.5 bg-[#120a8f]/5 text-[#120a8f] hover:bg-[#120a8f]/10 rounded-xl text-xs font-bold transition-colors">
      Зайти
    </button>
  </motion.div>
));

// Оптимизированный компонент чата
const ChatItem = React.memo(({ chat, onClick }: { chat: any, onClick: () => void }) => (
  <motion.div 
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    whileHover={{ scale: 1.01 }}
    onClick={onClick}
    className="bg-white border border-black/5 rounded-3xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
  >
    <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 relative shadow-sm">
      <img src={chat.avatar} alt={chat.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      {chat.isOnline && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />}
    </div>
    <div className="flex-1 overflow-hidden">
      <div className="flex justify-between items-center mb-1">
        <h4 className="text-base font-bold text-vk-text truncate flex items-center gap-1">
          {chat.name}
          {chat.isVerified && <Badge type="verified" size={14} />}
        </h4>
        <span className="text-[10px] font-bold text-vk-text-muted uppercase tracking-wider shrink-0">{chat.time}</span>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-vk-text-muted truncate pr-4">{chat.lastMessage}</p>
        {chat.unread && (
          <div className="w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm shadow-[#120a8f]/20">
            {chat.unread}
          </div>
        )}
      </div>
    </div>
  </motion.div>
));

// Оптимизированный компонент поста
const PostItem = React.memo(({ post, onClick }: { post: any, onClick: () => void }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }} 
    animate={{ opacity: 1, y: 0 }} 
    className="bg-white border-y border-black/5 sm:border sm:rounded-3xl shadow-sm cursor-pointer hover:shadow-md transition-all mb-3 overflow-hidden" 
    onClick={onClick}
  >
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-sm">
            <img src={post.author.avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-vk-text flex items-center gap-1">
              {post.author.name}
              {post.author.isVerified && <Badge type="verified" size={14} />}
            </h4>
            <p className="text-[10px] font-bold text-vk-text-muted uppercase tracking-wider">{post.time}</p>
          </div>
        </div>
        <button className="text-vk-text-muted hover:text-vk-text p-1" onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal size={20} />
        </button>
      </div>
      
      <p className="text-vk-text text-sm leading-relaxed mb-3">{post.text}</p>
      
      {post.image && (
        <div className="rounded-2xl overflow-hidden mb-3 border border-black/5">
          <img src={post.image} alt="Post" className="w-full h-auto object-cover max-h-[400px]" referrerPolicy="no-referrer" />
        </div>
      )}
      
      <div className="flex items-center justify-between pt-3 border-t border-black/5">
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-1.5 text-vk-text-muted hover:text-red-500 transition-colors group">
            <div className="p-1.5 rounded-full group-hover:bg-red-50 transition-colors">
              <Heart size={20} />
            </div>
            <span className="text-xs font-bold">{post.likes}</span>
          </button>
          <button className="flex items-center gap-1.5 text-vk-text-muted hover:text-vk-accent transition-colors group">
            <div className="p-1.5 rounded-full group-hover:bg-vk-accent/5 transition-colors">
              <MessageCircle size={20} />
            </div>
            <span className="text-xs font-bold">{post.comments}</span>
          </button>
          <button className="flex items-center gap-1.5 text-vk-text-muted hover:text-blue-500 transition-colors group">
            <div className="p-1.5 rounded-full group-hover:bg-blue-50 transition-colors">
              <Share2 size={20} />
            </div>
            <span className="text-xs font-bold">{post.shares}</span>
          </button>
        </div>
        <div className="flex items-center gap-1 text-vk-text-muted">
          <Eye size={14} />
          <span className="text-[10px] font-bold">{(post.likes * 12).toLocaleString()}</span>
        </div>
      </div>
    </div>
  </motion.div>
));

const MOCK_STORIES = [
  { id: 1, name: 'Ваш', avatar: DEFAULT_AVATAR, isAdd: true, hasUnseen: false },
];

import { VIRTUAL_CHATS, VIRTUAL_USERS } from './mockDataGenerator';

const MOCK_COMMENTS: any[] = [];

const MOCK_FRIENDS: any[] = [];

const MOCK_INCOMING_REQUESTS: any[] = [];

const MOCK_OUTGOING_REQUESTS: any[] = [];

const MOCK_RECOMMENDED: any[] = [];

const MOCK_COMMUNITIES: any[] = [];

const MOCK_CHANNELS: any[] = [];

const MOCK_COMMUNITY_MEMBERS: any[] = [];

const MOCK_CHAT_MESSAGES: any[] = [];

const ADMIN_TABS = [
  { id: 'dashboard', label: 'Дашборд', icon: Activity },
  { id: 'users', label: 'Пользователи', icon: Users },
  { id: 'communities', label: 'Сообщества', icon: UsersRound },
  { id: 'chats', label: 'Чаты', icon: MessageSquare },
  { id: 'posts', label: 'Посты', icon: FileText },
  { id: 'settings', label: 'Настройки', icon: Settings },
];

export default function App() {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const isAdmin = currentUser?.isAdmin || false;
  const isCreator = currentUser?.isCreator || false;
  const isVerified = currentUser?.isVerified || false;
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [isIntroPlaying, setIsIntroPlaying] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [hubView, setHubView] = useState<'communities' | 'profiles'>('communities');
  const [isCreatingHubProfile, setIsCreatingHubProfile] = useState(false);
  const [hubName, setHubName] = useState('');
  const [hubSpecialization, setHubSpecialization] = useState('');
  const [hubAbout, setHubAbout] = useState('');
  const [hubInterests, setHubInterests] = useState('');
  const [hubPhoto, setHubPhoto] = useState<string | null>(null);
  const [hubProfiles, setHubProfiles] = useState<any[]>([]);
  const [hubSearch, setHubSearch] = useState('');

  useEffect(() => {
    if (!isAuthReady || !currentUser) return;

    const q = query(collection(db, 'hub_profiles'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const profiles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHubProfiles(profiles);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'hub_profiles');
    });
    return () => unsubscribe();
  }, [isAuthReady, currentUser]);

  const handleCreateHubProfile = async () => {
    if (!currentUser || !hubName.trim()) return;
    
    try {
      await setDoc(doc(db, 'hub_profiles', currentUser.uid), {
        uid: currentUser.uid,
        hubName,
        specialization: hubSpecialization,
        about: hubAbout,
        interests: hubInterests.split(',').map(i => i.trim()).filter(i => i),
        photoURL: hubPhoto || currentUser.photoURL || DEFAULT_AVATAR,
        createdAt: new Date().toISOString()
      });
      toast.success('Профиль хаба создан!');
      setIsCreatingHubProfile(false);
      // Reset fields
      setHubName('');
      setHubSpecialization('');
      setHubAbout('');
      setHubInterests('');
      setHubPhoto(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'hub_profiles');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (!userDoc.exists()) {
            // Create user profile
            const isGlobalAdmin = user.email === 'alexeivasilev270819942@gmail.com';
            const newUserData = {
              uid: user.uid,
              username: user.email?.split('@')[0] || `user_${user.uid.substring(0, 5)}`,
              displayName: user.displayName || 'Пользователь',
              email: user.email,
              photoURL: user.photoURL || DEFAULT_AVATAR,
              isVerified: isGlobalAdmin,
              isAdmin: isGlobalAdmin,
              isCreator: isGlobalAdmin,
              createdAt: serverTimestamp()
            };
            try {
              await setDoc(userDocRef, newUserData);
              setCurrentUser(newUserData);
            } catch (error) {
              handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
            }
          } else {
            const data = userDoc.data();
            const isGlobalAdmin = user.email === 'alexeivasilev270819942@gmail.com';
            
            // Auto-upgrade global admin if needed
            if (isGlobalAdmin && (!data.isAdmin || !data.isVerified || !data.isCreator)) {
              const updatedData = { 
                ...data, 
                isAdmin: true, 
                isVerified: true, 
                isCreator: true 
              };
              try {
                await updateDoc(userDocRef, updatedData);
                setCurrentUser(updatedData);
                toast.success('Права администратора подтверждены');
              } catch (error) {
                console.error("Failed to auto-upgrade admin:", error);
                setCurrentUser(data);
              }
            } else {
              setCurrentUser(data);
            }
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        }
      } else {
        setCurrentUser(null);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    if (!isAuthReady || !currentUser) return;

    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        author: {
          name: doc.data().authorName,
          avatar: doc.data().authorPhoto,
          isVerified: doc.data().authorIsVerified
        },
        time: new Date(doc.data().createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
      setPosts(fetchedPosts);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
    });

    return () => unsubscribe();
  }, [isAuthReady, currentUser]);

  // Состояния для профиля
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<{ id: string, name: string, avatar: string, isFriend?: boolean, isOnline?: boolean, lastSeen?: string, about?: string, isAI?: boolean, isVerified?: boolean, isAdmin?: boolean, isCreator?: boolean, specialization?: string, interests?: string[] } | null>(null);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [newPostText, setNewPostText] = useState('');
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const postImageInputRef = useRef<HTMLInputElement>(null);
  const hubPhotoInputRef = useRef<HTMLInputElement>(null);
  const communityAvatarInputRef = useRef<HTMLInputElement>(null);
  const communityCoverInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit for base64 in Firestore
        toast.error('Файл слишком большой (макс. 1МБ)');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        callback(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Состояния для друзей
  const [friendsTab, setFriendsTab] = useState<'all' | 'requests' | 'add'>('all');
  const [friendsSearch, setFriendsSearch] = useState('');
  const [addFriendSearch, setAddFriendSearch] = useState('');

  // Состояния для чата
  const [activeChat, setActiveChat] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState(MOCK_CHAT_MESSAGES);
  const [virtualChats, setVirtualChats] = useState(VIRTUAL_CHATS);
  const [posts, setPosts] = useState<any[]>([]);
  const [geminiMessages, setGeminiMessages] = useState<any[]>([
    { id: 1, type: 'text', text: 'Привет! Я Gemini AI. Чем могу помочь?', sender: 'other', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), status: 'read' }
  ]);
  const [isGeminiTyping, setIsGeminiTyping] = useState(false);

  const [newChatMessage, setNewChatMessage] = useState('');
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Состояния для сообществ
  const [communitiesSearch, setCommunitiesSearch] = useState('');
  const [activeCommunity, setActiveCommunity] = useState<any>(null);
  const [activeChannel, setActiveChannel] = useState<any>(MOCK_CHANNELS[0]);
  const [communityView, setCommunityView] = useState<'chat' | 'members'>('chat');
  const [isCreatingCommunity, setIsCreatingCommunity] = useState(false);
  const [communityName, setCommunityName] = useState('');
  const [communityDescription, setCommunityDescription] = useState('');
  const [communityAvatar, setCommunityAvatar] = useState<string | null>(null);
  const [communityCover, setCommunityCover] = useState<string | null>(null);
  const [isCommunitySettingsOpen, setIsCommunitySettingsOpen] = useState(false);

  const handleCreateCommunity = async () => {
    if (!currentUser || !communityName.trim()) return;
    try {
      await addDoc(collection(db, 'communities'), {
        name: communityName,
        description: communityDescription,
        avatar: communityAvatar || DEFAULT_AVATAR,
        cover: communityCover || '',
        creatorId: currentUser.uid,
        membersCount: 1,
        isVerified: false,
        createdAt: new Date().toISOString()
      });
      toast.success('Сообщество создано!');
      setIsCreatingCommunity(false);
      setCommunityName('');
      setCommunityDescription('');
      setCommunityAvatar(null);
      setCommunityCover(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'communities');
    }
  };

  // Состояния админ-панели
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [adminTab, setAdminTab] = useState('dashboard');

  // Таймер онлайна удален


  // Оптимизация списков для устранения лагов
  const filteredFriends = useMemo(() => {
    return [...MOCK_FRIENDS, ...VIRTUAL_USERS]
      .filter(f => f.name.toLowerCase().includes(friendsSearch.toLowerCase()))
      .slice(0, 50);
  }, [friendsSearch]);

  const displayPosts = useMemo(() => {
    return posts.slice(0, 50);
  }, [posts]);

  const displayChats = useMemo(() => {
    return virtualChats.slice(0, 50);
  }, [virtualChats]);

  const filteredCommunities = useMemo(() => {
    return MOCK_COMMUNITIES.filter(c => c.name.toLowerCase().includes(communitiesSearch.toLowerCase()));
  }, [communitiesSearch]);

  useEffect(() => {
    if (activeChat) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, geminiMessages, activeChat, isGeminiTyping]);

  // Симуляция активности виртуальных пользователей удалена

  const handleSendMessage = async () => {
    if (!newChatMessage.trim()) return;
    const newMsg = {
      id: Date.now(),
      type: 'text',
      text: newChatMessage,
      sender: 'me',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent'
    };
    
    if (activeChat?.isAI) {
      const isGeminiBot = activeChat.id === 'gemini_bot';
      if (isGeminiBot) {
        setGeminiMessages(prev => [...prev, newMsg]);
      } else {
        setChatMessages(prev => [...prev, newMsg]);
      }
      
      setNewChatMessage('');
      setIsGeminiTyping(true);
      
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        // Build history for context
        const currentMessages = isGeminiBot ? geminiMessages : chatMessages;
        const history = currentMessages.filter(m => m.type === 'text').map(m => `${m.sender === 'me' ? 'User' : activeChat.name}: ${m.text}`).join('\n');
        const prompt = `${history}\nUser: ${newChatMessage}\n${activeChat.name}:`;
        
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: {
            systemInstruction: isGeminiBot 
              ? "You are Gemini AI, a helpful assistant." 
              : `You are ${activeChat.name}, a user of a social network. Respond naturally as this person. Keep it brief and friendly, like a typical chat message.`,
          }
        });
        
        const botMsg = {
          id: Date.now() + 1,
          type: 'text',
          text: response.text,
          sender: 'other',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'read'
        };
        
        if (isGeminiBot) {
          setGeminiMessages(prev => [...prev, botMsg]);
        } else {
          setChatMessages(prev => [...prev, botMsg]);
        }
      } catch (error) {
        console.error('AI error:', error);
        const errorMsg = {
          id: Date.now() + 1,
          type: 'text',
          text: 'Извините, произошла ошибка при обращении к ИИ.',
          sender: 'other',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'read'
        };
        if (isGeminiBot) {
          setGeminiMessages(prev => [...prev, errorMsg]);
        } else {
          setChatMessages(prev => [...prev, errorMsg]);
        }
      } finally {
        setIsGeminiTyping(false);
      }
    } else {
      setChatMessages([...chatMessages, newMsg]);
      setNewChatMessage('');
    }
  };

  const handleDeleteMessage = (id: number) => {
    setChatMessages(chatMessages.filter(m => m.id !== id));
    setSelectedMessageId(null);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      toast.error('Пожалуйста, заполните все поля');
      return;
    }
    if (!isLoginMode && !authName) {
      toast.error('Пожалуйста, введите имя');
      return;
    }

    setAuthLoading(true);
    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
        toast.success('Успешный вход!');
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        await updateProfile(userCredential.user, {
          displayName: authName
        });
        const userDocRef = doc(db, 'users', userCredential.user.uid);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
          const newUserData = {
            uid: userCredential.user.uid,
            username: userCredential.user.email?.split('@')[0] || `user_${userCredential.user.uid.substring(0, 5)}`,
            displayName: authName,
            email: userCredential.user.email,
            photoURL: DEFAULT_AVATAR,
            isVerified: false,
            isAdmin: false,
            isCreator: false,
            createdAt: serverTimestamp()
          };
          await setDoc(userDocRef, newUserData);
        } else {
          await setDoc(userDocRef, { displayName: authName }, { merge: true });
        }
        toast.success('Регистрация успешна!');
      }
    } catch (error: any) {
      let errorMessage = 'Произошла ошибка';
      if (error.code === 'auth/email-already-in-use') errorMessage = 'Этот email уже используется';
      else if (error.code === 'auth/invalid-email') errorMessage = 'Неверный формат email';
      else if (error.code === 'auth/weak-password') errorMessage = 'Пароль должен быть не менее 6 символов';
      else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') errorMessage = 'Неверный email или пароль';
      
      toast.error(errorMessage);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsIntroPlaying(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-vk-bg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-vk-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentUser) {
    if (isIntroPlaying) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen w-full bg-vk-bg px-6 font-sans relative overflow-hidden">
          {/* Декоративные элементы фона */}
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-vk-accent/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

          {/* Эксклюзивный анимированный логотип */}
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
            className="mb-8 flex flex-col items-center z-20"
          >
            <Logo size="md" />
          </motion.div>

          {/* Анимированный телефон */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative w-[280px] h-[580px] bg-white rounded-[40px] shadow-2xl border-[8px] border-gray-900 overflow-hidden flex flex-col z-10"
          >
            {/* Dynamic Island / Notch */}
            <div className="absolute top-0 inset-x-0 flex justify-center z-20">
              <div className="w-24 h-6 bg-gray-900 rounded-b-3xl"></div>
            </div>

            {/* Chat Header */}
            <div className="bg-gray-50 pt-10 pb-4 px-4 border-b border-gray-100 flex items-center justify-center shadow-sm z-10">
              <div className="flex flex-col items-center">
                <Logo size="xs" showText={false} />
                <h2 className="text-sm font-bold text-gray-800 mt-1">RDIS Social</h2>
                <p className="text-[10px] text-green-500 font-medium">online</p>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 bg-gray-50/50 p-4 flex flex-col gap-3 overflow-hidden">
              <motion.div
                initial={{ opacity: 0, x: -20, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ delay: 1.5, type: "spring" }}
                className="self-start bg-white border border-gray-100 text-gray-800 px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm shadow-sm max-w-[85%]"
              >
                Привет! 👋 Готов присоединиться?
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ delay: 3.0, type: "spring" }}
                className="self-end bg-vk-accent text-white px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm shadow-md max-w-[85%]"
              >
                Да, поехали! 🚀
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ delay: 4.5, type: "spring" }}
                className="self-start bg-white border border-gray-100 text-gray-800 px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm shadow-sm max-w-[85%]"
              >
                Отлично! Загружаю...
                <motion.span
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >...</motion.span>
              </motion.div>
            </div>

            {/* Chat Input area (fake) */}
            <div className="bg-white p-4 border-t border-gray-100 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                <Plus size={16} />
              </div>
              <div className="flex-1 h-8 bg-gray-100 rounded-full"></div>
            </div>
          </motion.div>

          {/* Loading Text below phone */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mt-8 flex flex-col items-center z-10"
          >
            <div className="flex items-center gap-2 mt-2 text-vk-text-muted text-sm">
              <div className="w-4 h-4 border-2 border-vk-accent border-t-transparent rounded-full animate-spin"></div>
              Подключение...
            </div>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full bg-vk-bg px-6 font-sans relative overflow-hidden">
        <Toaster position="top-center" richColors />
        
        {/* Декоративные элементы фона */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-vk-accent/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Анимированный логотип */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 15, stiffness: 200 }}
          className="mb-8 z-10"
        >
          <Logo size="md" />
          <p className="text-vk-text-muted text-sm text-center mt-2">
            {isLoginMode ? 'Войдите, чтобы продолжить' : 'Создайте аккаунт, чтобы продолжить'}
          </p>
        </motion.div>

        {/* Форма */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="w-full max-w-sm bg-vk-panel p-6 rounded-[32px] border border-vk-border/30 shadow-2xl shadow-black/5 z-10"
        >
          <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
            {!isLoginMode && (
              <input
                type="text"
                placeholder="Имя пользователя"
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
                className="w-full bg-vk-bg border border-vk-border rounded-2xl px-4 py-3 text-vk-text placeholder-vk-text-muted focus:outline-none focus:border-vk-accent transition-colors"
                required
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              className="w-full bg-vk-bg border border-vk-border rounded-2xl px-4 py-3 text-vk-text placeholder-vk-text-muted focus:outline-none focus:border-vk-accent transition-colors"
              required
            />
            <input
              type="password"
              placeholder="Пароль"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              className="w-full bg-vk-bg border border-vk-border rounded-2xl px-4 py-3 text-vk-text placeholder-vk-text-muted focus:outline-none focus:border-vk-accent transition-colors"
              required
            />
            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-vk-accent text-white font-bold rounded-2xl px-4 py-4 shadow-sm hover:bg-vk-accent/90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {authLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                isLoginMode ? 'Войти' : 'Зарегистрироваться'
              )}
            </button>
            
            <div className="flex items-center gap-4 my-2">
              <div className="flex-1 h-px bg-vk-border"></div>
              <span className="text-xs text-vk-text-muted font-medium uppercase tracking-wider">или</span>
              <div className="flex-1 h-px bg-vk-border"></div>
            </div>

            <button 
              type="button"
              onClick={async () => {
                try {
                  await signInWithPopup(auth, googleProvider);
                  toast.success('Успешный вход!');
                } catch (error: any) {
                  if (error.code !== 'auth/popup-closed-by-user') {
                    toast.error('Ошибка входа: ' + error.message);
                  }
                }
              }}
              className="w-full bg-white text-gray-800 border border-gray-200 font-bold rounded-2xl px-4 py-4 shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg"><g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)"><path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/><path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/><path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/><path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/></g></svg>
              Войти через Google
            </button>

            <button
              type="button"
              onClick={async () => {
                try {
                  await signInAnonymously(auth);
                  toast.success('Успешный анонимный вход!');
                } catch (error: any) {
                  toast.error('Ошибка входа: ' + error.message);
                }
              }}
              className="w-full bg-vk-panel text-vk-text border border-vk-border font-bold rounded-2xl px-4 py-4 shadow-sm hover:bg-vk-bg active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              <User size={24} className="text-vk-text-muted" />
              Войти без регистрации
            </button>

            <button
              type="button"
              onClick={() => setIsLoginMode(!isLoginMode)}
              className="text-sm text-vk-text-muted hover:text-vk-accent transition-colors mt-2"
            >
              {isLoginMode ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-vk-bg text-vk-text font-sans relative">
      <Toaster position="top-center" richColors />
      {/* Контентная область */}
      <div className={`flex-1 flex flex-col overflow-hidden relative transition-opacity duration-300 ${activeChat || activeCommunity || selectedPost || isCreatingCommunity || isAdminPanelOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {viewingProfile ? (
          <div className="flex-1 flex flex-col w-full h-full overflow-y-auto bg-vk-bg pb-20 no-scrollbar">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className="flex flex-col w-full"
            >
              {/* Обложка и шапка */}
              <div className="relative h-56 sm:h-72 w-full overflow-hidden">
                <motion.img 
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 10, repeat: Infinity, repeatType: "reverse" }}
                  src={`https://picsum.photos/seed/${viewingProfile.id}cover/1200/400`} 
                  alt="Cover" 
                  className="absolute inset-0 w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-blue-600"></div>
                
                <div className="absolute top-0 left-0 right-0 p-5 flex justify-between items-center z-10">
                  <div className="flex items-center gap-3">
                    <motion.button 
                      whileHover={{ scale: 1.1, x: -2 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setViewingProfile(null)} 
                      className="p-2.5 text-white hover:bg-white/20 rounded-full  transition-all outline-none shadow-lg"
                    >
                      <ChevronLeft size={24} />
                    </motion.button>
                    <h2 className="text-white font-bold text-xl drop-shadow-lg tracking-tight">Профиль</h2>
                  </div>
                </div>
              </div>

              {/* Информация пользователя */}
              <div className="px-6 relative max-w-2xl mx-auto w-full">
                <div className="flex flex-col items-center -mt-24 sm:-mt-28 mb-10">
                  <motion.div 
                    className="relative mb-6"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: "spring", damping: 15 }}
                  >
                    <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-[40px] border-[6px] border-white bg-white overflow-hidden shadow-2xl relative z-10">
                      <img src={viewingProfile.avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 w-10 h-10 bg-green-500 rounded-full border-[6px] border-white shadow-xl z-20" 
                    />
                  </motion.div>

                  <div className="text-center mb-6">
                    <motion.h2 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-3xl sm:text-4xl font-black leading-tight tracking-tighter text-vk-text flex items-center justify-center gap-2"
                    >
                      {viewingProfile.name}
                      <div className="flex items-center gap-1">
                        {viewingProfile.isCreator && <Badge type="creator" size={26} />}
                        {viewingProfile.isAdmin && <Badge type="admin" size={26} />}
                        {viewingProfile.isVerified && <Badge type="verified" size={26} />}
                      </div>
                    </motion.h2>
                    <div className="flex items-center justify-center gap-2 mt-2 mb-2">
                      {viewingProfile.isOnline ? (
                        <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                          <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></span>
                          <span className="text-xs font-bold text-green-600 uppercase tracking-widest">В сети</span>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-vk-text-muted uppercase tracking-widest">{viewingProfile.lastSeen || 'Был(а) недавно'}</span>
                      )}
                    </div>
                    <p className="text-vk-text-muted text-sm font-bold uppercase tracking-widest mt-1 opacity-60">@{viewingProfile.id} • Москва, Россия</p>
                  </div>

                  {viewingProfile.about && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, duration: 0.5 }}
                      className="text-center px-6 mb-8 text-sm text-vk-text leading-relaxed font-medium bg-white/50  p-4 rounded-3xl border border-black/5 shadow-sm"
                    >
                      {viewingProfile.about.split('\n').map((line, i) => (
                        <React.Fragment key={i}>{line}<br/></React.Fragment>
                      ))}
                    </motion.div>
                  )}

                  <div className="flex flex-wrap justify-center gap-2.5 mb-8">
                    {['Музыка', 'Дизайн', 'Спорт', 'Путешествия'].map((tag, idx) => (
                      <motion.span 
                        key={tag}
                        whileHover={{ scale: 1.05, backgroundColor: 'rgba(18, 10, 143, 0.1)' }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 + idx * 0.05 }}
                        className="bg-black/5 text-vk-text px-4 py-2 rounded-2xl text-[11px] font-bold uppercase tracking-widest cursor-pointer transition-all border border-black/5"
                      >
                        {tag}
                      </motion.span>
                    ))}
                  </div>

                  <div className="flex gap-4 w-full sm:w-auto">
                    <motion.button 
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setViewingProfile(null);
                        setActiveChat({ 
                          id: viewingProfile.id, 
                          name: viewingProfile.name, 
                          avatar: viewingProfile.avatar, 
                          isOnline: viewingProfile.isOnline, 
                          isAI: (viewingProfile as any).isAI,
                          isVerified: viewingProfile.isVerified,
                          userTier: (viewingProfile as any).userTier,
                          isAdmin: viewingProfile.isAdmin,
                          isCreator: viewingProfile.isCreator
                        });
                      }}
                      className="flex-1 sm:flex-none bg-blue-600 text-white px-10 py-4 rounded-3xl font-bold text-sm uppercase tracking-widest shadow-xl hover:shadow-[#120a8f]/20 transition-all flex items-center justify-center gap-3"
                    >
                      <MessageCircle size={20} /> Сообщение
                    </motion.button>
                    {viewingProfile.isFriend ? (
                      <motion.button 
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-1 sm:flex-none bg-white border border-black/5 text-vk-text px-10 py-4 rounded-3xl font-bold text-sm uppercase tracking-widest shadow-lg hover:bg-black/5 transition-all flex items-center justify-center gap-3"
                      >
                        <UserMinus size={20} /> Убрать
                      </motion.button>
                    ) : (
                      <motion.button 
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-1 sm:flex-none bg-white border border-black/5 text-vk-text px-10 py-4 rounded-3xl font-bold text-sm uppercase tracking-widest shadow-lg hover:bg-black/5 transition-all flex items-center justify-center gap-3"
                      >
                        <UserPlus size={20} /> Добавить
                      </motion.button>
                    )}
                  </div>
                </div>
              </div>

              {/* Блок фотографий */}
              <div className="w-full max-w-4xl mx-auto px-6 mb-10">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[11px] font-black text-vk-text-muted uppercase tracking-[0.2em]">Фотографии</h3>
                  <motion.span 
                    whileHover={{ x: 3 }}
                    className="text-[11px] font-bold text-[#120a8f] uppercase tracking-widest cursor-pointer hover:underline"
                  >
                    Показать все
                  </motion.span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <motion.div 
                      key={i} 
                      whileHover={{ scale: 1.05, rotate: i % 2 === 0 ? 1 : -1 }}
                      className="aspect-square rounded-2xl overflow-hidden cursor-pointer shadow-md border border-black/5"
                    >
                      <img src={`https://picsum.photos/seed/${viewingProfile.id}photo${i}/300/300`} alt={`Photo ${i}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Стена публикаций */}
              <div className="w-full max-w-4xl mx-auto flex flex-col px-6 mb-12 pb-20">
                <h3 className="text-[11px] font-black text-vk-text-muted mb-4 uppercase tracking-[0.2em]">Стена публикаций</h3>
                
                <div className="space-y-6">
                  {displayPosts.filter(p => p.authorId === viewingProfile.id).length === 0 ? (
                    <div className="text-center py-10 text-vk-text-muted">
                      <p className="text-sm font-medium">Нет записей</p>
                    </div>
                  ) : (
                    displayPosts
                      .filter(p => p.authorId === viewingProfile.id)
                      .map(post => (
                        <PostItem key={post.id} post={post} onClick={() => setSelectedPost(post)} />
                      ))
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        ) : activeTab === 'friends' ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col w-full h-full overflow-y-auto bg-vk-bg pb-20 px-4 pt-6 sm:px-8">
            <div className="max-w-3xl mx-auto w-full">
              <h2 className="text-2xl font-bold text-vk-text mb-6">Друзья</h2>
              
              {/* Навигация друзей */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                <button 
                  onClick={() => setFriendsTab('all')}
                  className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${friendsTab === 'all' ? 'bg-blue-600 text-white shadow-lg shadow-[#120a8f]/20' : 'bg-white text-vk-text hover:bg-black/5 border border-black/5'}`}
                >
                  Все друзья
                </button>
                <button 
                  onClick={() => setFriendsTab('requests')}
                  className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${friendsTab === 'requests' ? 'bg-blue-600 text-white shadow-lg shadow-[#120a8f]/20' : 'bg-white text-vk-text hover:bg-black/5 border border-black/5'}`}
                >
                  Заявки {MOCK_INCOMING_REQUESTS.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{MOCK_INCOMING_REQUESTS.length}</span>}
                </button>
                <button 
                  onClick={() => setFriendsTab('add')}
                  className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${friendsTab === 'add' ? 'bg-blue-600 text-white shadow-lg shadow-[#120a8f]/20' : 'bg-white text-vk-text hover:bg-black/5 border border-black/5'}`}
                >
                  Поиск
                </button>
              </div>

              {friendsTab === 'all' && (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-vk-text-muted" size={18} />
                    <input 
                      type="text" 
                      placeholder="Поиск друзей" 
                      value={friendsSearch}
                      onChange={(e) => setFriendsSearch(e.target.value)}
                      className="w-full bg-white border border-black/5 rounded-2xl py-3.5 pl-10 pr-4 text-vk-text placeholder-vk-text-muted focus:outline-none focus:ring-2 focus:ring-[#120a8f]/20 transition-all shadow-sm"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    {filteredFriends.length === 0 ? (
                      <div className="text-center py-10 text-vk-text-muted">
                        <p className="text-sm font-medium">У вас пока нет друзей</p>
                      </div>
                    ) : (
                      filteredFriends.map(friend => (
                        <FriendItem 
                          key={friend.id} 
                          friend={friend} 
                          onClick={() => setViewingProfile({ 
                            id: friend.id, 
                            name: friend.name, 
                            avatar: friend.avatar, 
                            isFriend: true, 
                            isOnline: friend.isOnline, 
                            lastSeen: friend.lastSeen, 
                            about: 'Информация профиля...',
                            isVerified: (friend as any).isVerified
                          })} 
                        />
                      ))
                    )}
                  </div>
                </div>
              )}

              {friendsTab === 'requests' && (
                <div className="space-y-6">
                  {MOCK_INCOMING_REQUESTS.length === 0 && MOCK_OUTGOING_REQUESTS.length === 0 ? (
                    <div className="text-center py-10 text-vk-text-muted">
                      <p className="text-sm font-medium">Нет заявок в друзья</p>
                    </div>
                  ) : (
                    <>
                      {MOCK_INCOMING_REQUESTS.length > 0 && (
                        <div>
                          <h3 className="text-sm font-bold text-vk-text-muted uppercase tracking-wider mb-3">Входящие заявки</h3>
                          <div className="space-y-2">
                            {MOCK_INCOMING_REQUESTS.map(req => (
                              <div key={req.id} className="bg-vk-panel border border-black/10 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                                <div 
                                  className="w-14 h-14 rounded-full overflow-hidden shrink-0 cursor-pointer"
                                  onClick={() => setViewingProfile({ id: req.id, name: req.name, avatar: req.avatar, isFriend: false, isOnline: true, about: 'Информация профиля...' })}
                                >
                                  <img src={req.avatar} alt={req.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                </div>
                                <div className="flex-1">
                                  <h4 
                                    className="text-base font-bold text-vk-text cursor-pointer hover:underline"
                                    onClick={() => setViewingProfile({ id: req.id, name: req.name, avatar: req.avatar, isFriend: false, isOnline: true, about: 'Информация профиля...' })}
                                  >
                                    {req.name}
                                  </h4>
                                  <p className="text-sm text-vk-text-muted">{req.mutual} общих друзей</p>
                                </div>
                                <div className="flex gap-2">
                                  <button className="w-10 h-10 rounded-full bg-vk-accent text-white flex items-center justify-center hover:opacity-90 transition-opacity">
                                    <Check size={20} />
                                  </button>
                                  <button className="w-10 h-10 rounded-full bg-black/5 text-vk-text flex items-center justify-center hover:bg-black/10 transition-colors">
                                    <X size={20} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {MOCK_OUTGOING_REQUESTS.length > 0 && (
                        <div>
                          <h3 className="text-sm font-bold text-vk-text-muted uppercase tracking-wider mb-3">Исходящие заявки</h3>
                          <div className="space-y-2">
                            {MOCK_OUTGOING_REQUESTS.map(req => (
                              <div key={req.id} className="bg-vk-panel border border-black/10 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                                <div className="w-14 h-14 rounded-full overflow-hidden shrink-0">
                                  <img src={req.avatar} alt={req.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                </div>
                                <div className="flex-1">
                                  <h4 className="text-base font-bold text-vk-text">{req.name}</h4>
                                  <p className="text-sm text-vk-text-muted">Подписаны</p>
                                </div>
                                <button className="px-4 py-2 rounded-full bg-black/5 text-vk-text text-sm font-medium hover:bg-black/10 transition-colors">
                                  Отменить
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {friendsTab === 'add' && (
                <div className="space-y-6">
                  <div className="relative flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-vk-text-muted" size={18} />
                      <input 
                        type="text" 
                        placeholder="Имя или ID пользователя" 
                        value={addFriendSearch}
                        onChange={(e) => setAddFriendSearch(e.target.value)}
                        className="w-full bg-vk-panel border border-black/10 rounded-xl py-3 pl-10 pr-4 text-vk-text placeholder-vk-text-muted focus:outline-none focus:border-vk-accent transition-colors"
                      />
                    </div>
                    <button className="bg-vk-accent text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity whitespace-nowrap">
                      Найти
                    </button>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-vk-text-muted uppercase tracking-wider mb-3">Возможно, вы знакомы</h3>
                    <div className="space-y-2">
                      {MOCK_RECOMMENDED.length === 0 ? (
                        <div className="text-center py-10 text-vk-text-muted bg-white border border-black/5 rounded-2xl shadow-sm">
                          <p className="text-sm font-medium">Нет рекомендаций</p>
                        </div>
                      ) : (
                        MOCK_RECOMMENDED.map(rec => (
                          <div key={rec.id} className="bg-vk-panel border border-black/10 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                            <div 
                              className="w-14 h-14 rounded-full overflow-hidden shrink-0 cursor-pointer"
                              onClick={() => setViewingProfile({ id: rec.id, name: rec.name, avatar: rec.avatar, isFriend: false, isOnline: false, lastSeen: 'Был(а) недавно', about: 'Информация профиля...' })}
                            >
                              <img src={rec.avatar} alt={rec.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                            <div className="flex-1">
                              <h4 
                                className="text-base font-bold text-vk-text cursor-pointer hover:underline"
                                onClick={() => setViewingProfile({ id: rec.id, name: rec.name, avatar: rec.avatar, isFriend: false, isOnline: false, lastSeen: 'Был(а) недавно', about: 'Информация профиля...' })}
                              >
                                {rec.name}
                              </h4>
                              <p className="text-sm text-vk-text-muted">{rec.mutual} общих друзей</p>
                            </div>
                            <button className="w-10 h-10 rounded-full bg-vk-accent/10 text-vk-accent flex items-center justify-center hover:bg-vk-accent/20 transition-colors">
                              <UserPlus size={20} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ) : activeTab === 'messages' ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col w-full h-full overflow-y-auto bg-vk-bg pb-20 px-4 pt-6 sm:px-8">
            <div className="max-w-3xl mx-auto w-full">
              <h2 className="text-2xl font-bold text-[#120a8f] mb-6">Сообщения</h2>
              
              {/* Gemini Bot Chat */}
              <motion.div 
                whileHover={{ scale: 1.01 }}
                onClick={() => setActiveChat({ id: 'gemini_bot', name: 'Gemini AI', avatar: 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg', isOnline: true, isAI: true })}
                className="bg-white border border-black/5 rounded-3xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all cursor-pointer mb-4"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shrink-0 shadow-lg">
                  <Aperture size={30} className="text-white animate-spin-slow" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="text-base font-bold text-vk-text truncate flex items-center gap-1">
                      Gemini AI
                      <Badge type="verified" size={14} />
                    </h4>
                    <span className="text-[10px] font-bold text-vk-accent uppercase tracking-wider shrink-0">AI Bot</span>
                  </div>
                  <p className="text-sm text-vk-text-muted truncate">Привет! Я Gemini AI. Чем могу помочь?</p>
                </div>
              </motion.div>

              {/* Virtual Chats */}
              <div className="space-y-2">
                {displayChats.map((chat) => (
                  <ChatItem 
                    key={chat.id} 
                    chat={chat} 
                    onClick={() => {
                      setActiveChat({ 
                        id: chat.id, 
                        name: chat.name, 
                        avatar: chat.avatar, 
                        isOnline: chat.isOnline, 
                        isAI: chat.isAI,
                        isVerified: (chat as any).isVerified,
                        userTier: (chat as any).userTier
                      });
                      setChatMessages([
                        { id: 1, type: 'date', text: 'Сегодня' },
                        { id: 2, type: 'text', text: chat.lastMessage, sender: 'other', time: chat.time, status: 'read' }
                      ]);
                    }} 
                  />
                ))}
              </div>
            </div>
          </motion.div>
        ) : activeTab === 'communities' ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col w-full h-full overflow-y-auto bg-vk-bg pb-20 px-4 pt-6 sm:px-8">
            <div className="max-w-3xl mx-auto w-full">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-[#120a8f]">Хаб</h2>
                <motion.button 
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => hubView === 'communities' ? setIsCreatingCommunity(true) : setIsCreatingHubProfile(true)}
                  className="w-10 h-10 rounded-full bg-[#120a8f]/10 text-[#120a8f] flex items-center justify-center hover:bg-[#120a8f]/20 transition-colors"
                >
                  <Plus size={20} />
                </motion.button>
              </div>

              <div className="flex gap-2 mb-6 bg-black/5 p-1 rounded-2xl w-fit">
                <button 
                  onClick={() => setHubView('communities')}
                  className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${hubView === 'communities' ? 'bg-white text-[#120a8f] shadow-sm' : 'text-vk-text-muted'}`}
                >
                  Сообщества
                </button>
                <button 
                  onClick={() => setHubView('profiles')}
                  className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${hubView === 'profiles' ? 'bg-white text-[#120a8f] shadow-sm' : 'text-vk-text-muted'}`}
                >
                  Профили
                </button>
              </div>

              {hubView === 'communities' ? (
                <>
                  <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-vk-text-muted" size={18} />
                    <input 
                      type="text" 
                      placeholder="Поиск сообществ" 
                      value={communitiesSearch}
                      onChange={(e) => setCommunitiesSearch(e.target.value)}
                      className="w-full bg-white border border-black/5 rounded-2xl py-3.5 pl-10 pr-4 text-vk-text placeholder-vk-text-muted focus:outline-none focus:ring-2 focus:ring-[#120a8f]/20 transition-all shadow-sm"
                    />
                  </div>

                  <div className="space-y-3">
                    {filteredCommunities.length === 0 ? (
                      <div className="text-center py-10 text-vk-text-muted">
                        <p className="text-sm font-medium">Нет сообществ</p>
                      </div>
                    ) : (
                      filteredCommunities.map(community => (
                        <CommunityItem 
                          key={community.id} 
                          community={community} 
                          onClick={() => {
                            setActiveCommunity(community);
                            setActiveChannel(MOCK_CHANNELS[0]);
                            setCommunityView('chat');
                          }} 
                        />
                      ))
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-vk-text-muted" size={18} />
                    <input 
                      type="text" 
                      placeholder="Поиск профилей" 
                      value={hubSearch}
                      onChange={(e) => setHubSearch(e.target.value)}
                      className="w-full bg-white border border-black/5 rounded-2xl py-3.5 pl-10 pr-4 text-vk-text placeholder-vk-text-muted focus:outline-none focus:ring-2 focus:ring-[#120a8f]/20 transition-all shadow-sm"
                    />
                  </div>

                  <div className="space-y-3">
                    {hubProfiles.filter(p => p.hubName.toLowerCase().includes(hubSearch.toLowerCase())).length === 0 && VIRTUAL_USERS.length === 0 ? (
                      <div className="text-center py-10 text-vk-text-muted">
                        <p className="text-sm font-medium">Профили не найдены</p>
                      </div>
                    ) : (
                      <>
                        {/* Real Profiles */}
                        {hubProfiles.filter(p => p.hubName.toLowerCase().includes(hubSearch.toLowerCase())).map(profile => (
                          <div 
                            key={profile.id} 
                            onClick={() => setViewingProfile({ 
                              id: profile.uid,
                              name: profile.hubName,
                              avatar: profile.photoURL,
                              isFriend: false, 
                              isOnline: true, 
                              lastSeen: 'В сети', 
                              about: profile.about || 'Пользователь хаба',
                              specialization: profile.specialization,
                              interests: profile.interests
                            })}
                            className="bg-white border border-black/5 rounded-3xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
                          >
                            <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 shadow-sm">
                              <img src={profile.photoURL} alt={profile.hubName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <h4 className="text-base font-bold text-vk-text truncate">{profile.hubName}</h4>
                              <p className="text-sm text-vk-text-muted truncate">{profile.specialization || 'Пользователь хаба'}</p>
                            </div>
                            <button className="w-10 h-10 rounded-full bg-vk-accent/10 text-vk-accent flex items-center justify-center hover:bg-vk-accent/20 transition-colors">
                              <UserPlus size={20} />
                            </button>
                          </div>
                        ))}
                        
                        {/* Virtual Users as placeholders if no real ones match or just to fill up */}
                        {VIRTUAL_USERS.filter(u => u.name.toLowerCase().includes(hubSearch.toLowerCase())).map(user => (
                          <div 
                            key={user.id} 
                            onClick={() => setViewingProfile({ ...user, isFriend: false, isOnline: true, lastSeen: 'В сети', about: 'Пользователь хаба' })}
                            className="bg-white border border-black/5 rounded-3xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all cursor-pointer opacity-70"
                          >
                            <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 shadow-sm">
                              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <h4 className="text-base font-bold text-vk-text truncate">{user.name}</h4>
                              <p className="text-sm text-vk-text-muted truncate">Пользователь хаба (Виртуальный)</p>
                            </div>
                            <button className="w-10 h-10 rounded-full bg-vk-accent/10 text-vk-accent flex items-center justify-center hover:bg-vk-accent/20 transition-colors">
                              <UserPlus size={20} />
                            </button>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        ) : activeTab === 'home' ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col w-full h-full overflow-y-auto bg-vk-bg pb-20">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-white/80  sticky top-0 z-20 border-b border-black/5">
              <h1 className="text-xl font-bold text-[#120a8f]">Лента</h1>
              <div className="flex items-center gap-3">
                <button className="p-2 text-vk-text-muted hover:bg-black/5 rounded-full transition-colors"><Search size={22} /></button>
                <button className="p-2 text-vk-text-muted hover:bg-black/5 rounded-full transition-colors"><Bell size={22} /></button>
              </div>
            </div>

            {/* Stories */}
            <div className="py-4 bg-white border-b border-black/5 mb-2">
              <div className="flex gap-4 px-4 overflow-x-auto no-scrollbar">
                {MOCK_STORIES.map(story => (
                  <div key={story.id} className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer">
                    <div className={`w-16 h-16 rounded-full p-[2px] ${story.hasUnseen ? 'bg-gradient-to-tr from-[#120a8f] to-purple-500' : 'bg-transparent'}`}>
                      <div className="w-full h-full rounded-full border-2 border-white overflow-hidden relative bg-vk-panel">
                        <img src={story.avatar} alt={story.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        {story.isAdd && (
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-white">
                            <Plus size={24} />
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-vk-text truncate w-16 text-center">{story.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Create Post Area */}
            <div className="px-4 mb-4 max-w-3xl mx-auto w-full">
              <div className="flex flex-col bg-white border border-[#e1e4e8] rounded-xl p-3 transition-all duration-300 focus-within:border-[#0077ff] focus-within:shadow-[0_4px_12px_rgba(0,119,255,0.15)] shadow-sm">
                <textarea 
                  placeholder="Что у вас нового? (Создать публикацию)" 
                  rows={1}
                  value={newPostText}
                  onChange={(e) => setNewPostText(e.target.value)}
                  className="border-none outline-none text-base resize-none min-h-[40px] bg-transparent text-vk-text placeholder-vk-text-muted"
                />
                <button 
                  onClick={async () => {
                    if (newPostText.trim() && currentUser) {
                      try {
                        await addDoc(collection(db, 'posts'), {
                          authorId: currentUser.uid,
                          authorName: currentUser.displayName || 'Пользователь',
                          authorPhoto: currentUser.photoURL || DEFAULT_AVATAR,
                          authorIsVerified: isVerified,
                          text: newPostText,
                          createdAt: new Date().toISOString(),
                          likes: 0,
                          comments: 0,
                          shares: 0,
                          views: 1
                        });
                        setNewPostText('');
                        toast.success('Пост опубликован!');
                      } catch (error) {
                        handleFirestoreError(error, OperationType.CREATE, 'posts');
                      }
                    }
                  }}
                  className="self-end bg-blue-600 text-white border-none px-6 py-2.5 rounded-full cursor-pointer mt-2.5 font-bold active:scale-95 transition-transform shadow-md hover:bg-blue-700 flex items-center gap-2"
                >
                  <Send size={18} />
                  Опубликовать
                </button>
              </div>
            </div>

            {/* Posts */}
            <div className="flex flex-col gap-1 sm:px-4 max-w-3xl mx-auto w-full">
              {displayPosts.length === 0 ? (
                <div className="text-center py-10 text-vk-text-muted bg-white border border-black/5 rounded-2xl shadow-sm">
                  <p className="text-sm font-medium">Нет записей</p>
                </div>
              ) : (
                displayPosts.map(post => (
                  <PostItem key={post.id} post={post} onClick={() => setSelectedPost(post)} />
                ))
              )}
            </div>
          </motion.div>
        ) : activeTab === 'profile' ? (
          <div className="flex-1 flex flex-col w-full h-full overflow-y-auto bg-vk-bg pb-20">
            {isEditingProfile ? (
              /* СОВРЕМЕННАЯ ФОРМА РЕДАКТИРОВАНИЯ */
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col w-full h-full">
                <div className="flex items-center px-4 py-4 bg-vk-bg/80  sticky top-0 z-20">
                  <button onClick={() => setIsEditingProfile(false)} className="p-2 -ml-2 text-vk-text hover:bg-vk-panel rounded-full transition-colors">
                    <ChevronLeft size={24} />
                  </button>
                  <h2 className="text-lg font-bold ml-2">Редактирование</h2>
                </div>

                <div className="relative h-32 sm:h-48 w-full mb-12">
                  <img src={DEFAULT_COVER} alt="Cover" className="absolute inset-0 w-full h-full object-cover opacity-70" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <button className="bg-black/50 text-white px-4 py-2 rounded-full flex items-center gap-2  hover:bg-black/60 transition-colors">
                      <Camera size={18} />
                      <span className="text-sm font-medium">Изменить обложку</span>
                    </button>
                  </div>
                  <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <div className="relative group cursor-pointer">
                      <div className="w-24 h-24 rounded-full bg-vk-panel border-4 border-vk-bg shadow-md overflow-hidden relative">
                        <img src="https://picsum.photos/seed/user/200/200" alt="Avatar" className="w-full h-full object-cover opacity-60" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 flex items-center justify-center text-white drop-shadow-md">
                          <Camera size={24} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-8 max-w-md mx-auto w-full mt-4">
                  <div className="space-y-6">
                    {/* Блок: О себе */}
                    <div className="bg-vk-panel rounded-3xl p-1.5 shadow-sm border border-vk-border/40">
                      <div className="px-4 py-3">
                        <label className="text-[11px] font-bold text-vk-text-muted uppercase tracking-wider">О себе</label>
                      </div>
                      <div className="px-2 pb-2">
                        <textarea 
                          placeholder="Расскажите немного о себе..." 
                          rows={3}
                          className="w-full bg-vk-bg border-none rounded-2xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-vk-accent/50 text-sm font-medium transition-all resize-none"
                          defaultValue="Создаю красивые интерфейсы и пишу чистый код. &#10;Всегда в поиске вдохновения! ✨"
                        />
                      </div>
                    </div>

                    {/* Блок: Основное */}
                    <div className="bg-vk-panel rounded-3xl p-1.5 shadow-sm border border-vk-border/40">
                      <div className="px-4 py-3">
                        <label className="text-[11px] font-bold text-vk-text-muted uppercase tracking-wider">Основное</label>
                      </div>
                      <div className="px-2 pb-2 space-y-2">
                        <input type="text" placeholder="Имя и фамилия" className="w-full bg-vk-bg border-none rounded-2xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-vk-accent/50 text-sm font-medium transition-all" />
                        <select defaultValue="" className="w-full bg-vk-bg border-none rounded-2xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-vk-accent/50 text-sm font-medium appearance-none text-vk-text transition-all">
                          <option value="" disabled>Пол</option>
                          <option value="male">Мужской</option>
                          <option value="female">Женский</option>
                        </select>
                        <input type="text" placeholder="User ID" className="w-full bg-vk-bg border-none rounded-2xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-vk-accent/50 text-sm font-medium transition-all" />
                      </div>
                    </div>

                    {/* Блок: Контакты */}
                    <div className="bg-vk-panel rounded-3xl p-1.5 shadow-sm border border-vk-border/40">
                      <div className="px-4 py-3">
                        <label className="text-[11px] font-bold text-vk-text-muted uppercase tracking-wider">Контакты</label>
                      </div>
                      <div className="px-2 pb-2 space-y-2">
                        <div className="flex gap-2">
                          <input type="text" placeholder="Страна" className="w-1/2 bg-vk-bg border-none rounded-2xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-vk-accent/50 text-sm font-medium transition-all" />
                          <input type="text" placeholder="Город" className="w-1/2 bg-vk-bg border-none rounded-2xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-vk-accent/50 text-sm font-medium transition-all" />
                        </div>
                        <input type="email" placeholder="Email адрес" className="w-full bg-vk-bg border-none rounded-2xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-vk-accent/50 text-sm font-medium transition-all" />
                      </div>
                    </div>

                    <button 
                      onClick={() => setIsEditingProfile(false)} 
                      className="w-full bg-vk-accent text-white font-bold rounded-2xl px-4 py-4 mt-4 shadow-lg shadow-vk-accent/20 hover:opacity-90 active:scale-[0.98] transition-all"
                    >
                      Сохранить изменения
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              /* СОВРЕМЕННЫЙ ВИД ПРОФИЛЯ */
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col w-full">
                {/* Обложка и шапка */}
                <div className="relative h-48 sm:h-64 w-full overflow-hidden">
                  <img 
                    src={DEFAULT_COVER} 
                    alt="Cover" 
                    className="absolute inset-0 w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-blue-600"></div>
                  
                  <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-10">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <motion.div 
                          whileHover={{ scale: 1.05 }}
                          className="bg-white/20  px-3 py-1.5 rounded-2xl flex items-center gap-2 border border-white/10 shadow-lg"
                        >
                          <Award size={14} className="text-yellow-400" />
                          <span className="text-white text-xs font-bold uppercase tracking-wider">Online</span>
                        </motion.div>
                      </div>
                      
                      {isAdmin && (
                        <motion.button 
                          whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setIsAdminPanelOpen(true)} 
                          className="px-4 py-2 text-white bg-white/10  border border-white/20 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all"
                        >
                          <Shield size={16} />
                          Админ-панель
                        </motion.button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 relative">
                      <motion.button 
                        whileHover={{ scale: 1.1, rotate: 15 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)} 
                        className="w-10 h-10 text-white bg-white/10  border border-white/20 rounded-full flex items-center justify-center shadow-lg transition-all"
                      >
                        <Settings size={22} />
                      </motion.button>
                      
                      {/* Выпадающее меню настроек */}
                      {isSettingsOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsSettingsOpen(false)} />
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="absolute right-0 mt-2 w-48 bg-white border border-black/5 rounded-3xl shadow-2xl py-2 z-50 overflow-hidden"
                          >
                            <button 
                              onClick={async () => {
                                setIsSettingsOpen(false);
                                await signOut(auth);
                                setActiveTab('home');
                              }} 
                              className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 transition-colors text-sm font-bold outline-none"
                            >
                              <LogOut size={18} />
                              Выйти из аккаунта
                            </button>
                          </motion.div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Информация пользователя */}
                <div className="px-4 relative max-w-md mx-auto w-full">
                  <div className="flex flex-col items-center -mt-20 sm:-mt-24 mb-8">
                    <motion.div 
                      className="relative mb-4"
                      animate={{ y: [0, -8, 0] }}
                      transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    >
                      <div className="w-36 h-36 sm:w-40 sm:h-40 rounded-3xl border-[4px] border-white bg-white overflow-hidden shadow-2xl relative">
                        <img src={currentUser?.photoURL || DEFAULT_AVATAR} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 ring-1 ring-black/5 rounded-3xl" />
                      </div>
                      <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 w-8 h-8 sm:w-9 sm:h-9 bg-green-500 rounded-full border-[4px] border-white shadow-lg" />
                    </motion.div>

                    <div className="text-center mb-5">
                      <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-vk-text flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2">
                          {currentUser?.displayName || 'Имя Пользователя'}
                          <Badge type="verified" size={24} />
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isAdmin && (
                            <>
                              <Badge type="creator" size={20} />
                              <Badge type="admin" size={20} />
                            </>
                          )}
                        </div>
                      </h2>
                      <div className="flex items-center justify-center gap-1.5 mt-1 mb-3">
                        <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></span>
                        <span className="text-sm font-medium text-green-600">В сети</span>
                      </div>
                      
                      {/* Прогресс уровня удален */}

                      <p className="text-vk-text-muted text-sm font-medium">@username • Москва, Россия</p>
                    </div>

                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, duration: 0.5 }}
                      className="text-center px-4 mb-6 text-sm text-vk-text leading-relaxed italic"
                    >
                      "Создаю красивые интерфейсы и пишу чистый код. <br/> Всегда в поиске вдохновения! ✨"
                    </motion.div>

                    <div className="flex flex-wrap justify-center gap-2 mb-6">
                      <span className="bg-vk-accent/10 text-vk-accent px-3 py-1 rounded-full text-sm font-medium cursor-pointer hover:bg-vk-accent/20 transition-colors">Программирование</span>
                      <span className="bg-vk-accent/10 text-vk-accent px-3 py-1 rounded-full text-sm font-medium cursor-pointer hover:bg-vk-accent/20 transition-colors">Технологии</span>
                      <span className="bg-vk-accent/10 text-vk-accent px-3 py-1 rounded-full text-sm font-medium cursor-pointer hover:bg-vk-accent/20 transition-colors">Игры</span>
                    </div>

                    <button 
                      onClick={() => setIsEditingProfile(true)}
                      className="bg-vk-panel border border-black/10 text-vk-text px-8 py-3 rounded-full font-semibold text-base shadow-lg hover:bg-black/5 active:scale-95 transition-all "
                    >
                      Редактировать профиль
                    </button>
                  </div>
                </div>

                {/* Блок фотографий */}
                <div className="w-full max-w-3xl mx-auto px-4 sm:px-4 mb-8">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-[13px] font-bold text-vk-text-muted uppercase tracking-wider">Мои фотографии</h3>
                    <span className="text-sm text-vk-accent cursor-pointer hover:underline">Добавить</span>
                  </div>
                  <div className="text-center py-6 text-vk-text-muted bg-white border border-black/5 rounded-2xl shadow-sm">
                    <p className="text-sm font-medium">Нет фотографий</p>
                  </div>
                </div>

                {/* Стена публикаций на всю ширину */}
                <div className="w-full max-w-3xl mx-auto flex flex-col sm:px-4 mb-8 pb-20">
                  <h3 className="text-[11px] font-bold text-vk-text-muted mb-2 mt-2 uppercase tracking-wider px-5 sm:px-1">Стена</h3>
                  
                  <div className="bg-vk-panel border-y border-black/10 sm:border sm:rounded-2xl shadow-lg  flex flex-col divide-y divide-black/10">
                    {/* Создание записи */}
                    <div className="p-4 flex flex-col gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                          <img src={currentUser?.photoURL || DEFAULT_AVATAR} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex-1 flex flex-col gap-2">
                          <textarea 
                            placeholder="Что у вас нового?"
                            value={newPostText}
                            onChange={(e) => setNewPostText(e.target.value)}
                            className="w-full bg-transparent border-none outline-none resize-none min-h-[40px] pt-2 text-vk-text placeholder-vk-text-muted"
                            rows={newPostText.trim() || newPostImage ? 3 : 1}
                          />
                          
                          {newPostImage && (
                            <div className="relative w-full max-h-[300px] rounded-2xl overflow-hidden border border-black/5 group">
                              <img src={newPostImage} alt="Preview" className="w-full h-full object-cover" />
                              <button 
                                onClick={() => setNewPostImage(null)}
                                className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2">
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            ref={postImageInputRef}
                            onChange={(e) => handleFileSelect(e, setNewPostImage)}
                          />
                          <button 
                            onClick={() => postImageInputRef.current?.click()}
                            className={`p-2 rounded-xl transition-colors ${newPostImage ? 'bg-vk-accent/10 text-vk-accent' : 'text-vk-text-muted hover:bg-black/5'}`}
                            title="Добавить фото"
                          >
                            <ImageIcon size={20} />
                          </button>
                        </div>
                        {(newPostText.trim() || newPostImage) && (
                          <button 
                            onClick={async () => {
                              if ((newPostText.trim() || newPostImage) && currentUser) {
                                try {
                                  await addDoc(collection(db, 'posts'), {
                                    authorId: currentUser.uid,
                                    authorName: currentUser.displayName || 'Пользователь',
                                    authorPhoto: currentUser.photoURL || DEFAULT_AVATAR,
                                    authorIsVerified: isVerified,
                                    text: newPostText,
                                    image: newPostImage,
                                    createdAt: new Date().toISOString(),
                                    likes: 0,
                                    comments: 0,
                                    shares: 0,
                                    views: 1
                                  });
                                  setNewPostText('');
                                  setNewPostImage(null);
                                  toast.success('Пост опубликован!');
                                } catch (error) {
                                  handleFirestoreError(error, OperationType.CREATE, 'posts');
                                }
                              }
                            }}
                            className="bg-vk-accent text-white px-6 py-2 rounded-full font-medium text-sm hover:bg-vk-accent/90 active:scale-95 transition-all flex items-center gap-2"
                          >
                            <Send size={16} />
                            Опубликовать
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Posts List */}
                    <div className="flex flex-col divide-y divide-black/5">
                      {displayPosts.filter(p => p.authorId === currentUser.uid).length === 0 ? (
                        <div className="text-center py-10 text-vk-text-muted">
                          <p className="text-sm font-medium">Нет записей</p>
                        </div>
                      ) : (
                        displayPosts
                          .filter(p => p.authorId === currentUser.uid)
                          .map(post => (
                            <PostItem key={post.id} post={post} onClick={() => setSelectedPost(post)} />
                          ))
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        ) : null}
      </div>

      {/* Post Details Modal */}
      {selectedPost && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="fixed inset-0 bg-vk-bg z-50 flex flex-col">
          <div className="flex items-center px-4 py-3 bg-vk-panel/80  sticky top-0 z-20 border-b border-black/5">
            <button onClick={() => setSelectedPost(null)} className="p-2 -ml-2 text-vk-text hover:bg-black/5 rounded-full transition-colors">
              <ChevronLeft size={24} />
            </button>
            <h2 className="text-lg font-bold ml-2">Запись</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto pb-20">
            <div className="bg-vk-panel border-b border-black/10">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden">
                      <img src={selectedPost.author.avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-vk-text">{selectedPost.author.name}</h4>
                      <p className="text-xs text-vk-text-muted">{selectedPost.time}</p>
                    </div>
                  </div>
                  <button className="text-vk-text-muted hover:text-vk-text p-1">
                    <MoreHorizontal size={18} />
                  </button>
                </div>
                <div className="text-base text-vk-text mb-3 leading-relaxed">
                  {selectedPost.text}
                </div>
                {selectedPost.image && (
                  <div className="rounded-xl overflow-hidden mb-3 border border-black/5 -mx-4 sm:mx-0 sm:rounded-xl">
                    <img src={selectedPost.image} alt="Post content" className="w-full h-auto object-cover" referrerPolicy="no-referrer" />
                  </div>
                )}
                <div className="flex items-center gap-4 pt-2 border-t border-black/5 mt-4">
                  <button className="flex items-center gap-1.5 text-vk-text-muted hover:text-red-400 transition-colors bg-black/5 px-3 py-1.5 rounded-full">
                    <Heart size={18} />
                    <span className="text-xs font-medium">{selectedPost.likes}</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-vk-text-muted hover:text-blue-400 transition-colors bg-black/5 px-3 py-1.5 rounded-full">
                    <MessageCircle size={18} />
                    <span className="text-xs font-medium">{selectedPost.comments}</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-vk-text-muted hover:text-green-400 transition-colors bg-black/5 px-3 py-1.5 rounded-full ml-auto">
                    <Share2 size={18} />
                    <span className="text-xs font-medium">{selectedPost.shares}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-vk-panel mt-2 p-4 min-h-screen">
              <h3 className="font-bold text-vk-text mb-4">Комментарии ({selectedPost.comments})</h3>
              <div className="flex flex-col gap-5">
                {MOCK_COMMENTS.map(c => (
                  <div key={c.id} className="flex gap-3">
                    <img src={c.avatar} className="w-8 h-8 rounded-full shrink-0" referrerPolicy="no-referrer" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-vk-text">{c.author}</span>
                        <span className="text-xs text-vk-text-muted">{c.time}</span>
                      </div>
                      <p className="text-sm text-vk-text mt-0.5">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 bg-vk-panel border-t border-black/10 p-3 flex items-center gap-3 pb-safe z-30">
            <img src={DEFAULT_AVATAR} className="w-8 h-8 rounded-full shrink-0" referrerPolicy="no-referrer" />
            <input type="text" placeholder="Написать комментарий..." className="flex-1 bg-black/5 rounded-full px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-vk-accent/50 transition-all" />
            <button className="text-vk-accent p-2 hover:bg-vk-accent/10 rounded-full transition-colors">
              <Send size={20} />
            </button>
          </div>
        </motion.div>
      )}

      {/* Chat View Overlay */}
      <AnimatePresence>
        {activeChat && (
          <motion.div 
            key="chat-view"
            initial={{ x: '100%' }} 
            animate={{ x: 0 }} 
            exit={{ x: '100%' }} 
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-vk-bg flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 bg-white/90  border-b border-black/5 z-20 shadow-sm">
              <div className="flex items-center gap-3">
                <motion.button 
                  whileHover={{ scale: 1.1, x: -2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setActiveChat(null)} 
                  className="p-2 -ml-2 text-vk-text hover:bg-black/5 rounded-full transition-colors"
                >
                  <ChevronLeft size={24} />
                </motion.button>
                <div 
                  className="flex items-center gap-3 cursor-pointer" 
                  onClick={() => {
                    setActiveChat(null);
                    setViewingProfile({ 
                      id: activeChat.id, 
                      name: activeChat.name, 
                      avatar: activeChat.avatar, 
                      isFriend: true, 
                      isOnline: activeChat.isOnline, 
                      about: 'Информация профиля...',
                      isAI: activeChat.isAI,
                      isVerified: activeChat.isVerified,
                      isAdmin: activeChat.isAdmin,
                      isCreator: activeChat.isCreator
                    });
                  }}
                >
                  <div className="relative w-11 h-11 rounded-2xl overflow-hidden shrink-0 shadow-sm">
                    <img src={activeChat.avatar} alt={activeChat.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    {activeChat.isOnline && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-vk-text text-base leading-tight flex items-center gap-1">
                      {activeChat.name}
                      <div className="flex items-center gap-0.5">
                        {activeChat.isCreator && <Badge type="creator" size={14} />}
                        {activeChat.isAdmin && <Badge type="admin" size={14} />}
                        {activeChat.isVerified && <Badge type="verified" size={14} />}
                      </div>
                    </h3>
                    <p className="text-[10px] font-bold text-vk-accent uppercase tracking-wider animate-pulse">печатает...</p>
                  </div>
                </div>
              </div>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 text-vk-text-muted hover:text-vk-text hover:bg-black/5 rounded-full transition-colors"
              >
                <MoreVertical size={20} />
              </motion.button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-vk-bg relative" onClick={() => setSelectedMessageId(null)}>
              {(activeChat?.id === 'gemini_bot' ? geminiMessages : chatMessages).map(msg => {
                if (msg.type === 'date') {
                  return (
                    <div key={msg.id} className="flex justify-center my-4">
                      <span className="bg-white/50  text-vk-text-muted text-[10px] font-bold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-sm">
                        {msg.text}
                      </span>
                    </div>
                  );
                }

                const isMe = msg.sender === 'me';
                
                return (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="relative group max-w-[80%] sm:max-w-[70%]">
                      <div 
                        onClick={(e) => { e.stopPropagation(); setSelectedMessageId(selectedMessageId === msg.id ? null : msg.id); }}
                        className={`p-4 shadow-sm cursor-pointer transition-transform active:scale-[0.98] ${
                          isMe 
                            ? 'bg-blue-600 text-white rounded-3xl rounded-br-sm' 
                            : 'bg-white border border-black/5 text-vk-text rounded-3xl rounded-bl-sm'
                        }`}
                      >
                        {msg.type === 'text' && (
                          <p className="text-sm break-words whitespace-pre-wrap leading-relaxed font-medium">{msg.text}</p>
                        )}
                        {msg.type === 'image' && (
                          <div className="rounded-2xl overflow-hidden -mx-1 -mt-1 mb-1 shadow-sm">
                            <img src={msg.url} alt="Attachment" className="w-full h-auto object-cover" referrerPolicy="no-referrer" />
                          </div>
                        )}
                        {msg.type === 'voice' && (
                          <div className="flex items-center gap-3 min-w-[180px]">
                            <button className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-sm ${isMe ? 'bg-white/20 text-white' : 'bg-[#120a8f]/10 text-[#120a8f]'}`}>
                              <Play size={20} className="ml-1" />
                            </button>
                            <div className="flex-1 h-1.5 bg-black/10 rounded-full overflow-hidden relative">
                              <div className={`absolute left-0 top-0 bottom-0 w-1/3 rounded-full ${isMe ? 'bg-white' : 'bg-[#120a8f]'}`} />
                            </div>
                            <span className={`text-[10px] font-bold ${isMe ? 'text-white/80' : 'text-vk-text-muted'}`}>{msg.duration}</span>
                          </div>
                        )}
                        
                        <div className={`flex items-center justify-end gap-1 mt-2 ${isMe ? 'text-white/70' : 'text-vk-text-muted'}`}>
                          <span className="text-[10px] font-bold uppercase tracking-wider">{msg.time}</span>
                          {isMe && (
                            msg.status === 'read' ? <CheckCheck size={14} /> : <Check size={14} />
                          )}
                        </div>
                      </div>

                      {/* Context Menu */}
                      <AnimatePresence>
                        {selectedMessageId === msg.id && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: isMe ? -10 : 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: isMe ? -10 : 10 }}
                            className={`absolute ${isMe ? 'top-full right-0 mt-2' : 'bottom-full left-0 mb-2'} bg-white border border-black/5 shadow-2xl rounded-3xl p-2 z-30 flex flex-col min-w-[160px] `}
                          >
                            <button className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-vk-text hover:bg-black/5 rounded-2xl transition-colors">
                              <Copy size={18} className="text-vk-text-muted" /> Копировать
                            </button>
                            <button className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-vk-text hover:bg-black/5 rounded-2xl transition-colors">
                              <Reply size={18} className="text-vk-text-muted" /> Ответить
                            </button>
                            <div className="h-px bg-black/5 my-1.5 mx-3" />
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg.id); }} 
                              className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} /> Удалить
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
              {isGeminiTyping && activeChat?.isAI && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex justify-start mb-4">
                  <div className="bg-vk-panel border border-black/5 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-2">
                    <div className="w-2 h-2 bg-vk-accent/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-vk-accent/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-vk-accent/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-vk-panel/90  border-t border-black/5 z-20">
              <div className="flex items-end gap-2 max-w-4xl mx-auto w-full">
                <button className="p-2.5 text-vk-text-muted hover:text-vk-text hover:bg-black/5 rounded-full transition-colors shrink-0">
                  <Paperclip size={22} />
                </button>
                
                <div className="flex-1 bg-black/5 border border-black/5 rounded-2xl flex items-end relative transition-colors focus-within:bg-white focus-within:border-vk-accent/30 focus-within:shadow-sm">
                  <textarea 
                    value={newChatMessage} 
                    onChange={e => setNewChatMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Сообщение..." 
                    className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[44px] py-3 px-4 text-sm text-vk-text placeholder-vk-text-muted"
                    rows={1}
                  />
                  <button className="p-2.5 text-vk-text-muted hover:text-vk-text transition-colors shrink-0 mb-0.5 mr-0.5">
                    <Smile size={22} />
                  </button>
                </div>

                {newChatMessage.trim() ? (
                  <motion.button 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    whileTap={{ scale: 0.9 }} 
                    onClick={handleSendMessage} 
                    className="w-11 h-11 bg-vk-accent text-white rounded-full shadow-md flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity"
                  >
                    <Send size={20} className="ml-1" />
                  </motion.button>
                ) : (
                  <button className="w-11 h-11 text-vk-text-muted hover:text-vk-text hover:bg-black/5 rounded-full flex items-center justify-center transition-colors shrink-0">
                    <Mic size={22} />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Community View Overlay */}
      <AnimatePresence>
        {activeCommunity && (
          <motion.div 
            key="community-view"
            initial={{ x: '100%' }} 
            animate={{ x: 0 }} 
            exit={{ x: '100%' }} 
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-vk-bg flex flex-col"
          >
            {/* Header with Cover */}
            <div className="relative h-40 sm:h-48 shrink-0">
              <img src={activeCommunity.cover} className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-blue-600" />
              <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
                <motion.button 
                  whileHover={{ scale: 1.1, x: -2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setActiveCommunity(null)} 
                  className="p-2.5 text-white hover:bg-white/20 rounded-full  transition-colors shadow-lg"
                >
                  <ChevronLeft size={24} />
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsCommunitySettingsOpen(true)} 
                  className="p-2.5 text-white hover:bg-white/20 rounded-full  transition-colors shadow-lg"
                >
                  <MoreVertical size={24} />
                </motion.button>
              </div>
              <div className="absolute -bottom-10 left-6 flex items-end gap-4 z-10">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-24 h-24 rounded-3xl border-4 border-white overflow-hidden bg-white shadow-xl"
                >
                  <img src={activeCommunity.avatar} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </motion.div>
              </div>
            </div>
            
            <div className="px-6 pt-12 pb-6 bg-white border-b border-black/5 shrink-0 shadow-sm">
              <h2 className="text-2xl font-bold text-vk-text leading-tight tracking-tight">{activeCommunity.name}</h2>
              <div className="flex items-center gap-2 mt-1.5">
                <p className="text-[10px] font-bold text-vk-text-muted uppercase tracking-widest">{activeCommunity.members} участников</p>
                <div className="w-1 h-1 bg-black/10 rounded-full" />
                <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest">в сети</p>
              </div>
            </div>

            {/* Channels & Tabs Navigation */}
            <div className="bg-white border-b border-black/5 shrink-0 z-10">
              <div className="flex gap-3 px-6 py-3 overflow-x-auto no-scrollbar">
                {MOCK_CHANNELS.map(ch => (
                  <motion.button 
                    key={ch.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setCommunityView('chat'); setActiveChannel(ch); }}
                    className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all shadow-sm ${communityView === 'chat' && activeChannel?.id === ch.id ? 'bg-blue-600 text-white' : 'bg-black/5 text-vk-text hover:bg-black/10'}`}
                  >
                    <ch.icon size={18} /> {ch.name}
                  </motion.button>
                ))}
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCommunityView('members')}
                  className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all shadow-sm ${communityView === 'members' ? 'bg-blue-600 text-white' : 'bg-black/5 text-vk-text hover:bg-black/10'}`}
                >
                  <UsersRound size={18} /> Участники
                </motion.button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative flex flex-col bg-vk-bg">
              {communityView === 'chat' ? (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-5">
                    {/* Chat Messages */}
                    {chatMessages.map(msg => {
                      if (msg.type === 'date') {
                        return (
                          <div key={msg.id} className="flex justify-center my-4">
                            <span className="bg-white/50  text-vk-text-muted text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-sm">
                              {msg.text}
                            </span>
                          </div>
                        );
                      }
                      const isMe = msg.sender === 'me';
                      return (
                        <motion.div 
                          key={msg.id} 
                          initial={{ opacity: 0, x: isMe ? 20 : -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`flex gap-3 ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isMe && (
                            <div className="w-9 h-9 rounded-2xl overflow-hidden shrink-0 mt-auto shadow-sm">
                              <img src={MOCK_COMMUNITY_MEMBERS[1].avatar} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                          )}
                          <div className={`relative group max-w-[75%] sm:max-w-[65%] p-4 shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-3xl rounded-br-sm' : 'bg-white border border-black/5 text-vk-text rounded-3xl rounded-bl-sm'}`}>
                            {!isMe && <p className="text-[10px] font-bold text-[#120a8f] uppercase tracking-wider mb-1.5">{MOCK_COMMUNITY_MEMBERS[1].name}</p>}
                            {msg.type === 'text' && <p className="text-sm break-words whitespace-pre-wrap leading-relaxed font-medium">{msg.text}</p>}
                            {msg.type === 'image' && (
                              <div className="rounded-2xl overflow-hidden -mx-1 -mt-1 mb-1 shadow-sm">
                                <img src={msg.url} alt="Attachment" className="w-full h-auto object-cover" referrerPolicy="no-referrer" />
                              </div>
                            )}
                            <div className={`flex items-center justify-end gap-1 mt-2 ${isMe ? 'text-white/70' : 'text-vk-text-muted'}`}>
                              <span className="text-[10px] font-bold uppercase tracking-wider">{msg.time}</span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                  {/* Input Area */}
                  {activeChannel?.isReadOnly ? (
                    <div className="p-5 bg-white/90  border-t border-black/5 text-center text-vk-text-muted text-[11px] font-bold uppercase tracking-widest shadow-lg">
                      Только администраторы могут писать в этот канал
                    </div>
                  ) : (
                    <div className="p-4 bg-white/90  border-t border-black/5 z-20 shadow-lg">
                      <div className="flex items-end gap-3 max-w-4xl mx-auto w-full">
                        <motion.button 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-3 text-vk-text-muted hover:text-[#120a8f] hover:bg-[#120a8f]/5 rounded-2xl transition-all shrink-0"
                        >
                          <Paperclip size={22} />
                        </motion.button>
                        <div className="flex-1 bg-black/5 border border-black/5 rounded-3xl flex items-end relative transition-all focus-within:bg-white focus-within:border-[#120a8f]/30 focus-within:shadow-md">
                          <textarea 
                            placeholder="Сообщение..." 
                            className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[48px] py-3.5 px-5 text-sm font-medium text-vk-text placeholder-vk-text-muted"
                            rows={1}
                          />
                          <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-3 text-vk-text-muted hover:text-[#120a8f] transition-all shrink-0 mb-0.5 mr-0.5"
                          >
                            <Smile size={22} />
                          </motion.button>
                        </div>
                        <motion.button 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center transition-all shrink-0 shadow-md"
                        >
                          <Mic size={22} />
                        </motion.button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-vk-text-muted" size={18} />
                    <input 
                      type="text" 
                      placeholder="Поиск участников" 
                      className="w-full bg-vk-panel border border-black/10 rounded-xl py-3 pl-10 pr-4 text-vk-text placeholder-vk-text-muted focus:outline-none focus:border-vk-accent transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    {MOCK_COMMUNITY_MEMBERS.map(member => (
                      <div key={member.id} className="bg-vk-panel border border-black/10 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                        <img src={member.avatar} alt={member.name} className="w-12 h-12 rounded-full object-cover" referrerPolicy="no-referrer" />
                        <div className="flex-1">
                          <h4 className="text-base font-bold text-vk-text">{member.name}</h4>
                          <p className={`text-xs font-medium ${member.role === 'Админ' ? 'text-vk-accent' : 'text-vk-text-muted'}`}>{member.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Hub Profile Modal */}
      <AnimatePresence>
        {isCreatingHubProfile && (
          <motion.div key="create-hub-profile" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed inset-0 bg-vk-bg z-50 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 bg-vk-panel/80 sticky top-0 z-20 border-b border-black/5">
              <div className="flex items-center gap-2">
                <button onClick={() => setIsCreatingHubProfile(false)} className="p-2 -ml-2 text-vk-text hover:bg-black/5 rounded-full transition-colors">
                  <X size={24} />
                </button>
                <h2 className="text-lg font-bold">Создать профиль хаба</h2>
              </div>
              <button 
                onClick={handleCreateHubProfile} 
                className="bg-vk-accent text-white px-4 py-1.5 rounded-full font-medium text-sm hover:opacity-90 transition-opacity"
              >
                Готово
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 max-w-2xl mx-auto w-full">
              <div className="flex flex-col items-center gap-4">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={hubPhotoInputRef}
                  onChange={(e) => handleFileSelect(e, (base64) => {
                    // We'll update the currentUser photoURL locally for preview if needed, 
                    // but usually we want to store it in the hub profile
                    setHubPhoto(base64);
                  })}
                />
                <div 
                  onClick={() => hubPhotoInputRef.current?.click()}
                  className="w-24 h-24 rounded-3xl bg-black/5 border-2 border-dashed border-black/10 flex items-center justify-center text-vk-text-muted hover:bg-black/10 transition-colors cursor-pointer overflow-hidden"
                >
                  {hubPhoto || currentUser?.photoURL ? (
                    <img src={hubPhoto || currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User size={40} />
                  )}
                </div>
                <span onClick={() => hubPhotoInputRef.current?.click()} className="text-sm font-medium text-vk-accent cursor-pointer">Загрузить фото профиля</span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-vk-text-muted mb-1.5 ml-1 uppercase tracking-wider">Имя в хабе</label>
                  <input 
                    type="text" 
                    placeholder="Как вас будут видеть в хабе?" 
                    value={hubName}
                    onChange={(e) => setHubName(e.target.value)}
                    className="w-full bg-white border border-black/10 rounded-2xl py-3.5 px-4 text-vk-text placeholder-vk-text-muted focus:outline-none focus:ring-2 focus:ring-vk-accent/20 transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-vk-text-muted mb-1.5 ml-1 uppercase tracking-wider">Специализация / Статус</label>
                  <input 
                    type="text" 
                    placeholder="Например: Дизайнер, Разработчик, Мечтатель" 
                    value={hubSpecialization}
                    onChange={(e) => setHubSpecialization(e.target.value)}
                    className="w-full bg-white border border-black/10 rounded-2xl py-3.5 px-4 text-vk-text placeholder-vk-text-muted focus:outline-none focus:ring-2 focus:ring-vk-accent/20 transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-vk-text-muted mb-1.5 ml-1 uppercase tracking-wider">О себе</label>
                  <textarea 
                    placeholder="Расскажите сообществу о себе" 
                    value={hubAbout}
                    onChange={(e) => setHubAbout(e.target.value)}
                    className="w-full bg-white border border-black/10 rounded-2xl py-3.5 px-4 text-vk-text placeholder-vk-text-muted focus:outline-none focus:ring-2 focus:ring-vk-accent/20 transition-all resize-none h-32" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-vk-text-muted mb-1.5 ml-1 uppercase tracking-wider">Интересы (через запятую)</label>
                  <input 
                    type="text" 
                    placeholder="Технологии, Искусство, Спорт..." 
                    value={hubInterests}
                    onChange={(e) => setHubInterests(e.target.value)}
                    className="w-full bg-white border border-black/10 rounded-2xl py-3.5 px-4 text-vk-text placeholder-vk-text-muted focus:outline-none focus:ring-2 focus:ring-vk-accent/20 transition-all" 
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Community Modal */}
      <AnimatePresence>
        {isCreatingCommunity && (
          <motion.div key="create-community" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed inset-0 bg-vk-bg z-50 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 bg-vk-panel/80  sticky top-0 z-20 border-b border-black/5">
              <div className="flex items-center gap-2">
                <button onClick={() => setIsCreatingCommunity(false)} className="p-2 -ml-2 text-vk-text hover:bg-black/5 rounded-full transition-colors">
                  <X size={24} />
                </button>
                <h2 className="text-lg font-bold">Новое сообщество</h2>
              </div>
              <button 
                onClick={handleCreateCommunity}
                disabled={!communityName.trim()}
                className="bg-vk-accent text-white px-4 py-1.5 rounded-full font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Создать
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
              <div className="flex flex-col items-center gap-4">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={communityAvatarInputRef}
                  onChange={(e) => handleFileSelect(e, setCommunityAvatar)}
                />
                <div 
                  onClick={() => communityAvatarInputRef.current?.click()}
                  className="w-24 h-24 rounded-2xl bg-black/5 border-2 border-dashed border-black/10 flex items-center justify-center text-vk-text-muted hover:bg-black/10 transition-colors cursor-pointer overflow-hidden"
                >
                  {communityAvatar ? (
                    <img src={communityAvatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <Camera size={32} />
                  )}
                </div>
                <span onClick={() => communityAvatarInputRef.current?.click()} className="text-sm font-medium text-vk-accent cursor-pointer">Загрузить аватар</span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-vk-text-muted mb-1.5 ml-1">Название</label>
                  <input 
                    type="text" 
                    placeholder="Введите название" 
                    value={communityName}
                    onChange={(e) => setCommunityName(e.target.value)}
                    className="w-full bg-vk-panel border border-black/10 rounded-xl py-3 px-4 text-vk-text placeholder-vk-text-muted focus:outline-none focus:border-vk-accent transition-colors" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-vk-text-muted mb-1.5 ml-1">Описание</label>
                  <textarea 
                    placeholder="Расскажите о сообществе" 
                    value={communityDescription}
                    onChange={(e) => setCommunityDescription(e.target.value)}
                    className="w-full bg-vk-panel border border-black/10 rounded-xl py-3 px-4 text-vk-text placeholder-vk-text-muted focus:outline-none focus:border-vk-accent transition-colors resize-none h-24" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-vk-text-muted mb-1.5 ml-1">Обложка</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={communityCoverInputRef}
                    onChange={(e) => handleFileSelect(e, setCommunityCover)}
                  />
                  <div 
                    onClick={() => communityCoverInputRef.current?.click()}
                    className="w-full h-32 rounded-xl bg-black/5 border-2 border-dashed border-black/10 flex flex-col items-center justify-center text-vk-text-muted hover:bg-black/10 transition-colors cursor-pointer overflow-hidden"
                  >
                    {communityCover ? (
                      <img src={communityCover} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <ImagePlus size={28} className="mb-2" />
                        <span className="text-xs font-medium">Добавить обложку</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Community Settings Modal */}
      <AnimatePresence>
        {isCommunitySettingsOpen && (
          <motion.div key="community-settings" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-0 z-[60] bg-black/40  flex items-center justify-center p-4">
            <div className="bg-vk-panel w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-black/5">
                <h2 className="text-lg font-bold text-vk-text">Настройки</h2>
                <button onClick={() => setIsCommunitySettingsOpen(false)} className="p-2 -mr-2 text-vk-text-muted hover:bg-black/5 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-vk-text-muted mb-1.5 ml-1">Название</label>
                    <input type="text" defaultValue={activeCommunity?.name} className="w-full bg-black/5 border border-transparent rounded-xl py-3 px-4 text-vk-text focus:outline-none focus:border-vk-accent focus:bg-white transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-vk-text-muted mb-1.5 ml-1">Описание</label>
                    <textarea defaultValue={activeCommunity?.description} className="w-full bg-black/5 border border-transparent rounded-xl py-3 px-4 text-vk-text focus:outline-none focus:border-vk-accent focus:bg-white transition-colors resize-none h-24" />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-black/5">
                  <h3 className="text-sm font-bold text-vk-text-muted uppercase tracking-wider">Приватность</h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-vk-accent/10 text-vk-accent flex items-center justify-center"><Lock size={20} /></div>
                      <div>
                        <p className="font-medium text-vk-text text-sm">Закрытое сообщество</p>
                        <p className="text-xs text-vk-text-muted">Вступление по заявкам</p>
                      </div>
                    </div>
                    <div className="w-12 h-6 bg-black/10 rounded-full relative cursor-pointer">
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-vk-accent/10 text-vk-accent flex items-center justify-center"><MessageCircle size={20} /></div>
                      <div>
                        <p className="font-medium text-vk-text text-sm">Сообщения сообщества</p>
                        <p className="text-xs text-vk-text-muted">Разрешить писать в ЛС</p>
                      </div>
                    </div>
                    <div className="w-12 h-6 bg-vk-accent rounded-full relative cursor-pointer">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-black/5 bg-black/[0.02]">
                <button onClick={() => setIsCommunitySettingsOpen(false)} className="w-full bg-vk-accent text-white py-3 rounded-xl font-medium hover:opacity-90 transition-opacity">
                  Сохранить изменения
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Panel Overlay */}
      <AnimatePresence>
        {isAdminPanelOpen && (
          <motion.div
            key="admin-panel"
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[70] bg-vk-bg flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 bg-white border-b border-black/5 shrink-0 shadow-sm z-10">
              <div className="flex items-center gap-3">
                <motion.button 
                  whileHover={{ scale: 1.1, x: -2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsAdminPanelOpen(false)} 
                  className="p-2 -ml-2 text-vk-text hover:bg-black/5 rounded-full transition-colors"
                >
                  <ChevronLeft size={24} />
                </motion.button>
                <h2 className="text-xl font-bold text-[#120a8f] flex items-center gap-2">
                  <ShieldAlert size={22} />
                  Админ-панель
                </h2>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white border-b border-black/5 shrink-0 overflow-x-auto no-scrollbar">
              <div className="flex px-4 py-3 gap-2 min-w-max">
                {ADMIN_TABS.map(tab => {
                  const isActive = adminTab === tab.id;
                  return (
                    <motion.button
                      key={tab.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setAdminTab(tab.id)}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                        isActive 
                          ? 'bg-blue-600 text-white shadow-lg shadow-[#120a8f]/20' 
                          : 'bg-black/5 text-vk-text-muted hover:bg-black/10 hover:text-vk-text'
                      }`}
                    >
                      <tab.icon size={18} />
                      {tab.label}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 bg-vk-bg">
              <div className="max-w-4xl mx-auto w-full">
                
                {/* Dashboard */}
                {adminTab === 'dashboard' && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm hover:shadow-md transition-shadow">
                      <Users className="text-[#120a8f] mb-3" size={32} />
                      <p className="text-3xl font-black text-vk-text mb-1">15,234</p>
                      <p className="text-[10px] font-bold text-vk-text-muted uppercase tracking-wider">Всего пользователей</p>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm hover:shadow-md transition-shadow">
                      <UsersRound className="text-purple-500 mb-3" size={32} />
                      <p className="text-3xl font-black text-vk-text mb-1">1,042</p>
                      <p className="text-[10px] font-bold text-vk-text-muted uppercase tracking-wider">Всего сообществ</p>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm hover:shadow-md transition-shadow">
                      <MessageSquare className="text-blue-500 mb-3" size={32} />
                      <p className="text-3xl font-black text-vk-text mb-1">842K</p>
                      <p className="text-[10px] font-bold text-vk-text-muted uppercase tracking-wider">Всего сообщений</p>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm hover:shadow-md transition-shadow">
                      <Activity className="text-green-500 mb-3" size={32} />
                      <p className="text-3xl font-black text-vk-text mb-1">3,421</p>
                      <p className="text-[10px] font-bold text-vk-text-muted uppercase tracking-wider">Активные сегодня</p>
                    </div>
                  </motion.div>
                )}

                {/* Users */}
                {adminTab === 'users' && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <motion.div 
                        key={i} 
                        whileHover={{ scale: 1.01 }}
                        className="bg-white p-4 rounded-3xl border border-black/5 shadow-sm space-y-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-sm">
                            <img src={`https://picsum.photos/seed/user${i}/100/100`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-vk-text text-base flex items-center gap-1">
                              Пользователь {i}
                              {i === 1 && <Badge type="verified" size={14} />}
                            </h4>
                            <p className="text-[10px] font-bold text-vk-text-muted uppercase tracking-wider">@user_{i} • {i === 1 ? 'Админ' : 'Пользователь'}</p>
                          </div>
                          <div className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/20" />
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-black/5">
                          <button onClick={() => toast.success(`Пользователь ${i} верифицирован`)} className="px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"><CheckCircle size={14}/> Вериф</button>
                          <button onClick={() => toast.success(`Пользователь ${i} назначен админом`)} className="px-3 py-2 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"><Shield size={14}/> Админ</button>
                          <button onClick={() => toast.success(`Пользователь ${i} получил статус Бронза`)} className="px-3 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"><Gem size={14}/> Бронза</button>
                          <button onClick={() => toast.success(`Пользователь ${i} получил статус Диамант`)} className="px-3 py-2 bg-blue-50 text-blue-400 hover:bg-blue-100 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"><Gem size={14}/> Диамант</button>
                          <button onClick={() => toast.error(`Пользователь ${i} заблокирован`)} className="px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors ml-auto"><Ban size={14}/> Блок</button>
                          <button onClick={() => toast.error(`Пользователь ${i} удален`)} className="px-3 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"><Trash2 size={14}/> Удал</button>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {/* Communities */}
                {adminTab === 'communities' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    {[1, 2].map(i => (
                      <div key={i} className="bg-vk-panel p-4 rounded-3xl border border-black/5 shadow-sm space-y-4">
                        <div className="flex items-center gap-3">
                          <img src={`https://picsum.photos/seed/community${i}/100/100`} className="w-12 h-12 rounded-xl object-cover" referrerPolicy="no-referrer" />
                          <div className="flex-1">
                            <h4 className="font-bold text-vk-text text-sm sm:text-base">Сообщество {i}</h4>
                            <p className="text-xs text-vk-text-muted">1.2M участников • Публичное</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => toast.success(`Редактирование сообщества ${i}`)} className="px-3 py-1.5 bg-black/5 text-vk-text hover:bg-black/10 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"><Edit size={14}/> Ред.</button>
                          <button onClick={() => toast.success(`Сообщество ${i} верифицировано`)} className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"><CheckCircle size={14}/> Вериф</button>
                          <button onClick={() => toast.success(`Сообщество ${i} получило верификацию`)} className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"><CheckCircle size={14}/> Верификация</button>
                          <button onClick={() => toast.error(`Сообщество ${i} закрыто`)} className="px-3 py-1.5 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ml-auto"><Lock size={14}/> Закрыть</button>
                          <button onClick={() => toast.error(`Сообщество ${i} удалено`)} className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"><Trash2 size={14}/> Удал</button>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}

                {/* Chats */}
                {adminTab === 'chats' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="bg-vk-panel p-4 rounded-3xl border border-black/5 shadow-sm space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center"><MessageSquare size={24} className="text-vk-text-muted"/></div>
                          <div className="flex-1">
                            <h4 className="font-bold text-vk-text text-sm sm:text-base">Чат {i}</h4>
                            <p className="text-xs text-vk-text-muted">Участников: {i * 12} • Активен</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => toast.success(`Чат ${i} очищен`)} className="px-3 py-1.5 bg-black/5 text-vk-text hover:bg-black/10 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"><Eraser size={14}/> Очистить</button>
                          <button onClick={() => toast.success(`Чат ${i} закреплен`)} className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"><Pin size={14}/> Закрепить</button>
                          <button onClick={() => toast.error(`Чат ${i} удален`)} className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ml-auto"><Trash2 size={14}/> Удалить</button>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}

                {/* Posts */}
                {adminTab === 'posts' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    {[1, 2].map(i => (
                      <div key={i} className="bg-vk-panel p-4 rounded-3xl border border-black/5 shadow-sm space-y-4">
                        <div className="flex items-center gap-3">
                          <img src={`https://picsum.photos/seed/user${i}/100/100`} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                          <div className="flex-1">
                            <h4 className="font-bold text-vk-text text-sm">Пользователь {i}</h4>
                            <p className="text-xs text-vk-text-muted">Сегодня в 12:00</p>
                          </div>
                        </div>
                        <p className="text-sm text-vk-text bg-black/5 p-3 rounded-xl">Пример текста поста для модерации. Здесь может быть любой контент пользователя...</p>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => toast.success(`Пост ${i} закреплен`)} className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"><Pin size={14}/> Закрепить</button>
                          <button onClick={() => toast.error(`Пост ${i} удален`)} className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ml-auto"><Trash2 size={14}/> Удалить</button>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}

                {/* Settings */}
                {adminTab === 'settings' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    <div className="bg-vk-panel p-5 rounded-3xl border border-black/5 shadow-sm space-y-5">
                      <h3 className="font-bold text-vk-text text-base">Настройки интерфейса</h3>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-vk-text">Управление вкладками</p>
                          <p className="text-xs text-vk-text-muted">Скрывать неиспользуемые</p>
                        </div>
                        <div onClick={() => toast.info('Настройка "Управление вкладками" изменена')} className="w-12 h-6 bg-vk-accent rounded-full relative cursor-pointer"><div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" /></div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-vk-text">Push-уведомления</p>
                          <p className="text-xs text-vk-text-muted">Включить системные алерты</p>
                        </div>
                        <div onClick={() => toast.info('Настройка "Push-уведомления" изменена')} className="w-12 h-6 bg-vk-accent rounded-full relative cursor-pointer"><div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" /></div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-vk-text">Режим отладки</p>
                          <p className="text-xs text-vk-text-muted">Для разработчиков</p>
                        </div>
                        <div className="w-12 h-6 bg-black/10 rounded-full relative cursor-pointer"><div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" /></div>
                      </div>
                    </div>
                  </motion.div>
                )}

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Нижняя панель навигации */}
      <AnimatePresence>
        {!activeChat && !activeCommunity && !selectedPost && !isCreatingCommunity && !isAdminPanelOpen && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-[100] bg-white/70 backdrop-blur-lg border-t border-black/5 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-safe"
          >
            <div className="flex justify-between items-center h-14 px-6 max-w-2xl mx-auto w-full">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setViewingProfile(null);
                    }}
                    className="relative flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all"
                  >
                    <motion.div
                      animate={{ 
                        scale: isActive ? 1.1 : 1,
                        color: isActive ? '#3b82f6' : '#64748b'
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                    </motion.div>
                    {isActive && (
                      <motion.div 
                        layoutId="nav-indicator"
                        className="absolute -bottom-1 w-1 h-1 bg-blue-500 rounded-full"
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

