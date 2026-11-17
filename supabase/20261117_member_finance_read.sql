-- Safe, additive read policies for approved members.
-- Does not drop or replace existing admin policies.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='financial_records'
      AND policyname='financial_records_approved_member_read'
  ) THEN
    CREATE POLICY financial_records_approved_member_read
      ON public.financial_records FOR SELECT TO authenticated
      USING (public.is_approved());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='excel_import_jobs'
      AND policyname='excel_import_jobs_approved_member_read'
  ) THEN
    CREATE POLICY excel_import_jobs_approved_member_read
      ON public.excel_import_jobs FOR SELECT TO authenticated
      USING (
        public.is_approved()
        AND EXISTS (
          SELECT 1 FROM public.documents d
          WHERE d.id = excel_import_jobs.document_id
            AND d.is_published = true
            AND d.visibility = 'members'::public.doc_visibility
        )
      );
  END IF;
END $$;
