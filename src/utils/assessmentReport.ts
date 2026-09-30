import type { AiPrediction, SecurityFinding, SecurityScorecard, VpnCaptureScenario } from '../types';

export type AssessmentReportKind = 'EXECUTIVE' | 'TECHNICAL' | 'COMBINED';

export interface AssessmentSnapshot {
  securityScore: number;
  riskScore: number | null;
  evidenceCoverage: number;
  threats: SecurityFinding[];
  evidenceGaps: SecurityFinding[];
  aiConfidenceScore: number | null;
  aiConfidenceModels: number;
  trafficMatchScore: number | null;
}

export interface ReportSection {
  title: string;
  lines?: string[];
  table?: { headers: string[]; rows: string[][] };
}

export function buildAssessmentSnapshot(
  scenario: VpnCaptureScenario,
  scorecard: SecurityScorecard,
  prediction: AiPrediction,
): AssessmentSnapshot {
  const modelResults = scenario.mlPredictions
    ? Object.values(scenario.mlPredictions).filter((result) => result && typeof result.confidence === 'number' && Number.isFinite(result.confidence))
    : [];
  const aiConfidenceScore = modelResults.length
    ? Math.round(modelResults.reduce((sum, result) => sum + Math.max(0, Math.min(1, result.confidence ?? 0)), 0) / modelResults.length * 100)
    : null;

  return {
    securityScore: scorecard.totalScore,
    // This is the observed configuration penalty. Unknown controls are tracked by evidence coverage.
    riskScore: scorecard.assessmentStatus === 'INSUFFICIENT' ? null : scorecard.riskPenalty,
    evidenceCoverage: scorecard.evidenceCoveragePercent,
    threats: scorecard.findings.filter((finding) => finding.penalty > 0),
    evidenceGaps: scorecard.findings.filter((finding) => finding.severity !== 'Pass' && finding.penalty === 0),
    aiConfidenceScore,
    aiConfidenceModels: modelResults.length,
    trafficMatchScore: prediction.status === 'NOT_DETERMINABLE' ? null : prediction.confidenceScore,
  };
}

const display = (value: unknown): string => value === null || value === undefined || value === '' ? 'Not observed' : String(value);
const yesNoUnknown = (value: boolean | null): string => value === null ? 'Not determined from packet evidence' : value ? 'Enabled' : 'Disabled';

const mlTargetName = (target: string): string => ({
  encryption: 'Encryption cipher',
  hash: 'Integrity algorithm',
  dh_group: 'Key exchange group',
  pfs_group: 'Perfect Forward Secrecy',
}[target] || target.replaceAll('_', ' '));

const mlClassName = (label: string): string => ({
  AES128: 'AES-128',
  AES256: 'AES-256',
  SHA256: 'SHA-256',
  SHA384: 'SHA-384',
  DH14: 'DH Group 14 / MODP-2048',
  DH15: 'DH Group 15 / MODP-3072',
  NOPFS: 'No PFS predicted',
  PFS14: 'PFS predicted with DH Group 14',
  PFS15: 'PFS predicted with DH Group 15',
}[label] || label);

function buildMlPredictionSection(scenario: VpnCaptureScenario): ReportSection | null {
  if (!scenario.mlPredictions) return null;
  return {
    title: 'Cryptographic model predictions',
    lines: [
      'These values are model predictions from packet/flow features. They are not decoded protocol fields and must be confirmed with visible negotiation evidence, gateway telemetry, or configuration.',
      'Use this section to guide investigation; do not treat it as compliance proof.',
    ],
    table: {
      headers: ['Target', 'ML prediction', 'Predicted-class probability', 'Evidence status'],
      rows: Object.entries(scenario.mlPredictions).map(([target, result]) => [
        mlTargetName(target),
        mlClassName(result.prediction),
        result.confidence === null ? 'Unavailable' : `${Math.round(result.confidence * 100)}%`,
        'ML inference, not packet-observed',
      ]),
    },
  };
}

