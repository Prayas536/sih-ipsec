# Presentation fact check
Audit date: 2026-09-28. Read `presentation_work/REPOSITORY_AUDIT.md` for the complete capability matrix and known discrepancies. Metrics were recomputed from existing artifacts; models and application code were not changed.

| Slide | Claim | Source file / module | Status | Notes |
|---|---|---|---|---|
| 1 | Project identity and SIH metadata | User brief; reference PPT slide 1 | VERIFIED | PS 26160; NTRO; Software; Blockchain & Cybersecurity. |
| 1 | Working local prototype | src/App.tsx; server/scapy_analyzer.py; demo/ | VERIFIED | No production-deployment claim. |
| 2 | Manual interpretation workflow | Conceptual workflow; server/scapy_analyzer.py | VERIFIED | No measured time-saving claim. |
| 2 | Hidden fields remain unavailable | server/scapy_analyzer.py: sa defaults; src/utils/pcapParser.ts | VERIFIED | No decryption capability claimed. |
| 3 | Three separate processing roles | src/App.tsx; src/utils/securityAuditor.ts; backend/app/ml_assessment.py | VERIFIED | ML-inferred notes are not the observed score. |
| 4 | Default frontend path | src/utils/scapyClient.ts; src/App.tsx | VERIFIED | 8765 analyzer; 8770 registration/telemetry. |
| 4 | FastAPI alternative | backend/app/main.py | VERIFIED | Not represented as the default UI path. |
| 4 | Browser fallback | src/App.tsx; src/utils/pcapParser.ts | VERIFIED | Does not execute Python model artifacts. |
| 5 | 157 captures; 24 combinations; 33 scenarios; 113 ICMP/44 TCP | presentation_work/evidence/dataset_audit.json; dataset.csv | VERIFIED | No successful UDP captures. |
| 5 | 44 definitions × 5; 157 SUCCESS / 54 FAILED | pcap_factory/experiments.json; metadata/ | VERIFIED | Do not infer 220 completed attempts; records may reflect retries. |
| 5 | Verification and labels | factory.py validate_negotiation/perform_child_rekey; build_dataset.py | VERIFIED | Filename label extraction does not itself read/validate negotiation metadata. |
| 6 | 18 exact trained features | backend/app/feature_extraction.py ML_FEATURE_NAMES; model_metadata.joblib | VERIFIED | No invented inputs; schema validation checks presence and inference orders columns. |
| 6 | UI workload feature separation | server/scapy_analyzer.py; src/utils/aiClassifier.ts | VERIFIED | These statistics are not crypto-model inputs. |
| 6 | Protocol support differs in ML extractor | feature_extractor/extractor.py | PARTIAL | Native ESP extraction is IPv4-specific; UDP/4500 fallback is simplistic; see audit. |
| 7 | 4 RF models; 300 trees; 126 training rows; seed 42 | feature_extractor/ml/train_final_models.py; model_metadata.joblib | VERIFIED | No retraining performed for this deck. |
| 7 | Exact classes | presentation_work/evidence/model_evaluation.json; joblib classes_ | VERIFIED | 2/2/2/3 classes across separate targets. |
| 7 | Unknown-class and mode limitations | backend/app/ml_inference.py; model artifacts | PARTIAL | No OOD detector, calibration or mode predictor. |
| 8 | Accuracy and cipher confusion matrix | presentation_work/evidence/model_evaluation.json; feature_extractor/ml/test.csv | VERIFIED | Evaluation of existing artifacts; n=31; no held-out-organization claim. |
| 8 | Test suite counts | presentation_work/evidence/{typescript_tests,python_tests,backend_tests}.txt | VERIFIED | 17/19; 55/55; 22/22. Two report-string assertions fail. |
| 8 | Robust generalization | make_split.py; dataset.csv | FUTURE | Need configuration/device/network-disjoint validation and calibration. |
| 9 | 10 risk; 60% coverage; 54 security score | evidence/sample_assessment.json; src/utils/securityAuditor.ts | VERIFIED | Score formula reproduced on sample. |
| 9 | CBC rule and ML advisory | securityAuditor.ts; backend/app/ml_assessment.py | VERIFIED | Rule output, not a confirmed vulnerability/exploit. |
| 9 | NIST/standards mapping | securityAuditor.ts | PARTIAL | Baseline rule labels; sample NIST is unverified; no certification. |
| 10 | Real screenshot | demo/dark-analysis-preview.png; demo/README.md | VERIFIED | Screenshot reused without fabricated UI values. |
| 10 | 93% crypto summary | sample_analysis.json; src/utils/assessmentReport.ts | VERIFIED | Mean 93.25% rounded to 93%; not accuracy. |
| 10 | Workload classification limitation | aiClassifier.ts; sample_assessment.json; factory metadata | PARTIAL | Controlled ICMP sample ranked VoIP by heuristic; not a trained workload result. |
| 11 | 46 frames; 6 IKE; 40 ESP; observed values | evidence/sample_analysis.json; source PCAP | VERIFIED | Header/proposal observations; no Child-SA plaintext claim. |
| 11 | 73/100/100/100 probabilities | evidence/sample_analysis.json | VERIFIED | Training-set example, explicitly not validation. |
| 11 | Sample rule outputs | evidence/sample_assessment.json | VERIFIED | Actual TypeScript functions rerun; PFS/mode remain unknown. |
| 12 | Actual stack and local services | package.json; server/scapy_analyzer.py; server/api_server.py | VERIFIED | Local prototype; optional external narrative service not required for deterministic report. |
| 12 | Gateway/live capture | server/telemetry.py; correlation.py; live_capture.py; agent | PARTIAL | Implemented code and tests; no NIC or new gateway demo in this audit. |
| 12 | Docker ML packaging | Dockerfile; docker-compose.yml | PARTIAL | Missing backend and feature_extractor copies; no container runtime claim. |
| 12 | Operational hardening | Presentation roadmap grounded in audit gaps | FUTURE | Not completed capabilities. |
| 13 | Structured analysis and reports | src/utils/assessmentReport.ts; demo/sample-technical-report.pdf | VERIFIED | No quantified productivity or adoption claim. |
| 13 | Intended audiences | User brief; prototype workflow | FUTURE | Target users, not deployed customers. |
| 14 | Closing capability summary | Repository audit; slides 4–12 evidence | VERIFIED | Prototype scope, not autonomous or complete protocol discovery. |

