import { AiPrediction, EspTrafficFeatures, TrafficCategory } from '../types';

type WorkloadCategory = Exclude<TrafficCategory, 'Live Real Capture' | 'INSUFFICIENT_DATA'>;

type WorkloadModelClass = {
  category: WorkloadCategory;
  centroid: number[];
  spread: number[];
};

const FEATURE_NAMES = [
  'duration',
  'packet_count',
  'total_bytes',
  'mean_packet_size',
  'std_packet_size',
  'min_packet_size',
  'max_packet_size',
  'mean_interarrival',
  'packet_rate',
  'byte_rate',
  'flow_symmetry',
] as const;

const FEATURE_MEANS = [
  3.522338,
  6.836589,
  13.05789,
  6.229202,
  4.941508,
  4.376137,
  6.7113,
  0.066085,
  3.434657,
  9.596184,
  0.5227,
];

const FEATURE_STDEVS = [
  1.123268,
  1.928727,
  2.423974,
  0.807634,
  1.078569,
  0.20808,
  0.745443,
  0.079664,
  1.145445,
  1.843769,
  0.332617,
];

const WORKLOAD_MODEL: WorkloadModelClass[] = [
  {
    category: 'Email',
    centroid: [-0.344011, -0.83059, -0.536304, 0.377899, 0.688999, 0.515289, 0.50544, 0.63263, -1.009891, -0.488097, 0.451332],
    spread: [0.896513, 0.584213, 0.485281, 0.35, 0.35, 0.944698, 0.35, 0.525958, 0.35, 0.35, 0.515879],
  },
  {
    category: 'File Transfer',
    centroid: [0.176907, 0.913086, 1.092558, 1.090206, 0.328592, 0.213269, 0.766191, -0.735287, 1.301768, 1.318472, -1.457132],
    spread: [0.952747, 0.595018, 0.474354, 0.35, 0.35, 0.870128, 0.35, 0.35, 0.35, 0.35, 0.35],
  },
  {
    category: 'ICMP',
    centroid: [-0.485213, -1.268573, -1.610587, -1.781672, -1.915379, -1.231847, -2.060874, 1.931828, -1.528785, -1.814143, 1.005652],
    spread: [0.751721, 0.479984, 0.401501, 0.35, 0.613121, 1.031732, 0.35, 0.931822, 0.35, 0.35, 0.35],
  },
  {
    category: 'Video',
    centroid: [0.972706, 1.217041, 1.287832, 0.950284, 0.481529, 0.26257, 0.692162, -0.696851, 1.010064, 1.074285, -1.069973],
    spread: [0.582127, 0.367384, 0.35, 0.35, 0.35, 0.806017, 0.35, 0.35, 0.35, 0.35, 0.35],
  },
  {
    category: 'VoIP',
    centroid: [0.548244, 0.602086, 0.126648, -1.061232, -0.935441, -0.272327, -0.801005, -0.570555, 0.405154, -0.190148, 0.998313],
    spread: [0.510075, 0.35, 0.35, 0.35, 0.35, 0.562102, 0.35, 0.35, 0.35, 0.35, 0.35],
  },
  {
    category: 'Web',
    centroid: [-0.993206, -0.400182, -0.154128, 0.490586, 0.897068, 0.415927, 0.594074, -0.538105, 0.353112, 0.457767, -0.578757],
    spread: [0.888942, 0.613789, 0.486135, 0.35, 0.35, 0.834603, 0.35, 0.35, 0.35, 0.35, 0.35],
  },
  {
    category: 'WhatsApp',
    centroid: [0.124573, -0.232868, -0.206017, -0.066071, 0.454632, 0.097119, 0.304011, -0.02366, -0.531422, -0.358137, 0.650565],
    spread: [0.836906, 0.521466, 0.405833, 0.35, 0.35, 0.685408, 0.35, 0.35, 0.35, 0.35, 0.4613],
  },
];

export function calculateEntropy(data: Uint8Array): number {
  if (data.length === 0) return 0;
  const frequencies = new Array(256).fill(0);
  for (let i = 0; i < data.length; i++) {
    frequencies[data[i]]++;
  }
  let entropy = 0;
  for (let i = 0; i < 256; i++) {
    if (frequencies[i] > 0) {
      const p = frequencies[i] / data.length;
      entropy -= p * Math.log2(p);
    }
  }
  return Number(entropy.toFixed(3));
}

function log1p(value: number): number {
  return Math.log1p(Math.max(0, Number.isFinite(value) ? value : 0));
}

