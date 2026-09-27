import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Eye,
  Info,
  Radar,
  ShieldAlert,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import {
  GatewayCorrelationResult,
  GatewayTelemetrySummary,
  IkeSecurityAssociation,
  MLPredictions,
  MLSecurityFinding,
  SecurityFinding,
  SecurityScorecard,
} from '../types';
import { CombinedAnalysisPanel } from './CombinedAnalysisPanel';

interface SecurityAssessmentProps {
  scorecard: SecurityScorecard;
  sa: IkeSecurityAssociation;
  gatewayTelemetry?: GatewayTelemetrySummary;
  correlation?: GatewayCorrelationResult;
  mlPredictions?: MLPredictions | null;
  mlSecurityFindings?: MLSecurityFinding[];
}

const severityBadge = (severity: string) => {
  const s = severity.toLowerCase();
  if (s === 'critical') return 'bg-rose-50 text-rose-700 border-rose-200';
  if (s === 'high') return 'bg-orange-50 text-orange-700 border-orange-200';
  if (s === 'medium') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (s === 'low') return 'bg-slate-100 text-slate-700 border-slate-200';
  if (s === 'pass') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  return 'bg-blue-50 text-blue-700 border-blue-200';
};

const evidenceBadge = (label: string, tone: 'observed' | 'ml' | 'gap' | 'pass') => {
  const cls = tone === 'observed'
    ? 'border-blue-200 bg-blue-50 text-blue-700'
    : tone === 'ml'
    ? 'border-purple-200 bg-purple-50 text-purple-700'
    : tone === 'pass'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-amber-200 bg-amber-50 text-amber-700';
  return <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cls}`}>{label}</span>;
};

const pfsLabel: Record<string, string> = {
  NOPFS: 'Predicted disabled',
  PFS14: 'Predicted enabled: DH Group 14',
  PFS15: 'Predicted enabled: DH Group 15',
};

const DetailRow = ({ label, value, reference, tone = 'observed' }: { label: string; value: React.ReactNode; reference: string; tone?: 'observed' | 'gap' | 'pass' }) => (
  <div className="grid gap-2 border-b border-slate-100 px-4 py-3 last:border-b-0 md:grid-cols-[220px_minmax(0,1fr)_260px]">
    <div className="font-semibold text-slate-800">{label}</div>
    <div className="min-w-0 break-words text-slate-900">{value}</div>
    <div className="text-slate-500">{tone === 'gap' ? evidenceBadge('Needs evidence', 'gap') : evidenceBadge('PCAP observed', tone)} <span className="ml-2">{reference}</span></div>
  </div>
);

const FindingCard = ({ finding }: { finding: SecurityFinding }) => (
  <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
    <div className="flex flex-wrap items-center gap-2">
      <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${severityBadge(finding.severity)}`}>{finding.severity}</span>
      <h4 className="text-sm font-bold text-slate-900">{finding.threatName}</h4>
      <span className="text-[11px] text-slate-400">({finding.parameter})</span>
    </div>
    <p className="mt-2 text-sm leading-6 text-slate-600">{finding.description}</p>
    <div className="mt-3 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
      <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
      <span><strong className="text-slate-900">Fix:</strong> {finding.remediation}</span>
    </div>
  </article>
);