## Reproduction
- `python presentation_work/audit.py` → dataset audit, capture inventory, evaluation metrics and sample Scapy output. Requires existing model dependencies plus the local presentation libraries.
- `node_modules/.bin/tsx presentation_work/verify_sample.ts` → actual TypeScript scorecard and workload heuristic.
- `python presentation_work/build_deck.py` → editable PPTX, this file and speaker notes.
- `powershell -File presentation_work/render.ps1` → actual PowerPoint slide images and text-bound checks.
- Existing suites: `npm test`; `python -m unittest discover -s server -p "test_*.py"`; `python -m pytest backend/tests -q`. Logs preserved under `presentation_work/evidence/`.

## Deliberate exclusions
No production accuracy, unseen-class detection, trained mode prediction, trained application recognition, full IKEv1 decoding, verified standards compliance, exploit detection, production deployment, or measured time savings are claimed. Reference image1.png (2022) is excluded; only image2.png (2026) is used.

## Existing artifact caveats
The dashboard screenshot includes its original heuristic VoIP label for an ICMP sample, standards labels, and a confidence summary. Slide 10 explicitly qualifies those values; none are used as proof of application identity or certification. The sample report’s prose is not used as protocol ground truth. Slide 11 uses a training-partition example for demonstration, while slide 8 uses held-out repetition 5.