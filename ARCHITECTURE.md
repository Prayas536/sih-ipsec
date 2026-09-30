# IPsec Analyzer Architecture

## Scope and Runtime Boundaries

This repository is a collection of cooperating local tools, not one unified backend. The Vite/React dashboard can parse PCAP/PCAPNG in the browser and can optionally call the Scapy analyzer (`server/scapy_analyzer.py`, port 8765). A separate HTTP API (`server/api_server.py`, default port 8770) stores sanitized analysis results and gateway telemetry in SQLite, controls allowlisted testbed configuration, and serves reports. The local agent (`server/vpn_analyzer_agent.py`) can analyze a file, collect bounded packet metadata, and submit sanitized telemetry. The standalone FastAPI service under `backend/` has its own upload/storage lifecycle and must not be conflated with the dashboard API.

No component decrypts ESP or encrypted IKE_AUTH payloads. PCAP observations, gateway telemetry, generated lab ground truth, and traffic classification are separate evidence sources and must stay distinguishable end to end.

```text
Browser upload ──> TypeScript parser ───────────────┐
       │           optional Scapy analyzer ─────────┤
       └──────────> dashboard assessment/report     ├──> API repository (analysis ID)
                                                    │          ▲
Gateway agent ── authenticated metadata ────────────┘          │
Bounded capture agent ─ timestamped metadata batches ──────────┘

Lab scenario ─> allowlisted configuration ─> two-peer capture and verification
                                          └─> accepted labeled dataset only
```

## Evidence and Persistence Contracts

- A parsed observation records its source, status, packet references, and value. Supported sources are `PCAP`, `GATEWAY_TELEMETRY`, `LAB_VALIDATION`, and `MODEL_INFERENCE`; absent or unsupported values remain unknown.
- A normalized analysis is keyed by `analysisId`. The API repository is the durable source for saved analysis and report history; the browser keeps only view state and references.
- A proposal offer is not a selected proposal. A selected transform is associated with the specific IKE or Child SA and its exchange/time evidence, never copied capture-wide onto unrelated SAs.
- Training labels come only from completed testbed runs whose negotiated state is verified on both peers. Requested settings and failed attempts are not ground truth.
- Live batches preserve source timestamps and batch identity. The ingestion API validates bounded schemas, authenticates the sender, sanitizes endpoint identifiers, and applies explicit retention limits before persistence.

## Workstream 1: Real Testbed Matrix

**Ownership:** `pcap_factory/factory.py`, `pcap_factory/experiments.json`, `src/utils/testbedConfig.ts`, `server/testbed_control.py`.

1. Define scenario dimensions and capabilities once: IKE/ESP suite, IKE DH, Child-SA PFS group or explicitly disabled, mode, address family, authentication, and application traffic class. UI options must be generated from or checked against this supported scenario contract.
2. Validate settings and render peer configuration through the existing allowlist. Preflight verifies interfaces, routes/selectors, daemons, and traffic generators before a run is scheduled.
3. Start packet capture on both peers before IKE negotiation. Establish the tunnel, generate a deterministic bounded application flow, and collect both peer status plus selected IKE/ESP and Child-SA state.
4. Accept a run only when both peers agree with every requested dimension. PFS enabled requires the requested Child-SA DH group after rekey; PFS disabled requires explicit evidence that the active/rekeyed Child SA has no DH exchange. Missing evidence is `NOT_VERIFIED`, not disabled.
5. Mark and publish PCAP/metadata as training-eligible only after validation. Failed, partial, requested-only, and mismatched runs remain failure diagnostics and are excluded from training manifests.

**Acceptance checks:** matrix coverage enumerates GCM, tunnel/transport, IPv4/IPv6, supported IKE DH x Child PFS pairs, PFS on/off, and application traffic classes; deterministic generator tests; capture-start ordering; peer-agreement and PFS negative tests; dataset builder rejects any non-validated run.

## Workstream 2: Protocol Analysis

