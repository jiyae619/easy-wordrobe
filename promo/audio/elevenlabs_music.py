"""Optional: generate the promo's music bed with ElevenLabs Music instead of the synthesised score.

    ELEVENLABS_API_KEY=... python3 elevenlabs_music.py elevenlabs_score.mp3

The prompt is written against the edit's beat map (120 BPM, drop at 4.0 s, breakdown 16-18 s,
final hit at 26 s) so the cuts stay on the beat. Then swap it in when muxing (see ../README.md).
Endpoint and fields follow ElevenLabs' Music API (POST /v1/music); check their current docs if
the request is rejected.
"""
import json, os, sys, urllib.request

PROMPT = (
    "30-second upbeat fashion-tech commercial track, 120 BPM, A minor, clean modern house. "
    "0-4s: soft filtered pads and a ticking clock-like hi-hat, sleepy and hushed, with a white-noise "
    "riser building into a drop exactly at 4.0 seconds. 4-16s: confident four-on-the-floor kick, "
    "claps on 2 and 4, pumping side-chained bass, bright plucked synth hook, chord stabs, "
    "playful and optimistic. 16-18s: short half-time breakdown with no kick, then a quick riser. "
    "18-26s: full energy again with a glassy bell top line. 26s: one big final chord hit that rings "
    "out and fades by 30s. No vocals."
)


def main(out):
    key = os.environ.get('ELEVENLABS_API_KEY')
    if not key:
        sys.exit('Set ELEVENLABS_API_KEY')
    body = json.dumps({'prompt': PROMPT, 'music_length_ms': 30000}).encode()
    req = urllib.request.Request('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_192', data=body,
                                 headers={'xi-api-key': key, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=300) as r, open(out, 'wb') as f:
        f.write(r.read())
    print('wrote', out)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'elevenlabs_score.mp3')
