"""Stylemax promo score — 120 BPM fashion-house cue, 28 s, synthesised with numpy.

Structure (bar = 2 s):
  bars 1-2   intro: filtered pad + clock tick + riser        ("80% of your closet is asleep")
  bar 3      DROP: kick/clap/hats/bass/stabs + shimmer        (garments wake up)
  bars 4-8   groove + pluck hook                               (scan, suggest)
  bar 9      half-time breakdown (no kick)                      (insights)
  bars 10-12 full groove + top line                             (montage)
  bars 13-14 final hit + ringing outro                          (logo)
"""
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
import wave, sys, os

SR = 44100
BPM = 120
BEAT = 60 / BPM
BAR = 4 * BEAT
DUR = 28.0
N = int(SR * DUR)
rng = np.random.default_rng(7)


def t_(n):
    return np.arange(n) / SR


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lp(x, fc, order=2):
    return sosfilt(butter(order, min(fc, SR / 2 - 100), 'low', fs=SR, output='sos'), x)


def hp(x, fc, order=2):
    return sosfilt(butter(order, fc, 'high', fs=SR, output='sos'), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], 'band', fs=SR, output='sos'), x)


class Bus:
    def __init__(self):
        self.L = np.zeros(N + SR * 4)
        self.R = np.zeros(N + SR * 4)

    def add(self, x, at, gain=1.0, pan=0.0):
        i = int(at * SR)
        if i >= len(self.L):
            return
        x = x[: len(self.L) - i]
        gl = gain * np.cos((pan + 1) * np.pi / 4)
        gr = gain * np.sin((pan + 1) * np.pi / 4)
        self.L[i:i + len(x)] += x * gl
        self.R[i:i + len(x)] += x * gr

    def addst(self, L, R, at, gain=1.0):
        i = int(at * SR)
        n = min(len(L), len(self.L) - i)
        self.L[i:i + n] += L[:n] * gain
        self.R[i:i + n] += R[:n] * gain


# ------------------------------------------------------------------ instruments

def kick(d=0.45):
    t = t_(int(SR * d))
    f = 45 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 7.5)
    click = hp(rng.standard_normal(len(t)), 2000) * np.exp(-t * 300) * 0.25
    return np.tanh((body + click) * 1.6)


def clap():
    n = int(SR * 0.35)
    t = t_(n)
    env = np.zeros(n)
    for k, o in enumerate((0, 0.011, 0.022)):
        i = int(o * SR)
        env[i:] += np.exp(-(t[: n - i]) * (180 if k < 2 else 22))
    x = bp(rng.standard_normal(n), 900, 5200) * env
    return x * 0.8


def hat(open_=False):
    d = 0.28 if open_ else 0.05
    n = int(SR * d)
    t = t_(n)
    x = lp(hp(rng.standard_normal(n), 7000, 4), 13000) * np.exp(-t * (16 if open_ else 90))
    return x * (0.32 if open_ else 0.4)


def tick():
    n = int(SR * 0.04)
    t = t_(n)
    return (np.sin(2 * np.pi * 3200 * t) * np.exp(-t * 160) + 0.3 * hp(rng.standard_normal(n), 6000) * np.exp(-t * 300))


def saw(f, t, detune=0.0):
    ph = (f * (1 + detune)) * t
    return 2 * (ph - np.floor(ph + 0.5))


def supersaw(f, t, voices=5, spread=0.012):
    x = np.zeros_like(t)
    for v in range(voices):
        d = (v - (voices - 1) / 2) / ((voices - 1) / 2) * spread
        x += saw(f, t + rng.random() / f, d)
    return x / voices


def pad_chord(notes, d, cutoff=1400, att=0.5, rel=0.8):
    t = t_(int(SR * (d + rel)))
    L = np.zeros_like(t)
    R = np.zeros_like(t)
    for m in notes:
        f = mtof(m)
        L += supersaw(f, t, spread=0.010)
        R += supersaw(f, t, spread=0.013)
    env = np.minimum(1, t / att) * np.where(t < d, 1, np.exp(-(t - d) * 5))
    return lp(L * env, cutoff) / len(notes), lp(R * env, cutoff) / len(notes)