**Ownership:** `src/utils/pcapParser.ts`, `backend/app/capture_parser.py`, `server/sa_correlator.py`, parser fixtures/tests.

1. Both parsers emit protocol records and field-level evidence rather than a single capture-wide crypto summary. A proposal record includes IKE version, exchange, message/packet references, proposal number, offered/selected status when provable, transforms, and associated SA/SPIs when present.
2. Decode IKEv1 proposal/transform structure and IKEv2 offers/selections, including multiple proposals and multiple SAs. Model CREATE_CHILD_SA/rekey as a new SA lifecycle record; correlate by protocol identifiers, SPIs, direction, and time window.
3. Decode IP, NAT-T, ESP, and AH headers independently. Capture filters include UDP 500/4500, IP protocol 50 (ESP), and IP protocol 51 (AH), plus IPv6 equivalents.
4. Malformed, truncated, encrypted, or ambiguous data yields explicit unknown/partial status. Tunnel/transport mode, authentication method, configured replay window, and lifetime remain unknown unless a source explicitly proves them.

**Acceptance checks:** real sanitized IKEv1/IKEv2 offer and selection fixtures, multiple SA and rekey fixtures, AH/NAT-T/IPv6 coverage, malformed/truncated fixtures, and assertions that records do not borrow transforms across SAs or infer encrypted fields.

## Workstream 3: Live Capture Dashboard

**Ownership:** `server/live_capture.py`, `server/vpn_analyzer_agent.py`, `server/api_server.py`, `server/repository.py`, `src/App.tsx` and live-capture UI.

1. The capture agent creates bounded metadata batches with stable `batchId`, `sourceId`, monotonically numbered events, original capture timestamps, and explicit `payloadIncluded: false` by default. Payload capture requires a separate explicit opt-in and is outside the default dashboard path.
2. Agent-to-API ingestion uses a short-lived bearer credential over TLS outside localhost, request-size and event-count limits, timestamp validation, replay/idempotency checks, and endpoint pseudonymization. A CORS allowlist is browser policy, not authentication.
3. The API stores batches under a configured retention policy and returns accepted count, duplicate count, oldest/newest event time, and source status. Reconnect uses last acknowledged batch/event IDs; bounded polling can resume without silently duplicating events.
4. The dashboard renders live source, connected/stale/error state, last received event time, batch/packet counts, and retention/collection mode. Packet event timestamps are not replaced with server receipt time.
5. Capture permissions are documented per OS/interface. Collection is authorized, local-first, bounded, and metadata-only unless explicitly changed.

**Acceptance checks:** authenticated local authorized capture reaches API and dashboard; timestamp and count round-trip; duplicate retry is idempotent; invalid/oversized/expired batches rejected; reconnect and retention behavior tested; payload absent by default.

## Workstream 4: Security Scoring and Standards Checks

**Ownership:** `src/utils/securityAuditor.ts`, `server/api_server.py`, rule tests and security-model docs.

1. Treat the rule set as project-defined checks, not a complete certification of NIST, RFC, or CNSA compliance. UI and API wording says “checks assessed” unless full scope and required evidence are covered.
2. Each rule declares identifier, required evidence/source, standards reference and exact scope, severity/penalty, pass/fail/unknown conditions, and remediation. Unknown or unsupported non-empty transforms never pass.
3. Evaluate selected transforms separately from offered transforms. Missing Child-SA evidence cannot prove ESP/PFS/replay status. Unknown evidence reduces coverage, not by itself observed-risk score; the two outputs remain distinct.
4. Long lifetime, algorithm allowlists, AEAD integrity semantics, and incomplete proposal handling are explicit rules shared by browser and API where both score.

**Acceptance checks:** unknown algorithms, unknown transform IDs, offered-only proposals, incomplete/no Child SA, PFS unknown/on/off, and over-eight-hour lifetime have asserted findings, score, coverage, and “checks assessed” wording.

