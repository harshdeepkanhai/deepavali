# Spec Delta

## Purpose
Protecting players and the service from common and automated attacks, and keeping the server's technology from being advertised.

## ADDED Requirements

### Requirement: Browser security policy
Every response SHALL carry a Content-Security-Policy that allows scripts only from the game's own origin and blocks framing, plugins and foreign form targets, plus HSTS, nosniff, a no-referrer policy, cross-origin isolation of windows and resources, and a permissions policy that disables unused device features.

#### Scenario: Injected script
- **WHEN** an attacker manages to insert a script tag pointing to another site
- **THEN** the browser refuses to run it

#### Scenario: Clickjacking
- **WHEN** another site embeds the game in a frame
- **THEN** the browser refuses to display it

### Requirement: Cross-site request protection
State-changing API requests SHALL be accepted only with a JSON body and an Origin header equal to the game's own origin.

#### Scenario: Forged request from another site
- **WHEN** a page on another site submits a request to delete the account
- **THEN** the request is rejected and nothing changes

### Requirement: Abuse limits
The server SHALL rate-limit requests per client address, with tighter limits on sign-up, sign-in and recovery, SHALL cap request body size and header time, and SHALL respond to excess traffic with a generic "too many requests" response.

#### Scenario: Automated sign-in flood
- **WHEN** one address sends hundreds of sign-in attempts per minute
- **THEN** most are refused with "too many requests" while other players are unaffected

#### Scenario: Forged client address
- **WHEN** a client sends its own X-Forwarded-For header to dodge limits
- **THEN** the server still identifies it by the address set by the hosting edge

### Requirement: Technology non-disclosure
Responses MUST NOT reveal the names or versions of the server software, framework, language runtime or database, including in headers, error pages, cookie names, asset file names and error messages.

#### Scenario: Unknown path
- **WHEN** a scanner requests a path that does not exist
- **THEN** it gets the same plain response for every unknown path, with no default framework page

#### Scenario: Database failure
- **WHEN** a database error occurs
- **THEN** the client sees only a generic error and an opaque reference id

### Requirement: Private data store
The database SHALL accept connections only from the game server over the hosting provider's private network, and all queries SHALL be parameterised.

#### Scenario: Direct connection attempt
- **WHEN** someone on the internet tries to connect to the database
- **THEN** the connection is refused

### Requirement: Secret handling
Secrets SHALL come only from the hosting environment, never from the repository, and logs MUST NOT contain session tokens, recovery codes, passkey material or client addresses.

#### Scenario: Reading the logs
- **WHEN** an operator reads the server logs
- **THEN** they see request paths, statuses, timings and reference ids, but no secrets or addresses
