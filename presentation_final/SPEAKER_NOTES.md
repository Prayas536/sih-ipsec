# Speaker notes
Each script is intended for approximately 20–40 seconds. Paths are relative to the repository.

## Slide 1
IPsec Sentinel addresses PS 26160 for NTRO. Our prototype turns IPsec packet captures into three clearly separated outputs: visible protocol evidence, model estimates, and rule-based security assessment. This presentation follows the implemented code and reproducible artifacts. We will show the controlled dataset, the actual model results, and a real dashboard example, including what the prototype cannot yet determine.

**Key technical point:** Three distinct evidence categories.
**Likely question:** Is this a concept or a working prototype?
**Answer:** The repository contains runnable parsers, four trained artifacts, security rules, APIs, tests, and saved dashboard/report evidence.

## Slide 2
The hard part is not opening a PCAP. It is deciding which protocol fields are actually visible, which settings need gateway evidence, and which security conclusions are justified. IKE negotiation can expose transforms, while ESP application content remains encrypted. Incomplete captures add uncertainty. Our aim is to structure that investigation and make its evidence boundaries visible.

**Key technical point:** Visibility is not the same as certainty.
**Likely question:** Can ESP reveal the application or full VPN configuration?
**Answer:** It exposes headers and traffic shape, not plaintext or all hidden Child-SA settings.

## Slide 3
The implemented workflow automates extraction and produces a consistent assessment. It has three different jobs. Parsing decodes visible fields. Random Forest models estimate four configuration labels. Deterministic rules produce findings and scores from the available evidence. These outputs are displayed separately so that an estimate cannot silently become packet-observed fact. The analyst still resolves incomplete or conflicting evidence.

**Key technical point:** Parsing, prediction and judgement have separate roles.
**Likely question:** Does ML determine the security score?
**Answer:** The observed configuration score is computed by TypeScript rules; ML produces separately tagged advisory findings.

## Slide 4
The dashboard sends captures to the local Scapy analyzer on port 8765. That service returns decoded observations and invokes the shared feature extractor and four model artifacts. The browser computes its observed scorecard and renders the combined result. A separate local API on 8770 handles persistence and gateway correlation. FastAPI also exposes an ML endpoint. If Scapy is unavailable, browser parsing remains available, but Python model inference is absent.

**Key technical point:** The diagram matches actual frontend calls.
**Likely question:** Is FastAPI the dashboard’s only backend?
**Answer:** No. The default upload uses the Scapy HTTP service; FastAPI is a separate interface.

## Slide 5
The factory configures two strongSwan peers, begins packet capture, generates traffic, and compares negotiated settings with the experiment. PFS-enabled runs require explicit rekey evidence. We counted 157 successful captures covering all 24 crypto combinations, across 33 crypto-and-traffic scenarios. The repository also retains 54 failure records. Forty-four definitions with five repetitions describe the intended matrix, not a completed campaign. CSV labels come from filenames, with negotiation metadata checked separately.

**Key technical point:** Configuration labels have a saved negotiation trail.
**Likely question:** Is this a production dataset or synthetic packet generator?
**Answer:** These are controlled strongSwan lab captures with negotiation metadata. The browser’s separate testbed export is synthetic.

## Slide 6
We distinguish decoded protocol fields from measured packet statistics. The protocol parser exposes visible headers and transforms. The crypto models use exactly these eighteen numeric features, including packet counts, sizes, duration and IKE/ESP totals. The dashboard also measures timing, symmetry and entropy for a separate workload heuristic. Those are not the four models’ inputs. The encrypted ESP payload is never treated as readable application content.

**Key technical point:** Use the actual trained feature schema.
**Likely question:** Do entropy or packet sizes prove the cipher?
**Answer:** No. They support statistical estimates at most; visible transforms or correlated gateway evidence are stronger confirmation.

## Slide 7
The trained component is deliberately specific. There are four Random Forest classifiers, each with three hundred trees, predicting encryption, integrity, DH group and PFS class. Training uses 126 rows from repetitions one through four, with balanced class weights and a fixed seed. Inference selects the same eighteen columns in the saved order. There is no tunnel-mode model or application classifier here, and predicted-class probability is not measured accuracy.

**Key technical point:** Closed-set crypto estimates, not arbitrary protocol discovery.
**Likely question:** What happens for an unseen cipher or transport mode?
**Answer:** The crypto model still selects among known labels; no OOD rejection exists. Mode is not a target and stays undetermined without other evidence.

