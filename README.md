# AI-Powered IPsec VPN Protocol Analyzer & Security Assessment Framework

[![Security Standard](https://img.shields.io/badge/Security_Standard-NIST_SP_800--77_Rev._1-blue?style=flat-square)](https://csrc.nist.gov/publications/detail/sp/800-77/rev-1/final)
[![RFC Compliance](https://img.shields.io/badge/RFC_Standards-RFC_8221_%7C_RFC_7296-emerald?style=flat-square)](https://datatracker.ietf.org/doc/html/rfc8221)
[![AI Engine](https://img.shields.io/badge/AI_Engine-Random_Forest_%2B_ESP_Heuristics-purple?style=flat-square)](https://scikit-learn.org/)
[![Docker](https://img.shields.io/badge/Deployment-Docker_Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](docker-compose.yml)
[![License](https://img.shields.io/badge/License-MIT-slate?style=flat-square)](LICENSE)

> **Smart India Hackathon | NTRO Problem Statement 26160**  
> *Automated Cryptographic Security Assessment & Encrypted ESP Traffic Classification*

---

## 📌 Executive Summary

Virtual Private Networks (VPNs) built on **IPsec (Internet Protocol Security)** form the backbone of national critical infrastructure, defense networks, government communications, and inter-branch banking systems.

However, modern network security teams face two critical challenges:
1. **The "Connected" Mirage**: An IPsec tunnel can successfully establish and report **"Connected"** while secretly negotiating obsolete, broken 1990s-era cryptographic primitives (e.g., 3DES, 1024-bit DH groups, disabled Perfect Forward Secrecy), exposing communications to nation-state decryption and collision attacks (**Sweet32**, **Logjam**).
2. **Encrypted Tunnel Blindness**: Because ESP (Encapsulating Security Payload) encrypts network payloads, traditional Deep Packet Inspection (DPI) firewalls cannot classify application traffic inside the tunnel, leaving operators blind to covert exfiltration, command-and-control channels, or unexpected traffic bursts.

This framework provides an end-to-end, multi-tier automated solution:
- **Deterministic Cryptographic Security Auditor**: Inspects IKEv1/IKEv2 handshakes against **NIST SP 800-77 Rev. 1**, **RFC 8221**, and the **NSA CNSA Suite**, instantly assigning a 0–100 security posture score with threat matrices and actionable remediation.
- **AI Encrypted Traffic Fingerprinting**: Employs trained machine learning models and statistical flow heuristics (packet length distributions, burst timing, flow symmetry, and Shannon entropy) to infer traffic patterns and estimate cryptographic parameters without decrypting payloads.
- **Interactive Dissector & Workstation**: Browser-based frame-by-frame packet inspection, hex-dump viewer, SPI tracking, and telemetry monitoring.
- **VPN Testbed & Remediation Generator**: Automatically outputs compliant, hardened `strongSwan (swanctl.conf)` and `ip xfrm` configurations with synthetic testbed PCAP generators.
- **Automated Audit Reports**: Generates downloadable Executive and Technical Markdown, JSON, and publication-ready PDF audit reports with optional AI-assisted executive summaries.

---

## 📚 Technical Documentation & Deep Dives

For in-depth technical details, please refer to the specialized documentation:
- 📖 **[TECHNICAL_DOCUMENTATION.md](TECHNICAL_DOCUMENTATION.md)**: **Master Technical Specification** — In-depth packet lifecycle, mathematical audit formulas (Sweet32, Logjam, PFS), ML pipeline, and runbooks.
- 🏗️ **[ARCHITECTURE.md](ARCHITECTURE.md)**: Component boundaries, evidence contracts, and multi-tier design.
- 🔌 **[API.md](API.md)**: REST API endpoint schemas and payload contracts for Scapy and the Central API.
- 🧠 **[ML_MODEL.md](ML_MODEL.md)**: Random Forest model architectures, 18-feature input vector, and confidence thresholds.
- 🛡️ **[SECURITY_MODEL.md](SECURITY_MODEL.md)**: Zero-trust evidence hierarchy (`PCAP_OBSERVED > TELEMETRY > ML > UNKNOWN`).
- 📊 **[dataset/README.md](dataset/README.md)**: Labeled cryptographic & workload datasets, column definitions, and model training guide.

## 🏗️ System Architecture

The solution is architected as a set of cooperating, decoupled local services ensuring high performance, zero data leakage, and offline capability:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       USER WEB INTERFACE                                        │
│                              (React 19 + TypeScript + Vite @ Port 3000)                         │
│  ┌───────────────────────┐  ┌────────────────────────┐  ┌────────────────────────────────────┐  │
│  │   Security Auditing   │  │  AI Traffic Analytics  │  │  Packet Dissector & Hex Inspector  │  │
│  └───────────────────────┘  └────────────────────────┘  └────────────────────────────────────┘  │
│  ┌───────────────────────┐  ┌────────────────────────┐  ┌────────────────────────────────────┐  │
│  │   Gateways Manager    │  │  VPN Testbed Generator │  │  Executive & Tech PDF Report Exporter│  │
│  └───────────────────────┘  └────────────────────────┘  └────────────────────────────────────┘  │
└──────────────────────────┬───────────────────────────────┬──────────────────────────────────────┘
                           │ Fallback Parser / Direct API  │ High-Fidelity Dissection
                           ▼                               ▼
┌──────────────────────────────────────────────┐ ┌──────────────────────────────────────────────┐
│           CORE ANALYSIS & TELEMETRY API      │ │           SCAPY DISSECTION SERVICE           │
│         (Python FastAPI @ Port 8770)         │ │            (Scapy Engine @ Port 8765)        │
│                                              │ │                                              │
│  • Bounded PCAP Ingestion & Validation       │ │  • Deep IKEv1/IKEv2 Transform Decoding       │
│  • Gateway Telemetry & Replay Protection     │ │  • Link-layer, IPv4/IPv6, NAT-T, ESP SAs     │
│  • SQLite Repository (data/analyzer.sqlite3) │ │  • Packet Layer Summaries & Raw Hex Dump     │
│  • AI Report Narrative Synthesis (Groq/Gemini│ │  • Ephemeral Stateless Stream Processing     │
│  • Allowlisted Testbed Job Control           │ │                                              │
└──────────────────────▲───────────────────────┘ └──────────────────────▲───────────────────────┘
                       │ Sanitized Telemetry                            │ Live Capture / Feed
                       │                                                │
┌──────────────────────┴────────────────────────────────────────────────┴───────────────────────┐
│                                   VPN ANALYZER AGENT                                         │
│                              (server/vpn_analyzer_agent.py)                                   │
│  • Bounded local live network interface capture (tcpdump / Scapy)                            │
│  • Edge endpoint pseudonymization & metadata aggregation                                      │
│  • Authenticated batch telemetry push to central analysis server                              │
└───────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Port & Service Mapping

| Service | Technology | Port | Description |
| :--- | :--- | :--- | :--- |
| **Frontend Web App** | React 19, TypeScript, Vite, Tailwind CSS | `3000` | Interactive operator dashboard and inspection UI |
| **Scapy Analyzer** | Python 3.12, Scapy | `8765` | High-fidelity binary packet decoder and protocol dissector |
| **Analysis & Telemetry API** | Python 3.12, FastAPI, SQLite | `8770` | Central analysis engine, gateway repository, report compiler |

---

## 🚀 Getting Started

You can run the entire suite using **Docker Compose** (recommended) or as individual local services.

### Option A: Run with Docker Compose (Recommended)

Docker Compose starts the Frontend, Analysis API, and Scapy Analyzer together in isolated containers.

#### 1. Clone the repository and navigate into the project directory
```bash
git clone https://github.com/Prayas536/sih-ipsec.git
cd sih-ipsec/ai-based-pcap-analyzer
```

#### 2. Set up environment configuration
```bash
cp .env.example .env
```
*(Optional: edit `.env` to add your `GROQ_API_KEY` or `GEMINI_API_KEY` if you want AI-generated executive narrative summaries in reports).*

#### 3. Build and launch all services
```bash
docker compose up --build
```

#### 4. Open the Dashboard
Open your web browser and navigate to:
```
http://localhost:3000
```

To stop all services:
```bash
docker compose down
```

---

### Option B: Local Development Setup (Manual)

If running without Docker, open three separate terminal windows:

#### Prerequisites
- **Node.js**: v18.0.0 or higher (`node -v`)
- **Python**: v3.11 or v3.12 (`python --version`)
- **npm** or **bun**

---

#### Step 1: Environment & Python Dependencies
In the root directory, create a Python virtual environment and install the backend dependencies:

```bash
# Windows (PowerShell)
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Linux / macOS
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Copy the environment file:
```bash
cp .env.example .env
```

---

#### Step 2: Start the Services

##### Terminal 1 — Scapy Dissection Service (Port 8765)
```bash
# Ensure virtual environment is activated
python server/scapy_analyzer.py
```
*Listens on `http://127.0.0.1:8765`. Provides detailed protocol dissection and layer-by-layer packet parsing.*

##### Terminal 2 — Analysis & Telemetry API (Port 8770)
```bash
# Ensure virtual environment is activated
python server/api_server.py
```
*Listens on `http://127.0.0.1:8770`. Manages the SQLite database, report generation, and gateway monitoring.*

##### Terminal 3 — Frontend Web Application (Port 3000)
```bash
npm install
npm run dev
```
*Starts the Vite dev server at `http://localhost:3000`.*

---

## 📡 Capturing Real IPsec Traffic for Analysis

You can upload `.pcap`, `.pcapng`, or `.cap` capture files directly into the web interface.

### Method 1: Capture on Linux Gateway using `tcpdump`
Run this command on your VPN client or StrongSwan gateway:

```bash
sudo tcpdump -i any -nn -s 0 -w ipsec_capture.pcap \
    "udp port 500 or udp port 4500 or proto 50 or proto 51"
```

1. Start the capture command above.
2. Initiate your IPsec tunnel (e.g. `swanctl --initiate --child <conn>`).
3. Send network traffic across the tunnel (ping, web request, file download, or call).
4. Stop the capture with `Ctrl + C`.
5. Drag and drop `ipsec_capture.pcap` directly into the web analyzer dashboard.

### Method 2: Capture with Wireshark
1. Open Wireshark and select your active network adapter.
2. In the capture filter toolbar, enter:
   ```text
   udp port 500 or udp port 4500 or esp or ah
   ```
3. Start the capture and establish your VPN connection.
4. Save the file via **File → Save As → Wireshark/tcpdump pcap (`.pcap`)**.
5. Upload the saved file to the dashboard.

### Method 3: Local Live Capture Agent
You can also run bounded local live capture directly via the bundled Python agent:

```powershell
python server/vpn_analyzer_agent.py --mode local --live --interface Ethernet --count 100 --timeout 30
```

---

## 🛡️ Security Audit Compliance Benchmark

The deterministic security audit engine evaluates negotiated Security Associations (SAs) against official government and cryptographic standards:

| Security Parameter | Recommended (Hardened) | Deprecated / High Risk | Threat / Vulnerability Mitigated |
| :--- | :--- | :--- | :--- |
| **IKE Protocol Version** | **IKEv2 (RFC 7296)** | IKEv1 (RFC 2409) | Offline dictionary attacks on PSK, aggressive-mode identity exposure. |
| **Cipher Algorithm** | **AES-256-GCM / ChaCha20-Poly1305** | 3DES-CBC, DES, Blowfish | 64-bit block size collision attacks (**Sweet32 / CVE-2016-2183**). |
| **Diffie-Hellman Group** | **Group 19, 20 (ECDH) or Group 14+ (2048b+)** | Group 1 (768b), Group 2 (1024b) | Precomputation and discrete logarithm attacks (**Logjam Attack**). |
| **Integrity & Hashing** | **AEAD Combined / SHA-256+** | MD5, SHA-1 | Hash collision and length-extension vulnerabilities. |
| **Perfect Forward Secrecy** | **Mandatory (PFS Enabled)** | Disabled | Compromise of private keys allows retroactive decryption of past traffic. |
| **Replay Protection** | **Enabled (64-packet window+)** | Disabled | Duplicate transaction execution via packet interception and reinjection. |

---

## 🧠 AI Encrypted Traffic Fingerprinting

When IPsec is in Phase 2 (ESP), payloads are encrypted. Plaintext packet inspection is mathematically impossible without the ephemeral session keys.

Our engine extracts physical transmission metadata to perform classification:
- **Packet Length Distribution ($L_\mu, L_\sigma$)**: Small fixed lengths (~120–160B) characterize VoIP; MTU-saturating frames (~1420–1500B) indicate file transfers.
- **Inter-Arrival Time ($IAT_\mu$)**: Isochronous pulses (~20ms) signify real-time audio/video; bursty clusters denote web browsing.
- **Flow Symmetry ($S_{flow}$)**: Extreme downlink asymmetry ($\ge 90\%$) indicates streaming video; balanced ratios ($\approx 50/50$) represent interactive duplex calls.
- **Shannon Entropy ($H$)**:
  $$H(X) = -\sum_{i=1}^{n} P(x_i) \log_2 P(x_i)$$
  Calculates bit distribution randomness across payloads to confirm high-entropy cipher operation.

---

## 📂 Project Structure

```
├── .env.example                # Sample environment configuration
├── docker-compose.yml          # Multi-container orchestration (Frontend, Scapy, API)
├── Dockerfile                  # Multi-stage Docker build file
├── requirements.txt            # Python dependencies (Scapy, Scikit-learn, Pandas)
├── package.json                # Frontend dependencies and scripts
│
├── server/                     # Backend Python Services
│   ├── api_server.py           # Core FastAPI REST API server (Port 8770)
│   ├── scapy_analyzer.py       # High-fidelity Scapy packet dissection service (Port 8765)
│   ├── vpn_analyzer_agent.py   # Telemetry collection & live capture agent
│   ├── ai_reporting.py         # AI narrative generator (Groq / Gemini / OpenAI)
│   ├── repository.py           # SQLite database persistence layer
│   ├── telemetry.py            # Gateway telemetry ingestion and normalization
│   └── testbed_control.py      # strongSwan allowlisted configuration engine
│
├── feature_extractor/          # Machine Learning Subsystem
│   ├── extractor.py            # Feature vector extractor from PCAP traces
│   └── ml/models/              # Bundled trained Random Forest cryptographic models
│
├── src/                        # Frontend Application (React 19 + TypeScript)
│   ├── App.tsx                 # Core UI state and layout coordinator
│   ├── types.ts                # TypeScript interface contracts for packets and audits
│   ├── components/             # Reusable UI Components
│   │   ├── Header.tsx          # Top navigation bar & upload controls
│   │   ├── MetricCards.tsx     # Security score and posture cards
│   │   ├── SecurityAssessment.tsx # NIST compliance and threat matrix breakdown
│   │   ├── PacketViewer.tsx    # Interactive packet table and hex viewer
│   │   ├── GatewaysManager.tsx # Remote gateway monitoring and telemetry view
│   │   ├── HelpModal.tsx       # Built-in operator help & reference guide
│   │   ├── ModelEstimates.tsx  # ML parameter prediction card
│   │   ├── ReportModal.tsx     # PDF, JSON, and Markdown audit report exporter
│   │   └── TestbedGeneratorModal.tsx # strongSwan / PCAP synthetic testbed lab
│   └── utils/                  # Core Utilities & Parsing Engines
│       ├── pcapParser.ts       # Web-native binary PCAP/PCAPNG parser
│       ├── securityAuditor.ts  # Deterministic NIST SP 800-77 scoring engine
│       ├── aiClassifier.ts     # Client-side heuristic ESP traffic classifier
│       ├── gatewayPdf.ts       # Client-side publication-ready PDF generator
│       └── scapyClient.ts      # HTTP bridge to local Scapy analyzer service
│
├── data/                       # Local SQLite database directory (analyzer.sqlite3)
└── tests/                      # Frontend TypeScript test suites
```

---

## 🔧 Environment Variables Reference

Configure these in your `.env` file:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `VPN_ANALYZER_API_HOST` | `127.0.0.1` | API server binding address (`0.0.0.0` in Docker) |
| `VPN_ANALYZER_API_PORT` | `8770` | Port for the central FastAPI server |
| `VPN_ANALYZER_SCAPY_HOST` | `127.0.0.1` | Host for the Scapy dissection service |
| `VPN_ANALYZER_DATABASE` | `data/analyzer.sqlite3` | SQLite database file location |
| `GROQ_API_KEY` | *(optional)* | API key for Groq-assisted report narrative generation |
| `GROQ_MODEL` | `qwen/qwen3.8-27b` | Model used for AI executive summaries |
| `GEMINI_API_KEY` | *(optional)* | Google Gemini API key (fallback narrative provider) |
| `VPN_ANALYZER_AGENT_TOKEN` | *(optional)* | Shared bearer token for authenticating remote agents |
| `VPN_ANALYZER_TESTBED_TOKEN` | *(optional)* | Security token required to apply testbed strongSwan configs |

---

## 🧪 Testing & Validation

Run the frontend test suite:
```bash
npm test
```

Typecheck and lint:
```bash
npm run lint
```

Run the backend Python test suites:
```bash
python -m unittest discover server/ -p "test_*.py"
```

---

## 📜 Deliverables Checklist (SIH NTRO 26160)

- [x] **VPN Testbed Generator**: Automated generation of `strongSwan (swanctl.conf)` & `ip xfrm` configurations with customizable ciphers, DH groups, and PFS settings.
- [x] **Dataset & Feature Extraction**: Complete feature extraction pipeline (`feature_extractor/`) with labeled datasets.
- [x] **Binary Packet Parser**: Multi-format parser supporting classic `.pcap`, modern `.pcapng`, and Scapy deep dissection.
- [x] **Deterministic Security Auditor**: Auditing engine benchmarked against NIST SP 800-77 Rev. 1, RFC 8221, and RFC 7296.
- [x] **Encrypted Traffic Classification**: AI model estimation combined with ESP physical metadata shape heuristics.
- [x] **Interactive Dashboard**: Modern operator workstation with hex packet viewer, telemetry tracking, and threat matrices.
- [x] **Multi-Format Reporting**: One-click generation of publication-ready PDF, Markdown, and JSON compliance reports.

---

## 📄 License
This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
