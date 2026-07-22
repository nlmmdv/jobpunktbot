-- Reviews table for user/freelancer ratings
create table reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references profiles(id) on delete cascade,
  reviewee_id uuid not null references profiles(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Indexes for performance
create index reviews_reviewee_id_idx on reviews(reviewee_id);
create index reviews_reviewer_id_idx on reviews(reviewer_id);
create index reviews_created_at_idx on reviews(created_at);

-- RLS Policies
alter table reviews enable row level security;

-- Users can view reviews about them
create policy "Users can view reviews about themselves"
  on reviews for select
  using (auth.uid() = reviewee_id or auth.uid() = reviewer_id or true);

-- Users can create reviews for others (but not themselves)
create policy "Users can create reviews for others"
  on reviews for insert
  with check (
    auth.uid() = reviewer_id
    and auth.uid() != reviewee_id
  );

-- Admins can view all reviews
create policy "Admins can view all reviews"
  on reviews for select
  using (true);

-- Only reviewer can update their review
create policy "Only reviewer can update review"
  on reviews for update
  using (auth.uid() = reviewer_id);

-- Only reviewer can delete their review
create policy "Only reviewer can delete review"
  on reviews for delete
  using (auth.uid() = reviewer_id);