def stab(notes, d=0.22):
    t = t_(int(SR * d))
    x = np.zeros_like(t)
    for m in notes:
        x += supersaw(mtof(m), t, voices=3, spread=0.008)
    env = np.exp(-t * 11)
    # filter envelope approximated by blending bright+dark
    bright = lp(x, 5200)
    dark = lp(x, 900)
    fe = np.exp(-t * 20)
    return (bright * fe + dark * (1 - fe)) * env / len(notes)


def bass(m, d):
    t = t_(int(SR * d))
    f = mtof(m)
    x = 0.65 * saw(f, t) + 0.6 * np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f / 2 * t)
    env = np.minimum(1, t / 0.005) * np.exp(-t * 3.2)
    return np.tanh(lp(x, 520) * env * 1.4)


def pluck(m, d=0.35):
    """Karplus-Strong-ish pluck with a sine body for a clean, glassy hook."""
    n = int(SR * d)
    f = mtof(m)
    per = int(SR / f)
    buf = rng.uniform(-1, 1, per)
    out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % per]
        buf[i % per] = 0.5 * (buf[i % per] + buf[(i + 1) % per]) * 0.996
    t = t_(n)
    body = np.sin(2 * np.pi * f * t) * np.exp(-t * 7) + 0.3 * np.sin(4 * np.pi * f * t) * np.exp(-t * 12)
    return (0.55 * out + 0.6 * body) * np.minimum(1, t / 0.002)


def bell(m, d=1.6):
    t = t_(int(SR * d))
    f = mtof(m)
    mod = np.sin(2 * np.pi * f * 2.0 * t) * 1.1 * np.exp(-t * 3)
    return np.sin(2 * np.pi * f * t + mod) * np.exp(-t * 2.4)


def riser(d):
    n = int(SR * d)
    t = t_(n)
    x = rng.standard_normal(n)
    # sweep via chunked bandpass
    out = np.zeros(n)
    chunks = 40
    for c in range(chunks):
        a, b = c * n // chunks, (c + 1) * n // chunks
        fc = 400 * (12000 / 400) ** (c / chunks)
        out[a:b] = bp(x[max(0, a - 2000):b], fc * 0.7, min(fc * 1.3, 20000))[-(b - a):]
    env = (t / d) ** 2.2
    tone = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (2 * t / d)) / SR) * 0.25
    return (out * 1.3 + tone) * env


def whoosh(d=0.6, up=True):
    n = int(SR * d)
    t = t_(n)
    x = rng.standard_normal(n)
    out = np.zeros(n)
    chunks = 24
    for c in range(chunks):
        a, b = c * n // chunks, (c + 1) * n // chunks
        k = c / chunks if up else 1 - c / chunks
        fc = 300 * (8000 / 300) ** k
        out[a:b] = bp(x[max(0, a - 2000):b], fc * 0.6, min(fc * 1.4, 20000))[-(b - a):]
    env = np.sin(np.pi * t / d) ** 2
    return out * env


def shimmer(d=1.2, base=81):
    t = t_(int(SR * d))
    x = np.zeros_like(t)
    for i, m in enumerate([base, base + 3, base + 7, base + 10, base + 12, base + 15, base + 19]):
        st = i * 0.045
        tt = np.clip(t - st, 0, None)
        x += np.sin(2 * np.pi * mtof(m) * tt) * np.exp(-tt * 4) * (t >= st)
    return x / 3


def shutter():
    n = int(SR * 0.18)
    t = t_(n)
    a = hp(rng.standard_normal(n), 2500) * np.exp(-t * 120)
    b = np.zeros(n)
    i = int(0.07 * SR)
    b[i:] = hp(rng.standard_normal(n - i), 1800) * np.exp(-t[: n - i] * 90)
    return (a + 0.8 * b) * 0.9


def blip(m=84, d=0.09):
    t = t_(int(SR * d))
    return np.sin(2 * np.pi * mtof(m) * t) * np.exp(-t * 45)


