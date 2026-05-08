export interface User {
  id: string;
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: "customer" | "admin"| "chef";
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
    isVerified: boolean;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: "veg" | "non-veg" | "dessert" | "beverage";
  subCategory: string;
  image: string;
  isAvailable: boolean;
  preparationTime: number;
  ingredients?: string[];
  chefName?: string;
  chefId?: string;
  chefDistance?: number;
  nutritionInfo?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
  };
  allergens?: string[];
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  spiceLevel?: "mild" | "medium" | "hot" | "extra-hot";
  dailySpecial?: {
    isSpecial?: boolean;
    day?: string;
    specialPrice?: number;
  };
  tags?: string[];
  rating: {
    average: number;
    count: number;
    bayesianScore?: number;
  };
}

export interface MenuCategory {
  _id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  order: number;
  items?: MenuItem[];
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  price: number;
}

export interface Cart {
  _id: string;
  user: string;
  items: CartItem[];
  updatedAt: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  customer: User;
  customerInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    coordinates? : { latitude: number; longitude: number };
  };
  items: {
    menuItem: MenuItem;
    name: string;
    price: number;
    quantity: number;
    subtotal: number;
    chef? : string;
    chefName?: string;
  }[];
  pricing: {
    subtotal: number;
    tax: number;
    deliveryFee: number;
    discount: number;
    total: number;
  };
  status:
    | "pending"
    | "confirmed"
    | "preparing"
    | "ready"
    | "out-for-delivery"
    | "delivered"
    | "cancelled";
  paymentStatus: "pending" | "paid" | "failed";
  paymentMethod: "esewa" | "khalti" | "cod";
  createdAt: string;
  estimatedDeliveryTime: string;
  deliveryDistance?: number;
  specialInstructions?: string;
  scheduledFor?: { date: string; time: string };
  assignedChef?: { _id: string; firstName: string; lastName: string; chefProfile?: any };
  trackingInfo: any;
}

export interface Review {
  _id: string;
  user: { firstName: string; lastName: string };
  rating: number;
  comment: string;
  createdAt: string;
}

export interface StatBlock {
  orders: number;
  revenue: number;
  customers?: number;
  menuItems?: number;
}

export interface RecentOrder {
  _id: string;
  orderNumber: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
  };
  pricing: {
    total: number;
  };
  status: string;
  createdAt: string;
}

export interface OrderStatusStat {
  _id: string; // The status name
  count: number;
}

export interface PopularItem {
  _id: string; // The item name
  orderCount: number;
  totalQuantity: number;
}

export interface DashboardData {
  todayStats: StatBlock;
  totalStats: StatBlock;
  recentOrders: RecentOrder[];
  orderStatusStats: OrderStatusStat[];
  popularItems: PopularItem[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: {
    items: T[];
    currentPage: number;
    totalPages: number;
    totalItems: number;
  };
}
