import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '12mb' }));

const supabaseUrl = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const storageBucket = process.env.SUPABASE_STORAGE_BUCKET || 'products';

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

const publicSupabase = supabaseUrl && supabasePublishableKey
  ? createClient(supabaseUrl, supabasePublishableKey)
  : null;

const productSelect = `
  *,
  category:product_categories(*),
  images:product_images(*),
  variants:product_variants(*)
`;

const adminTables = new Map([
  ['app_settings', { id: 'key' }],
  ['product_categories', { id: 'id', slug: true }],
  ['products', { id: 'id', slug: true }],
  ['product_images', { id: 'id' }],
  ['product_variants', { id: 'id' }],
  ['inventory_movements', { id: 'id' }],
  ['customers', { id: 'id' }],
  ['customer_addresses', { id: 'id' }],
  ['orders', { id: 'id' }],
  ['order_items', { id: 'id' }],
  ['coupons', { id: 'id' }],
  ['shipping_methods', { id: 'id' }],
  ['payment_methods', { id: 'id' }],
  ['post_categories', { id: 'id', slug: true }],
  ['posts', { id: 'id', slug: true }],
  ['pages', { id: 'id', slug: true }],
  ['banners', { id: 'id' }],
  ['reviews', { id: 'id' }],
  ['contacts', { id: 'id' }],
  ['newsletter_subscribers', { id: 'id' }],
  ['menus', { id: 'id', slug: true }],
  ['menu_items', { id: 'id' }]
]);

function requireSupabase(res) {
  if (!supabase) {
    res.status(503).json({ error: 'Supabase is not configured' });
    return false;
  }
  return true;
}

function decodeBase64File(fileBase64) {
  const match = String(fileBase64 || '').match(/^data:(.+);base64,(.+)$/);
  if (match) return { contentType: match[1], buffer: Buffer.from(match[2], 'base64') };
  return { contentType: 'application/octet-stream', buffer: Buffer.from(String(fileBase64 || ''), 'base64') };
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `san-pham-${Date.now()}`;
}

function productPayload(body) {
  const status = body.status || 'active';
  const name = String(body.name || '').trim();
  return {
    category_id: body.category_id || null,
    name,
    slug: body.slug ? slugify(body.slug) : slugify(name),
    sku: body.sku ? String(body.sku).trim() : null,
    brand: body.brand ? String(body.brand).trim() : null,
    short_description: body.short_description ? String(body.short_description).trim() : null,
    description: body.description ? String(body.description).trim() : null,
    price: Number(body.price || 0),
    compare_at_price: body.compare_at_price ? Number(body.compare_at_price) : null,
    stock_quantity: Number(body.stock_quantity || 0),
    unit: body.unit || 'hop',
    age_range: body.age_range || null,
    origin: body.origin || null,
    tags: Array.isArray(body.tags) ? body.tags : String(body.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean),
    is_featured: Boolean(body.is_featured),
    is_active: status !== 'inactive',
    published_at: status === 'draft' ? null : (body.published_at || new Date().toISOString())
  };
}

async function attachPrimaryImage(productId, imageUrl, altText) {
  if (!imageUrl) return;
  await supabase.from('product_images').update({ is_primary: false }).eq('product_id', productId);
  await supabase.from('product_images').insert({
    product_id: productId,
    url: imageUrl,
    alt_text: altText || 'Anh san pham',
    sort_order: 0,
    is_primary: true
  });
}

async function getProductById(id) {
  return supabase.from('products').select(productSelect).eq('id', id).single();
}

function cleanAdminPayload(table, body) {
  const config = adminTables.get(table);
  const payload = { ...body };
  delete payload.id;
  delete payload.created_at;
  delete payload.updated_at;

  if (config?.slug && payload.name && !payload.slug) payload.slug = slugify(payload.name);
  if (config?.slug && payload.title && !payload.slug) payload.slug = slugify(payload.title);
  if (payload.slug) payload.slug = slugify(payload.slug);

  Object.keys(payload).forEach((key) => {
    if (payload[key] === '') payload[key] = null;
  });

  return payload;
}