def reverb(x, secs=2.2, damp=6000):
    n = int(SR * secs)
    t = t_(n)
    irL = lp(rng.standard_normal(n), damp) * np.exp(-t * 6.9 / secs)
    irR = lp(rng.standard_normal(n), damp) * np.exp(-t * 6.9 / secs)
    irL[: int(0.012 * SR)] = 0
    irR[: int(0.017 * SR)] = 0
    L = fftconvolve(x, irL)[: len(x)]
    R = fftconvolve(x, irR)[: len(x)]
    s = np.max(np.abs(np.concatenate([L, R]))) + 1e-9
    return L / s * np.max(np.abs(x)), R / s * np.max(np.abs(x))


# ------------------------------------------------------------------ arrangement
CH = {
    'Am': [57, 60, 64, 67, 71],
    'F': [53, 57, 60, 64, 67],
    'C': [55, 60, 64, 67, 71],
    'G': [55, 59, 62, 66, 69],
}
ROOT = {'Am': 33, 'F': 29, 'C': 36, 'G': 31}
PROG = ['Am', 'F', 'C', 'G']

HOOK_A = [(0, 76), (3, 74), (6, 72), (8, 69), (10, 72), (12, 74), (14, 76)]
HOOK_B = [(0, 79), (3, 76), (6, 74), (8, 72), (11, 74), (13, 76), (14, 69)]


def bt(bar, beat=0.0):
    return (bar - 1) * BAR + beat * BEAT


