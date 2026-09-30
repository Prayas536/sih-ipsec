import React from 'react';
import { Activity, ArrowDown, Cpu, Eye, FileSearch } from 'lucide-react';
import type { AiPrediction, SecurityScorecard, VpnCaptureScenario } from '../types';
import { PacketViewer } from './PacketViewer';
import { SecurityAssessment } from './SecurityAssessment';
import { ModelEstimates } from './ModelEstimates';

interface AnalysisResultsProps {
  scenario: VpnCaptureScenario;
  scorecard: SecurityScorecard;
  prediction: AiPrediction;
}

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({ scenario, scorecard, prediction }) => {
  const observations = scenario.sa.observations;
  const durationMs = scenario.features.flowDurationMs ?? 0;
  const stats = [
    { label: 'Captured packets', value: (observations?.totalPackets ?? scenario.packets.length).toLocaleString() },
    { label: 'IKE packets', value: (observations?.ikePackets ?? scenario.packets.filter((packet) => packet.protocol === 'IKE').length).toLocaleString() },
    { label: 'ESP packets', value: (observations?.espPackets ?? scenario.features.packetCount).toLocaleString() },
    { label: 'Capture duration', value: durationMs > 0 ? `${(durationMs / 1000).toFixed(2)} s` : 'Not available' },
  ];

  const jumpTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="analysis-results">
      <nav aria-label="Analysis sections" className="analysis-jump-nav">
        <button onClick={() => jumpTo('observed-results')} type="button"><span>01</span> Observed in PCAP</button>
        <button onClick={() => jumpTo('ml-results')} type="button"><span>02</span> Model estimates</button>
      </nav>

      <section aria-labelledby="observed-title" className="evidence-section observed-section" id="observed-results">
        <header className="evidence-section-header">
          <div className="evidence-section-title">
            <span className="evidence-section-icon observed-icon"><Eye aria-hidden="true" className="h-5 w-5" /></span>
            <div>
              <p className="evidence-overline">01 / Packet evidence</p>
              <h2 id="observed-title">Observed in this capture</h2>
              <p>Values decoded from visible packet headers and capture metadata.</p>
            </div>
          </div>
          <span className="source-pill source-pill-observed">Directly parsed</span>
        </header>

        <div className="observed-stats" aria-label="Capture summary">
          {stats.map((stat) => (
            <div className="observed-stat" key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </div>
          ))}
        </div>

        <div className="evidence-subsection">
          <div className="evidence-subsection-heading">
            <Activity aria-hidden="true" className="h-4 w-4" />
            <div><h3>Security assessment</h3><p>Rule-based checks applied to the observed evidence.</p></div>
          </div>
          <SecurityAssessment
            scorecard={scorecard}
            sa={scenario.sa}
            gatewayTelemetry={scenario.gatewayTelemetry}
            correlation={scenario.correlation}
          />
        </div>

        <details className="packet-details" id="packet-details">
          <summary>
            <span><FileSearch aria-hidden="true" className="h-4 w-4" />Inspect packet-by-packet details</span>
            <span className="packet-details-count">{scenario.packets.length.toLocaleString()} packets <ArrowDown aria-hidden="true" className="h-3.5 w-3.5" /></span>
          </summary>
          <div className="packet-details-content"><PacketViewer packets={scenario.packets} /></div>
        </details>
      </section>

      <section aria-labelledby="ml-title" className="evidence-section estimate-section" id="ml-results">
        <header className="evidence-section-header">
          <div className="evidence-section-title">
            <span className="evidence-section-icon estimate-icon"><Cpu aria-hidden="true" className="h-5 w-5" /></span>
            <div>
              <p className="evidence-overline">02 / Statistical inference</p>
              <h2 id="ml-title">Model estimates</h2>
              <p>Predictions from capture patterns; these are not packet-observed facts.</p>
            </div>
          </div>
          <span className="source-pill source-pill-estimate">Estimated, not confirmed</span>
        </header>
        <ModelEstimates
          prediction={prediction}
          mlPredictions={scenario.mlPredictions}
          mlWarning={scenario.mlWarning}
          mlSecurityFindings={scenario.mlSecurityFindings}
        />
      </section>
    </div>
  );
};