async function countRows(table, filter) {
  let query = supabase.from(table).select('*', { count: 'exact', head: true });
  if (filter) query = filter(query);
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'hethongsua-backend', supabase: Boolean(supabase), publicSupabase: Boolean(publicSupabase), storageBucket });
});

app.get('/api/settings', async (req, res) => {
  if (!requireSupabase(res)) return;
  const { data, error } = await supabase.from('app_settings').select('*').order('key', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/admin/summary', async (req, res) => {
  if (!requireSupabase(res)) return;
  try {
    const [products, categories, orders, customers, posts, pages, banners, contacts, newsletters, coupons] = await Promise.all([
      countRows('products'),
      countRows('product_categories'),
      countRows('orders'),
      countRows('customers'),
      countRows('posts'),
      countRows('pages'),
      countRows('banners'),
      countRows('contacts', (query) => query.eq('status', 'new')),
      countRows('newsletter_subscribers'),
      countRows('coupons')
    ]);
    res.json({ products, categories, orders, customers, posts, pages, banners, newContacts: contacts, newsletters, coupons });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin-data/:table', async (req, res) => {
  if (!requireSupabase(res)) return;
  const config = adminTables.get(req.params.table);
  if (!config) return res.status(404).json({ error: 'Unknown admin table' });

  let query = supabase.from(req.params.table).select('*', { count: 'exact' });
  if (req.query.limit) query = query.limit(Number(req.query.limit));
  if (req.query.orderBy) query = query.order(req.query.orderBy, { ascending: req.query.ascending === 'true' });
  else query = query.order('created_at', { ascending: false });

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ data, count });
});

