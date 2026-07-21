-- Enable Row Level Security on all tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE effort_logs ENABLE ROW LEVEL SECURITY;

-- ACCOUNTS POLICIES
-- Users can read their own account
CREATE POLICY "Users can view their own account"
    ON accounts FOR SELECT
    USING (auth.uid() = account_id);

-- Users can update their own account
CREATE POLICY "Users can update their own account"
    ON accounts FOR UPDATE
    USING (auth.uid() = account_id);

-- PROJECTS POLICIES
-- Users can view their own projects
CREATE POLICY "Users can view their own projects"
    ON projects FOR SELECT
    USING (auth.uid() = account_id);

-- Users can insert their own projects
CREATE POLICY "Users can insert their own projects"
    ON projects FOR INSERT
    WITH CHECK (auth.uid() = account_id);

-- Users can update their own projects
CREATE POLICY "Users can update their own projects"
    ON projects FOR UPDATE
    USING (auth.uid() = account_id);

-- Users can delete their own projects
CREATE POLICY "Users can delete their own projects"
    ON projects FOR DELETE
    USING (auth.uid() = account_id);

-- PROJECT MEMBERS POLICIES
-- Users can view members of their projects
CREATE POLICY "Users can view members of their projects"
    ON project_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.project_id = project_members.project_id
            AND projects.account_id = auth.uid()
        )
    );

-- Users can insert members into their projects
CREATE POLICY "Users can insert members into their projects"
    ON project_members FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.project_id = project_members.project_id
            AND projects.account_id = auth.uid()
        )
    );

-- Users can update members in their projects
CREATE POLICY "Users can update members in their projects"
    ON project_members FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.project_id = project_members.project_id
            AND projects.account_id = auth.uid()
        )
    );

-- Users can delete members from their projects
CREATE POLICY "Users can delete members from their projects"
    ON project_members FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.project_id = project_members.project_id
            AND projects.account_id = auth.uid()
        )
    );

-- PROJECT REQUIREMENTS POLICIES
-- Users can view requirements of their projects
CREATE POLICY "Users can view requirements of their projects"
    ON project_requirements FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.project_id = project_requirements.project_id
            AND projects.account_id = auth.uid()
        )
    );

-- Users can insert requirements into their projects
CREATE POLICY "Users can insert requirements into their projects"
    ON project_requirements FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.project_id = project_requirements.project_id
            AND projects.account_id = auth.uid()
        )
    );

-- Users can update requirements in their projects
CREATE POLICY "Users can update requirements in their projects"
    ON project_requirements FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.project_id = project_requirements.project_id
            AND projects.account_id = auth.uid()
        )
    );

-- Users can delete requirements from their projects
CREATE POLICY "Users can delete requirements from their projects"
    ON project_requirements FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.project_id = project_requirements.project_id
            AND projects.account_id = auth.uid()
        )
    );

-- PROJECT RISKS POLICIES
-- Users can view risks of their projects
CREATE POLICY "Users can view risks of their projects"
    ON project_risks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.project_id = project_risks.project_id
            AND projects.account_id = auth.uid()
        )
    );

-- Users can insert risks into their projects
CREATE POLICY "Users can insert risks into their projects"
    ON project_risks FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.project_id = project_risks.project_id
            AND projects.account_id = auth.uid()
        )
    );

-- Users can update risks in their projects
CREATE POLICY "Users can update risks in their projects"
    ON project_risks FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.project_id = project_risks.project_id
            AND projects.account_id = auth.uid()
        )
    );

-- Users can delete risks from their projects
CREATE POLICY "Users can delete risks from their projects"
    ON project_risks FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.project_id = project_risks.project_id
            AND projects.account_id = auth.uid()
        )
    );

-- EFFORT LOGS POLICIES
-- Users can view effort logs for their project requirements
CREATE POLICY "Users can view effort logs for their requirements"
    ON effort_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM project_requirements pr
            JOIN projects p ON pr.project_id = p.project_id
            WHERE pr.requirement_id = effort_logs.requirement_id
            AND p.account_id = auth.uid()
        )
    );

-- Users can insert effort logs for their project requirements
CREATE POLICY "Users can insert effort logs for their requirements"
    ON effort_logs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM project_requirements pr
            JOIN projects p ON pr.project_id = p.project_id
            WHERE pr.requirement_id = effort_logs.requirement_id
            AND p.account_id = auth.uid()
        )
    );

-- Users can update their own effort logs
CREATE POLICY "Users can update their own effort logs"
    ON effort_logs FOR UPDATE
    USING (
        auth.uid() = account_id
        AND EXISTS (
            SELECT 1 FROM project_requirements pr
            JOIN projects p ON pr.project_id = p.project_id
            WHERE pr.requirement_id = effort_logs.requirement_id
            AND p.account_id = auth.uid()
        )
    );

-- Users can delete their own effort logs
CREATE POLICY "Users can delete their own effort logs"
    ON effort_logs FOR DELETE
    USING (
        auth.uid() = account_id
        AND EXISTS (
            SELECT 1 FROM project_requirements pr
            JOIN projects p ON pr.project_id = p.project_id
            WHERE pr.requirement_id = effort_logs.requirement_id
            AND p.account_id = auth.uid()
        )
    );
