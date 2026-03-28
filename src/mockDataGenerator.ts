import { db } from './firebase';
import { collection, addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore';

export const seedTestData = async (currentUserId: string) => {
  const testUsers = [
    { name: 'Алексей Иванов', spec: 'Frontend Developer', interests: ['React', 'TypeScript', 'UI/UX'] },
    { name: 'Мария Петрова', spec: 'Product Designer', interests: ['Figma', 'Design Systems', 'Art'] },
    { name: 'Дмитрий Соколов', spec: 'Backend Engineer', interests: ['Node.js', 'Go', 'Distributed Systems'] },
    { name: 'Елена Кузнецова', spec: 'QA Lead', interests: ['Automation', 'Testing', 'Quality'] },
    { name: 'Иван Смирнов', spec: 'Mobile Developer', interests: ['Swift', 'Kotlin', 'Flutter'] },
  ];

  const testCommunities = [
    { name: 'Разработка интерфейсов', desc: 'Все о современном фронтенде и дизайне.', members: 1250 },
    { name: 'Backend & Architecture', desc: 'Обсуждаем сложные системы и серверные технологии.', members: 890 },
    { name: 'Дизайн-система', desc: 'Сообщество дизайнеров и исследователей.', members: 2100 },
    { name: 'Карьера в IT', desc: 'Советы по поиску работы и развитию навыков.', members: 5600 },
    { name: 'Open Source Hub', desc: 'Проекты с открытым исходным кодом.', members: 430 },
  ];

  try {
    // Add users and their hub profiles
    for (const u of testUsers) {
      const tempId = `test_user_${Math.random().toString(36).substring(7)}`;
      const userRef = doc(db, 'users', tempId);
      await setDoc(userRef, {
        uid: tempId,
        username: tempId,
        displayName: u.name,
        email: `${tempId}@example.com`,
        photoURL: `https://picsum.photos/seed/${tempId}/200/200`,
        isVerified: Math.random() > 0.5,
        isAdmin: false,
        isCreator: false,
        createdAt: serverTimestamp()
      });

      const hubRef = doc(db, 'hub_profiles', tempId);
      await setDoc(hubRef, {
        hubName: u.name,
        specialization: u.spec,
        about: `Привет! Я ${u.name}. Увлекаюсь ${u.interests.join(', ')}.`,
        interests: u.interests,
        photoURL: `https://picsum.photos/seed/${tempId}/200/200`,
        updatedAt: serverTimestamp()
      });
    }

    // Add communities
    for (const c of testCommunities) {
      await addDoc(collection(db, 'communities'), {
        name: c.name,
        description: c.desc,
        avatar: `https://picsum.photos/seed/${c.name}/200/200`,
        cover: `https://picsum.photos/seed/${c.name}_cover/800/400`,
        creatorId: currentUserId,
        membersCount: c.members,
        isVerified: Math.random() > 0.7,
        createdAt: serverTimestamp()
      });
    }

    return true;
  } catch (error) {
    console.error("Error seeding data:", error);
    throw error;
  }
};

export const generateVirtualUsers = (count: number) => {
  return [];
};

export const generateVirtualPosts = (users: any[], count: number) => {
  return [];
};

export const generateVirtualChats = (users: any[], count: number) => {
  return [];
};

export const VIRTUAL_USERS = generateVirtualUsers(0);
export const VIRTUAL_POSTS = generateVirtualPosts(VIRTUAL_USERS, 0);
export const VIRTUAL_CHATS = generateVirtualChats(VIRTUAL_USERS, 0);
