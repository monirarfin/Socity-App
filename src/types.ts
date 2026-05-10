export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  fatherName?: string;
  motherName?: string;
  houseName?: string;
  village?: string;
  district?: string;
  nidNumber?: string;
  memberId?: string;
  memberSlug?: string;
  bio?: string;
  houseSegment?: string;
  familyHead?: string;
  mobile?: string;
  familyIncome?: number;
  studentCount?: number;
  publicExamineeCount?: number;
  fatherId?: string;
  motherId?: string;
  role: 'member' | 'admin' | 'collector' | 'director';
  isApproved: boolean;
  isPublicContribution?: boolean;
  createdAt: any;
  updatedAt?: any;
}

export interface BlockData {
  id: string;
  type: 'text' | 'image' | 'audio' | 'video';
  content: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string;
  content: string;
  blocks?: BlockData[];
  type: 'news' | 'event' | 'project' | 'help';
  createdAt: any;
  likes: string[]; // UIDs of users who liked
  commentCount: number;
  audioUrl?: string; // Voice note URL
  imageUrl?: string; // AI generated image URL
  projectStartDate?: string;
  projectEndDate?: string;
  projectBudget?: number;
  projectSummary?: string;
  projectProgress?: number;
  projectStatusUpdate?: string;
  projectBudgetBreakdown?: BudgetLineItem[];
}

export interface Conversation {
  id: string;
  participants: string[];
  participantDetails: {
    [uid: string]: {
      displayName: string;
      photoURL: string;
    };
  };
  lastMessage?: string;
  lastMessageAt?: any;
  updatedAt: any;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'snap' | 'file';
  mediaUrl?: string;
  transcription?: string;
  reactions?: { [uid: string]: string };
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  createdAt: any;
}

export interface BudgetLineItem {
  item: string;
  amount: number;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string;
  content: string;
  createdAt: any;
  parentId?: string;
  audioUrl?: string;
}

export interface Contribution {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  amount: number;
  method: 'bkash' | 'nagad' | 'bank' | 'cash';
  transactionId: string;
  status: 'pending' | 'approved';
  isPublic: boolean;
  createdAt: any;
}

export interface Notification {
  id: string;
  type: 'registration';
  userId: string;
  userName: string;
  userPhotoURL?: string;
  message: string;
  read: boolean;
  createdAt: any;
}

export interface Subscription {
  id: string;
  userId: string;
  month: string;
  year: number;
  amount: number;
  status: 'paid' | 'pending';
  collectedById?: string;
  updatedAt: any;
}

export interface Call {
  id: string;
  callerId: string;
  receiverId: string;
  type: 'voice' | 'video';
  status: 'ringing' | 'accepted' | 'rejected' | 'ended' | 'missed';
  offer?: any;
  answer?: any;
  createdAt: any;
  endedAt?: any;
}
