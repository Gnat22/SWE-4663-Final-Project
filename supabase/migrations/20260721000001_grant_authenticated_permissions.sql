
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_requirements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_risks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.effort_logs TO authenticated;
GRANT SELECT, UPDATE ON public.accounts TO authenticated;

GRANT USAGE ON SEQUENCE public.projects_project_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.project_members_member_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.project_requirements_requirement_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.project_risks_risk_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.effort_logs_log_id_seq TO authenticated;

GRANT SELECT ON public.v_project_effort_summary TO authenticated;
