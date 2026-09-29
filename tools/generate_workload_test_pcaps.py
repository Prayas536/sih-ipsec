from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from random import Random

from scapy.all import Ether, IP, Raw, wrpcap


@dataclass(frozen=True)
class WorkloadProfile:
    label: str
    packets: int
    duration_ms: float
    mean_len: int
    std_len: int
    min_len: int
    max_len: int
    symmetry: float


PROFILES = [
    WorkloadProfile("VoIP", 5758, 101218, 205, 26, 67, 362, 0.82),
    WorkloadProfile("WhatsApp", 2426, 93267, 436, 268, 76, 724, 0.75),
    WorkloadProfile("Email", 277, 80431, 624, 284, 73, 1271, 0.78),
    WorkloadProfile("Web", 101, 1527, 713, 385, 92, 1195, 0.26),
    WorkloadProfile("Video", 5553, 111213, 1009, 299, 109, 1443, 0.17),
    WorkloadProfile("ICMP", 18, 5502, 119, 0, 76, 119, 0.84),
    WorkloadProfile("File Transfer", 1177, 7085, 1275, 199, 102, 1500, 0.03),
]

OUT_DIR = Path("test_pcaps") / "workload_samples"
SRC_IP = "10.10.1.10"
DST_IP = "10.10.2.20"
SRC_MAC = "02:00:00:00:01:10"
DST_MAC = "02:00:00:00:02:20"
ETHER_IP_ESP_OVERHEAD = 14 + 20 + 8


def target_lengths(profile: WorkloadProfile, rng: Random) -> list[int]:
    if profile.std_len == 0:
        return [profile.mean_len] * profile.packets

    values: list[int] = []
    for _ in range(profile.packets):
        value = round(rng.gauss(profile.mean_len, profile.std_len))
        values.append(max(profile.min_len, min(profile.max_len, value)))
    return values


def is_uplink(index: int, profile: WorkloadProfile) -> bool:
    if profile.symmetry >= 0.95:
        return index % 2 == 0
    if profile.symmetry <= 0.05:
        return index % 101 != 0
    downlink_ratio = 1 / (1 + profile.symmetry)
    return (index % 1000) / 1000 >= downlink_ratio


def make_packet(index: int, target_len: int, uplink: bool, src_ip: str = SRC_IP, dst_ip: str = DST_IP) -> Ether:
    src = src_ip if uplink else dst_ip
    dst = dst_ip if uplink else src_ip
    spi = (0x10000000 + (index % 0x0FFFFFFF)).to_bytes(4, "big")
    seq = (index + 1).to_bytes(4, "big")
    payload_len = max(1, target_len - ETHER_IP_ESP_OVERHEAD)
    pattern = bytes(((index * 31 + offset * 17) % 256 for offset in range(payload_len)))
    ether = Ether(src=SRC_MAC if uplink else DST_MAC, dst=DST_MAC if uplink else SRC_MAC)
    return ether / IP(src=src, dst=dst, proto=50) / Raw(spi + seq + pattern)


def write_profile(profile: WorkloadProfile) -> Path:
    rng = Random(profile.label)
    lengths = target_lengths(profile, rng)
    step = profile.duration_ms / max(profile.packets - 1, 1) / 1000
    packets = []
    for index, length in enumerate(lengths):
        packet = make_packet(index, length, is_uplink(index, profile))
        packet.time = index * step
        packets.append(packet)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / f"{profile.label.lower().replace(' ', '_')}.pcap"
    wrpcap(str(path), packets)
    return path


def main() -> None:
    for profile in PROFILES:
        path = write_profile(profile)
        print(f"{profile.label}: {path}")


if __name__ == "__main__":
    main()
