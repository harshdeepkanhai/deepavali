package main

import (
	"errors"
	"net/url"
	"os"
	"strings"
)

type config struct {
	Addr           string
	PublicOrigin   string // scheme://host[:port]; the only origin allowed to call the API
	RPID           string // passkey relying party id: the host name of PublicOrigin
	Secure         bool   // PublicOrigin is https
	DatabaseURL    string
	StaticDir      string
	ClientIPHeader string // header set by the hosting edge that holds the real client address
}

func loadConfig() (config, error) {
	c := config{
		Addr:           ":" + envOr("PORT", "8080"),
		PublicOrigin:   strings.TrimRight(os.Getenv("PUBLIC_ORIGIN"), "/"),
		DatabaseURL:    os.Getenv("DATABASE_URL"),
		StaticDir:      envOr("STATIC_DIR", "web"),
		ClientIPHeader: "CF-Connecting-IP",
	}
	if v, ok := os.LookupEnv("CLIENT_IP_HEADER"); ok {
		c.ClientIPHeader = v // empty means: use the socket address
	}
	if c.PublicOrigin == "" || c.DatabaseURL == "" {
		return c, errors.New("PUBLIC_ORIGIN and DATABASE_URL are required")
	}
	u, err := url.Parse(c.PublicOrigin)
	if err != nil || u.Host == "" || u.Path != "" || (u.Scheme != "https" && u.Scheme != "http") {
		return c, errors.New("PUBLIC_ORIGIN must look like https://example.com")
	}
	if u.Scheme == "http" && u.Hostname() != "localhost" {
		return c, errors.New("PUBLIC_ORIGIN must use https outside localhost")
	}
	c.RPID = u.Hostname()
	c.Secure = u.Scheme == "https"
	return c, nil
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
