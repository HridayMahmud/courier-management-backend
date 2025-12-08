# 🚚 Courier Management API

A simple RESTful API to manage **users, parcels, and authentication** in a courier system.  
Base URL: `https://courier-management-backend-swrf.onrender.com`

---

## 🔹 Features

- User registration & login  
- Forgot password & reset password  
- Create, view, update, and delete parcels  
- Admin can view all parcels  

---

## 📝 Endpoints

### 1️⃣ Register User

**POST** `/register`  

**Body:**

```json
{
  "name": "HRIDAY MAHMUD",
  "email": "hriday@example.com",
  "password": "password123",
  "role": "customer"
}
Response:
{
  "message": "user registered successfully",
  "User": { /* user object */ }
}
2️⃣ Login

POST /login

Body:

{
  "email": "hriday@example.com",
  "password": "password123"
}
Response:
{
  "message": "login successful",
  "token": "<JWT_TOKEN>"
}
Use this token in Authorization: Bearer <token> header for protected routes.

3️⃣ Forgot Password

POST /forgot-password

Body:

{
  "email": "user@example.com"
}
Response:
{
  "message": "email sent"
}

4️⃣ Reset Password

POST /reset-password

Body:
{
  "email": "user@example.com",
  "token": "123456",
  "password": "newpassword123"
}
Response:

{
  "message": "Password reset successful"
}

5️⃣ Create Parcel

POST /create-parcel
Headers:

Authorization: Bearer <user_token>


Body:

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

All protected routes require a JWT token in Authorization header.

⚡ Testing

Use Postman or Insomnia.

Register a user → login → copy the token.

Include the token in Authorization for protected endpoints.

Test forgot-password → reset-password workflow using the token sent via email.

📌 Notes

Passwords are hashed in DB.

Reset tokens expire after 10 minutes.

Admin users can manage all parcels; regular users only their own.

Developed by: Hriday Mahmud
GitHub Repository: [Courier Management Backend](https://github.com/HridayMahmud/courier-management-backend)

