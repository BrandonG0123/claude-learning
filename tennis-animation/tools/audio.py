#!/usr/bin/env python3
"""audio.py — procedural sound design for the 10 s tennis piece (numpy only; FFT filtering, no scipy).
usage: python3 -I tools/audio.py out.wav [cues.json]
A cue is {"t": seconds, "type": <instrument>, "gain": 1.0, "pan": 0.0, ...instrument params}. Types:
  strike (intensity), bounce (intensity), whoosh (dur, f_start, f_peak, f_end, shape, pan_to), impact (intensity),
  riser (dur, f0, f1), crowd (dur, level), roar (dur), tick (f), sting (root, dur), drone (dur, f), swell (dur, f)
"""
import sys, json, math, wave
import numpy as np

SR = 48000
DUR = 10.0
N = int(SR * DUR)

def t_axis(n): return np.arange(n) / SR

# ---------- filters (FFT, zero-phase, vectorised) ----------
def fft_filter(sig, gain_fn):
    n = len(sig); F = np.fft.rfft(sig); f = np.fft.rfftfreq(n, 1 / SR)
    return np.fft.irfft(F * gain_fn(f), n)
def lowpass(sig, fc, order=4): return fft_filter(sig, lambda f: 1 / np.sqrt(1 + (f / max(fc, 1.0)) ** (2 * order)))
def highpass(sig, fc, order=4): return fft_filter(sig, lambda f: 1 / np.sqrt(1 + (max(fc, 1.0) / np.maximum(f, 1e-3)) ** (2 * order)))
def bandpass(sig, lo, hi, order=4): return highpass(lowpass(sig, hi, order), lo, order)
def sweep_filter(w, fc_of_u, width=1.3, hop=1024, order=2):
    """time-varying bandpass: chunked, hann-crossfaded. fc_of_u(u) gives centre freq for u in 0..1"""
    n = len(w); out = np.zeros(n); win = np.hanning(2 * hop)
    for i in range(0, n, hop):
        seg = w[i:i + 2 * hop]; m = len(seg)
        if m < 32: break
        fc = fc_of_u(min(1.0, (i + hop) / n))
        out[i:i + m] += bandpass(seg * win[:m], fc / width, fc * width, order)
    return out

def env(n, attack, decay, hold=0.0, curve=4.0):
    t = t_axis(n); a = np.clip(t / max(attack, 1e-5), 0, 1)
    d = np.where(t > attack + hold, np.exp(-(t - attack - hold) / max(decay, 1e-5) * curve), 1.0)
    return a * d
def noise(n, rng): return rng.standard_normal(n)
def pink(n, rng):
    F = np.fft.rfft(rng.standard_normal(n)); f = np.fft.rfftfreq(n, 1 / SR); F = F / np.sqrt(np.maximum(f, 20.0)); return np.fft.irfft(F, n) * 8.0
def glide(f_start, f_end, n, k=1.0):
    """exponential pitch glide array"""
    t = t_axis(n) / (n / SR); return f_start * (f_end / f_start) ** (t ** k)
def osc(freq):  # freq array → sine
    return np.sin(2 * math.pi * np.cumsum(freq) / SR)

# ---------- instruments ----------
def strike(rng, intensity=1.0, **_):
    """racket on ball: transient click + bandpassed 'pock' + pitched thump with fast pitch drop"""
    n = int(SR * 0.3); t = t_axis(n)
    click = noise(n, rng) * env(n, 0.0004, 0.004)
    pock = bandpass(noise(n, rng), 600, 5500) * env(n, 0.0008, 0.03)
    thump = osc(240 * intensity ** 0.3 * (1 + 1.6 * np.exp(-t * 55))) * env(n, 0.001, 0.09)
    body = lowpass(noise(n, rng), 350) * env(n, 0.001, 0.06)
    return np.tanh((0.9 * click + 1.0 * pock + 1.4 * thump + 0.9 * body) * 1.5 * intensity)
def bounce(rng, intensity=1.0, **_):
    n = int(SR * 0.22); t = t_axis(n)
    thump = osc(135 * (1 + 0.9 * np.exp(-t * 45))) * env(n, 0.001, 0.075)
    pock = bandpass(noise(n, rng), 250, 2200) * env(n, 0.001, 0.022)
    return np.tanh((1.25 * thump + 0.7 * pock) * intensity)
def whoosh(rng, dur=0.5, f_start=300.0, f_peak=2600.0, f_end=450.0, shape=0.5, width=1.3, **_):
    n = int(SR * dur); u = t_axis(n) / dur
    amp = np.where(u < shape, (u / shape) ** 2.2, np.clip(1 - (u - shape) / (1 - shape), 0, 1) ** 1.6)
    def fc(x): return f_start * (f_peak / f_start) ** (x / shape) if x < shape else f_peak * (f_end / f_peak) ** ((x - shape) / (1 - shape))
    return sweep_filter(noise(n, rng), fc, width) * amp * 1.6
