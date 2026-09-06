export interface Term {
  id: string;
  name: string;
  status: 'active' | 'completed';
  createdAt: number;
}

export interface Student {
  id: string;
  termId: string;
  firstName: string;
  lastName: string;
  level: string;
  phone?: string;
  classType?: 'حضوری' | 'آنلاین' | 'منتورینگ' | 'آلمانی' | 'خصوصی' | string;
  totalPayable: number;
  amountPaid: number;
  debt: number;
  status: 'paid' | 'unpaid';
  receiptUrl?: string;
  hasBook?: boolean;
  bookName?: string;
  bookPrice?: number;
  hasInterview?: boolean;
  hasDiscount?: boolean;
  discountPercent?: number;
  discountAmount?: number;
}

export interface TeacherSalary {
  id: string;
  teacherName: string;
  role: string;
  amount: number;
  month: string;
  status: 'paid' | 'unpaid';
  termId: string;
  receiptUrl?: string;
}

export interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  termId: string;
  receiptUrl?: string;
}

export interface Level {
  id: string | any;
  name: string;
  fee: number;
}
