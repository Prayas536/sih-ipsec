# Technical Documentation: AI-Powered IPsec VPN Protocol Analyzer & Security Assessment Framework

> **Document Version:** 2.4.0  
> **Problem Statement:** NTRO 26160 — Smart India Hackathon  
> **Classification:** Technical Reference & System Specification  
> **Target Audience:** Security Researchers, Network Engineers, Core Evaluators, and DevOps Teams

---

## Table of Contents
1. [Executive Overview & System Scope](#1-executive-overview--system-scope)
2. [Evidence Hierarchy & Security Principles](#2-evidence-hierarchy--security-principles)
3. [Multi-Tier System Architecture](#3-multi-tier-system-architecture)
4. [Protocol Dissection & Parsing Engine](#4-protocol-dissection--parsing-engine)
5. [Deterministic Cryptographic Security Auditor](#5-deterministic-cryptographic-security-auditor)
6. [Machine Learning & Encrypted Traffic Fingerprinting](#6-machine-learning--encrypted-traffic-fingerprinting)
7. [REST API Specifications & Contracts](#7-rest-api-specifications--contracts)
8. [Edge Gateway Agent & Telemetry Subsystem](#8-edge-gateway-agent--telemetry-subsystem)
9. [VPN Testbed Lab & Remediation Generator](#9-vpn-testbed-lab--remediation-generator)
10. [Database Architecture & Data Persistence](#10-database-architecture--data-persistence)
11. [Deployment, Runbooks & Operational Security](#11-deployment-runbooks--operational-security)
12. [Diagnostic & Troubleshooting Matrix](#12-diagnostic--troubleshooting-matrix)

---

## 1. Executive Overview & System Scope

### 1.1 The Operational Challenge
Virtual Private Networks (VPNs) configured with the **IPsec (Internet Protocol Security)** suite represent the cornerstone of national security and critical infrastructure interconnectivity. However, network visibility across IPsec tunnels is constrained by two critical phenomena:

1. **The "Connected" False Sense of Security**: IPsec IKE handshakes (IKEv1 RFC 2409, IKEv2 RFC 7296) allow negotiation of legacy fallback ciphers (e.g., 3DES-CBC, 1024-bit MODP Diffie-Hellman, missing PFS). The tunnel reports a healthy "UP" status to operators despite being vulnerable to Sweet32 (CVE-2016-2183) or precomputed discrete log cracking (Logjam).
2. **ESP Payload Opacity**: When traffic transitions to Phase 2 Encapsulating Security Payload (ESP, IP Protocol 50), packet contents are encrypted. Traditional Deep Packet Inspection (DPI) engines fail completely, preventing administrators from distinguishing legitimate traffic from anomalous bulk exfiltration or command-and-control beacons.

### 1.2 System Purpose
This framework provides an end-to-end platform that:
- Ingests raw binary network captures (`.pcap`, `.pcapng`, `.cap`) and bounded live network interfaces.
- Deterministically audits negotiated security parameters against **NIST SP 800-77 Rev. 1**, **RFC 8221**, and the **NSA Commercial National Security Algorithm (CNSA) Suite**.
- Uses trained Machine Learning models (Random Forest) and statistical flow heuristics to infer cryptographic suites and classify encrypted ESP traffic patterns without requiring private keys.
- Generates downloadable, publication-grade Executive & Technical Audit Reports in PDF, Markdown, and JSON.
- Generates hardened, compliant `strongSwan (swanctl.conf)` and `ip xfrm` configuration profiles to remediate identified vulnerabilities.

---

## 2. Evidence Hierarchy & Security Principles

To prevent false confidence and comply with zero-trust networking requirements, the system strictly enforces an **Evidence Precedence Policy**:

$$\text{PCAP\_OBSERVED} > \text{GATEWAY\_TELEMETRY} > \text{LAB\_VALIDATION} > \text{ML\_INFERENCE} > \text{UNKNOWN}$$

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 EVIDENCE PRECEDENCE                                    │
│                                                                                        │
│   1. PCAP_OBSERVED       Directly extracted from plaintext IKE handshake payloads      │
│      (Highest Trust)     (e.g., IKE_SA_INIT proposal and transform attributes)         │
│                                                                                        │
│   2. GATEWAY_TELEMETRY   Authenticated, signed status reported by a running strongSwan │
│      (High Trust)        daemon via the local VPN Analyzer Agent                       │
│                                                                                        │
│   3. LAB_VALIDATION      Controlled ground-truth synthesized in the VPN Testbed        │
│      (Medium-High Trust) with verified parameters configured on both endpoints        │
│                                                                                        │
│   4. ML_INFERENCE        Statistical estimation from packet physical shape & timing.   │
│      (Behavioral Only)   Flagged explicitly as probabilistic inference; never trusted   │
│                          to pass a cryptographic security audit                        │
│                                                                                        │
│   5. UNKNOWN             Unobserved, encrypted, or ambiguous fields. Default state.    │
│      (Zero Trust)        Marked as "Unverified" — never given an unearned pass.        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Core Security Invariants
- **No Payload Decryption Required**: The platform never asks for, stores, or handles private keys or pre-shared keys (PSKs).
- **No Inferred Passes**: If an IKE proposal was not observed in the trace (e.g., only encrypted `IKE_AUTH` packets were captured), the system marks the cipher as `NOT_VERIFIED` rather than assuming a default compliant cipher.
- **Strict Data Sanitization**: Gateway telemetry sent to the central repository pseudonymizes IP addresses and internal identifiers by default.

---

## 3. Multi-Tier System Architecture

The application is decomposed into decoupled, specialized components communicating over local REST APIs:

```
                                  ┌───────────────────────────────┐
                                  │      Operator Web Browser     │
                                  └──────────────┬────────────────┘
                                                 │ HTTP :3000
                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ TIER 1: FRONTEND WORKSTATION (React 19 + TypeScript + Vite)                                     │
│                                                                                                 │
│ • State Engine (App.tsx): Dynamic scenario coordination, tab routing, notifications            │
│ • Client Parsers (pcapParser.ts): Binary Libpcap & PCAPNG block decoder                        │
│ • Security Engine (securityAuditor.ts): NIST SP 800-77 Rev. 1 compliance rule evaluation       │
│ • Traffic Classifier (aiClassifier.ts): Shannon entropy & ESP physical shape centroid engine   │
│ • PDF Generator (gatewayPdf.ts): High-fidelity client-side PDF document rendering               │
└───────────────────────────────┬───────────────────────────────┬─────────────────────────────────┘
                                │ Fallback Direct               │ Deep Protocol Dissection
                                │ Ingestion                     │ (Port :8765)
                                ▼                               ▼
┌──────────────────────────────────────────────┐ ┌──────────────────────────────────────────────┐
│ TIER 2: CENTRAL API & PERSISTENCE            │ │ TIER 3: SCAPY DISSECTION SERVICE             │
│ (Python 3.12 / FastAPI @ Port 8770)          │ │ (Python 3.12 / Scapy @ Port 8765)            │
│                                              │ │                                              │
│ • POST /api/analyze/pcap                     │ │ • POST /analyze                              │
│ • SQLite Database (data/analyzer.sqlite3)    │ │ • Stateless stream dissection                │
│ • Gateway Telemetry Ingestion                │ │ • IKEv1/IKEv2 proposal transform unpacker    │
│ • Multi-Provider AI Reports (Groq/Gemini/OAI)│ │ • Frame-by-frame hex-dump builder            │
│ • Allowlisted strongSwan Job Control         │ │ • Deep layer decoding (Ether, IP, ESP, UDP)  │
└──────────────────────▲───────────────────────┘ └──────────────────────▲───────────────────────┘
                       │ JSON Telemetry Push                            │ Bounded Capture
                       │                                                │
┌──────────────────────┴────────────────────────────────────────────────┴───────────────────────┐
│ TIER 4: EDGE GATEWAY AGENT (server/vpn_analyzer_agent.py)                                     │
│                                                                                                 │
│ • Local strongSwan vici / swanctl interface queries                                           │
│ • Bounded live interface packet capture (tcpdump / Scapy)                                     │
│ • Periodic authenticated telemetry heartbeats to Central API                                  │
└───────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Protocol Dissection & Parsing Engine

### 4.1 Supported Capture Formats
The dissection engine supports all standard pcap formats via two distinct engines:
1. **Web-Native Binary Parser (`src/utils/pcapParser.ts`)**:
   - Parses Classic Libpcap (`0xa1b2c3d4` standard microsecond and `0xa1b23c4d` nanosecond).
   - Parses PCAPNG Block Format (`Section Header Block 0x0A0D0D0A`, `Interface Description Block`, `Enhanced Packet Block`).
   - Operates in-memory entirely within the client browser, ensuring immediate response without mandatory server dependencies.
2. **Deep Scapy Dissector (`server/scapy_analyzer.py`)**:
   - Dissects layered headers: Ethernet II, Linux Cooked Capture (SLL), 802.1Q VLAN, IPv4, IPv6, UDP, ESP (IP proto 50), AH (IP proto 51).
   - Extracts complete IKE exchange states and Security Parameter Indexes (SPI-Initiator, SPI-Responder).

### 4.2 IKE Handshake Dissection Lifecycle
The dissector maps packets to the canonical IKE lifecycle:
```text
Initiator                                                  Responder
   │                                                           │
   │─────────── IKE_SA_INIT (Exchange Type 34) ───────────────>│  [Plaintext: SA Proposals,
   │<────────── IKE_SA_INIT Response ──────────────────────────│   Key Exchange (KE), Nonces]
   │                                                           │
   │══ Encrypted Boundary (IKE_AUTH / Exchange Type 35) ═══════│  [Encrypted: Identities,
   │──────────────────────────────────────────────────────────>│   Certificates, Child SA
   │<──────────────────────────────────────────────────────────│   proposals, Traffic Selectors]
   │                                                           │
   │════════════════ ESP Phase 2 Data Transfer ════════════════│  [Encrypted: IP proto 50,
   │<══════════════ (IP Protocol 50 / UDP 4500) ══════════════>│   SPI, Sequence Number, IV,
   │                                                           │   Payload, ICV / Tag]
```

---

## 5. Deterministic Cryptographic Security Auditor

### 5.1 NIST SP 800-77 Rev. 1 & RFC 8221 Benchmark Engine
The audit engine (`src/utils/securityAuditor.ts`) performs mathematical and deterministic evaluation of negotiated SA parameters against federal standards:

```text
Initial Security Score: 100
  - Deduction: Obsolete Cipher (3DES: -50 pts, DES: -70 pts)
  - Deduction: Weak Diffie-Hellman Group (DH Group 1: -45 pts, DH Group 2: -35 pts)
  - Deduction: Missing Perfect Forward Secrecy (-25 pts)
  - Deduction: Broken Integrity Hashing (MD5: -40 pts, SHA-1: -25 pts)
  - Deduction: IKEv1 Legacy Protocol Version (-20 pts)
  - Deduction: Disabled Replay Protection (-20 pts)
Final Security Score = clamp(100 - Total Deductions, 0, 100)
```

### 5.2 Specific Vulnerability Detection Rules

#### A. Sweet32 Attack (CVE-2016-2183)
- **Target**: 3DES-CBC (`Triple-DES`) and Blowfish.
- **Vulnerability**: 64-bit block size ($L = 64$). By the Birthday Paradox, a collision in CBC mode ciphertext blocks occurs after observing approximately $2^{L/2} = 2^{32}$ blocks ($\approx 32\text{ GB}$). An adversary who intercepts 32 GB of data can recover HTTP authentication cookies or plaintext.
- **Rule**: If `encryption == "3DES"`, flag Severity **CRITICAL**, deduct 50 points, output remediation: upgrade to `AES-256-GCM`.

#### B. Logjam Attack (Weak Diffie-Hellman)
- **Target**: DH Groups 1 (768-bit) and 2 (1024-bit).
- **Vulnerability**: Discrete logarithm computation in finite fields can be precomputed using the Number Field Sieve (NFS) algorithm for common 1024-bit primes. Nation-state actors can decrypt pre-recorded sessions retroactively.
- **Rule**: If `dh_group < 14`, flag Severity **HIGH**, deduct 35–45 points, output remediation: require `MODP-2048 (Group 14)` or `ECP-256 (Group 19)`.

#### C. Ephemeral Key Secrecy (Missing PFS)
- **Target**: Child SAs negotiated without an explicit Diffie-Hellman exchange in Phase 2.
- **Vulnerability**: If the long-term private key or IKE SA key is compromised, all recorded Child SA ESP traffic can be decrypted retroactively.
- **Rule**: If `pfs_enabled == false`, flag Severity **HIGH**, deduct 25 points, require `esp_proposals = ...-ecp256`.

---

## 6. Machine Learning & Encrypted Traffic Fingerprinting

### 6.1 Cryptographic Parameter Inference Pipeline
When IKE negotiations are not captured (e.g., capture started mid-session), the system invokes 4 pre-trained **Random Forest Classifiers** (`feature_extractor/ml/models/`) to predict cryptographic configuration from 18 physical packet features:

```
[18 Numeric Features] ───► [Random Forest: 300 Trees] ───► Class Probabilities & Top Prediction
  • packet_count               • create_child_sa_count
  • total_bytes                • informational_count
  • avg_packet_size            • ike_request_count
  • min_packet_size            • ike_response_count
  • max_packet_size            • ike_bytes
  • capture_duration_seconds   • ike_avg_packet_size
  • udp_packet_count           • esp_bytes
  • udp_500_count              • esp_avg_packet_size
  • ike_packet_count           • (Repetition & IP context excluded)
  • esp_packet_count
```

#### Confidence Thresholds
- **HIGH CONFIDENCE**: Model probability $\ge 80\%$
- **MEDIUM CONFIDENCE**: Model probability $55\% \le P < 80\%$
- **LOW CONFIDENCE**: Model probability $< 55\%$

---

### 6.2 ESP Workload Fingerprinting (Physical Transmission Heuristics)
Because ESP payload bytes are indistinguishable from random noise, the system uses physical transmission characteristics to classify the application category:

```text
┌─────────────────┬──────────────────┬──────────────────┬─────────────────┬─────────────────┐
│ Workload Class  │ Mean Packet Size │ Std Deviation    │ Inter-Arrival   │ Flow Symmetry   │
├─────────────────┼──────────────────┼──────────────────┼─────────────────┼─────────────────┤
│ VoIP (Voice)    │ 120 – 190 B      │ Low (< 70 B)     │ 20 ms ± 3 ms    │ 50% / 50%       │
│ Video Streaming │ 1100 – 1400 B    │ Moderate         │ Chunked bursts  │ 90%+ Downlink   │
│ File Transfer   │ 1350 – 1500 B    │ Very Low         │ MTU saturation  │ 95%+ One-way    │
│ Web Browsing    │ 500 – 900 B      │ High (> 350 B)   │ Bimodal bursts  │ 75% / 25%       │
│ Messaging / ICMP│ < 250 B          │ Low              │ Sparse / Idling │ Balanced        │
└─────────────────┴──────────────────┴──────────────────┴─────────────────┴─────────────────┘
```

#### Shannon Entropy Calculation
$$H(X) = -\sum_{i=1}^{n} P(x_i) \log_2 P(x_i)$$
- **Max Entropy**: $8.0\text{ bits/byte}$ (Ideal uniform randomness).
- **Observed ESP Entropy**: Typically $7.92 – 7.99\text{ bits/byte}$.
- **Diagnostic Usage**: If an ESP stream exhibits $H < 7.5\text{ bits/byte}$, the system flags an anomalous condition (e.g., unencrypted null cipher `ESP_NULL` or repeated zero padding).

---

## 7. REST API Specifications & Contracts

### 7.1 Scapy Analyzer Service (`http://127.0.0.1:8765`)

#### `POST /analyze`
- **Purpose**: Dissects raw binary PCAP/PCAPNG bytes.
- **Request Headers**:
  - `Content-Type: application/octet-stream`
  - `X-Filename: <filename.pcap>`
- **Request Body**: Raw binary buffer.
- **Response Schema (`200 OK`)**:
  ```json
  {
    "scenarioName": "ipsec_capture.pcap",
    "fileSizeBytes": 1048576,
    "packets": [
      {
        "id": 1,
        "timestamp": 1727700000.123,
        "protocol": "IKE",
        "length": 340,
        "srcIp": "192.168.1.10",
        "dstIp": "192.168.2.1",
        "srcPort": 500,
        "dstPort": 500,
        "ikeType": "IKE_SA_INIT",
        "spi": "a1b2c3d4e5f60708",
        "info": "IKE_SA_INIT Request: SA(AES-256-GCM, DH-19)",
        "hexDump": "00 1a 2b 3c ..."
      }
    ],
    "sa": {
      "ikeVersion": "IKEv2",
      "encryption": "AES256",
      "cipherKeyLength": 256,
      "integrity": "SHA384",
      "dhGroup": "DH19",
      "pfsEnabled": true,
      "replayProtection": true,
      "tunnelMode": "Tunnel"
    }
  }
  ```

---

### 7.2 Central Analysis & Telemetry API (`http://127.0.0.1:8770`)

#### `POST /api/analyze/pcap`
- Ingests sanitized PCAP analysis sessions, computes risk scores, and commits to SQLite.
- Returns `{ "status": "ok", "analysisId": "uuid-v4" }`.

#### `GET /api/analysis/{analysisId}`
- Fetches stored session records, audit findings, and historical scorecards.

#### `POST /api/agent/telemetry`
- Receives authenticated heartbeats and SA state tables from edge gateway agents.
- **Authorization**: `Bearer <VPN_ANALYZER_AGENT_TOKEN>`.

#### `POST /api/reports/{id}/ai-narrative`
- Generates executive synthesis prose using the configured LLM provider (`groq`, `gemini`, or `openai`).
- Strict safeguard: Only sanitized aggregate metrics and finding summaries are transmitted; packet data is never forwarded.

---

## 8. Edge Gateway Agent & Telemetry Subsystem

The **VPN Analyzer Agent** (`server/vpn_analyzer_agent.py`) can execute in two modes:

### 8.1 Mode 1: Bounded Local Live Capture
Captures network interface packets directly using Scapy:
```powershell
python server/vpn_analyzer_agent.py --mode local --live --interface Ethernet --count 100 --timeout 30
```
- Restricts capture strictly to IPsec filters: UDP ports 500/4500 and IP protocols 50/51.
- Halts automatically upon reaching `--count` or `--timeout`.

### 8.2 Mode 2: Remote Gateway Telemetry Daemon
Polls the local strongSwan daemon via `swanctl --list-sas` and pushes sanitized telemetry:
```bash
python server/vpn_analyzer_agent.py run --config /etc/vpn-agent/config.json --interval 15
```

---

## 9. VPN Testbed Lab & Remediation Generator

The Testbed Generator (`src/components/TestbedGeneratorModal.tsx`) renders hardened configuration templates for **strongSwan**:

```ini
# Auto-generated NIST-Compliant Remediation (swanctl.conf)
connections {
    remediated-tunnel {
        version = 2
        local_addrs  = 192.168.1.1
        remote_addrs = 192.168.2.1

        local {
            auth = psk
            id = vpn-gw-alpha
        }
        remote {
            auth = psk
            id = vpn-gw-beta
        }

        children {
            secure-net {
                local_ts  = 10.0.1.0/24
                remote_ts = 10.0.2.0/24
                # Mandatory AEAD cipher with Perfect Forward Secrecy (ECDH Group 19)
                esp_proposals = aes256gcm128-ecp256
                dpd_action = restart
            }
        }
        # Hardened Phase 1 Proposal
        proposals = aes256-sha384-ecp256
    }
}
```

---

## 10. Database Architecture & Data Persistence

The backend utilizes an embedded **SQLite 3** relational database (`data/analyzer.sqlite3`) with WAL (Write-Ahead Logging) enabled for concurrency:

```sql
CREATE TABLE IF NOT EXISTS analyses (
    analysis_id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    security_score INTEGER NOT NULL,
    risk_level TEXT NOT NULL,
    ike_version TEXT,
    encryption TEXT,
    integrity TEXT,
    dh_group TEXT,
    pfs_enabled BOOLEAN,
    replay_protection BOOLEAN,
    evidence_coverage REAL NOT NULL,
    packet_count INTEGER NOT NULL,
    raw_json_data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gateways (
    gateway_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    endpoint_ip TEXT NOT NULL,
    status TEXT NOT NULL,
    last_seen TIMESTAMP,
    software_version TEXT,
    active_tunnels INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS telemetry_batches (
    batch_id TEXT PRIMARY KEY,
    gateway_id TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sa_state_json TEXT NOT NULL,
    FOREIGN KEY(gateway_id) REFERENCES gateways(gateway_id)
);
```

---

## 11. Deployment, Runbooks & Operational Security

### 11.1 Containerized Deployment (Production Standard)
```bash
# 1. Clone repository
git clone https://github.com/Prayas536/sih-ipsec.git
cd sih-ipsec/ai-based-pcap-analyzer

# 2. Configure environment
cp .env.example .env

# 3. Spin up all services
docker compose up -d --build

# 4. Verify service health
docker compose ps
curl http://127.0.0.1:8765/
curl http://127.0.0.1:8770/api/gateways
```

### 11.2 Host Firewall & Port Invariants
Ensure host firewalls restrict access appropriately:
- Port `3000`: Public / LAN access for dashboard operators.
- Port `8765`: Internal loopback only (`127.0.0.1`).
- Port `8770`: Accessible to dashboard and edge gateway agents.

---

## 12. Diagnostic & Troubleshooting Matrix

| Symptom | Probable Cause | Corrective Action |
| :--- | :--- | :--- |
| **"Scapy Service Disconnected" in UI** | `scapy_analyzer.py` is not running on port 8765 | Run `python server/scapy_analyzer.py` or verify container `docker compose logs scapy`. |
| **IKE Transform reported as "Unknown"** | Capture missed `IKE_SA_INIT` packets | Re-capture with `tcpdump` starting *before* tunnel initiation. |
| **Port 8770 `Address already in use`** | Ghost Python process holding port | Run `Get-NetTCPConnection -LocalPort 8770` (Windows) or `lsof -i :8770` (Linux) and terminate PID. |
| **PDF export fails or displays blanks** | Missing jspdf / autotable dependencies | Run `npm install jspdf jspdf-autotable`. |
| **ML models throw version mismatch** | Scikit-learn version mismatch | Re-install matching version: `pip install scikit-learn==1.9.1`. |
| **AI Executive Summary fails in Report** | Invalid or missing `GROQ_API_KEY` | Set valid key in `.env` and restart API, or select standard local report. |

---

*Authored for Smart India Hackathon — NTRO Problem Statement 26160.*
