package main

import (
	"context"
	"os"
	"testing"
)

// Runs only with TEST_DATABASE_URL set, against a throwaway database.
func testDB(t *testing.T) string {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}
	return url
}

func TestMigrateTwice(t *testing.T) {
	url := testDB(t)
	ctx := context.Background()
	db, err := openDB(ctx, url)
	must(t, err)
	defer db.Close()
	must(t, migrate(ctx, db))
	must(t, migrate(ctx, db)) // second run is a no-op
	var n int
	must(t, db.QueryRow(ctx, `SELECT count(*) FROM information_schema.tables WHERE table_name IN ('users','credentials','sessions','challenges','recovery_codes','progress')`).Scan(&n))
	if n != 6 {
		t.Fatalf("want 6 tables, got %d", n)
	}
	must(t, expire(ctx, db))
}
