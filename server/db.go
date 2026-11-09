package main

import (
	"context"
	"embed"
	"errors"
	"fmt"
	"io/fs"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed migrations/*.sql
var migrationFS embed.FS

func openDB(ctx context.Context, url string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(url)
	if err != nil {
		return nil, errors.New("DATABASE_URL is not valid") // never echo the URL: it holds the password
	}
	cfg.MaxConns = 10
	cfg.MaxConnIdleTime = 5 * time.Minute
	cfg.ConnConfig.RuntimeParams["application_name"] = "app"
	cfg.ConnConfig.RuntimeParams["statement_timeout"] = "5000"
	ctx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, errors.New("database unreachable")
	}
	return pool, nil
}

// migrate applies embedded migrations in order, once, inside one transaction.
// The advisory lock stops two instances from migrating at the same time.
func migrate(ctx context.Context, db *pgxpool.Pool) error {
	tx, err := db.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(727274)`); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `CREATE TABLE IF NOT EXISTS schema_version (version INT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`); err != nil {
		return err
	}
	var current int
	if err := tx.QueryRow(ctx, `SELECT COALESCE(MAX(version), 0) FROM schema_version`).Scan(&current); err != nil {
		return err
	}
	names, err := fs.Glob(migrationFS, "migrations/*.sql")
	if err != nil {
		return err
	}
	sort.Strings(names)
	for _, n := range names {
		v, err := strconv.Atoi(strings.SplitN(strings.TrimPrefix(n, "migrations/"), "_", 2)[0])
		if err != nil {
			return fmt.Errorf("bad migration name %s", n)
		}
		if v <= current {
			continue
		}
		sql, err := migrationFS.ReadFile(n)
		if err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, string(sql)); err != nil {
			return fmt.Errorf("migration %d: %w", v, err)
		}
		if _, err := tx.Exec(ctx, `INSERT INTO schema_version (version) VALUES ($1)`, v); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

// expire deletes finished ceremonies and dead sessions.
func expire(ctx context.Context, db *pgxpool.Pool) error {
	if _, err := db.Exec(ctx, `DELETE FROM challenges WHERE expires_at < now()`); err != nil {
		return err
	}
	_, err := db.Exec(ctx, `DELETE FROM sessions WHERE expires_at < now() OR last_seen_at < now() - $1::interval`, sessionIdle)
	return err
}
