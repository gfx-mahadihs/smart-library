ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS student_id text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_student_id_format'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_student_id_format
      CHECK (student_id IS NULL OR student_id ~ '^[A-Za-z0-9-]+$');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_student_id_unique'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_student_id_unique UNIQUE (student_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    university_id,
    student_id,
    department,
    semester
  )
  VALUES (
    new.id,
    coalesce(left(new.raw_user_meta_data->>'full_name', 120), left(new.raw_user_meta_data->>'name', 120), ''),
    new.email,
    left(nullif(new.raw_user_meta_data->>'university_id', ''), 40),
    left(nullif(new.raw_user_meta_data->>'student_id', ''), 40),
    left(nullif(new.raw_user_meta_data->>'department', ''), 80),
    left(nullif(new.raw_user_meta_data->>'semester', ''), 20)
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    email = excluded.email,
    student_id = coalesce(excluded.student_id, public.profiles.student_id);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'student')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.notifications (user_id, type, title, message)
  VALUES (
    new.id,
    'announcement',
    'Welcome to গ্রন্থাগার',
    'Explore the catalogue and reserve your first book.'
  );
  RETURN new;
END $$;
