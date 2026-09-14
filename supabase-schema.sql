-- הרץ את כל הקובץ הזה ב-Supabase: Project > SQL Editor > New query > Run

create extension if not exists "pgcrypto";

-- הגדרות אישיות (קטגוריות וצבעים) לכל משתמש
create table if not exists settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  categories jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

-- לקוחות / ספקים / קבלני משנה / עובדים
create table if not exists parties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text not null default 'client',
  phone text,
  id_number text,
  email text,
  address text,
  notes text,
  created_at timestamptz default now()
);

-- תנועות כספיות (הכנסות/הוצאות)
create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null,
  amount numeric not null,
  value_date date not null,
  actual_date date,
  payment_method text,
  check_number text,
  bank_branch text,
  ref_number text,
  party_id uuid references parties(id) on delete set null,
  party_name text,
  party_type text,
  category text,
  sub_category text,
  project text,
  status text,
  recurring text,
  installment_num int,
  installment_total int,
  notes text,
  tags text,
  created_at timestamptz default now()
);

-- תזכורות
create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  date date not null,
  time text,
  repeat text,
  snooze text,
  notes text,
  created_at timestamptz default now()
);

-- אבטחה: כל משתמש רואה ורק את הנתונים שלו
alter table settings enable row level security;
alter table parties enable row level security;
alter table entries enable row level security;
alter table reminders enable row level security;

create policy "own settings" on settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own parties" on parties for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own entries" on entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own reminders" on reminders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
