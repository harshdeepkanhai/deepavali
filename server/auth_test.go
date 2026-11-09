package main

import (
	"regexp"
	"strings"
	"testing"
)

func TestRecoveryCodes(t *testing.T) {
	codes := recoveryCodes(10)
	seen := map[string]bool{}
	re := regexp.MustCompile(`^[A-Z2-7]{4}-[A-Z2-7]{4}-[A-Z2-7]{4}-[A-Z2-7]{4}$`)
	for _, c := range codes {
		if !re.MatchString(c) || seen[c] {
			t.Fatalf("bad or repeated code %q", c)
		}
		seen[c] = true
		typed := strings.ToLower(strings.ReplaceAll(c, "-", " "))
		if n, ok := normalizeCode(typed); !ok || string(hashCode(n)) != string(hashCode(c)) {
			t.Fatalf("typed form %q did not normalise to %q", typed, c)
		}
	}
	for _, bad := range []string{"", "ABCD", "ABCD-EFGH-IJKL-MNO!", strings.Repeat("A", 17)} {
		if _, ok := normalizeCode(bad); ok {
			t.Errorf("accepted %q", bad)
		}
	}
}

func TestDisplayName(t *testing.T) {
	re := regexp.MustCompile(`^[A-Z][a-z]+ [A-Z][a-z]+ [1-9][0-9]{3}$`)
	for i := 0; i < 200; i++ {
		if n := displayName(); !re.MatchString(n) {
			t.Fatalf("unexpected name %q", n)
		}
	}
}
