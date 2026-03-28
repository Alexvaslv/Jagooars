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
