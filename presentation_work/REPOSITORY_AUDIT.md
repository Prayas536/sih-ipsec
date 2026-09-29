# Repository audit for the SIH 2026 presentation

Audit scope: first-party source, documentation, configuration, package manifests, tests, all 157 factory capture containers, 211 factory metadata records, 157 extracted feature records, four CSV tables, five joblib artifacts, existing presentation, screenshots, video/report artifacts, and SQLite schemas/counts. `evidence/repository_inventory.json` inventories 1,202 files; `source_index.json` records 109 source/document/configuration files. Dependency and build directories were identified but are not project capability evidence. Secret `.env` values were not read. No notebooks or pre-existing evaluation-result files were found outside dependencies. Existing evaluation scripts were inspected and bundled artifacts evaluated afresh without retraining.

## Actual execution paths

1. React `src/App.tsx` uploads bytes via `src/utils/scapyClient.ts` to `server/scapy_analyzer.py` at localhost:8765. This decodes packet-visible fields, calls `backend/app/feature_extraction.py` → `feature_extractor/extractor.py`, then `ml_inference.py` → four joblib models, and `ml_assessment.py`. Browser `pcapParser.ts` is a fallback; it does not run those Python models.
2. Browser `securityAuditor.ts` creates the observed configuration scorecard; `aiClassifier.ts` is a separate workload heuristic. `assessmentReport.ts`, report components and PDF export utilities produce reports.
3. The frontend also registers analysis with `server/api_server.py` at localhost:8770. `repository.py` persists sanitized session metadata. Optional `telemetry.py`, `correlation.py` and the local agent connect authorized strongSwan SA evidence by exact SPI.
4. `backend/app/main.py` is a separate FastAPI interface, with `/api/ml-analyze` and capture/job/analysis routes. Its capture store persists raw `.bin` captures. Do not claim all backend storage is metadata-only, or that this is the dashboard's default upload route.

## Dataset and validation

44 experiment definitions × 5 intended repetitions = 220 intended slots. Present artifacts: 157 successful PCAPs/metadata records; 54 failure records. These records do not establish a completed 220-run campaign. There are 33 captured crypto/traffic scenarios, 24 crypto combinations, 113 ICMP and 44 TCP captures; no successful UDP captures. All success metadata reports IKEv2, tunnel mode and validation.valid=true. Factory performs real SSH-driven strongSwan configuration, tcpdump capture, ping/TCP/UDP traffic, negotiation comparison and explicit rekey/PFS verification. The separate browser testbed generator is synthetic. Some documentation incorrectly calls the factory captures synthetic.

Dataset labels are parsed from filenames by `build_dataset.py`; the builder does not independently gate on metadata validity. The audit checks metadata separately. Ground truth is controlled lab configuration plus saved negotiation evidence, not production diversity or packet-only proof of hidden policy.

Four 300-tree RandomForestClassifier artifacts use 18 ordered numeric inputs and no scaler. Train: 126 repetitions 1–4; test: 31 repetition-5 rows. Excludes filename, traffic and repetition from model inputs. Evaluation rerun: encryption 19/31 (61.29%), hash 31/31 (100%), DH 29/31 (93.55%), PFS 30/31 (96.77%). Full precision/recall/F1 and confusion matrices are in `evidence/model_evaluation.json`. No exact 18-feature row overlap was found, but configurations recur across the split. No external-network validation or probability calibration is established. No unknown-class rejection is present in the crypto models.

## Capability matrix (completed before slide generation)

