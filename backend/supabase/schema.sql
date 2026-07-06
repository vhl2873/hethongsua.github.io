
begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  create type public.order_status as enum ('pending','confirmed','packing','shipping','completed','cancelled','refunded');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_status as enum ('unpaid','paid','failed','refunded');
exception when duplicate_object then null;
end $$;

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  role text not null default 'customer' check (role in ('admin', 'staff', 'customer')),
  status text not null default 'active' check (status in ('active', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  phone text,
  email text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  receiver_name text not null,
  phone text not null,
  address_line text not null,
  ward text,
  district text,
  province text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.product_categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.product_categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  sku text unique,
  brand text,
  short_description text,
  description text,
  price numeric(12,2) not null default 0,
  compare_at_price numeric(12,2),
  cost_price numeric(12,2),
  stock_quantity integer not null default 0,
  unit text not null default 'hop',
  weight_grams integer,
  age_range text,
  origin text,
  ingredients text,
  nutrition jsonb not null default '{}'::jsonb,
  tags text[] not null default array[]::text[],
  is_featured boolean not null default false,
  is_active boolean not null default true,
  published_at timestamptz,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  sku text unique,
  price numeric(12,2),
  compare_at_price numeric(12,2),
  stock_quantity integer not null default 0,
  attributes jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  movement_type text not null check (movement_type in ('import', 'export', 'adjustment', 'order')),
  quantity integer not null,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  session_id text,
  status text not null default 'active' check (status in ('active', 'converted', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint carts_owner_check check (user_id is not null or session_id is not null)
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  quantity integer not null default 1 check (quantity > 0),
  price numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, product_id, variant_id)
);

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create table if not exists public.compares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  session_id text,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint compares_owner_check check (user_id is not null or session_id is not null)
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric(12,2) not null,
  min_order_amount numeric(12,2) not null default 0,
  max_discount_amount numeric(12,2),
  usage_limit integer,
  used_count integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shipping_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  fee numeric(12,2) not null default 0,
  min_order_amount numeric(12,2) not null default 0,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid references public.customers(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  status public.order_status not null default 'pending',
  payment_status public.payment_status not null default 'unpaid',
  payment_method_id uuid references public.payment_methods(id) on delete set null,
  shipping_method_id uuid references public.shipping_methods(id) on delete set null,
  coupon_id uuid references public.coupons(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  shipping_address text not null,
  shipping_ward text,
  shipping_district text,
  shipping_province text,
  subtotal numeric(12,2) not null default 0,
  discount_total numeric(12,2) not null default 0,
  shipping_fee numeric(12,2) not null default 0,
  grand_total numeric(12,2) not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  sku text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null default 0,
  line_total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status public.order_status not null,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  discount_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.post_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.post_categories(id) on delete set null,
  title text not null,
  slug text not null unique,
  excerpt text,
  content text,
  thumbnail_url text,
  author_id uuid references auth.users(id) on delete set null,
  is_published boolean not null default false,
  published_at timestamptz,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.post_tag_links (
  post_id uuid not null references public.posts(id) on delete cascade,
  tag_id uuid not null references public.post_tags(id) on delete cascade,
  primary key (post_id, tag_id)
);

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  content text,
  is_published boolean not null default true,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text,
  link_url text,
  position text not null default 'home_hero',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  subject text,
  message text not null,
  status text not null default 'new' check (status in ('new', 'processing', 'done', 'spam')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  status text not null default 'active' check (status in ('active', 'unsubscribed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menus (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.menus(id) on delete cascade,
  parent_id uuid references public.menu_items(id) on delete cascade,
  label text not null,
  url text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_category_id on public.products(category_id);
create index if not exists idx_products_active_featured on public.products(is_active, is_featured, published_at);
create index if not exists idx_product_images_product_id on public.product_images(product_id);
create index if not exists idx_product_variants_product_id on public.product_variants(product_id);
create index if not exists idx_orders_customer_id on public.orders(customer_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_posts_category_id on public.posts(category_id);
create index if not exists idx_banners_position on public.banners(position, is_active);
create index if not exists idx_reviews_product_id on public.reviews(product_id);
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'app_settings','profiles','customers','customer_addresses','product_categories','products',
    'product_variants','carts','cart_items','coupons','shipping_methods','payment_methods',
    'orders','post_categories','posts','pages','banners','reviews','contacts','newsletter_subscribers',
    'menus','menu_items'
  ] loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end $$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'app_settings','profiles','customers','customer_addresses','product_categories','products','product_images',
    'product_variants','inventory_movements','carts','cart_items','wishlists','compares','coupons',
    'shipping_methods','payment_methods','orders','order_items','order_status_history','coupon_redemptions',
    'post_categories','posts','post_tags','post_tag_links','pages','banners','reviews','contacts',
    'newsletter_subscribers','menus','menu_items'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'staff')
      and status = 'active'
  );
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'app_settings','profiles','customers','customer_addresses','product_categories','products','product_images',
    'product_variants','inventory_movements','carts','cart_items','wishlists','compares','coupons',
    'shipping_methods','payment_methods','orders','order_items','order_status_history','coupon_redemptions',
    'post_categories','posts','post_tags','post_tag_links','pages','banners','reviews','contacts',
    'newsletter_subscribers','menus','menu_items'
  ] loop
    execute format('drop policy if exists admin_manage_%I on public.%I', table_name, table_name);
    execute format('create policy admin_manage_%I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', table_name, table_name);
  end loop;
end $$;
-- Public read policies for storefront data.
drop policy if exists "public_read_app_settings" on public.app_settings;
create policy "public_read_app_settings" on public.app_settings for select using (key in ('store', 'seo_home'));
drop policy if exists "public_read_active_categories" on public.product_categories;
create policy "public_read_active_categories" on public.product_categories for select using (is_active = true);
drop policy if exists "public_read_active_products" on public.products;
create policy "public_read_active_products" on public.products for select using (is_active = true and (published_at is null or published_at <= now()));
drop policy if exists "public_read_product_images" on public.product_images;
create policy "public_read_product_images" on public.product_images for select using (true);
drop policy if exists "public_read_active_variants" on public.product_variants;
create policy "public_read_active_variants" on public.product_variants for select using (is_active = true);
drop policy if exists "public_read_shipping_methods" on public.shipping_methods;
create policy "public_read_shipping_methods" on public.shipping_methods for select using (is_active = true);
drop policy if exists "public_read_payment_methods" on public.payment_methods;
create policy "public_read_payment_methods" on public.payment_methods for select using (is_active = true);
drop policy if exists "public_read_post_categories" on public.post_categories;
create policy "public_read_post_categories" on public.post_categories for select using (is_active = true);
drop policy if exists "public_read_posts" on public.posts;
create policy "public_read_posts" on public.posts for select using (is_published = true and (published_at is null or published_at <= now()));
drop policy if exists "public_read_pages" on public.pages;
create policy "public_read_pages" on public.pages for select using (is_published = true);
drop policy if exists "public_read_banners" on public.banners;
create policy "public_read_banners" on public.banners for select using (is_active = true and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now()));
drop policy if exists "public_read_reviews" on public.reviews;
create policy "public_read_reviews" on public.reviews for select using (is_approved = true);
drop policy if exists "public_read_menus" on public.menus;
create policy "public_read_menus" on public.menus for select using (true);
drop policy if exists "public_read_menu_items" on public.menu_items;
create policy "public_read_menu_items" on public.menu_items for select using (is_active = true);

-- Customer self-service policies. Admin backend uses the service role key and bypasses RLS.
drop policy if exists "users_read_own_profile" on public.profiles;
create policy "users_read_own_profile" on public.profiles for select using (auth.uid() = id);
drop policy if exists "users_update_own_profile" on public.profiles;
create policy "users_update_own_profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "users_read_own_orders" on public.orders;
create policy "users_read_own_orders" on public.orders for select using (auth.uid() = user_id);
drop policy if exists "users_read_own_order_items" on public.order_items;
create policy "users_read_own_order_items" on public.order_items for select using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
drop policy if exists "users_manage_own_wishlist" on public.wishlists;
create policy "users_manage_own_wishlist" on public.wishlists for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "users_manage_own_cart" on public.carts;
create policy "users_manage_own_cart" on public.carts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "users_manage_own_cart_items" on public.cart_items;
create policy "users_manage_own_cart_items" on public.cart_items for all using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())) with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));

