
DROP VIEW IF EXISTS v_project_effort_summary;

CREATE VIEW v_project_effort_summary AS
SELECT
    p.project_id,
    p.account_id,
    p.project_name,
    r.requirement_id,
    r.title AS requirement_title,
    r.type AS requirement_type,
    COALESCE(SUM(CASE WHEN e.phase = 'Requirements Analysis' THEN e.hours_expended ELSE 0 END), 0) AS total_requirements_analysis_hours,
    COALESCE(SUM(CASE WHEN e.phase = 'Designing' THEN e.hours_expended ELSE 0 END), 0) AS total_designing_hours,
    COALESCE(SUM(CASE WHEN e.phase = 'Coding' THEN e.hours_expended ELSE 0 END), 0) AS total_coding_hours,
    COALESCE(SUM(CASE WHEN e.phase = 'Testing' THEN e.hours_expended ELSE 0 END), 0) AS total_testing_hours,
    COALESCE(SUM(CASE WHEN e.phase = 'Project Management' THEN e.hours_expended ELSE 0 END), 0) AS total_project_management_hours,
    COALESCE(SUM(e.hours_expended), 0) AS total_overall_hours
FROM project_requirements r
JOIN projects p ON r.project_id = p.project_id
LEFT JOIN effort_logs e ON r.requirement_id = e.requirement_id
GROUP BY p.project_id, p.account_id, p.project_name, r.requirement_id, r.title, r.type;

ALTER VIEW v_project_effort_summary SET (security_invoker = on);

GRANT SELECT ON public.v_project_effort_summary TO authenticated;
