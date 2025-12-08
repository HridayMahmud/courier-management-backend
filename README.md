# 🚚 Courier Management Backend API

A RESTful API for managing **users, parcels, and authentication** in a courier management system.  

**Base URL:** `https://courier-management-backend-swrf.onrender.com`  

---

## 📊 API Workflow Diagram

```mermaid
flowchart TD
    A[Register User] --> B[Login User]
    B --> C{JWT Token}
    C --> D[Create Parcel]
    C --> E[Get User Parcels]
    B --> F[Forgot Password]
    F --> G[Reset Password]
    C --> H[Update Parcel]
    C --> I[Delete Parcel]
    J[Admin Login] --> K[Get All Parcels]
    K --> H
    K --> I
Explanation:

Register User → Create a new user account.

Login User → Get JWT token for protected routes.

Forgot Password → Sends reset token via email.

Reset Password → Update password using token.

Create / Get / Update / Delete Parcel → CRUD operations using token.

Admin Login → View all parcels and manage any parcel.

Tokens are required for all protected routes.

📂 Project Structure
COURIER_MANAGEMENT/
│
├── config/                 # Configuration files (DB, mail)
│   ├── db.js
│   ├── mail.js
│
├── controllers/            # Route controllers
│   ├── authController.js
│   ├── parcelController.js
│
├── i18n/                   # Localization files
│   └── i18n.js
│
├── middleware/             # Auth & role middleware
│   ├── authMiddleware.js
│   ├── localizationMiddleware.js
│   ├── roleMiddleware.js
│
├── models/                 # Mongoose models
│   ├── Parcel.js
│   └── User.js
│
├── repository/             # DB query layer
│   ├── parcelRepository.js
│   └── userRepository.js
│
├── routes/                 # Route definitions
│   ├── authRouter.js
│   └── parcelsRouter.js
│
├── .env.example            # Environment variables template
├── .gitignore
├── package.json
├── package-lock.json
├── README.md               # Documentation
└── server.js               # Entry point
This structure ensures the project is organized, maintainable, and scalable.

🔹 Features
User registration & login

Forgot password & reset password

Create, view, update, and delete parcels

Admin can view and manage all parcels

🔹 Setup Instructions
Clone the repository:

bash
git clone https://github.com/HridayMahmud/courier-management-backend.git
cd courier-management-backend
Install dependencies:

bash
npm install
Create .env based on .env.example:

ini
PORT=4000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password
Start the server:

bash
Copy code
npm start
Server will run on http://localhost:4000 (or the port in your .env).

🔹 API Endpoints
1️⃣ Register User
POST /register

Body:
json

{
  "name": "HRIDAY MAHMUD",
  "email": "hriday@example.com",
  "password": "password123",
  "role": "customer"
}
Response:
json
{
  "message": "user registered successfully",
  "User": { /* user object */ }
}
2️⃣ Login
POST /login
Body:
json
{
  "email": "hriday@example.com",
  "password": "password123"
}
Response:
json
{
  "message": "login successful",
  "token": "<JWT_TOKEN>"
}
Use this token in Authorization: Bearer <token> header for protected routes.

3️⃣ Forgot Password
POST /forgot-password

Body:
json

{
  "email": "user@example.com"
}
Response:
json

{
  "message": "email sent"
}
4️⃣ Reset Password
POST /reset-password

Body:
json
{
  "email": "user@example.com",
  "token": "123456",
  "password": "newpassword123"
}
Response:

json

{
  "message": "Password reset successful"
}
5️⃣ Create Parcel
POST /create-parcel
Headers:
Authorization: Bearer <user_token>
Body:
json
{
  "title": "Parcel 1",
  "address": "123 Street, City",
  "weight": 5
}
Response:
{
  "message": "Parcel created successfully",
  "parcel": { /* parcel object */ }
}
6️⃣ Get User Parcels
GET /user-parcel
Headers:
Authorization: Bearer <user_token>
Response:
[
  { /* parcel object */ },
  ...
]
7️⃣ Get All Parcels (Admin Only)
GET /getall-parcels
Headers:
Authorization: Bearer <admin_token>

8️⃣ Update Parcel
PUT /update/:parcelId
Headers:
Authorization: Bearer <token>
Body:
json
{
  "title": "Updated Parcel",
  "address": "456 Street, City",
  "weight": 6
}
9️⃣ Delete Parcel
DELETE /delete/:parcelId
Headers:
Authorization: Bearer <token>
🔑 Authorization
Role	Permissions
Customer	Create parcel, view own parcels, reset password
Admin	View all parcels, update/delete any parcel

All protected routes require a JWT token in the Authorization header.

⚡ Testing
Use Postman or Insomnia.

Register a user → login → copy the token.

Include token in Authorization header for protected endpoints.

Test forgot-password → reset-password flow via email.

Admin token is required for /getall-parcels.

📌 Notes
Passwords are hashed in the database.

Reset tokens expire after 10 minutes.

Admin users can manage all parcels; regular users can only access their own parcels.

👨‍💻 Developer
Hriday Mahmud
GitHub Repository: Courier Management Backend [https://github.com/HridayMahmud/courier-management-backend]
