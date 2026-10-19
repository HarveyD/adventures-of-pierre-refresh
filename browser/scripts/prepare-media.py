"""Derive browser media without modifying the surviving school project assets."""
import argparse
import hashlib
import json
import shutil
import subprocess
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / 'Harvey Java'
OUT = ROOT / 'public/assets/derived'
GIFS = {
    'player-idle': 'Pierre standing still.gif',
    'player-run-right': 'Pierre running right.gif',
    'player-run-left': 'pierre running left.gif',
    'player-fall-right': 'falling to the right.gif',
    'player-fall-left': 'falling to the left.gif',
    'player-wall-right': 'on right wall.gif',
    'player-wall-left': 'on left wall.gif',
    'player-death': 'death animation.gif',
}
TRACKS = {
    'training': 'training level.wav', 'egypt': 'egyptian level.wav',
    'snow': 'snow level.wav', 'moon': 'moon level.wav',
}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--ffmpeg', default=shutil.which('ffmpeg'))
    parser.add_argument('--images-only', action='store_true')
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {'animations': {}, 'audio': {}, 'sources': {}}
    for key, filename in GIFS.items():
        source = SOURCE / filename
        gif = Image.open(source)
        # Pillow seek composes frames using GIF offsets, transparency, and disposal.
        frames, durations = [], []
        loop = gif.info.get('loop')
        for index in range(gif.n_frames):
            gif.seek(index)
            frames.append(gif.convert('RGBA').copy())
            durations.append(max(20, gif.info.get('duration', 100)))
        width, height = gif.size
        sheet = Image.new('RGBA', (width * len(frames), height))
        for index, frame in enumerate(frames):
            sheet.paste(frame, (index * width, 0))
        sheet.save(OUT / f'{key}.png', optimize=True)
        manifest['animations'][key] = {
            'file': f'{key}.png', 'width': width, 'height': height,
            'durations': durations, 'loop': loop, 'source': filename,
        }
        manifest['sources'][filename] = hashlib.sha256(source.read_bytes()).hexdigest()
    if not args.images_only:
        if not args.ffmpeg:
            parser.error('Provide --ffmpeg /path/to/ffmpeg for audio conversion.')
        for key, filename in TRACKS.items():
            source = SOURCE / filename
            for ext, codec in [('mp3', 'libmp3lame'), ('ogg', 'libvorbis')]:
                subprocess.run([
                    args.ffmpeg, '-v', 'error', '-y', '-i', str(source),
                    '-map_metadata', '-1', '-ar', '44100', '-ac', '2',
                    '-codec:a', codec, '-b:a', '96k', str(OUT / f'{key}.{ext}'),
                ], check=True)
            manifest['audio'][key] = {'files': [f'{key}.mp3', f'{key}.ogg'], 'source': filename}
            manifest['sources'][filename] = hashlib.sha256(source.read_bytes()).hexdigest()
    else:
        previous = OUT / 'media.json'
        if previous.exists():
            old = json.loads(previous.read_text())
            manifest['audio'] = old.get('audio', {})
            manifest['sources'].update(old.get('sources', {}))
    (OUT / 'media.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(f'Prepared {len(GIFS)} animations and {len(manifest["audio"])} tracks in {OUT}')


if __name__ == '__main__':
    main()