## Workstream 5: Sensitive Data and API Exposure

**Ownership:** `.gitignore`, `server/storage.py` or `backend/app/storage.py`, `server/repository.py`, `server/sanitizer.py`, `server/api_server.py`, privacy/security docs.

1. Treat raw PCAPs and databases as local sensitive artifacts: ignore new local captures/databases, inspect tracked artifacts and history before removal or rewriting history, and document that ignore rules do not untrack existing objects.
2. Keep raw capture retention separate from sanitized metadata retention. Define storage location, default lifetime, user deletion action, and deletion semantics for direct FastAPI uploads, dashboard analyses, live batches, and backups. Do not silently persist uploaded packet bytes in the metadata API.
3. Minimize and pseudonymize IPs, selectors, IDs, and gateway fields before persistence/reporting. Preserve exact values only where required for authorized local correlation, with access controls and explicit opt-in.
4. Require authentication for non-public routes, TLS for non-local access, bounded request bodies, secret rotation, and configured exact-origin CORS allowlists. Reject wildcard/reflected origins in non-local mode; bind local-only services to loopback by default.
5. Review tracked samples/history for sensitive contents. Any history rewrite or deletion of tracked user artifacts requires an explicit repository-owner decision.

**Acceptance checks:** auth and CORS matrix, size limits, sanitizer tests, upload/live retention and delete tests, `.gitignore` coverage, tracked artifact/history inventory, and documented local/deployed settings.

## Workstream 6: Report History and Documentation

**Ownership:** `server/repository.py`, `server/api_server.py`, `src/App.tsx`, report utilities/components, README/API/architecture/ML/privacy docs.

1. Persist each completed analysis before opening report views. Store report references by `analysisId` and report kind, not duplicated transient PCAP data or frontend-only objects.
2. On load/restart, fetch saved analyses/reports from the API and restore executive/technical view selection. A missing/deleted analysis is shown as unavailable rather than reconstructed from stale browser state.
3. Executive output prioritizes decision, material risks, evidence coverage, and action. Technical output includes packet/SA evidence, source/provenance, uncertainty, and rule basis.
4. Optional generated prose is labeled and cannot change parsed evidence, findings, or scores. Documentation describes actual runtime services, data persistence, and model training/inference status.

**Acceptance checks:** refresh/restart restores analysis-linked reports; deletion removes/revokes references; both report modes show correct evidence; model claims and service/setup/API/privacy docs match tested behavior.

## Delivery Order and Gates

1. Establish shared evidence/rule contracts and tests; fix unsupported-algorithm and missing-evidence behavior.
2. Harden artifact handling and API boundary before enabling remote live ingestion.
3. Complete parser records/fixtures and association correlation.
4. Extend testbed scenario contract and verified-run acceptance before adding training data.
5. Add authenticated live batches and dashboard status over the hardened repository.
6. Restore report history from analysis IDs and reconcile user-facing documentation.

Each workstream must pass its focused tests before dependent work begins. Real lab negotiation and privileged capture require authorized peers/interfaces and cannot be represented as verified by unit tests alone.

## Current Runtime Notes

- The browser parser is the fallback; the Scapy service is optional and may provide different detail. The UI should expose parser provenance.
- `server/api_server.py` currently persists sanitized analysis and gateway telemetry in SQLite, and exposes testbed/gateway/report endpoints. Its current CORS behavior reflects request origins and must be tightened before non-local use.
- `server/live_capture.py` captures bounded packet metadata locally, but is not yet a continuous authenticated dashboard ingestion workflow.
- `backend/` is a separate FastAPI application with its own raw upload/storage lifecycle.
- Traffic classification in the dashboard is a heuristic baseline. The repository also contains model training/inference code; claims must be scoped to the path and dataset actually used.
- PCAP alone generally cannot prove authentication method, operational mode, configured replay window, SA lifetime, or encrypted transforms. These remain unknown absent explicit evidence.
