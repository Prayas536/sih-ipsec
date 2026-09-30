# ML Training & Evaluation Datasets

This directory is the dedicated location for placing, organizing, and referencing datasets used for training and evaluating the Machine Learning models in the **AI-Powered IPsec VPN Protocol Analyzer**.

---

## 📂 Included Datasets

| File | Type | Rows | Description |
| :--- | :--- | :--- | :--- |
| [`ipsec_crypto_dataset.csv`](ipsec_crypto_dataset.csv) | Full Labeled Dataset | 157 rows | Complete synthetic IPsec capture dataset containing packet metrics and ground-truth cryptographic labels (`encryption`, `hash`, `dh_group`, `pfs_group`). |
| [`network_traffic_workload_dataset.csv`](network_traffic_workload_dataset.csv) | Workload Dataset | 457 rows | Labeled ESP network flow metrics across 5 application classes (`WhatsApp`, `VoIP`, `Email`, `File Transfer`, `Web`). |
| [`custom_training_template.csv`](custom_training_template.csv) | Template | — | Template file showing the exact column structure required for training new models on your custom PCAP captures. |

---

## 🎯 Target Labels for Cryptographic Classification

The machine learning models predict four critical IPsec parameters:
1. **`encryption`**: Cipher algorithm (e.g., `AES128`, `AES256`, `3DES`)
2. **`hash`**: Integrity / PRF algorithm (e.g., `SHA256`, `SHA384`, `MD5`)
3. **`dh_group`**: Diffie-Hellman Key Exchange group (e.g., `DH14`, `DH15`, `DH19`, `DH2`)
4. **`pfs_group`**: Perfect Forward Secrecy group (e.g., `NOPFS`, `PFS14`, `PFS15`, `PFS19`)

---

## 📊 Feature Column Definitions

When placing a dataset in this directory for training, ensure it contains the following numeric features:

| Column Name | Data Type | Description |
| :--- | :--- | :--- |
| `packet_count` | Integer | Total number of packets in the capture session |
| `total_bytes` | Integer | Total volume of traffic captured (bytes) |
| `avg_packet_size` | Float | Mean packet size across the session ($L_\mu$) |
| `min_packet_size` | Integer | Minimum packet length observed (bytes) |
| `max_packet_size` | Integer | Maximum packet length observed (bytes) |
| `capture_duration_seconds` | Float | Duration of the capture window |
| `udp_packet_count` | Integer | Total UDP frames (IKE, NAT-T) |
| `udp_500_count` | Integer | Total standard IKE negotiation frames (Port 500) |
| `ike_packet_count` | Integer | Total IKE protocol packets identified |
| `esp_packet_count` | Integer | Total Encapsulating Security Payload (ESP) packets |
| `create_child_sa_count` | Integer | Number of `CREATE_CHILD_SA` exchanges observed |
| `informational_count` | Integer | Number of IKE `INFORMATIONAL` exchanges observed |
| `ike_request_count` | Integer | Count of IKE request messages |
| `ike_response_count` | Integer | Count of IKE response messages |
| `ike_bytes` | Integer | Total byte volume of IKE signaling traffic |
| `ike_avg_packet_size` | Float | Mean size of IKE negotiation messages |
| `esp_bytes` | Integer | Total byte volume of encrypted ESP traffic |
| `esp_avg_packet_size` | Float | Mean size of ESP encrypted payloads |

*(Note: Context columns such as `source_pcap`, `repetition`, and `traffic` are automatically excluded from training inputs to prevent overfitting).*

---

## 🚀 How to Train ML Models with Your Dataset

Follow these steps to train and update the models with new or custom data:

### Step 1: Extract Features from Your PCAP Files (Optional)
If you have raw `.pcap` files, extract features using the feature extractor:
```bash
python feature_extractor/extractor.py path/to/your_capture.pcap
```

### Step 2: Place Your Dataset File
Copy your dataset into this folder, e.g.:
```bash
cp my_new_dataset.csv dataset/ipsec_crypto_dataset.csv
```

### Step 3: Split into Train & Test Sets
Run the splitting script to generate `feature_extractor/ml/train.csv` and `feature_extractor/ml/test.csv`:
```bash
python -c "
import pandas as pd
df = pd.read_csv('dataset/ipsec_crypto_dataset.csv')
train = df[df['repetition'] < 5]
test = df[df['repetition'] == 5]
train.to_csv('feature_extractor/ml/train.csv', index=False)
test.to_csv('feature_extractor/ml/test.csv', index=False)
print(f'Train rows: {len(train)}, Test rows: {len(test)}')
"
```

### Step 4: Train the Final Random Forest Models
Run the training script:
```bash
python feature_extractor/ml/train_final_models.py
```
This script trains 4 separate Random Forest estimators (300 trees each) and automatically saves the updated models to:
```
feature_extractor/ml/models/
├── encryption_model.joblib
├── hash_model.joblib
├── dh_group_model.joblib
└── pfs_group_model.joblib
```

### Step 5: Evaluate Model Accuracy & Metrics
```bash
python feature_extractor/ml/evaluate_models.py
python feature_extractor/ml/cross_validate.py
```