def impact(rng, intensity=1.0, **_):
    n = int(SR * 1.8); t = t_axis(n)
    sub = osc(36 + 75 * np.exp(-t * 8.5)) * env(n, 0.002, 1.0, curve=3)
    burst = lowpass(noise(n, rng), 1000) * env(n, 0.001, 0.13)
    crack = bandpass(noise(n, rng), 1500, 7000) * env(n, 0.0005, 0.02) * 0.6
    tail = lowpass(noise(n, rng), 220) * env(n, 0.01, 1.0, curve=3) * 0.5
    return np.tanh((1.35 * sub + 1.1 * burst + crack + tail) * 1.4 * intensity)
def riser(rng, dur=2.0, f0=90.0, f1=1400.0, **_):
    n = int(SR * dur); u = t_axis(n) / dur; amp = u ** 2.4
    nz = sweep_filter(noise(n, rng), lambda x: f0 * (f1 / f0) ** x, 1.5, 2048)
    tone = sum(osc(glide(f0 * k, f1 * k, n)) * (0.55 ** k) for k in (1, 2, 3)) * (0.5 + 0.5 * np.sin(2 * math.pi * (6 + 26 * u ** 2) * t_axis(n)))  # accelerating tremolo
    return (nz * 1.0 + tone * 0.35) * amp
def crowd(rng, dur=10.0, level=1.0, **_):
    n = int(SR * dur); t = t_axis(n)
    p = bandpass(pink(n, rng), 160, 3400, 2)
    mod = 0.72 + 0.2 * np.sin(2 * math.pi * 0.31 * t + 1.1) + 0.08 * np.sin(2 * math.pi * 1.1 * t + 0.4)
    return p * mod * level
def roar(rng, dur=2.6, **_):
    n = int(SR * dur); u = t_axis(n) / dur
    p = bandpass(pink(n, rng), 220, 4500, 2) + 0.3 * bandpass(noise(n, rng), 800, 3000, 2)
    amp = np.where(u < 0.22, (u / 0.22) ** 1.4, np.clip(1 - (u - 0.22) / 0.78, 0, 1) ** 1.3)
    return p * amp
def tick(rng, f=2300.0, **_):
    n = int(SR * 0.05); t = t_axis(n)
    return np.sin(2 * math.pi * f * t) * env(n, 0.0004, 0.012) + noise(n, rng) * env(n, 0.0002, 0.002) * 0.5
def sting(rng, root=110.0, dur=3.2, **_):
    n = int(SR * dur); t = t_axis(n); s = np.zeros(n)
    for ratio, g in ((1, 1.0), (1.5, 0.6), (2, 0.75), (2.52, 0.3), (3, 0.3), (4, 0.22)):
        for det in (-0.35, 0.35):
            f = root * ratio * (1 + det / 100); s += g * np.sin(2 * math.pi * f * t + 0.35 * np.sin(2 * math.pi * f * 2.01 * t) * np.exp(-t * 3))
    bell = np.sin(2 * math.pi * root * 4 * t + 2.6 * np.sin(2 * math.pi * root * 4 * 1.41 * t) * np.exp(-t * 2)) * np.exp(-t * 2.2)
    return np.tanh((s * 0.22 + bell * 0.4) * env(n, 0.008, 1.5, curve=3.0))
def drone(rng, dur=4.0, f=55.0, **_):
    n = int(SR * dur); t = t_axis(n)
    s = np.sin(2 * math.pi * f * t) + 0.5 * np.sin(2 * math.pi * f * 2 * t + 0.2) + 0.25 * np.sin(2 * math.pi * f * 3.01 * t)
    return lowpass(s * (0.7 + 0.3 * np.sin(2 * math.pi * 0.2 * t)), 420) * np.minimum(1, t / 0.4)
def swell(rng, dur=1.2, f=220.0, **_):
    """orchestral-ish swell: detuned tones with slow attack, used under hero moments"""
    n = int(SR * dur); t = t_axis(n); u = t / dur
    s = sum(np.sin(2 * math.pi * f * r * (1 + d / 100) * t) * g for r, g in ((1, 1), (1.5, .5), (2, .4)) for d in (-0.5, 0.5))
    return lowpass(s, 2500) * np.sin(u * math.PI if False else u * math.pi) ** 1.5 * 0.25

