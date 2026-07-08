# 🧠 Denpex GitHub Action

Denpex is an Autonomous ML Incident Intelligence Engine that automatically diagnoses distributed machine learning training failures.

Instead of digging through 10,000 lines of PyTorch, NCCL, and SLURM logs to find out why your job crashed, simply add this GitHub Action to your CI/CD pipeline. When a training job fails, Denpex will automatically intercept the logs, diagnose the root cause (e.g., CUDA OOM, InfiniBand flap, Straggler node), and print the exact fix directly in your GitHub Actions console.

## 🚀 Quickstart

Drop this action at the very end of your ML workflow. It uses `if: failure()` so it **only** runs if your PyTorch job crashes.

```yaml
name: Nightly Training
on: [push]

jobs:
  train:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run PyTorch Distributed Training
        run: python -m torch.distributed.run --nproc_per_node=8 train.py
        
      # 👇 Add Denpex at the end to catch crashes
      - name: Diagnose with Denpex
        uses: MisaMisaAI/denpex-action@main
        if: failure()
        with:
          # Optional: Use your API key to route alerts to your Slack/PagerDuty
          api-key: ${{ secrets.DENPEX_API_KEY }} 
```

## 🔒 Security & Privacy

This action is designed for Enterprise ML teams:
* **Zero Dependencies:** Built entirely with Node.js standard libraries (`fs`, `https`).
* **No IP Leakage:** It only securely transmits the stack trace logs via encrypted HTTPS. It does **not** have access to your model weights, datasets, or proprietary IP.
* **Transparent:** Feel free to audit `diagnose.js` yourself. It's only 80 lines of code.

## 💡 What it Catch
Denpex natively understands and provides fixes for:
- CUDA Out of Memory (OOM)
- PyTorch/NCCL Collective Hangs
- Hardware Faults (Xid 79, ECC Errors, PCIe degradation)
- InfiniBand/RDMA Network Partitions
- Gray Failures (Straggler Nodes)

Need to self-host Denpex inside your own AWS/GCP VPC? [Check out our Enterprise plans](https://denpex.com).
