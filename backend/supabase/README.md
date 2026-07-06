# Supabase database

Chay file `schema.sql` trong Supabase de tao database cho website ban sua.

## Cach chay

1. Mo Supabase Dashboard cua project.
2. Vao `SQL Editor` -> `New query`.
3. Mo file `backend/supabase/schema.sql`, copy toan bo noi dung va bam `Run`.
4. Vao `Table Editor` kiem tra cac bang `products`, `product_categories`, `orders`, `customers`.
5. Vao `Storage` dam bao bucket `products` da ton tai va dang public.

## Nhom bang da tao

- San pham: `product_categories`, `products`, `product_images`, `product_variants`, `inventory_movements`.
- Khach hang: `profiles`, `customers`, `customer_addresses`.
- Ban hang: `carts`, `cart_items`, `orders`, `order_items`, `order_status_history`, `coupons`, `coupon_redemptions`.
- Noi dung: `posts`, `post_categories`, `post_tags`, `pages`, `banners`, `menus`, `menu_items`.
- Tuong tac: `reviews`, `contacts`, `newsletter_subscribers`.
- Cau hinh: `app_settings`, `shipping_methods`, `payment_methods`.

## Sau khi chay SQL

Kiem tra backend:

```bash
cd backend
npm run dev
```

Mo cac endpoint:

- `http://localhost:3000/health`
- `http://localhost:3000/api/categories`
- `http://localhost:3000/api/products`
- `http://localhost:3000/api/products/sua-bot-dinh-duong-800g`

## Luu y bao mat

`SUPABASE_SECRET_KEY` / service role key chi de trong backend. Khong dua key nay vao frontend hoac GitHub.