INSTRUMENTS = dict(strike=strike, bounce=bounce, whoosh=whoosh, impact=impact, riser=riser, crowd=crowd, roar=roar, tick=tick, sting=sting, drone=drone, swell=swell)

# ---------- mixer ----------
def pan_gains(pan):
    a = (float(pan) + 1) / 2 * math.pi / 2; return math.cos(a), math.sin(a)
class Mix:
    def __init__(self): self.buf = np.zeros((N, 2))
    def add(self, sig, t, gain=1.0, pan=0.0, pan_to=None):
        i = int(round(t * SR))
        if i >= N: return
        if i < 0: sig = sig[-i:]; i = 0
        sig = sig[:N - i]; m = len(sig)
        if pan_to is None:
            l, r = pan_gains(pan); self.buf[i:i + m, 0] += sig * gain * l; self.buf[i:i + m, 1] += sig * gain * r
        else:
            p = np.linspace(pan, pan_to, m); a = (p + 1) / 2 * math.pi / 2
            self.buf[i:i + m, 0] += sig * gain * np.cos(a); self.buf[i:i + m, 1] += sig * gain * np.sin(a)
def reverb(buf, rng, decay=1.1, mix=0.2, predelay=0.012):
    n = int(SR * decay * 2.5); t = t_axis(n)
    ir = lowpass(noise(n, rng) * np.exp(-t / decay * 3.0), 6500); ir[:int(SR * predelay)] = 0; ir /= (np.sqrt(np.sum(ir ** 2)) + 1e-9)
    out = np.zeros_like(buf)
    for ch in range(2):
        wet = np.fft.irfft(np.fft.rfft(buf[:, ch], N + n) * np.fft.rfft(ir, N + n), N + n)[:N]
        out[:, ch] = buf[:, ch] * (1 - mix) + wet * mix * 0.7
    return out
def master(buf, peak_db=-1.0, fade_out=0.35):
    # gentle bus compression via tanh, normalise, fade tail
    x = np.tanh(buf * 1.1) / math.tanh(1.1)
    x *= (10 ** (peak_db / 20)) / (np.max(np.abs(x)) + 1e-9)
    n = int(SR * fade_out); x[-n:] *= np.linspace(1, 0, n)[:, None]
    x[:int(SR * 0.01)] *= np.linspace(0, 1, int(SR * 0.01))[:, None]
    return x
def write_wav(path, x):
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())

DEFAULT_CUES = [
    {"t": 0.0, "type": "crowd", "dur": 10.0, "gain": 0.12},
    {"t": 0.0, "type": "drone", "dur": 3.0, "gain": 0.25},
    {"t": 0.3, "type": "riser", "dur": 1.7, "gain": 0.5},
    {"t": 2.0, "type": "strike", "gain": 0.9, "intensity": 1.2},
    {"t": 2.0, "type": "impact", "gain": 0.6},
    {"t": 2.0, "type": "whoosh", "dur": 0.6, "gain": 0.5, "pan": -0.8, "pan_to": 0.8},
    {"t": 4.0, "type": "bounce", "gain": 0.8},
    {"t": 6.0, "type": "whoosh", "dur": 0.5, "gain": 0.5},
    {"t": 8.0, "type": "impact", "gain": 0.8},
    {"t": 8.0, "type": "roar", "gain": 0.5},
    {"t": 8.2, "type": "sting", "gain": 0.6},
]

def main():
    out = sys.argv[1] if len(sys.argv) > 1 else 'out/audio.wav'
    cues = json.load(open(sys.argv[2])) if len(sys.argv) > 2 else DEFAULT_CUES
    if isinstance(cues, dict): cues = cues.get('cues', [])
    mix = Mix(); rng_master = np.random.default_rng(20251007)
    for i, c in enumerate(sorted(cues, key=lambda c: c['t'])):
        kind = c['type']
        if kind not in INSTRUMENTS: print('unknown cue type', kind, file=sys.stderr); continue
        rng = np.random.default_rng(1000 + i * 17)
        params = {k: v for k, v in c.items() if k not in ('t', 'type', 'gain', 'pan', 'pan_to')}
        sig = INSTRUMENTS[kind](rng, **params)
        mix.add(sig, c['t'], gain=c.get('gain', 1.0), pan=c.get('pan', 0.0), pan_to=c.get('pan_to'))
    x = reverb(mix.buf, rng_master); x = master(x)
    write_wav(out, x)
    peak = 20 * math.log10(np.max(np.abs(x)) + 1e-9); rms = 20 * math.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
    print(f'wrote {out}: {len(cues)} cues, {DUR}s stereo {SR}Hz, peak {peak:.1f} dBFS, rms {rms:.1f} dBFS')

if __name__ == '__main__': main()