app.post('/api/admin-data/:table', async (req, res) => {
  if (!requireSupabase(res)) return;
  const config = adminTables.get(req.params.table);
  if (!config) return res.status(404).json({ error: 'Unknown admin table' });

  const payload = cleanAdminPayload(req.params.table, req.body);
  const { data, error } = await supabase.from(req.params.table).insert(payload).select('*').single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

app.put('/api/admin-data/:table/:id', async (req, res) => {
  if (!requireSupabase(res)) return;
  const config = adminTables.get(req.params.table);
  if (!config) return res.status(404).json({ error: 'Unknown admin table' });

  const payload = cleanAdminPayload(req.params.table, req.body);
  const { data, error } = await supabase.from(req.params.table).update(payload).eq(config.id, req.params.id).select('*').single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/admin-data/:table/:id', async (req, res) => {
  if (!requireSupabase(res)) return;
  const config = adminTables.get(req.params.table);
  if (!config) return res.status(404).json({ error: 'Unknown admin table' });

  const { error } = await supabase.from(req.params.table).delete().eq(config.id, req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

app.get('/api/categories', async (req, res) => {
  if (!requireSupabase(res)) return;
  const { data, error } = await supabase.from('product_categories').select('*').order('sort_order', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/categories', async (req, res) => {
  if (!requireSupabase(res)) return;
  const payload = { name: req.body.name, slug: slugify(req.body.slug || req.body.name), description: req.body.description || null, sort_order: Number(req.body.sort_order || 0), is_active: req.body.is_active !== false };
  const { data, error } = await supabase.from('product_categories').insert(payload).select('*').single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

app.get('/api/products', async (req, res) => {
  if (!requireSupabase(res)) return;
  let categoryId = null;
  if (req.query.category) {
    const { data: category, error: categoryError } = await supabase.from('product_categories').select('id').eq('slug', req.query.category).single();
    if (categoryError) return res.status(categoryError.code === 'PGRST116' ? 404 : 500).json({ error: categoryError.message });
    categoryId = category.id;
  }
  let query = supabase.from('products').select(productSelect).order('created_at', { ascending: false });
  if (req.query.public === 'true') query = query.eq('is_active', true);
  if (req.query.featured === 'true') query = query.eq('is_featured', true);
  if (categoryId) query = query.eq('category_id', categoryId);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/products/:slug', async (req, res) => {
  if (!requireSupabase(res)) return;
  const { data, error } = await supabase.from('products').select(productSelect).eq('slug', req.params.slug).single();
  if (error) return res.status(error.code === 'PGRST116' ? 404 : 500).json({ error: error.message });
  res.json(data);
});

app.post('/api/products', async (req, res) => {
  if (!requireSupabase(res)) return;
  const payload = productPayload(req.body);
  if (!payload.name) return res.status(400).json({ error: 'Product name is required' });
  const { data, error } = await supabase.from('products').insert(payload).select('*').single();
  if (error) return res.status(500).json({ error: error.message });
  await attachPrimaryImage(data.id, req.body.image_url, data.name);
  const product = await getProductById(data.id);
  if (product.error) return res.status(500).json({ error: product.error.message });
  res.status(201).json(product.data);
});

app.put('/api/products/:id', async (req, res) => {
  if (!requireSupabase(res)) return;
  const payload = productPayload(req.body);
  delete payload.slug;
  if (req.body.slug) payload.slug = slugify(req.body.slug);
  const { data, error } = await supabase.from('products').update(payload).eq('id', req.params.id).select('*').single();
  if (error) return res.status(500).json({ error: error.message });
  await attachPrimaryImage(data.id, req.body.image_url, data.name);
  const product = await getProductById(data.id);
  if (product.error) return res.status(500).json({ error: product.error.message });
  res.json(product.data);
});

app.delete('/api/products/:id', async (req, res) => {
  if (!requireSupabase(res)) return;
  const { error } = await supabase.from('products').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

app.get('/api/orders', async (req, res) => {
  if (!requireSupabase(res)) return;
  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .order('created_at', { ascending: false })
    .limit(Number(req.query.limit || 50));
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.put('/api/orders/:id/status', async (req, res) => {
  if (!requireSupabase(res)) return;
  const payload = {};
  if (req.body.status) payload.status = req.body.status;
  if (req.body.payment_status) payload.payment_status = req.body.payment_status;
  if (!Object.keys(payload).length) return res.status(400).json({ error: 'Missing order status payload' });

  const { data, error } = await supabase
    .from('orders')
    .update(payload)
    .eq('id', req.params.id)
    .select('*')
    .single();

  if (error) return res.status(500).json({ error: error.message });

  if (payload.status) {
    await supabase.from('order_status_history').insert({
      order_id: req.params.id,
      status: payload.status,
      note: req.body.note || 'Cap nhat tu trang admin'
    });
  }

  res.json(data);
});
app.get('/api/customers', async (req, res) => {
  if (!requireSupabase(res)) return;
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(Number(req.query.limit || 50));
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/banners', async (req, res) => {
  if (!requireSupabase(res)) return;
  let query = supabase.from('banners').select('*').order('sort_order', { ascending: true });
  if (req.query.position) query = query.eq('position', req.query.position);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/posts', async (req, res) => {
  if (!requireSupabase(res)) return;
  const { data, error } = await supabase
    .from('posts')
    .select('*, category:post_categories(*)')
    .order('created_at', { ascending: false })
    .limit(Number(req.query.limit || 50));
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/pages', async (req, res) => {
  if (!requireSupabase(res)) return;
  const { data, error } = await supabase.from('pages').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/storage/files', async (req, res) => {
  if (!requireSupabase(res)) return;
  const prefix = req.query.prefix || '';
  const { data, error } = await supabase.storage.from(storageBucket).list(prefix, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
  if (error) return res.status(500).json({ error: error.message });
  const files = (data || []).map((item) => {
    const fullPath = `${prefix ? `${String(prefix).replace(/\/$/, '')}/` : ''}${item.name}`;
    const { data: publicData } = supabase.storage.from(storageBucket).getPublicUrl(fullPath);
    return { ...item, path: fullPath, publicUrl: publicData.publicUrl };
  });
  res.json(files);
});

app.post('/api/storage/upload', async (req, res) => {
  if (!requireSupabase(res)) return;
  const { path, fileBase64, contentType } = req.body;
  if (!path || !fileBase64) return res.status(400).json({ error: 'Missing path or fileBase64' });

  const decoded = decodeBase64File(fileBase64);
  const { data, error } = await supabase.storage.from(storageBucket).upload(path, decoded.buffer, {
    contentType: contentType || decoded.contentType,
    upsert: true
  });
  if (error) return res.status(500).json({ error: error.message });

  const { data: publicData } = supabase.storage.from(storageBucket).getPublicUrl(data.path);
  res.json({ path: data.path, publicUrl: publicData.publicUrl });
});

app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
});





