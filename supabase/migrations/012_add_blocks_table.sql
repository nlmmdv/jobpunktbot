-- Таблица блокировок пользователей
create table user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocked_user_id uuid not null references profiles(id) on delete cascade,
  blocked_by_admin_id uuid not null references profiles(id) on delete cascade,
  reason text not null,
  duration_minutes integer not null, -- 0 = навсегда
  blocked_at timestamp with time zone default now(),
  unblock_at timestamp with time zone,
  status varchar(20) default 'active' check (status in ('active', 'expired', 'manually_unblocked')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Таблица блокировок владельцев
create table owner_blocks (
  id uuid primary key default gen_random_uuid(),
  blocked_owner_id uuid not null references owner_profiles(id) on delete cascade,
  blocked_by_admin_id uuid not null references profiles(id) on delete cascade,
  reason text not null,
  duration_minutes integer not null,
  blocked_at timestamp with time zone default now(),
  unblock_at timestamp with time zone,
  status varchar(20) default 'active' check (status in ('active', 'expired', 'manually_unblocked')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Таблица блокировок компаний
create table company_blocks (
  id uuid primary key default gen_random_uuid(),
  blocked_company_id uuid not null references owner_profiles(id) on delete cascade,
  blocked_by_admin_id uuid not null references profiles(id) on delete cascade,
  reason text not null,
  duration_minutes integer not null,
  blocked_at timestamp with time zone default now(),
  unblock_at timestamp with time zone,
  status varchar(20) default 'active' check (status in ('active', 'expired', 'manually_unblocked')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Таблица предупреждений пользователей
create table user_warnings (
  id uuid primary key default gen_random_uuid(),
  warned_user_id uuid not null references profiles(id) on delete cascade,
  warned_by_admin_id uuid not null references profiles(id) on delete cascade,
  reason text not null,
  severity varchar(20) not null check (severity in ('mild', 'moderate', 'severe')),
  created_at timestamp with time zone default now()
);

-- Таблица предупреждений владельцев
create table owner_warnings (
  id uuid primary key default gen_random_uuid(),
  warned_owner_id uuid not null references owner_profiles(id) on delete cascade,
  warned_by_admin_id uuid not null references profiles(id) on delete cascade,
  reason text not null,
  severity varchar(20) not null check (severity in ('mild', 'moderate', 'severe')),
  created_at timestamp with time zone default now()
);

-- Таблица предупреждений компаний
create table company_warnings (
  id uuid primary key default gen_random_uuid(),
  warned_company_id uuid not null references owner_profiles(id) on delete cascade,
  warned_by_admin_id uuid not null references profiles(id) on delete cascade,
  reason text not null,
  severity varchar(20) not null check (severity in ('mild', 'moderate', 'severe')),
  created_at timestamp with time zone default now()
);

-- Индексы для производительности
create index user_blocks_blocked_user_idx on user_blocks(blocked_user_id);
create index user_blocks_status_idx on user_blocks(status);
create index user_blocks_unblock_at_idx on user_blocks(unblock_at);
create index owner_blocks_blocked_owner_idx on owner_blocks(blocked_owner_id);
create index owner_blocks_status_idx on owner_blocks(status);
create index company_blocks_blocked_company_idx on company_blocks(blocked_company_id);
create index company_blocks_status_idx on company_blocks(status);
create index user_warnings_warned_user_idx on user_warnings(warned_user_id);
create index owner_warnings_warned_owner_idx on owner_warnings(warned_owner_id);
create index company_warnings_warned_company_idx on company_warnings(warned_company_id);

-- RLS Policies
alter table user_blocks enable row level security;
alter table owner_blocks enable row level security;
alter table company_blocks enable row level security;
alter table user_warnings enable row level security;
alter table owner_warnings enable row level security;
alter table company_warnings enable row level security;

-- Пользователи видят свои блокировки
create policy "Users can view their own blocks"
  on user_blocks for select
  using (auth.uid() = blocked_user_id or auth.uid() = blocked_by_admin_id);

-- Администраторы видят все блокировки
create policy "Admins can view all blocks"
  on user_blocks for select
  using (true);

-- Администраторы могут создавать блокировки
create policy "Admins can create blocks"
  on user_blocks for insert
  with check (auth.uid() = blocked_by_admin_id);

-- Администраторы могут обновлять статус блокировки
create policy "Admins can update blocks"
  on user_blocks for update
  using (auth.uid() = blocked_by_admin_id);

-- Аналогичные политики для company_blocks
create policy "Admins can view all company blocks"
  on company_blocks for select
  using (true);

create policy "Admins can create company blocks"
  on company_blocks for insert
  with check (auth.uid() = blocked_by_admin_id);

create policy "Admins can update company blocks"
  on company_blocks for update
  using (auth.uid() = blocked_by_admin_id);

-- Политики для предупреждений пользователей
create policy "Users can view their own warnings"
  on user_warnings for select
  using (auth.uid() = warned_user_id or auth.uid() = warned_by_admin_id);

create policy "Admins can view all user warnings"
  on user_warnings for select
  using (true);

create policy "Admins can create user warnings"
  on user_warnings for insert
  with check (auth.uid() = warned_by_admin_id);

-- Политики для блокировок владельцев
create policy "Admins can view all owner blocks"
  on owner_blocks for select
  using (true);

create policy "Admins can create owner blocks"
  on owner_blocks for insert
  with check (auth.uid() = blocked_by_admin_id);

create policy "Admins can update owner blocks"
  on owner_blocks for update
  using (auth.uid() = blocked_by_admin_id);

-- Политики для предупреждений владельцев
create policy "Admins can view all owner warnings"
  on owner_warnings for select
  using (true);

create policy "Admins can create owner warnings"
  on owner_warnings for insert
  with check (auth.uid() = warned_by_admin_id);

-- Политики для предупреждений компаний
create policy "Admins can view all company warnings"
  on company_warnings for select
  using (true);

create policy "Admins can create company warnings"
  on company_warnings for insert
  with check (auth.uid() = warned_by_admin_id);
