from __future__ import annotations

from pathlib import Path

from scapy.all import IP, UDP, rdpcap, wrpcap

from generate_workload_test_pcaps import PROFILES, make_packet, target_lengths, is_uplink
from random import Random


IKE_SOURCE = Path("pcap_factory/captures/AES128_SHA256_DH14_NOPFS_ICMP_rep01.pcap")
OUT_DIR = Path("test_pcaps") / "combined_workload_samples"


def is_ike_packet(packet) -> bool:
    return packet.haslayer(UDP) and (packet[UDP].sport in {500, 4500} or packet[UDP].dport in {500, 4500})


def load_ike_packets():
    packets = [packet.copy() for packet in rdpcap(str(IKE_SOURCE)) if packet.haslayer(IP) and is_ike_packet(packet)]
    if not packets:
        raise RuntimeError(f"No IKE packets found in {IKE_SOURCE}")
    for index, packet in enumerate(packets):
        packet.time = index * 0.01
    return packets


def write_combined_samples() -> None:
    ike_packets = load_ike_packets()
    ike_end = max(float(packet.time) for packet in ike_packets)
    src_ip = ike_packets[0][IP].src
    dst_ip = ike_packets[0][IP].dst
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for profile in PROFILES:
        rng = Random(profile.label)
        lengths = target_lengths(profile, rng)
        step = profile.duration_ms / max(profile.packets - 1, 1) / 1000
        workload_packets = []
        for index, length in enumerate(lengths):
            packet = make_packet(index, length, is_uplink(index, profile), src_ip, dst_ip)
            packet.time = ike_end + 0.1 + index * step
            workload_packets.append(packet)

        path = OUT_DIR / f"{profile.label.lower().replace(' ', '_')}_with_ike.pcap"
        wrpcap(str(path), ike_packets + workload_packets)
        print(f"{profile.label}: {path}")


if __name__ == "__main__":
    write_combined_samples()
