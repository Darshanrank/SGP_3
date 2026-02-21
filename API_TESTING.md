# API Endpoints Testing Guide

Base URL: `http://localhost:3000/api`

## 1. Authentication
*Note: After login, copy the `accessToken` and use it in the Authorization header for subsequent requests (`Authorization: Bearer <your_token>`).*

### Register
**POST** `/auth/register`
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "Password123!"
}
```

### Login
**POST** `/auth/login`
```json
{
  "email": "john@example.com",
  "password": "Password123!"
}
```

---

## 2. Profile Management

### Get My Profile
**GET** `/profile/me`
*Headers: Authorization: Bearer <token>*

### Update Profile
**PUT** `/profile/me`
*Headers: Authorization: Bearer <token>*
```json
{
  "bio": "I love learning languages!",
  "avatarUrl": "https://example.com/avatar.jpg",
  "learningLanguage": "Spanish"
}
```

### Get Public Profile
**GET** `/profile/:id`
*Headers: Authorization: Bearer <token>*

---

## 3. Skills Management

### Get Master Skill List
**GET** `/skills`
*Headers: Authorization: Bearer <token>*

### Create a New Skill (Admin)
**POST** `/skills`
*Headers: Authorization: Bearer <token>*
```json
{
  "name": "React.js",
  "category": "Programming"
}
```

### Get My Skills
**GET** `/skills/my`
*Headers: Authorization: Bearer <token>*

### Add Skill to Profile
**POST** `/skills/my`
*Headers: Authorization: Bearer <token>*
```json
{
  "skillId": 1,
  "type": "TEACH",
  "level": "HIGH",
  "proofUrl": "https://github.com/myprofile",
  "preview": {
    "videoUrl": "https://youtube.com/...",
    "description": "I will teach you React basics.",
    "syllabusOutline": "1. Components, 2. Props, 3. State"
  }
}
```

---

## 4. Swaps & Requests

### Create Swap Request
**POST** `/swaps/requests`
*Headers: Authorization: Bearer <token>*
```json
{
  "toUserId": 2,
  "teachSkillId": 1,
  "learnSkillId": 5
}
```

### Get My Requests
**GET** `/swaps/requests?type=sent`
**GET** `/swaps/requests?type=received`
*Headers: Authorization: Bearer <token>*

### Respond to Request (Accept/Reject)
**PUT** `/swaps/requests/:id`
*Headers: Authorization: Bearer <token>*
```json
{
  "status": "ACCEPTED"
}
```
*(Options: ACCEPTED, REJECTED, CANCELLED)*

---

## 5. Classes (Active Swaps)

### Get My Classes
**GET** `/swaps/classes`
*Headers: Authorization: Bearer <token>*

### Get Class Details
**GET** `/swaps/classes/:id`
*Headers: Authorization: Bearer <token>*

### Add Class Todo
**POST** `/swaps/classes/:id/todos`
*Headers: Authorization: Bearer <token>*
```json
{
  "title": "Review Chapter 1",
  "description": "Read pages 10-20",
  "dueDate": "2023-12-31"
}
```

### Toggle Todo Status
**PUT** `/swaps/classes/todos/:todoId`
*Headers: Authorization: Bearer <token>*
```json
{
  "isCompleted": true
}
```

### Complete Class
**POST** `/swaps/classes/:id/complete`
*Headers: Authorization: Bearer <token>*
*(Must be called by both users to fully complete the class)*

---

## 6. Chat

### Get Messages
**GET** `/chat/:classId`
*Headers: Authorization: Bearer <token>*

### Send Message
**POST** `/chat/:classId`
*Headers: Authorization: Bearer <token>*
```json
{
  "message": "Hello! When should we meet?"
}
```

---

## 7. Meta (Notifications, Dashboard, Calendar)

### Get Notifications
**GET** `/meta/notifications`
*Headers: Authorization: Bearer <token>*

### Mark Notification as Read
**PUT** `/meta/notifications/:id/read`
*Headers: Authorization: Bearer <token>*

### Get Dashboard Stats
**GET** `/meta/dashboard`
*Headers: Authorization: Bearer <token>*

### Get Calendar Events
**GET** `/meta/calendar`
*Headers: Authorization: Bearer <token>*

### Create Calendar Event
**POST** `/meta/calendar`
*Headers: Authorization: Bearer <token>*
```json
{
  "title": "React Class",
  "eventDate": "2023-12-01T10:00:00Z",
  "swapClassId": 1
}
```

### Report User
**POST** `/meta/report`
*Headers: Authorization: Bearer <token>*
```json
{
  "reportedUserId": 2,
  "reason": "Inappropriate behavior"
}
```
