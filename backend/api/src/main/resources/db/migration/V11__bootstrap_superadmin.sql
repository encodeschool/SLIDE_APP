ALTER TABLE user_roles
    DROP CONSTRAINT user_roles_role_check,
    ADD CONSTRAINT user_roles_role_check
        CHECK (role IN ('USER','SELLER','MODERATOR','ADMIN','SUPERADMIN'));

DO $bootstrap_superadmin$
DECLARE
    superadmin_email TEXT := lower(btrim('${bootstrapAdminEmail}'));
    superadmin_password_hash TEXT := convert_from(
        decode('${bootstrapAdminPasswordHashBase64}', 'base64'),
        'UTF8'
    );
    superadmin_id UUID;
BEGIN
    IF superadmin_email = '' AND superadmin_password_hash = '' THEN
        RETURN;
    END IF;

    IF superadmin_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
            OR superadmin_password_hash !~ '^\{bcrypt\}\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$' THEN
        RAISE EXCEPTION 'Bootstrap superadministrator configuration is invalid';
    END IF;

    SELECT id INTO superadmin_id
    FROM users
    WHERE email = superadmin_email
      AND email_verified = TRUE
      AND status = 'ACTIVE';

    IF superadmin_id IS NULL THEN
        RAISE EXCEPTION 'Bootstrap superadministrator must match the verified bootstrap administrator';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM user_roles WHERE user_id = superadmin_id AND role = 'ADMIN'
    ) THEN
        RAISE EXCEPTION 'Bootstrap superadministrator must already hold the ADMIN role';
    END IF;

    INSERT INTO user_roles (user_id, role)
    VALUES (superadmin_id, 'SUPERADMIN')
    ON CONFLICT (user_id, role) DO NOTHING;
END;
$bootstrap_superadmin$;
