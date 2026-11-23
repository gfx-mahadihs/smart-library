ALTER TABLE public.library_settings
  ADD COLUMN IF NOT EXISTS max_renewals integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS renew_days integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS reservation_hold_hours integer NOT NULL DEFAULT 48,
  ADD COLUMN IF NOT EXISTS fine_cap_per_loan numeric NOT NULL DEFAULT 100;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS text_size text NOT NULL DEFAULT 'normal'
    CHECK (text_size IN ('small', 'normal', 'large'));

CREATE TABLE IF NOT EXISTS public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 1,
  hold_expires_at timestamptz,
  status text NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'notified', 'expired', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (book_id, user_id)
);
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage own waitlist" ON public.waitlist
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "staff read waitlist" ON public.waitlist
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'librarian'));
REVOKE ALL ON public.waitlist FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waitlist TO authenticated;

CREATE TABLE IF NOT EXISTS public.book_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text NOT NULL DEFAULT '',
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (book_id, user_id)
);
ALTER TABLE public.book_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signed in read visible reviews" ON public.book_reviews
  FOR SELECT TO authenticated
  USING (NOT hidden OR user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "members create own review" ON public.book_reviews
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "members update own review" ON public.book_reviews
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "members delete own review" ON public.book_reviews
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "admin hide review" ON public.book_reviews
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
REVOKE ALL ON public.book_reviews FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_reviews TO authenticated;

CREATE TABLE IF NOT EXISTS public.reading_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  public_slug text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reading_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manage reading lists" ON public.reading_lists
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "public shared reading list" ON public.reading_lists
  FOR SELECT TO anon
  USING (public_slug IS NOT NULL);
REVOKE ALL ON public.reading_lists FROM anon;
GRANT SELECT ON public.reading_lists TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_lists TO authenticated;

CREATE TABLE IF NOT EXISTS public.reading_list_items (
  list_id uuid NOT NULL REFERENCES public.reading_lists(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (list_id, book_id)
);
ALTER TABLE public.reading_list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manage reading list items" ON public.reading_list_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.reading_lists l WHERE l.id = list_id AND l.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.reading_lists l WHERE l.id = list_id AND l.user_id = auth.uid()));
CREATE POLICY "public shared reading list items" ON public.reading_list_items
  FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.reading_lists l WHERE l.id = list_id AND l.public_slug IS NOT NULL));
REVOKE ALL ON public.reading_list_items FROM anon;
GRANT SELECT ON public.reading_list_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_list_items TO authenticated;

CREATE TABLE IF NOT EXISTS public.library_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  event_at timestamptz,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.library_notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "everyone reads notices" ON public.library_notices
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage notices" ON public.library_notices
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
GRANT SELECT ON public.library_notices TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.library_notices TO authenticated;

ALTER TABLE public.borrow_records
  ADD COLUMN IF NOT EXISTS renewal_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.fines
  ADD COLUMN IF NOT EXISTS waiver_reason text,
  ADD COLUMN IF NOT EXISTS waived_by uuid,
  ADD COLUMN IF NOT EXISTS waived_at timestamptz;

