
CREATE POLICY "Users can delete their own account"
    ON accounts FOR DELETE
    USING (auth.uid() = account_id);
