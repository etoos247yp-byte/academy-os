// Categories for courses (CSAT - 수능)
export const CATEGORIES = ["전체", "국어", "수학", "영어", "과탐", "사탐", "수리논술", "인문논술"];

// Days of the week
export const DAYS = ['월', '화', '수', '목', '금', '토', '일'];

// Academy periods definition
export const PERIODS = [
  { id: 1, time: '08:20', label: '1교시' },
  { id: 2, time: '09:10', label: '2교시' },
  { id: 3, time: '10:20', label: '3교시' },
  { id: 4, time: '11:10', label: '4교시' },
  // 점심 시간 공백
  { id: 5, time: '14:30', label: '5교시' },
  { id: 6, time: '15:20', label: '6교시' },
  { id: 7, time: '16:30', label: '7교시' },
  { id: 8, time: '17:20', label: '8교시' },
  // 저녁 시간 공백
  { id: 9, time: '19:40', label: '9교시' },
  { id: 10, time: '20:30', label: '10교시' },
  { id: 11, time: '21:40', label: '11교시' },
  { id: 12, time: '22:50', label: '12교시' },
];

// Level options
export const LEVELS = ['초급', '중급', '고급', '실전'];

// Category to color mapping (CSAT subjects)
export const CATEGORY_COLORS = {
  '국어': { bg: 'bg-red-100', text: 'text-red-800', accent: 'bg-red-500' },
  '수학': { bg: 'bg-blue-100', text: 'text-blue-800', accent: 'bg-blue-500' },
  '영어': { bg: 'bg-purple-100', text: 'text-purple-800', accent: 'bg-purple-500' },
  '과탐': { bg: 'bg-green-100', text: 'text-green-800', accent: 'bg-green-500' },
  '사탐': { bg: 'bg-amber-100', text: 'text-amber-800', accent: 'bg-amber-500' },
  '수리논술': { bg: 'bg-cyan-100', text: 'text-cyan-800', accent: 'bg-cyan-500' },
  '인문논술': { bg: 'bg-pink-100', text: 'text-pink-800', accent: 'bg-pink-500' },
};

// Enrollment status
export const ENROLLMENT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
};

// Status display configuration
export const STATUS_CONFIG = {
  pending: {
    label: '신청 대기',
    color: 'bg-yellow-100 text-yellow-800',
    badgeColor: 'bg-yellow-500',
  },
  approved: {
    label: '수강 확정',
    color: 'bg-green-100 text-green-800',
    badgeColor: 'bg-green-500',
  },
  rejected: {
    label: '신청 반려',
    color: 'bg-red-100 text-red-800',
    badgeColor: 'bg-red-500',
  },
  cancelled: {
    label: '취소됨',
    color: 'bg-gray-100 text-gray-800',
    badgeColor: 'bg-gray-500',
  },
};
