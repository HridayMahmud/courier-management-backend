
This README covers:
✔ Project overview
✔ Tech stack
✔ Features
✔ Folder structure
✔ Installation
✔ Environment variables
✔ Running the server
✔ API routes
✔ Postman/Thunder Client testing guide
✔ Example requests
✔ Authentication flows
✔ Role-based access
✔ CRUD operations
✔ Error handling
✔ Contribution guidelines

---
# 📦 Courier Management Backend
A Node.js + Express.js + MongoDB backend API for managing courier parcels with authentication, authorization, and role-based access.
---
## 🚀 Features
* User Authentication (JWT)
* Login & Register
* Role-based access → **customer**, **courier**, **admin**
* CRUD operations for parcels
* Get parcels by user
* Admin-only access for viewing all parcels
* Secure routes using `authMiddleware`
* Clean code using MVC pattern
* Environment variables support using `.env`
* MongoDB database integration with Mongoose

---

## 🛠️ Tech Stack

| Technology                   | Purpose               |
| ---------------------------- | --------------------- |
| **Node.js**                  | Runtime environment   |
| **Express.js**               | Server framework      |
| **MongoDB + Mongoose**       | Database              |
| **JWT**                      | Authentication        |
| **bcryptjs**                 | Password hashing      |
| **Dotenv**                   | Environment variables |
| **Postman / Thunder Client** | API testing           |

---
## Project Structure

```text
.
├── config/
│   ├── mail.js
│   └── db.js
├── controllers/
│   ├── authController.js
│   └── parcelController.js
├── i18n/
│   └── i18n.js
├── middleware/
│   ├── authMiddleware.js
│   ├── roleMiddleware.js
│   └── locallizationMiddleware.js
├── models/
│   ├── User.js
│   └── Parcel.js
├── node_modules/
├── repository/
│   ├── userRepository.js
│   └── parcelRepository.js
├── routes/
│   ├── authRouter.js
│   └── parcelsRouter.js
├── views/
├── .env
├── .gitignore
├── package-lock.json
├── package.json
└── server.js

## ⚙️ Installation
Clone the repository:
```sh
git clone your-repository-link-here
cd your-project-folder
```
Install dependencies:

```sh
npm install
```

---

## 🧩 Environment Variables

Create a `.env` file in the root folder:

```
PORT=5000
MONGO_URL=mongodb+srv://root:12345@cluster-1.pfwx280.mongodb.net/courier-management?retryWrites=true&w=majority&appName=Cluster-1
JWT_SECRET=your_jwt_secret_key
```
---
## ▶️ Run the Server

```sh
npm start
```

OR in development:

```sh
npm run dev
```

Server will run at:

```
http://localhost:5000
```

---

# 🔐 Authentication Routes

| Method | Endpoint                           | Description         |
| ------ | --------------------               | ------------------- |
| POST   | `/api/auth/register`               | Register a new user |
| POST   | `/api/auth/login`                  | Login & get token   |
| POST   | `/api/auth/forgot-password         | forgot & get token  |
| POST   | `/api/auth/reset-password          | reset-pasword using token|

### Example register payload:

```json
{
  "name": "John Doe",
  "email": "john@gmail.com",
  "password": "123456"
  "role":"adming"
}
```
### Login response:

```json
{
  "token": "your-jwt-token"
}
```

Use this token in **Authorization header**:

```
Authorization: Bearer <TOKEN>
```

---

# 📦 Parcel Routes

| Method | Endpoint                    | Access                 | Description         |
| ------ | ---------------------       | ---------------------- | ------------------- |
| POST   | `/api/parcel/create`        | customer/courier/admin | Create parcel       |
| GET    | `/api/parcel/user-parcel`   | logged-in user         | Get only my parcels |
| GET    | `/api/parcel/all-parcel`    | admin                  | Get all parcels     |
| PUT    | `/api/parcel/update/:id`    | logged-in user         | Update parcel       |
| DELETE | `/api/parcel/update/:id`    | logged-in user         | Delete parcel       |

## ✏️ Sample Create Parcel Request

POST → `/api/parcels/create`

```json
{
  "title": "Laptop Delivery",
  "address": "Dhaka, Bangladesh",
  "weight": "1.5kg"
}
```
## 🛠️ Update Parcel Request

PUT → `/api/parcels/6730183hs71`

```json
{
  "title": "Mobile Delivery",
  "address": "Mirpur, Dhaka"
}
```

---

## ❌ Delete Parcel

DELETE → `/api/parcels/67301kd812`

Response:

```json
{
  "message": "Parcel deleted successfully"
}
```

---

# 👮 Role-Based Access

| Role         | Permissions                                         |
| ------------ | --------------------------------------------------- |
| **customer** | Create parcel, update own parcel, delete own parcel |
| **courier**  | View + update assigned parcels                      |
| **admin**    | Full access + get all parcels                       |

Middleware used:

```js
role(["admin"])
```

```js
role(["customer", "courier"])
```

---

## 🧪 Testing Guide (Postman / Thunder Client)

### Step 1 → Register

### Step 2 → Login

### Step 3 → Copy JWT token

### Step 4 → Set Header:

```
Authorization: Bearer <token>
```

### Step 5 → Test any Parcel API

---

# 🐛 Error Handling Structure

Example error response:

```json
{
  "message": "invalid_token"
}
```
Tell me what you prefer!
