CREATE OR REPLACE FUNCTION public.audit_library_notice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.admin_audit_log(actor_id,action,entity,entity_id)
  VALUES(auth.uid(),
         CASE TG_OP WHEN 'INSERT' THEN 'create_notice' WHEN 'UPDATE' THEN 'update_notice' ELSE 'delete_notice' END,
         'library_notice',
         coalesce(NEW.id,OLD.id)::text);
  RETURN coalesce(NEW,OLD);
END $$;
DROP TRIGGER IF EXISTS audit_library_notice_insert ON public.library_notices;
DROP TRIGGER IF EXISTS audit_library_notice_update ON public.library_notices;
DROP TRIGGER IF EXISTS audit_library_notice_delete ON public.library_notices;
CREATE TRIGGER audit_library_notice_insert AFTER INSERT ON public.library_notices
FOR EACH ROW EXECUTE FUNCTION public.audit_library_notice();
CREATE TRIGGER audit_library_notice_update AFTER UPDATE ON public.library_notices
FOR EACH ROW EXECUTE FUNCTION public.audit_library_notice();
CREATE TRIGGER audit_library_notice_delete AFTER DELETE ON public.library_notices
FOR EACH ROW EXECUTE FUNCTION public.audit_library_notice();

CREATE OR REPLACE FUNCTION public.audit_waitlist_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    PERFORM cron.unschedule('library-due-reminders');
    PERFORM cron.schedule('library-due-reminders','15 8 * * *','SELECT public.create_due_reminders()');
  END IF;
END $$;