export function buildReportSections(
  kind: AssessmentReportKind,
  scenario: VpnCaptureScenario,
  scorecard: SecurityScorecard,
  prediction: AiPrediction,
  narrative?: { executive_summary: string; technical_interpretation: string } | null,
): ReportSection[] {
  const snapshot = buildAssessmentSnapshot(scenario, scorecard, prediction);
  const summary = snapshot.threats.length
    ? `${snapshot.threats.length} observed configuration risk${snapshot.threats.length === 1 ? '' : 's'} require review; ${snapshot.evidenceGaps.length} controls need more evidence.`
    : snapshot.evidenceGaps.length
      ? `No confirmed configuration risk was scored, but ${snapshot.evidenceGaps.length} controls need more evidence.`
      : 'No configuration risk was identified in the assessed controls.';
  const scoreLines = [
    `Evidence-adjusted security score: ${snapshot.securityScore}/100 (${scorecard.rating}).`,
    `Observed configuration risk score: ${snapshot.riskScore === null ? 'Not rated' : `${snapshot.riskScore}/100`}. This is a rule-based penalty, not the probability of an attack.`,
    `Evidence coverage: ${snapshot.evidenceCoverage}% (${scorecard.assessmentStatus}). Unknown controls receive no security credit.`,
  ];
  const trafficLines = [
    `Inferred workload: ${prediction.status === 'NOT_DETERMINABLE' ? 'Not determinable' : prediction.predictedClass}.`,
    `Traffic pattern match: ${snapshot.trafficMatchScore === null ? 'Unavailable' : `${snapshot.trafficMatchScore}%`}. This is a relative heuristic score, not calibrated model confidence.`,
    `ESP packets: ${scenario.features.packetCount}; mean length: ${scenario.features.meanPacketLength.toFixed(1)} bytes; mean inter-arrival: ${scenario.features.meanInterArrivalTimeMs.toFixed(1)} ms; entropy: ${scenario.features.calculatedEntropy.toFixed(2)} bits/byte.`,
    `Wire metadata: ${scenario.sa.observations?.ikePackets ?? 'unknown'} IKE and ${scenario.sa.observations?.espPackets ?? scenario.features.packetCount} ESP frames; NAT traversal ${scenario.sa.observations?.natTraversal ?? 'not determined'}.`,
    'Application identity and encrypted contents cannot be confirmed from packet metadata.',
  ];
  const confidenceLines = [
    `AI confidence score: ${snapshot.aiConfidenceScore === null ? 'Unavailable' : `${snapshot.aiConfidenceScore}%`} (mean cryptographic-model predicted-class probability).`,
    snapshot.aiConfidenceModels
      ? `Mean predicted-class probability across ${snapshot.aiConfidenceModels} available cryptographic inference models. This is not AI narrative confidence, measured accuracy, or probability that the deployment is secure.`
      : 'The trained cryptographic inference service did not return model predictions for this capture.',
  ];
  const threatRows = snapshot.threats.map((finding) => [
    finding.severity, `${finding.parameter}: ${finding.threatName}${finding.cveReference ? ` (${finding.cveReference})` : ''}`,
    finding.detectedValue, String(finding.penalty), finding.remediation,
  ]);
  const threatSection: ReportSection = {
    title: 'Threat matrix and remediation',
    lines: threatRows.length ? undefined : ['No observed configuration risks were scored. Review evidence gaps before concluding the tunnel is secure.'],
    table: threatRows.length ? { headers: ['Severity', 'Control / threat', 'Observed', 'Penalty', 'Action'], rows: threatRows } : undefined,
  };
  const gapsSection: ReportSection = {
    title: 'Evidence gaps',
    lines: snapshot.evidenceGaps.length
      ? snapshot.evidenceGaps.map((finding) => `${finding.parameter}: ${finding.detectedValue}. ${finding.remediation}`)
      : ['No unassessed controls were identified in the current rule set.'],
  };
  const evidenceBasisSection: ReportSection = {
    title: 'Evidence basis and limits',
    lines: [
      'Packet-observed fields come from visible IKE/IP/ESP metadata only.',
      'Encrypted ESP payload contents are not visible, so application identity and user activity are not confirmed.',
      'Unknown controls such as PFS, replay window, and SA lifetime remain evidence gaps unless Child-SA negotiation, gateway telemetry, or configuration proves them.',
      'ML predictions and AI prose are separated from packet-observed findings.',
    ],
  };
  const observedCryptoSection: ReportSection = {
    title: kind === 'EXECUTIVE'
      ? 'Observed cryptographic posture'
      : 'Cryptographic parameters — packet-observed evidence',
    table: { headers: ['Field', 'Packet-observed value', 'Evidence status'], rows: [
      ['IKE version', display(scenario.sa.ikeVersion), scenario.sa.ikeVersion === 'Not observed in capture' ? 'Not observed' : 'Observed'],
      ['Operating mode', display(scenario.sa.operationalMode), scenario.sa.operationalMode === 'Not determined from capture' ? 'Not determined' : 'Observed'],
      ['Encryption', display(scenario.sa.encryptionAlgorithm), scenario.sa.encryptionAlgorithm === 'Not observed in capture' ? 'Not observed' : 'Observed'],
      ['Integrity', display(scenario.sa.authIntegrityAlgorithm), scenario.sa.authIntegrityAlgorithm === 'Not observed in capture' ? 'Not observed' : 'Observed'],
      ['DH group', display(scenario.sa.dhGroup), scenario.sa.dhGroup === 'Not observed in capture' ? 'Not observed' : 'Observed'],
      ['PFS', yesNoUnknown(scenario.sa.pfsEnabled), scenario.sa.pfsEnabled === null ? 'Evidence gap' : 'Observed'],
      ['Replay protection', yesNoUnknown(scenario.sa.replayProtection), scenario.sa.replayProtection === null ? 'Evidence gap' : 'Observed'],
      ['Key lifetime', scenario.sa.keyLifetimeSeconds === null ? 'Not observed' : `${scenario.sa.keyLifetimeSeconds} seconds`, scenario.sa.keyLifetimeSeconds === null ? 'Evidence gap' : 'Observed'],
    ] },
  };
  const mlPredictionSection = buildMlPredictionSection(scenario);
  const aiNarrativeSection: ReportSection = {
    title: narrative ? 'AI-written narrative (evidence-bound)' : 'Deterministic summary',
    lines: [narrative?.executive_summary || summary],
  };

  if (kind === 'EXECUTIVE') {
    return [
      evidenceBasisSection,
      { title: 'Security and risk', lines: scoreLines },
      observedCryptoSection,
      ...(mlPredictionSection ? [mlPredictionSection] : []),
      { title: 'Traffic and metadata inference', lines: trafficLines.slice(0, 2).concat(trafficLines[3], trafficLines[4]) },
      { title: 'Crypto ML confidence', lines: confidenceLines },
      aiNarrativeSection,
      threatSection,
      gapsSection,
    ];
  }

  const observations = scenario.sa.observations;
  const sections: ReportSection[] = [
    evidenceBasisSection,
    { title: narrative ? 'AI-written technical interpretation (evidence-bound)' : 'Technical interpretation', lines: [narrative?.technical_interpretation || summary] },
    { title: 'Security and risk', lines: scoreLines },
    threatSection,
    gapsSection,
    observedCryptoSection,
    { title: 'Traffic analysis and metadata inference', lines: trafficLines },
    { title: 'Crypto ML confidence', lines: confidenceLines },
  ];

  if (mlPredictionSection) sections.push(mlPredictionSection);
  if (scenario.mlSecurityFindings?.length) {
    sections.push({
      title: 'Model-inferred security notes',
      lines: ['These are predictions, not packet-observed configuration findings. Confirm them with gateway telemetry or negotiation evidence.'],
      table: { headers: ['Severity', 'Finding', 'Basis', 'Confidence', 'Recommended check'], rows: scenario.mlSecurityFindings.map((finding) => [
        finding.severity, finding.title, finding.basis.replaceAll('_', ' '), `${Math.round(finding.confidence * 100)}%`, finding.recommendation,
      ]) },
    });
  }
  if (observations) {
    sections.push({ title: 'Wire-visible metadata', lines: [
      `Total frames: ${observations.totalPackets}; IKE: ${observations.ikePackets}; ESP: ${observations.espPackets}; AH: ${observations.ahPackets}.`,
      `NAT traversal: ${display(observations.natTraversal)}; capture duration: ${observations.captureDurationMs.toFixed(1)} ms.`,
      `IKE exchanges: ${observations.ikeExchanges.join(', ') || 'None observed'}.`,
    ] });
  }
  if (kind === 'COMBINED' && scenario.gatewayTelemetry) {
    sections.push({ title: 'Gateway correlation', lines: [
      `Gateway status: ${scenario.gatewayTelemetry.gatewayStatus}; correlation: ${scenario.gatewayTelemetry.correlationStatus}.`,
      `Matched SPIs: ${scenario.gatewayTelemetry.matchedSpis.length}; unmatched capture SPIs: ${scenario.gatewayTelemetry.unmatchedPcapSpis.length}.`,
      `Telemetry source: ${scenario.gatewayTelemetry.source || 'Not reported'}.`,
    ] });
  }
  return sections;
}

export function formatAssessmentMarkdown(
  kind: AssessmentReportKind,
  scenario: VpnCaptureScenario,
  sections: ReportSection[],
  generatedAt = new Date().toISOString(),
): string {
  const title = kind === 'EXECUTIVE' ? 'Executive security report' : kind === 'COMBINED' ? 'Combined technical and gateway report' : 'Technical security report';
  const escapeCell = (value: string) => value.replaceAll('|', '\\|').replaceAll('\n', ' ');
  const body = sections.map((section) => {
    const lines = [`## ${section.title}`, ...(section.lines || []).map((line) => `- ${line}`)];
    if (section.table) {
      lines.push('', `| ${section.table.headers.map(escapeCell).join(' | ')} |`);
      lines.push(`| ${section.table.headers.map(() => '---').join(' | ')} |`);
      lines.push(...section.table.rows.map((row) => `| ${row.map(escapeCell).join(' | ')} |`));
    }
    return lines.join('\n');
  }).join('\n\n');
  return `# ${title}\n\nCapture: ${scenario.name}\nGenerated: ${generatedAt}\n\n${body}\n`;
}
