CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS books_title_trgm_idx ON public.books USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS books_isbn_trgm_idx ON public.books USING gin (isbn gin_trgm_ops);
CREATE INDEX IF NOT EXISTS authors_name_trgm_idx ON public.authors USING gin (name gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.staff_return(_barcode text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _br record;
  _rate numeric;
  _cap numeric;
  _days integer;
  _amt numeric:=0;
  _next record;
  _hold_hours integer;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
  SELECT br.*, b.title,c.book_id INTO _br
  FROM public.borrow_records br
  JOIN public.book_copies c ON c.id=br.copy_id
  JOIN public.books b ON b.id=c.book_id
  WHERE c.barcode=trim(_barcode) AND br.status='active'
  FOR UPDATE OF br;
  IF _br.id IS NULL THEN RAISE EXCEPTION 'No active loan for that barcode.'; END IF;
  UPDATE public.borrow_records SET status='returned', returned_at=now() WHERE id=_br.id;
  UPDATE public.book_copies SET status='available' WHERE id=_br.copy_id;
  SELECT fine_per_day,fine_cap_per_loan,reservation_hold_hours
  INTO _rate,_cap,_hold_hours FROM public.library_settings WHERE id=1;
  _days:=greatest(0,ceil(extract(epoch FROM (now()-_br.due_at))/86400)::int);
  IF _days>0 AND _rate>0 THEN
    _amt:=least(_days*_rate,coalesce(_cap,100));
    INSERT INTO public.fines(user_id,borrow_record_id,overdue_days,amount)
    VALUES (_br.user_id,_br.id,_days,_amt);
  END IF;
  SELECT * INTO _next
  FROM public.waitlist w
  WHERE w.book_id=_br.book_id AND w.status='waiting'
  ORDER BY w.position,w.created_at LIMIT 1
  FOR UPDATE;
  IF _next.id IS NOT NULL THEN
    UPDATE public.waitlist
    SET status='notified', hold_expires_at=now()+make_interval(hours=>coalesce(_hold_hours,48))
    WHERE id=_next.id;
    INSERT INTO public.notifications(user_id,type,title,message,link)
    VALUES (_next.user_id,'availability','Book Available',
      format('"%s" is available. You have %s hours to reserve it.',_br.title,coalesce(_hold_hours,48)),
      '/my-library');
  END IF;
  IF _amt>0 THEN
    INSERT INTO public.notifications(user_id,type,title,message,link)
    VALUES (_br.user_id,'overdue','Overdue fine issued',
      format('"%s" was returned %s day(s) late.',_br.title,_days),'/fines');
  END IF;
  RETURN json_build_object('overdue_days',_days,'fine',_amt);
END $$;
REVOKE EXECUTE ON FUNCTION public.staff_return(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.staff_return(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_reports(_from timestamptz DEFAULT (now()-interval '30 days'), _to timestamptz DEFAULT now())
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) AND NOT public.has_role(auth.uid(),'librarian') THEN
    RAISE EXCEPTION 'Staff access required' USING ERRCODE='42501';
  END IF;
  RETURN jsonb_build_object(
    'most_borrowed',(
      SELECT coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) FROM (
        SELECT b.title,count(*) borrow_count
        FROM public.borrow_records br
        JOIN public.book_copies bc ON bc.id=br.copy_id
        JOIN public.books b ON b.id=bc.book_id
        WHERE br.borrowed_at BETWEEN _from AND _to
        GROUP BY b.id,b.title ORDER BY count(*) DESC LIMIT 20
      ) x
    ),
    'by_department',(
      SELECT coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) FROM (
        SELECT coalesce(p.department,'Unspecified') department,count(*) borrow_count
        FROM public.borrow_records br
        JOIN public.profiles p ON p.id=br.user_id
        WHERE br.borrowed_at BETWEEN _from AND _to
        GROUP BY p.department ORDER BY count(*) DESC
      ) x
    ),
    'overdue',(
      SELECT coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) FROM (
        SELECT br.id,b.title,p.full_name,p.email,br.due_at
        FROM public.borrow_records br
        JOIN public.book_copies bc ON bc.id=br.copy_id
        JOIN public.books b ON b.id=bc.book_id
        JOIN public.profiles p ON p.id=br.user_id
        WHERE br.status='active' AND br.due_at<_to
        ORDER BY br.due_at LIMIT 100
      ) x
    ),
    'fines_collected',(
      SELECT coalesce(sum(amount),0)
      FROM public.fines
      WHERE status='paid' AND paid_at BETWEEN _from AND _to
    )
  );
END $$;
REVOKE ALL ON FUNCTION public.admin_reports(timestamptz,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reports(timestamptz,timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.hide_book_review(_review_id uuid,_hidden boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;
  UPDATE public.book_reviews SET hidden=_hidden, updated_at=now() WHERE id=_review_id;
  INSERT INTO public.admin_audit_log(actor_id,action,entity,entity_id)
  VALUES(auth.uid(),CASE WHEN _hidden THEN 'hide_review' ELSE 'unhide_review' END,'book_review',_review_id::text);
END $$;
REVOKE ALL ON FUNCTION public.hide_book_review(uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hide_book_review(uuid,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_waitlist(_book_id uuid)
RETURNS TABLE(id uuid,position integer,status text,hold_expires_at timestamptz) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT w.id,w.position,w.status,w.hold_expires_at
  FROM public.waitlist w
  WHERE w.book_id=_book_id AND w.user_id=auth.uid()
$$;
REVOKE ALL ON FUNCTION public.list_waitlist(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_waitlist(uuid) TO authenticated;
