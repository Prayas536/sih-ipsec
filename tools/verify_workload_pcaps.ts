import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseUploadedFile } from '../src/utils/pcapParser';
import { classifyEspTraffic } from '../src/utils/aiClassifier';

const dir = process.argv[2] ?? 'test_pcaps/workload_samples';

for (const name of readdirSync(dir).filter((file) => file.endsWith('.pcap')).sort()) {
  const bytes = readFileSync(join(dir, name));
  const file = new File([bytes], name, { type: 'application/vnd.tcpdump.pcap' });
  const parsed = await parseUploadedFile(file);
  const prediction = classifyEspTraffic(parsed.features);
  console.log(`${name}: ${prediction.predictedClass} (${prediction.confidenceScore}%) | ${parsed.sa.ikeVersion} | ${parsed.sa.encryptionAlgorithm} | ${parsed.sa.authIntegrityAlgorithm} | ${parsed.sa.dhGroup}`);
}
