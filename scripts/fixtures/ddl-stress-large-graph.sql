-- DDL stress fixture: large schema graph (~40 tables)
-- Topology: e-commerce hub, RBAC subgraph, 5-table chain, events hub, isolated tables.
-- Use for layout, linter, bottlenecks, hide-isolated-tables, and PNG export testing.

CREATE TYPE order_status AS ENUM ('pending', 'paid', 'shipped', 'cancelled');

-- === Component 1: e-commerce hub (users is high in-degree hub) ===

CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE profiles (
  profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
  full_name TEXT NOT NULL
);

CREATE TABLE addresses (
  address_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  line1 TEXT NOT NULL,
  city TEXT NOT NULL
);

CREATE TABLE payment_methods (
  payment_method_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  last4 CHAR(4) NOT NULL
);

CREATE TABLE products (
  product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  price_cents INTEGER NOT NULL
);

CREATE TABLE categories (
  category_id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE product_categories (
  product_id UUID NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(category_id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);

CREATE TABLE orders (
  order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  status order_status NOT NULL DEFAULT 'pending',
  placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
  order_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(product_id),
  quantity INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE shopping_carts (
  cart_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE cart_items (
  cart_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES shopping_carts(cart_id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE product_reviews (
  review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL,
  body TEXT
);

CREATE TABLE shipments (
  shipment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  carrier TEXT NOT NULL
);

CREATE TABLE shipment_items (
  shipment_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(shipment_id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES order_items(order_item_id) ON DELETE CASCADE
);

CREATE TABLE coupons (
  coupon_code TEXT PRIMARY KEY,
  discount_pct NUMERIC(5, 2) NOT NULL
);

CREATE TABLE order_coupons (
  order_id UUID NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  coupon_code TEXT NOT NULL REFERENCES coupons(coupon_code),
  PRIMARY KEY (order_id, coupon_code)
);

-- === Component 2: deep chain ===

CREATE TABLE chain_a1 (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL
);

CREATE TABLE chain_a2 (
  id SERIAL PRIMARY KEY,
  a1_id INTEGER NOT NULL REFERENCES chain_a1(id) ON DELETE CASCADE
);

CREATE TABLE chain_a3 (
  id SERIAL PRIMARY KEY,
  a2_id INTEGER NOT NULL REFERENCES chain_a2(id) ON DELETE CASCADE
);

CREATE TABLE chain_a4 (
  id SERIAL PRIMARY KEY,
  a3_id INTEGER NOT NULL REFERENCES chain_a3(id) ON DELETE CASCADE
);

CREATE TABLE chain_a5 (
  id SERIAL PRIMARY KEY,
  a4_id INTEGER NOT NULL REFERENCES chain_a4(id) ON DELETE CASCADE
);

-- === Component 3: RBAC subgraph ===

CREATE TABLE rbac_users (
  rbac_user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE
);

CREATE TABLE rbac_roles (
  role_id SERIAL PRIMARY KEY,
  role_name TEXT NOT NULL UNIQUE
);

CREATE TABLE rbac_permissions (
  permission_id SERIAL PRIMARY KEY,
  permission_key TEXT NOT NULL UNIQUE
);

CREATE TABLE rbac_user_roles (
  rbac_user_id UUID NOT NULL REFERENCES rbac_users(rbac_user_id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES rbac_roles(role_id) ON DELETE CASCADE,
  PRIMARY KEY (rbac_user_id, role_id)
);

CREATE TABLE rbac_role_permissions (
  role_id INTEGER NOT NULL REFERENCES rbac_roles(role_id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES rbac_permissions(permission_id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- === Component 4: events hub (high fan-out) ===

CREATE TABLE events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE event_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  room TEXT NOT NULL
);

CREATE TABLE event_speakers (
  speaker_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

CREATE TABLE event_tickets (
  ticket_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  session_id UUID REFERENCES event_sessions(session_id) ON DELETE SET NULL,
  tier TEXT NOT NULL
);

CREATE TABLE event_attendees (
  attendee_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  email TEXT NOT NULL
);

CREATE TABLE event_sponsorships (
  sponsorship_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  sponsor_name TEXT NOT NULL
);

CREATE TABLE event_feedback (
  feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  score INTEGER NOT NULL
);

CREATE TABLE event_waitlist (
  waitlist_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  email TEXT NOT NULL
);

CREATE TABLE event_staff (
  staff_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  staff_name TEXT NOT NULL
);

-- === Isolated tables (no foreign keys) ===

CREATE TABLE config_registry (
  config_key TEXT PRIMARY KEY,
  config_value TEXT NOT NULL
);

CREATE TABLE geo_countries (
  country_code CHAR(2) PRIMARY KEY,
  country_name TEXT NOT NULL
);

CREATE TABLE currency_codes (
  code CHAR(3) PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE audit_archive (
  archive_id BIGSERIAL PRIMARY KEY,
  payload JSONB NOT NULL
);

CREATE TABLE schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE feature_toggles (
  toggle_key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'
);

-- array noise on one isolated table
CREATE TABLE ticker_snapshots (
  snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  article_ids UUID[] NOT NULL DEFAULT '{}'
);