-- Public forms can insert contact/newsletter records.
drop policy if exists "public_insert_contacts" on public.contacts;
create policy "public_insert_contacts" on public.contacts for insert with check (true);
drop policy if exists "public_insert_newsletter" on public.newsletter_subscribers;
create policy "public_insert_newsletter" on public.newsletter_subscribers for insert with check (true);
drop policy if exists "authenticated_insert_reviews" on public.reviews;
create policy "authenticated_insert_reviews" on public.reviews for insert to authenticated with check (auth.uid() = user_id);

-- Storage policies for the public products bucket.
drop policy if exists "public_read_products_bucket" on storage.objects;
create policy "public_read_products_bucket" on storage.objects for select using (bucket_id = 'products');
drop policy if exists "admin_upload_products_bucket" on storage.objects;
create policy "admin_upload_products_bucket" on storage.objects for insert to authenticated with check (bucket_id = 'products' and public.is_admin());
drop policy if exists "admin_update_products_bucket" on storage.objects;
create policy "admin_update_products_bucket" on storage.objects for update to authenticated using (bucket_id = 'products' and public.is_admin()) with check (bucket_id = 'products' and public.is_admin());
drop policy if exists "admin_delete_products_bucket" on storage.objects;
create policy "admin_delete_products_bucket" on storage.objects for delete to authenticated using (bucket_id = 'products' and public.is_admin());
insert into public.app_settings (key, value, description) values
  ('store', '{"name":"Sieu thi sua Thanh Hau","phone":"0900 000 000","email":"lienhe@thanhhau.vn","address":"Cap nhat dia chi cua hang","currency":"VND"}', 'Thong tin cua hang'),
  ('seo_home', '{"title":"Sieu thi sua Thanh Hau","description":"Cua hang sua va san pham me be uy tin."}', 'SEO trang chu')
