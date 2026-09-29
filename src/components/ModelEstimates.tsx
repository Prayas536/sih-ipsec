import React from 'react';
import { AlertTriangle, Cpu, Info, ShieldAlert, Sparkles } from 'lucide-react';
import type { AiPrediction, MLPredictions, MLSecurityFinding } from '../types';

interface ModelEstimatesProps {
  prediction: AiPrediction;
  mlPredictions?: MLPredictions | null;
  mlWarning?: string | null;
  mlSecurityFindings?: MLSecurityFinding[];
}

const TARGETS = [
  ['encryption', 'Encryption'],
  ['hash', 'Integrity'],
  ['dh_group', 'Key exchange group'],
  ['pfs_group', 'Perfect forward secrecy'],
] as const;

const confidenceLabel = (confidence: number | null) => {
  if (confidence === null) return { label: 'Unavailable', tone: 'confidence-unknown' };
  if (confidence >= 0.8) return { label: `${(confidence * 100).toFixed(1)}% · higher`, tone: 'confidence-high' };
  if (confidence >= 0.55) return { label: `${(confidence * 100).toFixed(1)}% · moderate`, tone: 'confidence-medium' };
  return { label: `${(confidence * 100).toFixed(1)}% · lower`, tone: 'confidence-low' };
};

const resultLabel = (value: string) => ({
  AES256: 'AES-256',
  AES128: 'AES-128',
  SHA256: 'SHA-256',
  SHA384: 'SHA-384',
  DH14: 'DH Group 14',
  DH15: 'DH Group 15',
  NOPFS: 'No PFS predicted',
  PFS14: 'PFS · DH Group 14',
  PFS15: 'PFS · DH Group 15',
}[value] || value);

export const ModelEstimates: React.FC<ModelEstimatesProps> = ({
  prediction,
  mlPredictions,
  mlWarning,
  mlSecurityFindings = [],
}) => (
  <div className="model-estimates-content">
    <div className="estimate-caveat">
      <Info aria-hidden="true" className="h-4 w-4 shrink-0" />
      <p>Models infer likely settings from packet and flow features. Verify important results against a gateway configuration or other authoritative source.</p>
    </div>

    {mlPredictions ? (
      <section aria-label="Cryptographic parameter estimates" className="estimate-panel">
        <div className="estimate-panel-heading">
          <div><h3>Cryptographic parameters</h3><p>Four trained models · confidence is not model accuracy.</p></div>
          <Cpu aria-hidden="true" className="h-4 w-4" />
        </div>
        <div className="estimate-list">
          {TARGETS.map(([key, label]) => {
            const result = mlPredictions[key];
            const confidence = confidenceLabel(result.confidence);
            const alternatives = Object.entries(result.probabilities || {})
              .map(([name, value]) => `${resultLabel(name)} ${Math.round(value * 100)}%`)
              .join(' · ');
            return (
              <div className="estimate-row" key={key}>
                <span className="estimate-parameter">{label}</span>
                <strong className="estimate-value">{resultLabel(result.prediction)}</strong>
                <span className={`estimate-confidence ${confidence.tone}`}>{confidence.label}</span>
                <span className="estimate-alternatives">{alternatives}</span>
              </div>
            );
          })}
        </div>
      </section>
    ) : (
      <div className={`estimate-unavailable ${mlWarning ? 'estimate-warning' : ''}`}>
        <AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0" />
        <p><strong>{mlWarning ? 'ML estimates unavailable' : 'No ML estimates returned'}</strong>{mlWarning ? `: ${mlWarning}` : ' for this capture.'}</p>
      </div>
    )}

    {mlSecurityFindings.length > 0 && (
      <section className="estimate-panel">
        <div className="estimate-panel-heading">
          <div><h3>Inferred security findings</h3><p>Recommendations based on model predictions.</p></div>
          <ShieldAlert aria-hidden="true" className="h-4 w-4" />
        </div>
        <div className="estimate-findings">
          {mlSecurityFindings.map((finding) => (
            <article className="estimate-finding" key={finding.id}>
              <div className="estimate-finding-title"><strong>{finding.title}</strong><span>{(finding.confidence * 100).toFixed(1)}% confidence</span></div>
              <p>{finding.message}</p>
              {finding.recommendation && <p className="estimate-recommendation"><strong>Suggested action:</strong> {finding.recommendation}</p>}
            </article>
          ))}
        </div>
      </section>
    )}

    <section className="estimate-panel traffic-estimate">
      <div className="estimate-panel-heading">
        <div><h3>Traffic pattern estimate</h3><p>Rule-based match from encrypted ESP packet shape; not the trained crypto model.</p></div>
        <Sparkles aria-hidden="true" className="h-4 w-4" />
      </div>
      <div className="traffic-estimate-summary">
        <span>Top match</span>
        <strong>{prediction.predictedClass}</strong>
        <span>{prediction.status === 'NOT_DETERMINABLE' ? 'Insufficient evidence' : `${prediction.confidenceScore}% relative match`}</span>
      </div>
      <div className="traffic-estimate-list">
        {prediction.probabilities.map((item) => (
          <div className="traffic-estimate-row" key={item.category}>
            <span>{item.category}</span>
            <div className="traffic-estimate-track"><span style={{ width: `${Math.max(0, Math.min(100, item.probability))}%` }} /></div>
            <strong>{item.probability}%</strong>
          </div>
        ))}
      </div>
    </section>

    <p className="estimate-footnote"><Info aria-hidden="true" className="h-3.5 w-3.5" />Encrypted application payloads remain opaque; workload labels do not confirm application identity.</p>
  </div>
);