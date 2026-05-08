🍽️ Sajha Chulo — Homemade Food Marketplace

"Sajha Chulo" (साझा चुलो) means "Shared Kitchen" in Nepali

A full-stack food marketplace connecting passionate home chefs with customers who crave authentic, homemade Nepali food. Built with the MERN stack.


✨ Features
👥 For Customers

Browse menu by category with chef name badges
Smart cart system
Live order tracking with animated progress bar
See which chef is cooking your food in real-time
Review and rate dishes after delivery
Tiffin subscription plans (Weekly / Monthly / Special Diet)
AI-powered chatbot for menu recommendations

👨‍🍳 For Chefs

Apply to become a chef (admin approval required)
Manage personal menu items (add / edit / delete / hide)
See incoming orders for their dishes in real-time
Update cooking status: Start Cooking → Mark Ready

🛠️ For Admin

Full dashboard with revenue stats and charts
Manage all menu items, categories, orders, customers
Approve / reject chef applications
Manage tiffin subscriptions and coupon codes
Update order status through full delivery pipeline


🧠 Algorithms & Smart Systems
📐 Haversine Distance Algorithm
Calculates real GPS distance between chef's kitchen and customer's delivery address to estimate accurate delivery time and calculate dynamic delivery fee:
0–2 km   → NRs 30
2–5 km   → NRs 60
5–10 km  → NRs 100
10+ km   → NRs 150
🔄 Finite State Machine (Order Flow)
Orders follow a strict state machine — same pattern used by real food delivery apps:
PENDING → CONFIRMED → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED
                                                            ↘ CANCELLED
🤖 Auto Chef Assignment
When an order is placed, the system automatically identifies which chef created each item and routes the order to the correct chef.
🏆 TOPSIS Algorithm (Smart Meal Advisor)
Multi-criteria decision making to recommend best dishes based on price, rating, preparation time, popularity, and nutrition.
⭐ Bayesian Average Rating
Prevents rating manipulation — a new chef with one 5★ rating cannot outrank an experienced chef with hundreds of genuine reviews.

🛠️ Tech Stack
LayerTechnologyFrontendReact 18 + TypeScript + ViteUI Componentsshadcn/ui + Tailwind CSSState ManagementTanStack React QueryBackendNode.js + Express.jsDatabaseMongoDB + MongooseAuthenticationJWTFile UploadMulterEmailNodemailerValidationexpress-validatorSecurityHelmet + bcrypt + rate-limit

📁 Project Structure
sajha-chulo/
├── backend/
│   ├── models/
│   │   ├── User.js          # Customer + Chef + Admin roles
│   │   ├── Order.js         # FSM + Haversine integration
│   │   ├── MenuItem.js
│   │   ├── MenuCategory.js
│   │   ├── Subscription.js
│   │   ├── TiffinPlan.js
│   │   └── Coupon.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── orders.js        # Auto chef assignment
│   │   ├── menu.js
│   │   ├── chef.js          # Public chef profiles
│   │   ├── chefRoutes.js    # Chef application + dashboard
│   │   ├── categories.js
│   │   ├── admin.js
│   │   ├── upload.js        # Image upload
│   │   ├── subscription.js
│   │   └── recommendations.js  # TOPSIS
│   ├── middleware/
│   │   └── auth.js
│   ├── services/
│   │   └── locationService.js
│   ├── utils/
│   │   └── email.js
│   └── server.js
│
└── Frontend/
    └── src/
        ├── pages/
        │   ├── Home.tsx
        │   ├── Menu.tsx            # Chef name badges
        │   ├── Chefs.tsx           # Chef profiles + their dishes
        │   ├── OrderHistory.tsx    # Live progress bar
        │   ├── MealPlans.tsx
        │   ├── MySubscription.tsx
        │   ├── Chef/
        │   │   ├── ChefDashboard.tsx
        │   │   ├── ChefAddItem.tsx
        │   │   ├── ChefManageMenu.tsx
        │   │   └── ChefOrders.tsx
        │   └── Admin/
        │       ├── AdminDashboard.tsx
        │       ├── ManageOrders.tsx
        │       ├── ManageMenu.tsx
        │       ├── ManageChefApplications.tsx
        │       └── ManageSubscriptions.tsx
        ├── components/
        │   ├── Navigation.tsx
        │   ├── PlatefulChat.tsx    # AI Chatbot (NLP + RAG + Trie)
        │   ├── AdminRoute.tsx
        │   ├── ChefRoute.tsx
        │   └── ProtectedRoute.tsx
        └── context/
            ├── AuthContext.tsx
            └── CartContext.tsx

🚀 Getting Started
Prerequisites

Node.js v14+
MongoDB Atlas account (or local MongoDB)
npm or yarn

1. Clone the repository
bashgit clone https://github.com/sitalbhusal/sajha-chulo.git
cd sajha-chulo
2. Setup Backend
bashcd backend
npm install
Create backend/.env by copying backend/.env.example and filling in your values:
envMONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=7d
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
bashnpm run dev
3. Setup Frontend
bashcd Frontend
npm install
npm run dev
4. Seed the Database
bashcd backend
node seed.js
This creates sample menu items, categories, and tiffin plans.

📡 API Overview
Auth
POST /api/auth/register
POST /api/auth/login
Menu
GET    /api/menu           → All items (with chef name)
POST   /api/menu           → Add item (admin/chef)
PUT    /api/menu/:id       → Edit item (admin/chef)
DELETE /api/menu/:id       → Delete item (admin/chef)
Orders
POST   /api/orders                    → Place order (auto chef assign + Haversine)
GET    /api/orders/my-orders          → Customer's orders
GET    /api/orders/chef-orders        → Chef's assigned orders
PATCH  /api/orders/:num/status        → Admin updates status
PATCH  /api/orders/:num/chef-status   → Chef updates cooking status
PATCH  /api/orders/:num/cancel        → Cancel order
Chefs
GET  /api/chefs           → All approved chefs
GET  /api/chefs/:id       → Chef profile + menu
POST /api/chef/apply      → Apply as chef
GET  /api/chef/dashboard  → Chef dashboard data
Subscriptions
GET  /api/subscriptions/plans            → All tiffin plans
POST /api/subscriptions                  → Subscribe to a plan
GET  /api/subscriptions/my-subscription  → User's active subscription
Upload
POST /api/upload/image     → Upload single image (admin/chef)
POST /api/upload/multiple  → Upload multiple images

🔒 Security

JWT authentication on all protected routes
Role-based access control (customer / chef / admin)
Passwords hashed with bcrypt
Rate limiting (100 req / 15 min per IP)
Helmet security headers
CORS restricted to frontend origin
Environment variables never committed to git


🗺️ Roadmap

 User authentication (JWT)
 Menu management with categories
 Shopping cart
 Order placement with scheduling
 Chef registration and approval system
 Live order tracking (FSM)
 Haversine-based delivery fee calculation
 Auto chef assignment on orders
 Tiffin subscription system
 Image upload from computer
 AI chatbot (NLP + RAG + Trie)
 TOPSIS meal recommendation
 Payment gateway integration
 Push notifications
 Mobile app




(Coming soon)


📄 License
MIT License © 2026 Sital Bhusal