function getFeatureVector(features: EspTrafficFeatures): number[] {
  const durationSeconds = Math.max((features.flowDurationMs ?? 0) / 1000, 0);
  const fallbackDuration = features.meanInterArrivalTimeMs > 0 && features.packetCount > 1
    ? (features.meanInterArrivalTimeMs * (features.packetCount - 1)) / 1000
    : 0;
  const effectiveDuration = durationSeconds > 0 ? durationSeconds : fallbackDuration;
  const packetRate = effectiveDuration > 0 ? features.packetCount / effectiveDuration : 0;
  const byteRate = effectiveDuration > 0 ? features.totalBytes / effectiveDuration : 0;

  return [
    log1p(effectiveDuration),
    log1p(features.packetCount),
    log1p(features.totalBytes),
    log1p(features.meanPacketLength),
    log1p(features.stdPacketLength),
    log1p(features.minPacketLength),
    log1p(features.maxPacketLength),
    log1p(features.meanInterArrivalTimeMs / 1000),
    log1p(packetRate),
    log1p(byteRate),
    Math.max(0, Math.min(1, features.flowSymmetry)),
  ];
}

function standardize(vector: number[]): number[] {
  return vector.map((value, index) => (value - FEATURE_MEANS[index]) / FEATURE_STDEVS[index]);
}

function distanceToClass(vector: number[], modelClass: WorkloadModelClass): number {
  const distance = vector.reduce((sum, value, index) => {
    const scaled = (value - modelClass.centroid[index]) / modelClass.spread[index];
    return sum + scaled * scaled;
  }, 0);
  return distance / FEATURE_NAMES.length;
}

function confidenceFromDistances(distance: number, runnerUpDistance: number): number {
  const margin = Math.max(0, runnerUpDistance - distance);
  const closeness = 1 / (1 + distance);
  const marginScore = 1 - Math.exp(-margin / 3);
  return Math.round(Math.max(15, Math.min(96, (0.65 * closeness + 0.35 * marginScore) * 100)));
}

export function classifyEspTraffic(features: EspTrafficFeatures): AiPrediction {
  if (features.packetCount < 5 || features.totalBytes === 0) {
    return {
      predictedClass: 'INSUFFICIENT_DATA',
      confidenceScore: 0,
      probabilities: [],
      primaryFeatures: [{
        name: 'Sample size',
        value: `${features.packetCount} ESP packets`,
        impact: 'Neutral',
        explanation: 'Insufficient ESP observations for a reliable workload classification.',
      }],
      source: 'UNKNOWN',
      status: 'NOT_DETERMINABLE',
      evidence: 'Fewer than five ESP packets or no ESP bytes were available.',
    };
  }

  const standardized = standardize(getFeatureVector(features));
  const ranked = WORKLOAD_MODEL
    .map((modelClass) => ({
      category: modelClass.category,
      distance: distanceToClass(standardized, modelClass),
    }))
    .sort((a, b) => a.distance - b.distance);

  const top = ranked[0];
  const runnerUp = ranked[1] ?? top;
  const confidenceScore = confidenceFromDistances(top.distance, runnerUp.distance);
  const inverseScores = ranked.map((item) => ({
    category: item.category,
    score: 1 / (1 + item.distance),
  }));
  const totalScore = inverseScores.reduce((sum, item) => sum + item.score, 0);
  const probabilities = inverseScores
    .map((item) => ({
      category: item.category,
      probability: Math.round((item.score / totalScore) * 100),
    }))
    .sort((a, b) => b.probability - a.probability);

  const durationSeconds = Math.max((features.flowDurationMs ?? 0) / 1000, 0);
  const effectiveDuration = durationSeconds > 0
    ? durationSeconds
    : (features.meanInterArrivalTimeMs * Math.max(0, features.packetCount - 1)) / 1000;
  const packetRate = effectiveDuration > 0 ? features.packetCount / effectiveDuration : 0;
  const byteRate = effectiveDuration > 0 ? features.totalBytes / effectiveDuration : 0;

  const primaryFeatures = [
    {
      name: 'Packet size profile',
      value: `${Math.round(features.meanPacketLength)} bytes avg, +/-${Math.round(features.stdPacketLength)} std dev`,
      impact: 'Supporting' as const,
      explanation: `Compared with labeled ${top.category} flows from network_traffic_labeled_dataset.csv.`,
    },
    {
      name: 'Flow volume',
      value: `${features.packetCount} packets / ${features.totalBytes} bytes`,
      impact: 'Supporting' as const,
      explanation: 'Packet and byte totals help separate short control flows from long media or transfer flows.',
    },
    {
      name: 'Timing rate',
      value: `${features.meanInterArrivalTimeMs.toFixed(2)} ms IAT, ${packetRate.toFixed(2)} pkt/s`,
      impact: 'Supporting' as const,
      explanation: 'Cadence and packet rate are matched against the labeled workload baseline.',
    },
    {
      name: 'Direction symmetry',
      value: `${features.flowSymmetry.toFixed(3)} symmetry, ${byteRate.toFixed(1)} B/s`,
      impact: 'Supporting' as const,
      explanation: 'Symmetry and byte rate help distinguish bidirectional chat/control traffic from asymmetric transfer or video flows.',
    },
  ];

  return {
    predictedClass: top.category,
    confidenceScore,
    probabilities,
    primaryFeatures,
    source: 'DERIVED_FROM_OBSERVED_DATA',
    status: 'INFERRED',
    evidence: 'Dataset-derived encrypted-flow workload estimate using centroids trained from network_traffic_labeled_dataset.csv. It does not decrypt ESP payloads.',
  };
}
