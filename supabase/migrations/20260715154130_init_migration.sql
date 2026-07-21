
CREATE TABLE accounts (
    account_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.accounts (account_id, role)
    VALUES (NEW.id, 'user');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE projects (
    project_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    owner_name VARCHAR(150) NOT NULL,
    project_name VARCHAR(150) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE project_members (
    member_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    member_name VARCHAR(150) NOT NULL,
    email VARCHAR(255),
    joined_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE project_risks (
    risk_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    risk_description TEXT NOT NULL,
    severity VARCHAR(50) DEFAULT 'Medium' CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    status VARCHAR(50) DEFAULT 'Open' CHECK (status IN ('Open', 'Monitoring', 'Mitigated', 'Closed')),
    mitigation_plan TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE project_requirements (
    requirement_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Functional', 'Non-Functional'))
);

CREATE TABLE effort_logs (
    log_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    requirement_id BIGINT NOT NULL REFERENCES project_requirements(requirement_id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    phase VARCHAR(50) NOT NULL CHECK (phase IN ('Requirements Analysis', 'Designing', 'Coding', 'Testing', 'Project Management')),
    hours_expended NUMERIC(5,2) NOT NULL CHECK (hours_expended >= 0)
);

CREATE OR REPLACE VIEW v_project_effort_summary AS
SELECT 
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
GROUP BY p.project_id, p.project_name, r.requirement_id, r.title, r.type;