on conflict (key) do update set value = excluded.value, description = excluded.description;

insert into public.product_categories (name, slug, description, sort_order) values
  ('Sua bot', 'sua-bot', 'Sua bot dinh duong cho tre em va gia dinh', 1),
  ('Sua tuoi', 'sua-tuoi', 'Sua tuoi tiet trung va thanh trung', 2),
  ('Sua chua', 'sua-chua', 'Sua chua an va sua chua uong', 3),
  ('Me va be', 'me-va-be', 'San pham cham soc me va be', 4)
on conflict (slug) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

insert into public.products (category_id, name, slug, sku, brand, short_description, description, price, compare_at_price, stock_quantity, unit, age_range, origin, tags, is_featured, is_active, published_at)
select c.id, 'Sua bot dinh duong 800g', 'sua-bot-dinh-duong-800g', 'MILK-800G', 'Thanh Hau', 'Sua bot bo sung dinh duong cho be va gia dinh.', 'San pham mau de hien thi tren website. Co the cap nhat thong tin thuong hieu, thanh phan va hinh anh trong trang admin.', 365000, 395000, 30, 'hop', '1 tuoi tro len', 'Viet Nam', array['sua bot','dinh duong'], true, true, now() from public.product_categories c where c.slug = 'sua-bot'
on conflict (slug) do update set price = excluded.price, compare_at_price = excluded.compare_at_price, stock_quantity = excluded.stock_quantity, is_featured = excluded.is_featured, updated_at = now();

insert into public.products (category_id, name, slug, sku, brand, short_description, description, price, compare_at_price, stock_quantity, unit, origin, tags, is_featured, is_active, published_at)
select c.id, 'Sua tuoi tiet trung it duong', 'sua-tuoi-tiet-trung-it-duong', 'FRESH-ITDUONG', 'Thanh Hau', 'Sua tuoi hop tien loi cho ca gia dinh.', 'San pham mau cho nhom sua tuoi.', 34000, 39000, 120, 'loc', 'Viet Nam', array['sua tuoi','it duong'], true, true, now() from public.product_categories c where c.slug = 'sua-tuoi'
on conflict (slug) do update set price = excluded.price, compare_at_price = excluded.compare_at_price, stock_quantity = excluded.stock_quantity, is_featured = excluded.is_featured, updated_at = now();

