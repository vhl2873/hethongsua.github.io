# He thong sua Thanh Hau

Du an da duoc tach thanh 2 phan:

```text
suruchi-ecommerce-master/
  frontend/   Website HTML/CSS/JS tinh cho khach hang va trang admin
  backend/    API server de ket noi Supabase Database va Supabase Storage
  index.html  Redirect nhanh sang frontend/index.html
  admin.html  Redirect nhanh sang frontend/admin.html
```

## Frontend

Thu muc `frontend/` chua toan bo giao dien web hien tai:

- `frontend/index.html`: trang chu
- `frontend/admin.html`: trang quan tri
- `frontend/assets/`: CSS, JS, hinh anh template

Co the mo truc tiep `frontend/index.html` bang trinh duyet.

## Backend

Thu muc `backend/` la Node.js API scaffold de ket noi Supabase.

```bash
cd backend
npm install
npm run dev
```

API mau:

- `GET /health`
- `GET /api/products`
- `GET /api/storage/files`
- `POST /api/storage/upload`

## Cau hinh Supabase

1. Sao chep `backend/.env.example` thanh `backend/.env`.
2. Dien `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWKS_URL`.
3. Tao Supabase Storage bucket, vi du `products`, roi dat `SUPABASE_STORAGE_BUCKET=products`.
4. Neu can frontend hien thi anh truc tiep, dat bucket public hoac tao API backend de tra signed URL.

File `backend/.env` da duoc ignore trong git.

## Database schema

File SQL tao bang Supabase nam tai `backend/supabase/schema.sql`.

Chay trong Supabase Dashboard:

1. `SQL Editor` -> `New query`.
2. Copy noi dung `backend/supabase/schema.sql`.
3. Bam `Run`.
4. Kiem tra `GET /api/products` de xac nhan bang `products` da hoat dong.
