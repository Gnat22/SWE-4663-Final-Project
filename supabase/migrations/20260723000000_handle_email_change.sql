
CREATE OR REPLACE FUNCTION public.handle_email_change()
RETURNS TRIGGER AS $$
DECLARE
    old_account_exists BOOLEAN;
    orphaned_account_id UUID;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.accounts WHERE account_id = NEW.id
    ) INTO old_account_exists;

    IF NOT old_account_exists THEN
        SELECT account_id INTO orphaned_account_id
        FROM public.accounts
        WHERE account_id NOT IN (SELECT id FROM auth.users)
        LIMIT 1;

        IF orphaned_account_id IS NOT NULL THEN
            UPDATE public.accounts
            SET account_id = NEW.id
            WHERE account_id = orphaned_account_id;
        ELSE
            INSERT INTO public.accounts (account_id, role)
            VALUES (NEW.id, 'user');
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created_or_updated
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_email_change();
