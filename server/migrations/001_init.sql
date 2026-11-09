-- Accounts hold no personal data: a random id and a generated display name.
CREATE TABLE users (
  id           BYTEA PRIMARY KEY,          -- 32 random bytes, also the passkey user handle
  display_name TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Passkeys. data is the full verified credential record (public key, sign count, flags).
CREATE TABLE credentials (
  id           BYTEA PRIMARY KEY,
  user_id      BYTEA NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data         JSONB NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);
CREATE INDEX credentials_user_idx ON credentials(user_id);

-- Sessions store only SHA-256 of the cookie token.
CREATE TABLE sessions (
  token_hash   BYTEA PRIMARY KEY,
  user_id      BYTEA NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL
);
CREATE INDEX sessions_user_idx ON sessions(user_id);

-- Passkey ceremony state between begin and finish. Single use, short-lived.
CREATE TABLE challenges (
  id_hash      BYTEA PRIMARY KEY,
  kind         TEXT NOT NULL CHECK (kind IN ('register', 'login', 'add')),
  user_id      BYTEA,
  display_name TEXT,
  data         JSONB NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL
);

-- Recovery codes store only SHA-256 of each 80-bit code.
CREATE TABLE recovery_codes (
  code_hash BYTEA PRIMARY KEY,
  user_id   BYTEA NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  used_at   TIMESTAMPTZ
);
CREATE INDEX recovery_codes_user_idx ON recovery_codes(user_id);

-- Cloud save: best star count per place.
CREATE TABLE progress (
  user_id    BYTEA PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  stars      JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