| Capability | Implemented | Partial | Planned | Evidence / boundary |
|---|:---:|:---:|:---:|---|
| PCAP / PCAPNG input | yes | | | `pcapParser.ts`, `scapy_analyzer.py`, `capture_parser.py` |
| IKEv2 decoding | | yes | | Visible headers/proposals/transforms; encrypted IKE_AUTH unavailable |
| IKEv1 | | yes | | Header/version recognition, not full proposal/auth decoder |
| ESP analysis | yes | | | SPI, sequence, size/timing metadata; no decryption |
| AH | | yes | | Header/SPI/sequence support; no integrity verification |
| IPv4 / IPv6 parsing | yes | | | Browser, Scapy and backend decoders; coverage differs by path |
| NAT-T | | yes | | Main parsers recognize IKE/ESP framing; ML extractor uses simplistic UDP/4500 detection |
| Tunnel / transport ML | | | future | No such target/artifact; PCAP path returns undetermined |
| Mode via telemetry | | yes | | Explicit Child-SA evidence via `telemetry.py`; all factory successes tunnel |
| Cipher ML | yes | | | AES128/AES256 artifact; estimates, not crypto proof |
| Integrity/hash ML | yes | | | SHA256/SHA384 artifact |
| DH ML | yes | | | DH14/DH15 artifact |
| PFS ML | yes | | | NOPFS/PFS14/PFS15 artifact; separate from observed PFS |
| IKE version ML | | | future | Version is parser-derived, no model target |
| Application traffic classifier | | yes | | `aiClassifier.ts` heuristic; unvalidated; sample ICMP is ranked VoIP |
| Workload supervised training | | yes | | `server/ml_pipeline.py` baseline requires external labeled manifest; no workload model artifact |
| Unknown / unseen crypto traffic | | yes | | Missing-feature errors and small-capture warning in FastAPI; no OOD rejection/calibration |
| Feature extraction | yes | | | `extractor.py`; exactly 18 trained inputs |
| Confidence | yes | | | RF predicted-class probability; dashboard mean 93.25% rounds to 93%; not accuracy |
| Model evaluation | | yes | | Repetition-held-out evaluation; external/configuration-disjoint validation remains future |
| Deterministic security rules | yes | | | `securityAuditor.ts`, backend security modules; policy findings need analyst interpretation |
| Risk score / coverage | yes | | | Sample 10 risk penalty, 60% coverage, 54 security score; not attack probability |
| Threat matrix | yes | | | `AssessmentOverview.tsx`, report builders and real screenshot |
| Dashboard | yes | | | React source + existing screenshot and report artifacts |
| REST API | yes | | | Scapy HTTP, local API, separate FastAPI routes |
| Local live capture | | yes | | `live_capture.py`, bounded agent; packet-metadata unit tests, no NIC capture demonstrated here |
| Gateway correlation | yes | | | Exact normalized SPI and strongSwan/VICI adapter code/tests; authorized access required |
| Replay analysis | | yes | | Duplicate/out-of-order observations; do not prove attack or replay-window policy |
| Key lifetime analysis | | yes | | Rule when evidence supplied, telemetry/visible notify support; sample unknown |
| Automated reports | yes | | | Markdown/PDF generation, saved examples; optional LLM prose separate |
| NIST mapping | | yes | | Baseline rule labels and nullable status; not independently validated compliance certification |
| Deployment | | yes | | Local services and Docker scaffolding; no production deployment proved |

## Material gaps and inconsistencies

- `LIMITATIONS.md` and parts of `ARCHITECTURE_AUDIT.md` predate implemented persistence/live-agent/model code. README's original classifier and completed-deliverable claims are broader than current evidence.
- ML extractor treats all UDP/500 or UDP/4500 candidates as IKE in fallback, identifies native ESP only under IPv4, and sets `ike_version_detected` to IKEv2 from packet presence. Do not use that field as proof of version; the demo uses the richer Scapy parser's header evidence.
- Raw IKE proposals may be offers; parser-visible transforms must not automatically be described as final negotiated Child-SA policy.
- CBC rule and some CVE/HMAC/standards wording overstate security conclusions. Deck says implemented hardening rule, not confirmed exploitation or certification. The observed PCAP score and ML-inferred PFS concern remain separate.
- Current Docker backend stage copies only `server/`, omitting `backend/`, `feature_extractor/` and model artifacts required by Scapy ML imports. Containerized ML is not claimed working.
- Two frontend report-text expectations fail; 17/19 TypeScript tests pass. Server: 55/55; FastAPI: 22/22. Initial sandbox-only permission errors were resolved by rerunning outside sandbox. Existing application files were not changed to manufacture a green result.
- The FastAPI test suite uses its configured capture storage; test-generated capture records are not part of the factory dataset count.

## Theme inspection

Reference is 16:9, white canvas, serif headings, navy/SIH-blue text, cyan accents, light-blue rounded cards and a blue footer. Extracted `image1.png` is obsolete 2022 branding and must never be embedded. `image2.png` is the verified 2026 asset used throughout. Reference slides were rendered in installed Microsoft PowerPoint and visually inspected.
