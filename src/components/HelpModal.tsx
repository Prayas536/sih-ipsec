import React, { useEffect } from 'react';
import { Activity, ArrowDown, CircleHelp, FileText, Network, ShieldCheck, Upload, X } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const topics = [
  { id: 'help-start', label: 'Start an analysis', icon: Upload },
  { id: 'help-results', label: 'Read the results', icon: ShieldCheck },
  { id: 'help-reports', label: 'Create a report', icon: FileText },
  { id: 'help-navigation', label: 'Find your way around', icon: Network },
];

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="help-backdrop" onMouseDown={onClose}>
      <section
        aria-labelledby="help-title"
        aria-modal="true"
        className="help-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="help-dialog-header">
          <div className="flex min-w-0 items-start gap-3">
            <span className="help-mark"><CircleHelp aria-hidden="true" className="h-5 w-5" /></span>
            <div className="min-w-0">
              <p className="help-eyebrow">Workspace guide</p>
              <h2 className="help-title" id="help-title">Your first analysis, step by step</h2>
              <p className="help-subtitle">A quick map of the tools and what each result means.</p>
            </div>
          </div>
          <button aria-label="Close help" className="help-close" onClick={onClose} type="button">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </header>

        <div className="help-dialog-body">
          <nav aria-label="Help topics" className="help-topic-nav">
            {topics.map(({ id, label, icon: Icon }, index) => (
              <a className="help-topic-link" href={`#${id}`} key={id}>
                <span className="help-topic-number">0{index + 1}</span>
                <Icon aria-hidden="true" className="h-4 w-4" />
                <span>{label}</span>
                <ArrowDown aria-hidden="true" className="help-topic-arrow h-3.5 w-3.5" />
              </a>
            ))}
          </nav>

          <div className="help-content">
            <section className="help-section" id="help-start">
              <p className="help-section-kicker">01 / Input</p>
              <h3>Start with a capture</h3>
              <ol className="help-steps">
                <li><span>1</span><div><strong>Open PCAP Analysis.</strong> Use the primary navigation.</div></li>
                <li><span>2</span><div><strong>Choose a file.</strong> Select “Upload PCAP” or drop a <code>.pcap</code>, <code>.pcapng</code>, or <code>.cap</code> file into the upload area.</div></li>
                <li><span>3</span><div><strong>Optionally select a gateway first.</strong> Correlation compares ESP SPIs with gateway telemetry; PCAP analysis works without it.</div></li>
              </ol>
              <p className="help-note">Encrypted ESP payloads are not decrypted by this analyzer.</p>
            </section>

            <section className="help-section" id="help-results">
              <p className="help-section-kicker">02 / Findings</p>
              <h3>Observed facts come before estimates</h3>
              <div className="help-result-row help-result-observed">
                <span className="help-result-tag">Observed</span>
                <p>Decoded from visible packet headers and capture metadata: IKE version, packet counts, negotiated values when visible, and evidence gaps. “Not observed” means the capture did not prove that value.</p>
              </div>
              <div className="help-result-row help-result-derived">
                <span className="help-result-tag">Rule assessment</span>
                <p>Security posture, compliance checks, and remediation are deterministic project rules applied to available evidence. They are not a standards certification.</p>
              </div>
              <div className="help-result-row help-result-estimated">
                <span className="help-result-tag">Estimated</span>
                <p>ML crypto predictions and traffic-pattern estimates are shown separately after packet evidence. Confidence is not measured accuracy, and a prediction is not proof of negotiated configuration.</p>
              </div>
            </section>

            <section className="help-section" id="help-reports">
              <p className="help-section-kicker">03 / Output</p>
              <h3>Generate and find reports</h3>
              <ol className="help-steps">
                <li><span>1</span><div>After analysis, choose <strong>View report</strong> in the capture header.</div></li>
                <li><span>2</span><div>Select the <strong>Executive</strong> summary or <strong>Technical</strong> report, review the preview, then download the PDF.</div></li>
                <li><span>3</span><div>Open <strong>Reports</strong> to return to documents for captures and gateways in this session.</div></li>
              </ol>
            </section>

            <section className="help-section" id="help-navigation">
              <p className="help-section-kicker">04 / Workspace</p>
              <h3>What lives where</h3>
              <div className="help-map">
                <div><strong>Dashboard</strong><span>Session summary, gateway status, and recent activity.</span></div>
                <div><strong>PCAP Analysis</strong><span>Upload captures; review observed evidence, rule assessment, ML estimates, and packet details.</span></div>
                <div><strong>Gateways</strong><span>Enroll and inspect telemetry sources for optional live correlation.</span></div>
                <div><strong>Reports</strong><span>Open executive, technical, and gateway audit documents.</span></div>
                <div><strong>Testbed</strong><span>Generate controlled sample configurations and captures for demonstrations.</span></div>
                <div><strong>System status</strong><span>Check which local analysis services and report tools are configured.</span></div>
              </div>
              <p className="help-note"><Activity aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />Press <kbd>Ctrl</kbd> + <kbd>K</kbd> (or <kbd>⌘</kbd> + <kbd>K</kbd>) to search common actions.</p>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
};