export const SecurityAssessment: React.FC<SecurityAssessmentProps> = ({
  scorecard,
  sa,
  gatewayTelemetry,
  correlation,
  mlPredictions,
  mlSecurityFindings,
}) => {
  const observations = sa.observations;
  const riskFindings = scorecard.findings.filter((finding) => finding.penalty > 0);
  const evidenceGaps = scorecard.findings.filter((finding) => finding.severity !== 'Pass' && finding.penalty === 0);
  const pfsPrediction = mlPredictions?.pfs_group;
  const pfsConfidence = pfsPrediction?.confidence === null || pfsPrediction?.confidence === undefined
    ? null
    : `${(pfsPrediction.confidence * 100).toFixed(1)}%`;
  const observedPfs = sa.pfsEnabled === null ? 'Not determined from capture' : sa.pfsEnabled ? 'Enabled' : 'Disabled';

  return (
    <div className="space-y-6">
      {gatewayTelemetry && (
        <CombinedAnalysisPanel
          sa={sa}
          gatewayTelemetry={gatewayTelemetry}
          correlation={correlation}
        />
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="grid gap-0 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="border-b border-slate-200 bg-slate-950 p-5 text-white lg:border-b-0 lg:border-r">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-200">
              <ShieldCheck className="h-4 w-4" />
              Security posture
            </div>
            <div className="mt-5 flex items-end gap-2">
              <span className="text-5xl font-black leading-none">{scorecard.totalScore}</span>
              <span className="pb-1 text-sm text-slate-300">/ 100</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs font-semibold">{scorecard.rating}</span>
              <span className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs font-semibold">{scorecard.assessmentStatus}</span>
            </div>
          </div>

          <div className="grid gap-3 p-5 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-500">Known-risk penalties</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">-{scorecard.riskPenalty}</div>
              <div className="mt-1 text-xs text-slate-500">Only confirmed findings reduce this score.</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-500">Evidence coverage</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{scorecard.evidenceCoveragePercent}%</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-blue-600" style={{ width: `${scorecard.evidenceCoveragePercent}%` }} /></div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-500">Action status</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{riskFindings.length}</div>
              <div className="mt-1 text-xs text-slate-500">scored risk{riskFindings.length === 1 ? '' : 's'} · {evidenceGaps.length} evidence gap{evidenceGaps.length === 1 ? '' : 's'}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <h3 className="text-sm font-bold text-amber-950">Why PFS says "not observed"</h3>
            <p className="mt-1 text-sm leading-6 text-amber-950/80">
              The capture does not expose enough Child-SA rekey or gateway state evidence to prove PFS. The deterministic audit therefore keeps PFS as <strong>not determined from capture</strong>. The ML model may still predict PFS state from packet/flow features, but that is a prediction, not packet-observed proof.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-amber-200 bg-white p-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-800"><Eye className="h-4 w-4" /> Packet evidence</div>
            <div className="mt-2 text-lg font-bold text-slate-900">{observedPfs}</div>
            <p className="mt-1 text-xs leading-5 text-slate-500">Needs CREATE_CHILD_SA evidence, explicit Child-SA config, or gateway telemetry to confirm.</p>
          </div>
          <div className="rounded-lg border border-purple-200 bg-white p-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-purple-700"><Cpu className="h-4 w-4" /> ML prediction</div>
            <div className="mt-2 text-lg font-bold text-slate-900">{pfsPrediction ? pfsLabel[pfsPrediction.prediction] || pfsPrediction.prediction : 'Unavailable'}</div>
            <p className="mt-1 text-xs leading-5 text-slate-500">{pfsConfidence ? `Model confidence: ${pfsConfidence}. Treat this as inference until confirmed by config or telemetry.` : 'No PFS model result returned for this capture.'}</p>
          </div>
        </div>
      </section>

      {mlSecurityFindings && mlSecurityFindings.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">ML-inferred security findings</h3>
                {evidenceBadge('ML predicted', 'ml')}
              </div>
              <p className="mt-1 text-xs text-slate-500">Separated from packet-observed audit results so predictions do not look like decoded facts.</p>
            </div>
            <div className="text-xs text-slate-500">Findings: <strong className="text-slate-900">{mlSecurityFindings.length}</strong></div>
          </div>
          <div className="grid gap-3 p-4 xl:grid-cols-2">
            {mlSecurityFindings.map((finding) => (
              <article key={finding.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${severityBadge(finding.severity)}`}>{finding.severity}</span>
                    <h4 className="text-sm font-bold text-slate-900">{finding.title}</h4>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">{(finding.confidence * 100).toFixed(1)}% {finding.confidence_label}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-700">{finding.message}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{finding.detail}</p>
                {finding.recommendation && (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
                    <strong className="text-slate-900">Recommendation:</strong> {finding.recommendation}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="border-b border-slate-200 p-4">
            <h3 className="text-sm font-bold text-slate-900">Packet-observed negotiation details</h3>
            <p className="mt-1 text-xs text-slate-500">Fields decoded from visible IKE/IP headers. Unknown values are evidence gaps, not safe defaults.</p>
          </div>
          <div className="text-sm">
            <DetailRow label="IKE version" value={sa.ikeVersion} reference="RFC 7296" tone={sa.ikeVersion === 'Not observed in capture' ? 'gap' : 'observed'} />
            <DetailRow label="Operating mode" value={`${sa.operationalMode} (${sa.ipVersion})`} reference="RFC 4301" tone={sa.operationalMode === 'Not determined from capture' ? 'gap' : 'observed'} />
            <DetailRow label="Encryption" value={`${sa.encryptionAlgorithm}${sa.encryptionKeyBits > 0 ? ` (${sa.encryptionKeyBits}-bit)` : ''}`} reference="NIST SP 800-77" tone={sa.encryptionAlgorithm === 'Not observed in capture' ? 'gap' : 'observed'} />
            <DetailRow label="Integrity" value={sa.authIntegrityAlgorithm} reference="RFC 8221" tone={sa.authIntegrityAlgorithm === 'Not observed in capture' ? 'gap' : 'observed'} />
            <DetailRow label="DH group" value={`${sa.dhGroup}${sa.dhBits > 0 ? ` (${sa.dhBits}-bit)` : ''}`} reference="NIST SP 800-56A" tone={sa.dhGroup === 'Not observed in capture' ? 'gap' : 'observed'} />
            <DetailRow label="PFS" value={observedPfs} reference="Child-SA evidence required" tone={sa.pfsEnabled === null ? 'gap' : 'observed'} />
            <DetailRow label="Replay protection" value={sa.replayProtection === null ? 'Not determined' : sa.replayProtection ? `Enabled${sa.replayWindowSize ? `, window ${sa.replayWindowSize}` : ''}` : 'Disabled'} reference="RFC 4303" tone={sa.replayProtection === null ? 'gap' : 'observed'} />
            <DetailRow label="SA lifetime" value={sa.keyLifetimeSeconds === null ? 'Not observed' : `${sa.keyLifetimeSeconds / 3600} hours (${sa.keyLifetimeSeconds}s)`} reference="8-24 hours recommended" tone={sa.keyLifetimeSeconds === null ? 'gap' : 'observed'} />
          </div>
        </div>

        {observations && (
          <aside className="rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="border-b border-slate-200 p-4">
              <div className="flex items-center gap-2">
                <Radar className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Wire-visible frame observations</h3>
              </div>
              <p className="mt-1 text-xs text-slate-500">Counts and packet metadata visible without decrypting ESP.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4">
              {[
                ['Total', observations.totalPackets],
                ['IKE', observations.ikePackets],
                ['ESP', observations.espPackets],
                ['AH', observations.ahPackets],
                ['UDP', observations.udpPackets],
                ['NAT-T', observations.natTraversal],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[11px] font-semibold text-slate-500">{label}</div>
                  <div className="mt-1 break-words text-base font-bold text-slate-900">{value}</div>
                </div>
              ))}
            </div>
            <div className="space-y-2 border-t border-slate-200 p-4 text-xs leading-5 text-slate-600">
              <div><strong className="text-slate-900">IKE exchanges:</strong> {observations.ikeExchanges.join(', ') || 'None'}</div>
              <div><strong className="text-slate-900">Payloads:</strong> {observations.ikePayloads.join(', ') || 'None'}</div>
              <div><strong className="text-slate-900">ESP SPIs:</strong> {observations.espSpis.join(', ') || 'None'}</div>
              <div><strong className="text-slate-900">ESP sequence:</strong> {observations.espSequenceRange}</div>
              {observations.captureNotes.map((note, index) => (
                <div key={index} className="rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-800">{note}</div>
              ))}
            </div>
          </aside>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col gap-2 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Compliance matrix</h3>
            <p className="mt-1 text-xs text-slate-500">Observed controls, expected baseline, and score impact.</p>
          </div>
          <div className="text-xs text-slate-500">Evidence coverage: <strong className="text-slate-900">{scorecard.evidenceCoveragePercent}%</strong></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs table-compact">
            <thead>
              <tr>
                <th>Control</th>
                <th>Current value</th>
                <th>Expected baseline</th>
                <th>Result</th>
                <th className="text-right">Impact</th>
              </tr>
            </thead>
            <tbody>
              {scorecard.findings.map((finding) => (
                <tr key={finding.id}>
                  <td className="font-semibold text-slate-900">{finding.parameter}</td>
                  <td className="max-w-[280px] whitespace-normal break-words text-slate-700">{finding.detectedValue}</td>
                  <td className="max-w-[280px] whitespace-normal break-words text-slate-600">{finding.recommendedValue}</td>
                  <td><span className={`rounded border px-2 py-0.5 text-[11px] font-semibold ${severityBadge(finding.severity)}`}>{finding.severity}</span></td>
                  <td className="text-right font-semibold">{finding.penalty > 0 ? <span className="text-rose-600">-{finding.penalty}</span> : <span className="text-slate-400">0</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="border-b border-slate-200 p-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">Threats that affect score</h3>
            </div>
          </div>
          <div className="space-y-3 p-4">
            {riskFindings.length > 0 ? riskFindings.map((finding) => <FindingCard key={finding.id} finding={finding} />) : (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                <CheckCircle2 className="mr-2 inline h-4 w-4" /> No observed configuration risk was scored.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="border-b border-slate-200 p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">Evidence gaps</h3>
            </div>
            <p className="mt-1 text-xs text-slate-500">These are unknown controls. They are not counted as confirmed vulnerabilities.</p>
          </div>
          <div className="space-y-3 p-4">
            {evidenceGaps.length > 0 ? evidenceGaps.map((finding) => (
              <div key={finding.id} className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {evidenceBadge('needs evidence', 'gap')}
                  <h4 className="text-sm font-bold text-slate-900">{finding.parameter}</h4>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-700">{finding.description}</p>
                <p className="mt-2 text-sm leading-6 text-amber-900"><strong>Next evidence:</strong> {finding.remediation}</p>
              </div>
            )) : (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">No current evidence gaps.</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
