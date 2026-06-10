# Auth API Contract

**Base path:** `/api/auth`  
**Stack:** Fastify · @fastify/jwt · bcrypt

---

## Error format

All errors follow a single envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "field": "email"
  }
}
```

`field` is present only for single-field validation errors.

### Common error codes

| Code | HTTP | Meaning |
|------|------|---------|
| `VALIDATION_ERROR` | 400 | Invalid / missing field |
| `USER_EXISTS` | 409 | Email already registered |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `INVALID_TOKEN` | 401 | Token missing, malformed, or expired |
| `TOKEN_REUSED` | 401 | Refresh token already rotated |
| `USER_NOT_FOUND` | 404 | No account for that email |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## JWT

### Token TTLs

| Token | TTL |
|-------|-----|
| Access token | 15 minutes |
| Refresh token | 7 days |

### Access token payload

```json
{
  "sub": "usr_01HX…",
  "email": "user@example.com",
  "role": "user",
  "iat": 1718000000,
  "exp": 1718000900
}
```

### Refresh token payload

```json
{
  "sub": "usr_01HX…",
  "jti": "rtk_01HX…",
  "iat": 1718000000,
  "exp": 1718604800
}
```

`jti` is a unique token ID used for rotation — each refresh invalidates the current `jti` and issues a new one.

---

## Endpoints

### POST /api/auth/register

Create a new account.

**Request**

```http
POST /api/auth/register
Content-Type: application/json
```

```json
{
  "email": "user@example.com",
  "password": "s3cur3P@ss"
}
```

| Field | Type | Rules |
|-------|------|-------|
| `email` | string | required, valid email, max 255 |
| `password` | string | required, min 8, max 72 (bcrypt limit) |

**Response · 201 Created**

```json
{
  "user": {
    "id": "usr_01HX…",
    "email": "user@example.com",
    "role": "user",
    "createdAt": "2026-06-10T12:00:00.000Z"
  },
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>"
}
```

**Errors**

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing / invalid field |
| 409 | `USER_EXISTS` | Email already registered |

---

### POST /api/auth/login

Authenticate with email + password.

**Request**

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "email": "user@example.com",
  "password": "s3cur3P@ss"
}
```

**Response · 200 OK**

```json
{
  "user": {
    "id": "usr_01HX…",
    "email": "user@example.com",
    "role": "user"
  },
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>"
}
```

**Errors**

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing field |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password |

---

### POST /api/auth/logout

Invalidate the current refresh token. Requires authentication.

**Request**

```http
POST /api/auth/logout
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "refreshToken": "<jwt>"
}
```

**Response · 204 No Content**

_(empty body)_

**Errors**

| HTTP | Code | Condition |
|------|------|-----------|
| 401 | `INVALID_TOKEN` | Access token missing or expired |
| 401 | `INVALID_TOKEN` | Refresh token invalid |

---

### POST /api/auth/refresh

Exchange a valid refresh token for a new token pair (rotation).

**Request**

```http
POST /api/auth/refresh
Content-Type: application/json
```

```json
{
  "refreshToken": "<jwt>"
}
```

**Response · 200 OK**

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>"
}
```

Old refresh token is immediately invalidated (`jti` revoked).

**Errors**

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing `refreshToken` |
| 401 | `INVALID_TOKEN` | Token expired or malformed |
| 401 | `TOKEN_REUSED` | Token `jti` already rotated (replay attack) |

---

### POST /api/auth/forgot-password

Send a password reset email.

**Request**

```http
POST /api/auth/forgot-password
Content-Type: application/json
```

```json
{
  "email": "user@example.com"
}
```

**Response · 200 OK**

```json
{
  "message": "If that email is registered, a reset link has been sent."
}
```

Response is identical whether or not the email exists (prevents user enumeration).

**Errors**

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing / invalid email |

---

### POST /api/auth/reset-password

Set a new password using the token from the reset email.

**Request**

```http
POST /api/auth/reset-password
Content-Type: application/json
```

```json
{
  "token": "<reset-token>",
  "password": "newS3cur3P@ss"
}
```

| Field | Type | Rules |
|-------|------|-------|
| `token` | string | required, opaque reset token (expires 1 hour) |
| `password` | string | required, min 8, max 72 |

**Response · 200 OK**

```json
{
  "message": "Password updated successfully."
}
```

All existing refresh tokens for the user are revoked on success.

**Errors**

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing / invalid field |
| 401 | `INVALID_TOKEN` | Reset token expired or already used |
| 404 | `USER_NOT_FOUND` | Token references a deleted account |

---

### GET /api/auth/me

Return the authenticated user's profile.

**Request**

```http
GET /api/auth/me
Authorization: Bearer <accessToken>
```

**Response · 200 OK**

```json
{
  "user": {
    "id": "usr_01HX…",
    "email": "user@example.com",
    "role": "user",
    "createdAt": "2026-06-10T12:00:00.000Z"
  }
}
```

**Errors**

| HTTP | Code | Condition |
|------|------|-----------|
| 401 | `INVALID_TOKEN` | Access token missing or expired |