## Slide 8
We reran inference using the saved models and the 31-row repetition-five test set. Cipher accuracy is 61.29 percent; hash is 100 percent; DH is 93.55 percent; PFS is 96.77 percent. The cipher confusion matrix makes its errors visible. These are small controlled-lab results with recurring configurations across train and test, not proof of generalization. Existing test suites also reveal two failing frontend report-text expectations, recorded in the fact check.

**Key technical point:** Separate reproducibility from external validity.
**Likely question:** Why is hash perfect but cipher weaker?
**Answer:** These figures reflect this small split and lab capture patterns; the repository does not establish a causal or cross-network explanation.

## Slide 9
The sample’s visible AES-CBC setting triggers the implemented ten-point hardening penalty. Evidence coverage is sixty percent because PFS, replay configuration and lifetime are unavailable. The evidence-adjusted security score is therefore ninety times point six, or fifty-four. These are local rule outputs, not attack probabilities. Separately, the model predicts no PFS and creates an inferred advisory; that must not be promoted to a confirmed configuration finding.

**Key technical point:** A low score can reflect incomplete evidence, not just observed risk.
**Likely question:** Does a score of 54 mean the tunnel has been compromised?
**Answer:** No. It combines a policy penalty and evidence coverage. Neither the score nor CBC observation establishes exploitation.

## Slide 10
This is the repository’s actual dashboard screenshot for the controlled ICMP capture. It shows the uploaded file, visible cipher and DH information, explicit unknown mode, risk and coverage, and the model-confidence summary. One useful limitation is visible: the workload heuristic ranks this ICMP example as VoIP. We are not presenting that label as successful application detection. The ninety-three percent card averages crypto-model probabilities; it does not validate the workload guess.

**Key technical point:** Real UI evidence includes real limitations.
**Likely question:** Why does the dashboard say VoIP for an ICMP test?
**Answer:** Its workload function uses hand-written size/timing scores and is not validated as an application classifier.

## Slide 11
Here is the exact demonstration file. The analyzer reads forty-six frames, including six IKE and forty ESP packets. The parser sees IKEv2, AES-CBC with a 128-bit key, SHA2-256 integrity and DH14. The models return the four predictions shown, while the observed rules produce the CBC note and the scores. The factory knows the controlled configuration, but the uploaded-capture path still correctly leaves hidden PFS and mode unknown.

**Key technical point:** One sample shows all three evidence categories together.
**Likely question:** Is this demo an independent model test?
**Answer:** No. Repetition one is in the training partition. This is pipeline demonstration; slide 8 uses repetition-five held-out rows.

## Slide 12
The practical deployment today is local: a React interface, a Python Scapy analyzer, and an API with SQLite persistence and optional gateway evidence. The repository includes bounded live-capture agent code and strongSwan telemetry support, but this audit did not capture from a live interface. Docker scaffolding is present, yet its backend image omits shared ML modules and artifacts. Operational use therefore requires packaging work, deployment hardening, and external validation.

**Key technical point:** Runnable local components are distinct from proven production deployment.
**Likely question:** Can we deploy the Docker configuration unchanged with ML?
**Answer:** The current backend image copies server code only, so ML dependencies in backend and feature_extractor must be packaged first.

## Slide 13
The prototype’s demonstrated value is standardization. Instead of reconstructing every result manually, an analyst gets structured observations, explicitly labeled model estimates, rule findings, and a reusable report. This maps directly to the problem statement’s analysis and assessment workflow. SOC teams, government or defence network teams, and auditors are intended users. We have not benchmarked analyst time savings or measured deployment impact, so those remain evaluation goals rather than claimed outcomes.

**Key technical point:** The benefit is grounded in implemented outputs.
**Likely question:** How much analyst time does this save?
**Answer:** No controlled time study exists yet. The repository proves processing and report generation, not a speedup percentage.

## Slide 14
Our closing claim is deliberately precise: IPsec Sentinel turns encrypted IPsec captures into an explainable assessment of the evidence that is available. The prototype has a controlled dataset, reproducible model evaluation, a working analysis flow and real report output. Its next step is broader validation and operational hardening. The principle remains the same: observe what is visible, label what is inferred, and show what is still unknown.

**Key technical point:** Credibility comes from visible evidence and bounded claims.
**Likely question:** What is the next technical milestone?
**Answer:** Configuration- and network-disjoint validation, calibrated/OOD-aware inference, and verified deployment packaging.
