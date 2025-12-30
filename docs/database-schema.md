# SPACEL Admin Panel - Database Schema

This document outlines the required database schema for the SPACEL admin panel integration with Supabase.

## Core Tables

### 1. Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  avatar_url TEXT,
  role VARCHAR(50) DEFAULT 'user', -- user, host, admin
  status VARCHAR(20) DEFAULT 'active', -- active, suspended, pending
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE
);
```

### 2. Spaces Table
```sql
CREATE TABLE spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  sub_category VARCHAR(100),
  capacity INTEGER,
  size_sqft INTEGER,
  price_per_hour DECIMAL(10,2),
  price_per_day DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'pending', -- pending, active, suspended, rejected
  location JSONB NOT NULL, -- {address, city, state, zipCode, country, coordinates}
  amenities TEXT[],
  images TEXT[],
  availability JSONB, -- availability schedule
  moderation_notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Bookings Table
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id VARCHAR(50) UNIQUE NOT NULL, -- Human-readable ID like BK001
  guest_id UUID REFERENCES users(id) ON DELETE CASCADE,
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  check_in TIMESTAMP WITH TIME ZONE NOT NULL,
  check_out TIMESTAMP WITH TIME ZONE NOT NULL,
  guests INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, completed, cancelled
  payment_status VARCHAR(20) DEFAULT 'pending', -- pending, paid, failed, refunded
  payment_method VARCHAR(50),
  transaction_id VARCHAR(100),
  subtotal DECIMAL(10,2),
  service_fee DECIMAL(10,2),
  taxes DECIMAL(10,2),
  total DECIMAL(10,2),
  special_requests TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. Space Categories Table
```sql
CREATE TABLE space_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  parent_id UUID REFERENCES space_categories(id),
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5. Content Management Tables

#### Announcements
```sql
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'draft', -- draft, published, archived
  audience VARCHAR(50) DEFAULT 'all_users', -- all_users, hosts_only, guests_only
  scheduled_date TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Documentation
```sql
CREATE TABLE documentation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100), -- user_guide, host_guide, guest_guide, policies, technical
  status VARCHAR(20) DEFAULT 'draft',
  seo_title VARCHAR(255),
  seo_description TEXT,
  tags TEXT[],
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Legal Pages
```sql
CREATE TABLE legal_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  page_type VARCHAR(100) NOT NULL, -- terms, privacy, cookies, etc.
  status VARCHAR(20) DEFAULT 'draft',
  version VARCHAR(20) DEFAULT '1.0',
  effective_date DATE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 6. Support System

#### Support Tickets
```sql
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100), -- technical, billing, general, etc.
  priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
  status VARCHAR(20) DEFAULT 'open', -- open, pending, in-progress, resolved, closed
  assigned_to UUID REFERENCES users(id),
  attachments JSONB, -- array of attachment URLs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);
```

#### Ticket Messages
```sql
CREATE TABLE ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id),
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE, -- internal admin notes
  attachments JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 7. Platform Settings
```sql
CREATE TABLE platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  setting_type VARCHAR(50) DEFAULT 'string', -- string, number, boolean, json
  description TEXT,
  category VARCHAR(100), -- general, payment, security, notifications
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 8. Admin Specific Tables

#### Admin Users
```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- super_admin, admin, moderator, support
  permissions JSONB, -- specific permissions array
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Moderation Actions
```sql
CREATE TABLE moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id UUID REFERENCES users(id),
  target_type VARCHAR(50) NOT NULL, -- space, user, content, booking
  target_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL, -- approve, reject, suspend, activate
  reason TEXT,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Audit Logs
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 9. Analytics Tables

#### Analytics Events
```sql
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES users(id),
  session_id VARCHAR(100),
  properties JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Storage Buckets

### 1. space-images
- Store space listing images
- Public access for display

### 2. user-avatars
- Store user profile pictures
- Public access for display

### 3. content-images
- Store images for announcements, documentation
- Public access for display

### 4. documents
- Store PDFs, documents for legal pages, etc.
- Public access for download

## Row Level Security (RLS) Policies

### Users Table
```sql
-- Users can only see their own data, admins can see all
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id OR 
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Only admins can insert/delete users
CREATE POLICY "Only admins can manage users" ON users
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));
```

### Spaces Table
```sql
-- Public can view active spaces
CREATE POLICY "Public can view active spaces" ON spaces
  FOR SELECT USING (status = 'active');

-- Hosts can manage their own spaces
CREATE POLICY "Hosts can manage own spaces" ON spaces
  FOR ALL USING (host_id = auth.uid());

-- Admins can manage all spaces
CREATE POLICY "Admins can manage all spaces" ON spaces
  FOR ALL USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));
```

## Indexes for Performance

```sql
-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);

-- Spaces table indexes
CREATE INDEX idx_spaces_host_id ON spaces(host_id);
CREATE INDEX idx_spaces_status ON spaces(status);
CREATE INDEX idx_spaces_category ON spaces(category);
CREATE INDEX idx_spaces_location ON spaces USING GIN(location);

-- Bookings table indexes
CREATE INDEX idx_bookings_guest_id ON bookings(guest_id);
CREATE INDEX idx_bookings_space_id ON bookings(space_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_dates ON bookings(check_in, check_out);

-- Support tickets indexes
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);
```

## Functions and Triggers

### Update Timestamps
```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spaces_updated_at BEFORE UPDATE ON spaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

This schema provides a comprehensive foundation for the SPACEL admin panel with proper relationships, security, and performance optimizations.