CREATE OR REPLACE FUNCTION public.renew_loan(_borrow_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  r public.borrow_records%ROWTYPE;
  s public.library_settings%ROWTYPE;
  waiting integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  SELECT * INTO r FROM public.borrow_records WHERE id=_borrow_id AND user_id=auth.uid() FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Loan not found' USING ERRCODE='P0002'; END IF;
  IF r.status <> 'active' OR r.returned_at IS NOT NULL THEN RAISE EXCEPTION 'Only active loans can be renewed'; END IF;
  IF r.due_at::date < current_date THEN RAISE EXCEPTION 'Overdue loans cannot be renewed'; END IF;
  SELECT * INTO s FROM public.library_settings WHERE id=1;
  IF r.renewal_count >= s.max_renewals THEN RAISE EXCEPTION 'Renewal limit reached'; END IF;
  SELECT count(*) INTO waiting
  FROM public.reservations x
  JOIN public.book_copies c ON c.id=r.copy_id
  WHERE x.book_id=c.book_id AND x.user_id<>auth.uid()
    AND x.status IN ('pending','approved','ready_for_pickup');
  IF waiting>0 THEN RAISE EXCEPTION 'This book has a pending reservation by another member'; END IF;
  UPDATE public.borrow_records
  SET due_at=r.due_at + make_interval(days=>s.renew_days),
      renewal_count=renewal_count+1
  WHERE id=r.id
  RETURNING * INTO r;
  INSERT INTO public.admin_audit_log(actor_id,action,entity,entity_id)
  VALUES (auth.uid(),'renew','borrow_record',r.id::text);
  RETURN jsonb_build_object('due_at',r.due_at,'renewal_count',r.renewal_count);
END $$;
REVOKE ALL ON FUNCTION public.renew_loan(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.renew_loan(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.join_waitlist(_book_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  pos integer;
  row public.waitlist%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.books WHERE id=_book_id) THEN RAISE EXCEPTION 'Book not found'; END IF;
  INSERT INTO public.waitlist(book_id,user_id,position,status)
  VALUES (_book_id,auth.uid(),COALESCE((SELECT max(position)+1 FROM public.waitlist WHERE book_id=_book_id AND status='waiting'),1),'waiting')
  ON CONFLICT (book_id,user_id) DO UPDATE SET status='waiting', created_at=now()
  RETURNING * INTO row;
  SELECT position INTO pos FROM public.waitlist WHERE id=row.id;
  RETURN jsonb_build_object('position',pos,'status',row.status);
END $$;
REVOKE ALL ON FUNCTION public.join_waitlist(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_waitlist(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.leave_waitlist(_book_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.waitlist SET status='cancelled'
  WHERE book_id=_book_id AND user_id=auth.uid();
  WITH ranked AS (
    SELECT id,row_number() OVER (ORDER BY created_at,id) pos
    FROM public.waitlist WHERE book_id=_book_id AND status='waiting'
  )
  UPDATE public.waitlist w SET position=r.pos FROM ranked r WHERE w.id=r.id;
END $$;
REVOKE ALL ON FUNCTION public.leave_waitlist(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leave_waitlist(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.recommend_books(_limit integer DEFAULT 10)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  WITH member_categories AS (
    SELECT b.category_id, count(*) hits
    FROM public.borrow_records br
    JOIN public.book_copies bc ON bc.id=br.copy_id
    JOIN public.books b ON b.id=bc.book_id
    WHERE br.user_id=auth.uid()
    GROUP BY b.category_id
  ),
  ranked AS (
    SELECT b.id,
           coalesce(mc.hits,0)*3+b.popularity
           + case when b.department=(SELECT department FROM public.profiles WHERE id=auth.uid()) then 5 else 0 end score
    FROM public.books b
    LEFT JOIN member_categories mc ON mc.category_id=b.category_id
  )
  SELECT id FROM ranked
  WHERE id NOT IN (SELECT bc.book_id FROM public.borrow_records br JOIN public.book_copies bc ON bc.id=br.copy_id WHERE br.user_id=auth.uid())
  ORDER BY score DESC
  LIMIT greatest(1,least(coalesce(_limit,10),50))
$$;
REVOKE ALL ON FUNCTION public.recommend_books(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recommend_books(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.save_book_review(_book_id uuid,_rating integer,_body text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF _rating NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'Rating must be between 1 and 5'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.borrow_records br
    JOIN public.book_copies bc ON bc.id=br.copy_id
    WHERE br.user_id=auth.uid() AND bc.book_id=_book_id
  ) THEN RAISE EXCEPTION 'Only members who borrowed this book can review it'; END IF;
  INSERT INTO public.book_reviews(book_id,user_id,rating,body)
  VALUES (_book_id,auth.uid(),_rating,left(coalesce(_body,''),5000))
  ON CONFLICT(book_id,user_id) DO UPDATE SET rating=excluded.rating,body=excluded.body,updated_at=now()
  RETURNING id INTO result_id;
  UPDATE public.books b SET rating=(
    SELECT round(avg(r.rating)::numeric,1) FROM public.book_reviews r
    WHERE r.book_id=_book_id AND r.hidden=false
  ) WHERE b.id=_book_id;
  RETURN result_id;
END $$;
REVOKE ALL ON FUNCTION public.save_book_review(uuid,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_book_review(uuid,integer,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_book_review(_book_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  DELETE FROM public.book_reviews WHERE book_id=_book_id AND user_id=auth.uid();
END $$;
REVOKE ALL ON FUNCTION public.delete_book_review(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_book_review(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.staff_waive_fine(_fine_id uuid,_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) AND NOT public.has_role(auth.uid(),'librarian') THEN
    RAISE EXCEPTION 'Staff access required' USING ERRCODE='42501';
  END IF;
  IF btrim(coalesce(_reason,''))='' THEN RAISE EXCEPTION 'Waiver reason is required'; END IF;
  UPDATE public.fines SET status='waived',waiver_reason=left(btrim(_reason),500),waived_by=auth.uid(),waived_at=now()
  WHERE id=_fine_id;
END $$;
REVOKE ALL ON FUNCTION public.staff_waive_fine(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.staff_waive_fine(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.member_reading_stats()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT jsonb_build_object(
    'books_read',(SELECT count(*) FROM public.borrow_records br WHERE br.user_id=auth.uid() AND br.status='returned'),
    'reading_streak',(
      SELECT count(DISTINCT br.returned_at::date)
      FROM public.borrow_records br
      WHERE br.user_id=auth.uid() AND br.status='returned'
        AND br.returned_at >= now()-interval '365 days'
    ),
    'badges',(
      SELECT jsonb_build_array(
        jsonb_build_object('key','first_borrow','earned',exists(select 1 from public.borrow_records br where br.user_id=auth.uid())),
        jsonb_build_object('key','five_books','earned',(select count(*) from public.borrow_records br where br.user_id=auth.uid() and br.status='returned')>=5),
        jsonb_build_object('key','on_time','earned',exists(select 1 from public.borrow_records br where br.user_id=auth.uid() and br.status='returned' and br.returned_at<=br.due_at))
      )
    )
  )
$$;
REVOKE ALL ON FUNCTION public.member_reading_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.member_reading_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.create_due_reminders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE inserted_count integer:=0;
BEGIN
  INSERT INTO public.notifications(user_id,type,title,message,link,created_at)
  SELECT br.user_id,
         CASE WHEN br.due_at::date < current_date THEN 'overdue'
              WHEN br.due_at::date = current_date+1 THEN 'due_soon'
              ELSE 'due_soon' END,
         CASE WHEN br.due_at::date < current_date THEN 'Book overdue'
              ELSE 'Book due soon' END,
         'Your loan is due on '||to_char(br.due_at,'Mon DD, YYYY')||'.',
         '/due-dates',
         now()
  FROM public.borrow_records br
  WHERE br.status='active' AND br.returned_at IS NULL
    AND (
      br.due_at::date=current_date+1
      OR br.due_at::date=current_date+3
      OR br.due_at::date=current_date-1
      OR br.due_at::date<current_date
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id=br.user_id AND n.link='/due-dates'
        AND n.created_at::date=current_date
    );
  GET DIAGNOSTICS inserted_count=ROW_COUNT;
  RETURN inserted_count;
END $$;
REVOKE ALL ON FUNCTION public.create_due_reminders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_due_reminders() TO authenticated;
