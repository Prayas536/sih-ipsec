import React, { useState } from 'react';
import {
  X,
  Download,
  FileDown,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  FileText,
  FileJson,
  Wifi,
} from 'lucide-react';
import { AiPrediction, IkeSecurityAssociation, SecurityScorecard, VpnCaptureScenario } from '../types';
import { CombinedAnalysisPanel } from './CombinedAnalysisPanel';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenario: VpnCaptureScenario;
  scorecard: SecurityScorecard;
  prediction: AiPrediction;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  scenario,
  scorecard,
  prediction,
}) => {
  const [reportType, setReportType] = useState<'EXECUTIVE' | 'TECHNICAL' | 'COMBINED'>('EXECUTIVE');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyMarkdown = () => {
    const content = generateMarkdownReport();
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const content = generateMarkdownReport();
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `IPsec_Security_Report_${scenario.id}_${reportType.toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const exportData = {
      reportType: 'IPSEC_SECURITY_AUDIT_EVIDENCE',
      generatedAt: new Date().toISOString(),
      scenario: {
        id: scenario.id,
        name: scenario.name,
        organization: scenario.organization,
        description: scenario.description,
        sa: scenario.sa,
        features: scenario.features,
        packetCount: scenario.packets.length,
        gatewayTelemetry: scenario.gatewayTelemetry ?? null,
        correlation: scenario.correlation ?? null,
      },
      scorecard,
      prediction,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `IPsec_Security_Audit_${scenario.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    let y = 16;

    const section = (title: string) => {
      if (y > pageHeight - 22) {
        doc.addPage();
        y = margin;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(25, 50, 72);
      doc.text(title, margin, y);
      y += 7;
    };
    const paragraph = (text: string) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(45, 55, 65);
      const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
      if (y + lines.length * 4.5 > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(lines, margin, y);
      y += lines.length * 4.5 + 4;
    };
    const table = (head: string[], body: string[][]) => {
      if (y > pageHeight - 25) {
        doc.addPage();
        y = margin;
      }
      autoTable(doc, {
        startY: y,
        head: [head],
        body: body.length ? body : [["No data", ...head.slice(1).map(() => "")]],
        margin: { left: margin, right: margin },
        styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [28, 66, 83], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 248, 249] },
      });
      y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 12;
      y += 7;
    };

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(24, 54, 70);
    doc.text('IPsec Security Assessment Report', margin, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(75, 85, 95);
    doc.text(`${scenario.name} | ${reportType} | ${new Date().toISOString()}`, margin, y);
    y += 9;

    section('Score and Evidence Coverage');
    paragraph(`${scorecard.totalScore}/100 | ${scorecard.rating} | ${scorecard.assessmentStatus} | ${scorecard.evidenceCoveragePercent}% evidence coverage | ${scorecard.riskPenalty} known-risk penalty points`);
    const barWidth = pageWidth - margin * 2;
    const scoreBar = (label: string, value: number, color: [number, number, number]) => {
      doc.setFontSize(8);
      doc.text(`${label}: ${value}%`, margin, y);
      y += 2;
      doc.setFillColor(230, 235, 238);
      doc.rect(margin, y, barWidth, 4, 'F');
      doc.setFillColor(...color);
      doc.rect(margin, y, barWidth * Math.max(0, Math.min(100, value)) / 100, 4, 'F');
      y += 8;
    };
    scoreBar('Evidence-adjusted score', scorecard.totalScore, [25, 132, 105]);
    scoreBar('Evidence coverage', scorecard.evidenceCoveragePercent, [42, 115, 165]);

    section('Observed Security Findings');
    table(['Severity', 'Parameter', 'Detected', 'Recommendation'], scorecard.findings.map((finding) => [
      finding.severity,
      finding.parameter,
      finding.detectedValue,
      finding.remediation,
    ]));

    section('Cryptographic Parameters');
    table(['Parameter', 'Value'], [
      ['IKE version', scenario.sa.ikeVersion],
      ['Operating mode', scenario.sa.operationalMode],
      ['Encryption', `${scenario.sa.encryptionAlgorithm} (${scenario.sa.encryptionKeyBits}-bit)`],
      ['Integrity', scenario.sa.authIntegrityAlgorithm],
      ['DH group', scenario.sa.dhGroup],
      ['PFS', scenario.sa.pfsEnabled === null ? 'Not determined' : scenario.sa.pfsEnabled ? 'Enabled' : 'Disabled'],
      ['Key lifetime', scenario.sa.keyLifetimeSeconds === null ? 'Not determined' : `${scenario.sa.keyLifetimeSeconds} seconds`],
      ['Replay protection', scenario.sa.replayProtection === null ? 'Not determined' : scenario.sa.replayProtection ? 'Enabled' : 'Disabled'],
    ]);

    section('Encrypted Traffic Classification');
    table(['Result', 'Confidence', 'Packet count', 'Entropy'], [[
      prediction.predictedClass,
      `${prediction.confidenceScore}%`,
      String(scenario.features.packetCount),
      `${scenario.features.calculatedEntropy} bits/byte`,
    ]]);

    if (scenario.gatewayTelemetry) {
      section('Gateway Correlation');
      table(['Gateway status', 'Correlation', 'Matched SPIs'], [[
        scenario.gatewayTelemetry.gatewayStatus,
        scenario.gatewayTelemetry.correlationStatus,
        scenario.gatewayTelemetry.matchedSpis.join(', ') || 'No exact match',
      ]]);
    }

    const totalPages = doc.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
      doc.setPage(page);
      doc.setFontSize(7);
      doc.setTextColor(120, 130, 138);
      doc.text('Unknown controls are not treated as secure; findings are based on the displayed evidence.', margin, pageHeight - 7);
      doc.text(`${page}/${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
    }
    doc.save(`IPsec_Security_Report_${scenario.id}_${reportType.toLowerCase()}.pdf`);
  };

  const generateMarkdownReport = () => {
    const gt = scenario.gatewayTelemetry;
    const hasTelemetry = !!gt;

    let telemetrySection = '';
    if (hasTelemetry) {
      telemetrySection = `
---

## 5. Gateway Telemetry & Correlation Audit (Mode 3)
- **Gateway ID:** \`${gt.gatewayId || 'N/A'}\`
- **Adapter:** \`${gt.adapter || 'STRONGSWAN'}\`
- **Gateway Status:** \`${gt.gatewayStatus}\`
- **Correlation Status:** \`${gt.correlationStatus}\`
- **Exact Matched SPIs:** ${gt.matchedSpis.length > 0 ? gt.matchedSpis.map((s) => `\`${s}\``).join(', ') : 'No exact match'}
- **Unmatched PCAP SPIs:** ${gt.unmatchedPcapSpis.length > 0 ? gt.unmatchedPcapSpis.map((s) => `\`${s}\``).join(', ') : 'None'}
- **Telemetry Collected At:** ${gt.collectedAt || 'N/A'}
- **Gateway Evidence:** ${gt.evidence.length > 0 ? gt.evidence.join('; ') : 'No gateway evidence'}
`;
    }

    return `# NTRO IPsec Security Assessment Report: ${scenario.name}
**Report Type:** ${
      reportType === 'EXECUTIVE'
        ? 'Executive Leadership Summary'
        : reportType === 'TECHNICAL'
        ? 'Detailed Technical Protocol Audit'
        : 'Mode 3 Combined PCAP & Gateway Correlation Audit'
    }
**Target Organization:** ${scenario.organization}
**Generated Date:** ${new Date().toISOString()}

---

## 1. Overall Security Scorecard
- **Security Score:** ${scorecard.totalScore} / 100 (${scorecard.rating.toUpperCase()})
- **Evidence Coverage:** ${scorecard.evidenceCoveragePercent}% (${scorecard.assessmentStatus})
- **Known-Risk Penalties:** ${scorecard.riskPenalty} points; unknown controls receive no score credit.
- **NIST SP 800-77 Rev. 1 Status:** ${scorecard.complianceNist === null ? 'NOT VERIFIED' : scorecard.complianceNist ? 'COMPLIANT' : 'NON-COMPLIANT'}
- **RFC 8221 Cryptographic Status:** ${scorecard.complianceRfc8221 === null ? 'NOT VERIFIED' : scorecard.complianceRfc8221 ? 'COMPLIANT' : 'NON-COMPLIANT'}
- **NSA CNSA Suite Status:** ${scorecard.complianceNsaCnsa === null ? 'NOT VERIFIED' : scorecard.complianceNsaCnsa ? 'COMPLIANT' : 'NON-COMPLIANT'}

---

## 2. Inferred Traffic & AI Classification
- **Predicted Payload Activity:** ${prediction.predictedClass}
- **AI Model Confidence:** ${prediction.confidenceScore}%
- **Entropy:** ${scenario.features.calculatedEntropy} / 8.00 bits (Verified encrypted payload)

---

## 3. Cryptographic Parameters
- **IKE Version:** ${scenario.sa.ikeVersion}
- **Operating Mode:** ${scenario.sa.operationalMode} (${scenario.sa.ipVersion})
- **Symmetric Cipher:** ${scenario.sa.encryptionAlgorithm} (${scenario.sa.encryptionKeyBits}-bit)
- **Integrity / Hash:** ${scenario.sa.authIntegrityAlgorithm}
- **Diffie-Hellman Group:** ${scenario.sa.dhGroup} (${scenario.sa.dhBits}-bit)
- **Perfect Forward Secrecy (PFS):** ${scenario.sa.pfsEnabled === null ? 'NOT OBSERVED' : scenario.sa.pfsEnabled ? 'ENABLED' : 'DISABLED'}
- **Key Lifetime:** ${scenario.sa.keyLifetimeSeconds === null ? 'NOT OBSERVED' : `${scenario.sa.keyLifetimeSeconds / 3600} hours`}
- **Replay Protection:** ${scenario.sa.replayProtection === null ? 'NOT OBSERVED' : scenario.sa.replayProtection ? 'ENABLED' : 'DISABLED'}

---

## 4. Key Findings & Remediation Plan
${scorecard.findings
  .filter((f) => f.severity !== 'Pass')
  .map(
    (f) => `### [${f.severity.toUpperCase()}] ${f.parameter}: ${f.threatName}
- **Detected:** ${f.detectedValue}
- **Standard Requirement:** ${f.recommendedValue}
- **Threat:** ${f.description}
- **Action Required:** ${f.remediation}
`
  )
  .join('\n')}${telemetrySection}
`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Automated Security Assessment Report
              </h2>
              <p className="text-xs text-slate-400">
                Official NTRO Protocol Analyzer Security Verification Document
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher */}
            <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
              <button
                id="btn-report-exec"
                onClick={() => setReportType('EXECUTIVE')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  reportType === 'EXECUTIVE'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Executive
              </button>
              <button
                id="btn-report-tech"
                onClick={() => setReportType('TECHNICAL')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  reportType === 'TECHNICAL'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Technical
              </button>
              {scenario.gatewayTelemetry && (
                <button
                  id="btn-report-combined"
                  onClick={() => setReportType('COMBINED')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                    reportType === 'COMBINED'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Wifi className="w-3 h-3" />
                  <span>Mode 3 Combined</span>
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-300 text-xs">
          {reportType === 'COMBINED' && scenario.gatewayTelemetry ? (
            /* Mode 3 Combined Analysis View */
            <div className="space-y-6">
              <CombinedAnalysisPanel
                sa={scenario.sa}
                gatewayTelemetry={scenario.gatewayTelemetry}
                correlation={scenario.correlation}
                packetCount={scenario.packets.length}
              />
            </div>
          ) : reportType === 'EXECUTIVE' ? (
            /* Executive Report View */
            <div className="space-y-6">
              
              {/* Executive Banner */}
              <div className="p-5 rounded-xl bg-slate-800/60 border border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                    Executive Threat &amp; Compliance Verdict
                  </span>
                  <h3 className="text-lg font-bold text-white mt-0.5">
                    {scenario.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Deployment Context: {scenario.description}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-2xl font-black text-white">
                    {scorecard.totalScore} <span className="text-sm font-normal text-slate-400">/ 100</span>
                  </div>
                  <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold uppercase mt-1 ${
                    scorecard.rating === 'Not Rated'
                      ? 'bg-slate-800 text-slate-300 border border-slate-700'
                      : scorecard.totalScore >= 70 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                  }`}>
                    {scorecard.rating} Posture
                  </span>
                  <div className="text-[11px] text-slate-400 mt-1">{scorecard.evidenceCoveragePercent}% evidence coverage · {scorecard.assessmentStatus}</div>
                </div>
              </div>

              {/* High-Level Narrative */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Tactical Risk Assessment Summary
                </h4>
                <div className="text-slate-300 leading-relaxed space-y-2">
                  <p>
                    This IPsec network capture represents encrypted communications under the jurisdiction of{' '}
                    <strong>{scenario.organization}</strong>. Its evidence-adjusted score is{' '}
                    <strong className="text-white">{scorecard.totalScore}/100</strong> with{' '}
                    <strong className="text-white">{scorecard.evidenceCoveragePercent}% evidence coverage</strong>.{' '}
                    {scorecard.assessmentStatus !== 'COMPLETE'
                      ? 'This is a partial assessment; unobserved controls are not treated as secure or as confirmed vulnerabilities.'
                      : scorecard.findings.some((finding) => finding.severity === 'Critical' || finding.severity === 'High')
                      ? 'The observed configuration includes high-risk findings that require review.'
                      : 'No high-risk finding was identified in the assessed fields.'}
                  </p>
                  <p>
                    <strong>AI Inferred Workload:</strong> Even though raw payloads are unreadable due to ESP encapsulation, machine learning models determined with <strong>{prediction.confidenceScore}% confidence</strong> that this tunnel is transmitting <strong>{prediction.predictedClass}</strong> based on statistical framing characteristics.
                  </p>
                </div>
              </div>

              {/* Executive Recommendations List */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  Prioritized Action Items
                </h4>
                <div className="space-y-2">
                  {scorecard.findings
                    .filter((f) => f.severity !== 'Pass')
                    .map((f, i) => (
                      <div key={i} className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-rose-950 text-rose-400 border border-rose-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <div>
                          <div className="font-bold text-white">{f.threatName}</div>
                          <div className="text-slate-400 mt-0.5">{f.remediation}</div>
                        </div>
                      </div>
                    ))}
                  {scorecard.findings.filter((f) => f.severity !== 'Pass').length === 0 && (
                    <div className="text-emerald-400 font-semibold p-3 bg-emerald-950/30 rounded-lg border border-emerald-900">
                      ✓ No immediate executive interventions required. Deployment meets defense standard requirements.
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            /* Technical Report View */
            <div className="space-y-6 font-mono text-xs">
              
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-emerald-400 font-bold">[PROTOCOL AUDIT RECORD]</div>
                <div>Target Gateway: {scenario.packets[0]?.destIp || '10.0.0.1'}</div>
                <div>Initiator SPI: {scenario.sa.initiatorSpi}</div>
                <div>Responder SPI: {scenario.sa.responderSpi}</div>
                <div>Key Lifetime Window: {scenario.sa.keyLifetimeSeconds === null ? 'Not observed' : `${scenario.sa.keyLifetimeSeconds}s`}</div>
                <div>Replay Protection: {scenario.sa.replayProtection === null ? 'Not observed' : scenario.sa.replayProtection ? `ENABLED${scenario.sa.replayWindowSize ? ` (Window ${scenario.sa.replayWindowSize})` : ''}` : 'DISABLED'}</div>
              </div>

              {/* Technical Specifications */}
              <div>
                <h4 className="font-bold text-white mb-2 font-sans">
                  Negotiated Security Association Transforms
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 rounded bg-slate-800/60 border border-slate-700">
                    <div className="text-[10px] text-slate-400">IKE Version</div>
                    <div className="font-bold text-white mt-1">{scenario.sa.ikeVersion}</div>
                  </div>
                  <div className="p-2.5 rounded bg-slate-800/60 border border-slate-700">
                    <div className="text-[10px] text-slate-400">Cipher</div>
                    <div className="font-bold text-white mt-1 truncate">{scenario.sa.encryptionAlgorithm}</div>
                  </div>
                  <div className="p-2.5 rounded bg-slate-800/60 border border-slate-700">
                    <div className="text-[10px] text-slate-400">DH Group</div>
                    <div className="font-bold text-white mt-1">{scenario.sa.dhGroup}</div>
                  </div>
                  <div className="p-2.5 rounded bg-slate-800/60 border border-slate-700">
                    <div className="text-[10px] text-slate-400">PFS Status</div>
                    <div className="font-bold text-white mt-1">
                      {scenario.sa.pfsEnabled === null ? 'Not observed' : scenario.sa.pfsEnabled ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Raw Findings Data Table */}
              <div>
                <h4 className="font-bold text-white mb-2 font-sans">Audit Finding Details</h4>
                <div className="border border-slate-800 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-800/80 text-[10px] uppercase text-slate-400 border-b border-slate-700">
                      <tr>
                        <th className="p-2.5">Parameter</th>
                        <th className="p-2.5">Detected Value</th>
                        <th className="p-2.5">Severity</th>
                        <th className="p-2.5">Identified Vulnerability</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {scorecard.findings.map((f, i) => (
                        <tr key={i} className="hover:bg-slate-800/30">
                          <td className="p-2.5 font-bold text-slate-200">{f.parameter}</td>
                          <td className="p-2.5 text-slate-300">{f.detectedValue}</td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              f.severity === 'Critical' ? 'bg-rose-950 text-rose-300' : (f.severity === 'Pass' ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300')
                            }`}>
                              {f.severity}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-400">{f.threatName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            Exportable report format conforming to NTRO Deliverable E.
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-download-json"
              onClick={handleDownloadJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <FileJson className="w-3.5 h-3.5 text-amber-400" />
              <span>Export JSON</span>
            </button>

            <button
              id="btn-download-pdf"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5 text-cyan-300" />
              <span>Download PDF</span>
            </button>

            <button
              id="btn-copy-report"
              onClick={handleCopyMarkdown}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Markdown!' : 'Copy Markdown'}</span>
            </button>

            <button
              id="btn-download-report"
              onClick={handleDownloadMarkdown}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-500/20 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .MD Report</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