def build(sfx_events):
    drums, music, sc_src, fx = Bus(), Bus(), Bus(), Bus()
    K, C, H, HO = kick(), clap(), hat(), hat(True)
    # sidechain envelope (duck on every kick)
    duck = np.ones(len(music.L))

    def kick_at(t0):
        drums.add(K, t0, 0.95)
        i = int(t0 * SR)
        n = int(0.32 * SR)
        e = 1 - 0.75 * np.exp(-np.arange(n) / SR * 11)
        duck[i:i + n] = np.minimum(duck[i:i + n], e[: len(duck[i:i + n])])

    # --- intro (bars 1-2): pad + ticking clock + riser
    for b in (1, 2):
        ch = PROG[b - 1]
        L, R = pad_chord(CH[ch], BAR, cutoff=700 + 500 * (b - 1), att=0.6)
        music.addst(L, R, bt(b), 0.55)
        for q in range(8):
            drums.add(tick(), bt(b, q * 0.5), 0.18 if q % 2 else 0.28, pan=0.3 if q % 2 else -0.3)
    fx.add(riser(BAR * 1.0), bt(2), 0.45)

    # --- groove bars 3..14
    for b in range(3, 15):
        ch = PROG[(b - 1) % 4]
        breakdown = b == 9
        outro = b >= 13
        if outro:
            continue
        for q in range(4):
            if not breakdown:
                kick_at(bt(b, q))
            else:
                if q in (0, 2.5):
                    kick_at(bt(b, q))
            if q in (1, 3):
                drums.add(C, bt(b, q), 0.55 if not breakdown else 0.35, pan=0.05)
            drums.add(HO if not breakdown else H, bt(b, q + 0.5), 0.35, pan=0.25)
            if b >= 5 and not breakdown:
                for s16 in (0.25, 0.75):
                    drums.add(H, bt(b, q + s16), 0.22, pan=-0.3)
        # bass: offbeat 8ths + root on 1
        for e in range(8):
            if breakdown and e % 2 == 0:
                continue
            note = ROOT[ch] + (12 if e in (3, 7) else 0)
            if e % 2 == 1 or e == 0:
                music.add(bass(note, BEAT * 0.45), bt(b, e * 0.5), 0.55)
        # stabs on the "and" of 1 and 3 + pad bed
        if not breakdown:
            for pos in (0.5, 1.75, 2.5):
                music.add(stab([n + 12 for n in CH[ch][:4]]), bt(b, pos), 0.30, pan=0.15 if pos != 1.75 else -0.15)
        L, R = pad_chord(CH[ch], BAR, cutoff=1800 if not breakdown else 1100, att=0.08, rel=0.4)
        music.addst(L, R, bt(b), 0.2 if not breakdown else 0.3)
        # hook from bar 4
        if b >= 4:
            hook = HOOK_A if b % 2 == 0 else HOOK_B
            for s16, m in hook:
                if breakdown and s16 % 4:
                    continue
                music.add(pluck(m), bt(b, s16 / 4), 0.26, pan=-0.2 if s16 % 3 else 0.2)
        if b >= 10:
            for s16, m in (HOOK_A if b % 2 == 0 else HOOK_B)[::2]:
                music.add(bell(m, 0.8), bt(b, s16 / 4), 0.08, pan=0.4)
    # little fill before breakdown & before montage
    for i, pos in enumerate((3.0, 3.25, 3.5, 3.75)):
        drums.add(clap(), bt(8, pos), 0.2 + 0.1 * i)
    fx.add(riser(BAR * 0.5), bt(9, 2), 0.35)

    # --- outro (bars 13-14): big final chord + bell + tail
    kick_at(bt(13))
    drums.add(C, bt(13), 0.5)
    drums.add(HO, bt(13), 0.4)
    music.add(bass(ROOT['Am'], 1.6), bt(13), 0.6)
    L, R = pad_chord([n + 12 for n in CH['Am']], BAR * 1.6, cutoff=2600, att=0.02, rel=1.2)
    music.addst(L, R, bt(13), 0.34)
    for i, m in enumerate([69, 72, 76, 79, 81]):
        music.add(bell(m, 2.5), bt(13, i * 0.25), 0.12, pan=-0.4 + i * 0.2)
    music.add(stab([n + 12 for n in CH['Am'][:4]], 0.6), bt(13), 0.35)
    # soft final "sign-off" pluck motif on the logo
    for i, (pos, m) in enumerate([(2.0, 76), (2.5, 79), (3.0, 81)]):
        music.add(pluck(m, 0.8), bt(13, pos), 0.2)
    music.add(bell(81, 3.0), bt(14, 0), 0.1)

    # --- SFX events from the edit
    for name, at, gain, *rest in sfx_events:
        pan = rest[0] if rest else 0.0
        x = {
            'whoosh': lambda: whoosh(0.55, True),
            'whoosh_down': lambda: whoosh(0.5, False),
            'shimmer': lambda: shimmer(1.4),
            'shutter': shutter,
            'blip': lambda: blip(88),
            'blip_lo': lambda: blip(81),
            'tap': lambda: blip(96, 0.05),
            'sparkle': lambda: shimmer(0.8, 88),
        }[name]()
        fx.add(x, at, gain, pan)

    # apply sidechain + reverb sends
    music.L *= duck
    music.R *= duck
    rvL, rvR = reverb(music.L + music.R * 0.5, 2.4)
    fxL, fxR = reverb(fx.L + fx.R, 1.6)
    L = drums.L + music.L + fx.L + 0.22 * rvL + 0.15 * fxL
    R = drums.R + music.R + fx.R + 0.22 * rvR + 0.15 * fxR
    # master: gentle high-shelf-ish lift, glue saturation, limit
    L = np.tanh(L * 1.1)
    R = np.tanh(R * 1.1)
    L, R = L[:N], R[:N]
    # fades
    fo = int(SR * 1.2)
    fade = np.ones(N)
    fade[-fo:] = np.linspace(1, 0, fo) ** 1.5
    fade[: int(SR * 0.02)] = np.linspace(0, 1, int(SR * 0.02))
    L *= fade
    R *= fade
    pk = max(np.max(np.abs(L)), np.max(np.abs(R)))
    L, R = L / pk * 0.89, R / pk * 0.89
    return L, R


def write_wav(path, L, R):
    x = np.stack([L, R], 1)
    x = (np.clip(x, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(x.tobytes())


if __name__ == '__main__':
    import json
    ev = json.load(open(sys.argv[1])) if len(sys.argv) > 1 else []
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), 'score.wav')
    L, R = build(ev)
    write_wav(out, L, R)
    print('wrote', out)