insert into public.products (category_id, name, slug, sku, brand, short_description, description, price, stock_quantity, unit, age_range, origin, tags, is_featured, is_active, published_at)
select c.id, 'Sua chua uong cho be', 'sua-chua-uong-cho-be', 'YOGURT-BE', 'Thanh Hau', 'Sua chua uong vi trai cay de dung moi ngay.', 'San pham mau cho nhom sua chua.', 28000, 80, 'loc', '2 tuoi tro len', 'Viet Nam', array['sua chua','tre em'], false, true, now() from public.product_categories c where c.slug = 'sua-chua'
on conflict (slug) do update set price = excluded.price, stock_quantity = excluded.stock_quantity, updated_at = now();

insert into public.products (category_id, name, slug, sku, brand, short_description, description, price, stock_quantity, unit, tags, is_featured, is_active, published_at)
select c.id, 'Bim em be cao cap', 'bim-em-be-cao-cap', 'BABY-DIAPER', 'Thanh Hau', 'Bim mem thoang khi cho be.', 'San pham mau cho nhom me va be.', 215000, 45, 'goi', array['me va be','bim'], false, true, now() from public.product_categories c where c.slug = 'me-va-be'
on conflict (slug) do update set price = excluded.price, stock_quantity = excluded.stock_quantity, updated_at = now();

insert into public.shipping_methods (name, description, fee, min_order_amount, sort_order) values
  ('Giao hang noi thanh', 'Giao hang trong khu vuc cua hang phuc vu.', 20000, 0, 1),
  ('Mien phi van chuyen', 'Ap dung cho don hang dat gia tri toi thieu.', 0, 500000, 2)
on conflict do nothing;

insert into public.payment_methods (name, code, description, sort_order) values
  ('Thanh toan khi nhan hang', 'cod', 'Khach hang thanh toan khi nhan san pham.', 1),
  ('Chuyen khoan ngan hang', 'bank_transfer', 'Nhan vien xac nhan sau khi nhan chuyen khoan.', 2)
on conflict (code) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

insert into public.post_categories (name, slug, description) values
  ('Kien thuc dinh duong', 'kien-thuc-dinh-duong', 'Bai viet ve dinh duong va cham soc gia dinh'),
  ('Tin cua hang', 'tin-cua-hang', 'Thong bao va chuong trinh cua Sieu thi sua Thanh Hau')
on conflict (slug) do update set name = excluded.name, description = excluded.description;

insert into public.pages (title, slug, content, seo_title, seo_description) values
  ('Gioi thieu', 'gioi-thieu', 'Sieu thi sua Thanh Hau chuyen cung cap sua va san pham me be chinh hang.', 'Gioi thieu Sieu thi sua Thanh Hau', 'Thong tin ve cua hang sua Thanh Hau'),
  ('Chinh sach giao hang', 'chinh-sach-giao-hang', 'Cap nhat chinh sach giao hang, doi tra va ho tro khach hang.', 'Chinh sach giao hang', 'Chinh sach giao hang cua cua hang')
on conflict (slug) do update set title = excluded.title, content = excluded.content, seo_title = excluded.seo_title, seo_description = excluded.seo_description;

insert into public.banners (title, subtitle, position, link_url, sort_order) values
  ('Sieu thi sua Thanh Hau', 'Sua chinh hang cho be va ca gia dinh', 'home_hero', '/shop.html', 1),
  ('Uu dai moi moi ngay', 'Cap nhat khuyen mai sua bot, sua tuoi va san pham me be', 'home_promo', '/shop.html', 2)
on conflict do nothing;

insert into public.menus (name, slug) values
  ('Menu chinh', 'main-menu'),
  ('Chan trang', 'footer-menu')
on conflict (slug) do update set name = excluded.name;

commit;





