import fs from 'node:fs';
import {auditIpsecSecurity} from '../src/utils/securityAuditor';
import {classifyEspTraffic} from '../src/utils/aiClassifier';
const sample=JSON.parse(fs.readFileSync('presentation_work/evidence/sample_analysis.json','utf8'));
fs.writeFileSync('presentation_work/evidence/sample_assessment.json',JSON.stringify({scorecard:auditIpsecSecurity(sample.sa),workloadHeuristic:classifyEspTraffic(sample.features)},null,2));
