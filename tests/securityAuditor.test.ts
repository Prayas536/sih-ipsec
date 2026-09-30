import assert from 'node:assert/strict';
import test from 'node:test';
import { auditIpsecSecurity } from '../src/utils/securityAuditor';

test('unknown cryptography cannot be reported as standards compliant', () => {
  const scorecard = auditIpsecSecurity({
    ikeVersion: 'IKEv2',
    operationalMode: 'Not determined from capture',
    ipVersion: 'IPv4',
    encryptionAlgorithm: 'Not observed in capture',
    encryptionKeyBits: 0,
    authIntegrityAlgorithm: 'Not observed in capture',
    dhGroup: 'Not observed in capture',
    dhGroupNumber: 0,
    dhBits: 0,
    pfsEnabled: null,
    keyLifetimeSeconds: null,
    replayProtection: null,
    initiatorSpi: '0x1',
    responderSpi: 'Not observed in capture',
    proposals: [],
  });

  assert.equal(scorecard.complianceNist, null);
  assert.equal(scorecard.complianceRfc8221, null);
  assert.equal(scorecard.complianceNsaCnsa, null);
  assert.ok(scorecard.findings.some((finding) => finding.id === 'F-PFS-UNKNOWN'));
});

test('unsupported non-empty transforms remain unassessed and cannot pass', () => {
  const scorecard = auditIpsecSecurity({
    ikeVersion: 'IKEv2',
    operationalMode: 'Not determined from capture',
    ipVersion: 'IPv4',
    encryptionAlgorithm: 'UNLISTED-DESIGN-7',
    encryptionKeyBits: 256,
    authIntegrityAlgorithm: 'UNLISTED-MAC-9',
    dhGroup: 'Group 19',
    dhGroupNumber: 19,
    dhBits: 256,
    pfsEnabled: null,
    keyLifetimeSeconds: null,
    replayProtection: null,
    initiatorSpi: '0x1',
    responderSpi: 'Not observed in capture',
    proposals: [],
  });

  assert.ok(scorecard.findings.some((finding) => finding.id === 'F-ENC-UNKNOWN-TRANSFORM'));
  assert.ok(scorecard.findings.some((finding) => finding.id === 'F-AUTH-UNKNOWN-TRANSFORM'));
  assert.equal(scorecard.findings.some((finding) => finding.id === 'F-ENC-PASS'), false);
  assert.equal(scorecard.evidenceCoveragePercent, 25);
  assert.equal(scorecard.complianceNist, null);
  assert.equal(scorecard.complianceRfc8221, null);
  assert.equal(scorecard.complianceNsaCnsa, null);
});

test('unknown controls reduce evidence-adjusted score and remain unverified', () => {
  const scorecard = auditIpsecSecurity({
    ikeVersion: 'IKEv2',
    operationalMode: 'Not determined from capture',
    ipVersion: 'IPv4',
    encryptionAlgorithm: 'Not observed in capture',
    encryptionKeyBits: 0,
    authIntegrityAlgorithm: 'Not observed in capture',
    dhGroup: 'Not observed in capture',
    dhGroupNumber: 0,
    dhBits: 0,
    pfsEnabled: null,
    keyLifetimeSeconds: null,
    replayProtection: null,
    initiatorSpi: '0x1',
    responderSpi: 'Not observed in capture',
    proposals: [],
  });

  assert.equal(scorecard.totalScore, 10);
  assert.equal(scorecard.riskPenalty, 0);
  assert.equal(scorecard.evidenceCoveragePercent, 10);
  assert.equal(scorecard.assessmentStatus, 'PARTIAL');
  assert.equal(scorecard.complianceNist, null);
  assert.equal(scorecard.complianceRfc8221, null);
});

test('fully evidenced approved suite receives full evidence coverage', () => {
  const scorecard = auditIpsecSecurity({
    ikeVersion: 'IKEv2',
    operationalMode: 'Tunnel Mode',
    ipVersion: 'IPv4',
    encryptionAlgorithm: 'AES-256-GCM',
    encryptionKeyBits: 256,
    authIntegrityAlgorithm: 'AEAD',
    dhGroup: 'Group 19',
    dhGroupNumber: 19,
    dhBits: 256,
    pfsEnabled: true,
    keyLifetimeSeconds: 7200,
    replayProtection: true,
    replayWindowSize: 64,
    initiatorSpi: '0x1',
    responderSpi: '0x2',
    proposals: [],
  });

  assert.equal(scorecard.totalScore, 100);
  assert.equal(scorecard.evidenceCoveragePercent, 100);
  assert.equal(scorecard.assessmentStatus, 'COMPLETE');
  assert.equal(scorecard.complianceNist, true);
});

test('long observed SA lifetime cannot pass the NIST assessment flag', () => {
  const scorecard = auditIpsecSecurity({
    ikeVersion: 'IKEv2',
    operationalMode: 'Tunnel Mode',
    ipVersion: 'IPv4',
    encryptionAlgorithm: 'AES-256-CBC',
    encryptionKeyBits: 256,
    authIntegrityAlgorithm: 'HMAC-SHA256',
    dhGroup: 'MODP_3072',
    dhGroupNumber: 15,
    dhBits: 3072,
    pfsEnabled: true,
    keyLifetimeSeconds: 86400,
    replayProtection: true,
    replayWindowSize: 64,
    initiatorSpi: '0x1',
    responderSpi: '0x2',
    proposals: [],
  });

  assert.ok(scorecard.findings.some((finding) => finding.id === 'F-TIME-01'));
  assert.equal(scorecard.complianceNist, false);
});

test('known weak fully observed configuration lowers the security score', () => {
  const scorecard = auditIpsecSecurity({
    ikeVersion: 'IKEv1',
    operationalMode: 'Transport Mode',
    ipVersion: 'IPv4',
    encryptionAlgorithm: '3DES-CBC',
    encryptionKeyBits: 168,
    authIntegrityAlgorithm: 'HMAC-SHA1',
    dhGroup: 'Group 2',
    dhGroupNumber: 2,
    dhBits: 1024,
    pfsEnabled: false,
    keyLifetimeSeconds: 3600,
    replayProtection: false,
    initiatorSpi: '0x1',
    responderSpi: '0x2',
    proposals: [],
  });

  assert.equal(scorecard.evidenceCoveragePercent, 100);
  assert.equal(scorecard.assessmentStatus, 'COMPLETE');
  assert.equal(scorecard.totalScore, 0);
  assert.ok(scorecard.riskPenalty > 0);
  assert.equal(scorecard.complianceNist, false);
  assert.equal(scorecard.rating, 'Critical');
});