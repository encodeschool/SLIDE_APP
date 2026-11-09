DO $bootstrap_admin$
DECLARE
    admin_email TEXT := lower(btrim('${bootstrapAdminEmail}'));
    admin_password_hash TEXT := convert_from(
        decode('${bootstrapAdminPasswordHashBase64}', 'base64'),
        'UTF8'
    );
    admin_id UUID;
BEGIN
    IF admin_email = '' AND admin_password_hash = '' THEN
        RETURN;
    END IF;

    IF admin_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
            OR admin_password_hash !~ '^\{bcrypt\}\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$' THEN
        RAISE EXCEPTION 'Bootstrap administrator configuration is invalid';
    END IF;

    INSERT INTO users (id, email, password_hash, display_name, locale, email_verified, status)
    VALUES (gen_random_uuid(), admin_email, admin_password_hash, 'Slideforge Administrator', 'en', TRUE, 'ACTIVE')
    ON CONFLICT (email) DO UPDATE
        SET email = users.email
        WHERE users.password_hash = EXCLUDED.password_hash
          AND users.email_verified = TRUE
          AND users.status = 'ACTIVE'
    RETURNING id INTO admin_id;

    IF admin_id IS NULL THEN
        RAISE EXCEPTION 'Bootstrap administrator email conflicts with an existing account';
    END IF;

    INSERT INTO user_roles (user_id, role)
    VALUES (admin_id, 'ADMIN')
    ON CONFLICT (user_id, role) DO NOTHING;
END;
$bootstrap_admin$;
