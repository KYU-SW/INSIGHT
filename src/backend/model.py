"""Inference reproduced from notebook cells 4, 10, 11, 13, 14 and 16."""

from functools import lru_cache
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[2]
MODEL_ID = "facebook/hubert-large-ls960-ft"
MODEL_REVISION = "ece5fabbf034c1073acae96d5401b25be96709d8"
SAMPLE_RATE = 16000
HIDDEN_INDEX = 7


@lru_cache(maxsize=1)
def load_model():
    import torch
    from torch import nn

    class MLPHead(nn.Module):
        def __init__(self):
            super().__init__()
            self.features = nn.Identity()
            # The supplied checkpoint has classifier.0 and classifier.2 tensors.
            # Dropout has no effect at inference; ReLU follows the notebook.
            self.classifier = nn.Sequential(nn.Linear(1024, 128), nn.ReLU(), nn.Linear(128, 1))

        def forward(self, x):
            return self.classifier(self.features(x))

    state = torch.load(ROOT / "head.pt", map_location="cpu", weights_only=True)
    expected = {"classifier.0.weight", "classifier.0.bias", "classifier.2.weight", "classifier.2.bias"}
    if set(state) != expected:
        raise RuntimeError(f"Unexpected head.pt layer keys: {sorted(state)}")
    from transformers import AutoFeatureExtractor, HubertModel
    from huggingface_hub import hf_hub_download

    for filename in ("config.json", "preprocessor_config.json", "pytorch_model.bin"):
        checkpoint_file = hf_hub_download(MODEL_ID, filename, revision=MODEL_REVISION)
    snapshot = Path(checkpoint_file).parent
    extractor = AutoFeatureExtractor.from_pretrained(snapshot)
    pretrained = torch.load(checkpoint_file, map_location="cpu", weights_only=True, mmap=True)
    prefix = "hubert.encoder.pos_conv_embed.conv."
    # Map the checkpoint's legacy weight_norm tensors before loading. This
    # preserves the trained positional convolution instead of initializing it.
    pretrained[prefix + "parametrizations.weight.original0"] = pretrained.pop(prefix + "weight_g")
    pretrained[prefix + "parametrizations.weight.original1"] = pretrained.pop(prefix + "weight_v")
    backbone, loading = HubertModel.from_pretrained(
        snapshot, state_dict=pretrained, output_loading_info=True, use_safetensors=False
    )
    del pretrained
    if (loading["missing_keys"] or
            set(loading["unexpected_keys"]) != {"lm_head.weight", "lm_head.bias"} or
            loading["mismatched_keys"] or loading["error_msgs"]):
        raise RuntimeError(f"HuBERT checkpoint does not match expected layers: {loading}")
    backbone.requires_grad_(False)
    backbone.eval()
    if backbone.config.hidden_size != 1024 or backbone.config.num_hidden_layers != 24:
        raise ValueError("HuBERT configuration differs from the training notebook")
    head = MLPHead()
    head.load_state_dict(state)
    head.eval()
    with np.load(ROOT / "scaler.npz", allow_pickle=False) as scaler:
        mean = scaler["mean"].copy()
        scale = scaler["scale"].copy()
    if mean.shape != (1024,) or scale.shape != (1024,) or np.any(scale <= 0):
        raise ValueError("Saved scaler does not match the 1024 dimensional max pooled input")
    return torch, extractor, backbone, head, mean, scale


def decode_audio(path: Path):
    """Match notebook: soundfile float32, stereo mean, librosa resample."""
    audio, sample_rate = sf.read(path, dtype="float32", always_2d=True)
    mono = audio.mean(axis=1)
    if sample_rate != SAMPLE_RATE:
        mono = librosa.resample(mono, orig_sr=sample_rate, target_sr=SAMPLE_RATE)
    if len(mono) < 400 or not np.isfinite(mono).all():
        raise ValueError("Audio is too short or contains invalid samples")
    return np.asarray(mono, dtype=np.float32)


def infer_score(audio: np.ndarray) -> float:
    torch, extractor, backbone, head, mean, scale = load_model()
    with torch.inference_mode():
        inputs = extractor(audio, sampling_rate=SAMPLE_RATE, return_tensors="pt")
        output = backbone(**inputs, output_hidden_states=True, return_dict=True)
        # Notebook max pooling is over all time frames, with no chunking.
        feature = output.hidden_states[HIDDEN_INDEX][0].float().cpu().numpy().max(axis=0)
        standardized = ((feature.astype(np.float32) - mean) / scale).astype("float32")
        if standardized.shape != (1024,) or not np.isfinite(standardized).all():
            raise ValueError("Extracted model features are invalid")
        logit = head(torch.from_numpy(standardized[None, :]))
        return float(torch.sigmoid(logit)[0, 0])
