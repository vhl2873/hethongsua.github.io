# Backend - He thong sua Thanh Hau

Backend nay dung de ket noi Supabase Database va Supabase Storage cho website tinh trong thu muc `frontend/`.

## Cai dat

```bash
cd backend
npm install
```

## Cau hinh moi truong

Sao chep `.env.example` thanh `.env`, sau do dien thong tin that:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_JWKS_URL`
- `SUPABASE_STORAGE_BUCKET`

Khong dua `.env` len GitHub.

## Supabase Storage

Tao bucket trong Supabase Storage, vi du `products`. Neu bucket public, frontend co the dung public URL de hien thi anh san pham. Backend co endpoint upload de dua file len bucket bang service key.

## Chay local

```bash
npm run dev
```

API mau:

- `GET /health`
- `GET /api/products`
- `GET /api/storage/files`
- `POST /api/storage/upload`

## Database

Schema Supabase nam tai `supabase/schema.sql`.

Thu tu cai dat khuyen nghi:

1. Tao Storage bucket `products` trong Supabase va bat public read.
2. Chay `supabase/schema.sql` trong Supabase SQL Editor.
3. Chay backend bang `npm run dev`.
4. Kiem tra `GET /api/categories` va `GET /api/products`.
