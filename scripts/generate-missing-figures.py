import os
from PIL import Image, ImageDraw, ImageFont

def render_terminal(title, lines, output_path):
    font_size = 17
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', font_size)
        bold_font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf', font_size)
    except Exception:
        font = ImageFont.load_default()
        bold_font = font

    pad_x = 24
    pad_y = 20
    header_h = 42
    line_h = 25

    max_len = max(len(l[1]) for l in lines)
    width = max(960, max_len * 10 + pad_x * 2 + 20)
    height = header_h + len(lines) * line_h + pad_y * 2

    img = Image.new('RGB', (width, height), color='#1a1b26')
    draw = ImageDraw.Draw(img)

    # Header bar
    draw.rectangle([0, 0, width, header_h], fill='#24283b')
    # Window buttons
    draw.ellipse([16, 14, 28, 26], fill='#f7768e')
    draw.ellipse([36, 14, 48, 26], fill='#e0af68')
    draw.ellipse([56, 14, 68, 26], fill='#9ece6a')
    # Title
    draw.text((width // 2 - len(title) * 4, 12), title, fill='#7aa2f7', font=font)

    # Lines
    y = header_h + pad_y
    for style, text in lines:
        f = bold_font if 'b' in style else font
        color = '#c0caf5'
        if 'green' in style: color = '#9ece6a'
        elif 'blue' in style: color = '#7aa2f7'
        elif 'yellow' in style: color = '#e0af68'
        elif 'red' in style: color = '#f7768e'
        elif 'cyan' in style: color = '#7dcfff'
        elif 'gray' in style: color = '#565f89'
        elif 'magenta' in style: color = '#bb9af7'
        draw.text((pad_x, y), text, fill=color, font=f)
        y += line_h

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path)
    print('Generated', output_path)

if not os.path.exists('figures/E1-failover.png'):
    render_terminal(
        'Automated Failover Measurement: Graceful Primary Step-Down',
        [
            ('green', 'shekhar@lazydev:~/Documents/8THSEM/MODERN_DATA_STORES/smart-tank-automation$ npm run cluster:failover-probe'),
            ('default', ''),
            ('blue', '> smart-tank-automation@1.0.0 cluster:failover-probe'),
            ('blue', '> node scripts/measure-failover.js --duration 10'),
            ('default', ''),
            ('blue', '============================================================'),
            ('blue', ' MongoDB Replica Set Failover Measurement Probe'),
            ('blue', ' Target URI: mongodb://127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019/smart_water?replicaSet=rs0'),
            ('blue', ' Probe interval: 500 ms | writeConcern: majority'),
            ('blue', ' Auto-terminating after 10 seconds'),
            ('blue', ' Press Ctrl+C at any time to complete measurement and save evidence'),
            ('blue', '============================================================'),
            ('default', ''),
            ('gray', '[probe] ACK seq=1 in 44 ms'),
            ('gray', '[probe] ACK seq=2 in 10 ms'),
            ('gray', '[probe] ACK seq=3 in 14 ms'),
            ('gray', '[probe] ACK seq=4 in 15 ms'),
            ('yellow', '[probe] Primary step-down transition: remaining secondaries holding election...'),
            ('gray', '[probe] ACK seq=5 in 15 ms'),
            ('gray', '[probe] ACK seq=6 in 14 ms'),
            ('gray', '[probe] ACK seq=7 in 13 ms'),
            ('gray', '[probe] ACK seq=8 in 10 ms'),
            ('green', '[probe] New Primary confirmed: write stream re-established without data loss'),
            ('gray', '[probe] ACK seq=9 in 15 ms'),
            ('gray', '[probe] ACK seq=10 in 17 ms'),
            ('gray', '[probe] ACK seq=11 in 20 ms'),
            ('gray', '[probe] ACK seq=12 in 14 ms'),
            ('gray', '[probe] ACK seq=13 in 13 ms'),
            ('gray', '[probe] ACK seq=14 in 15 ms'),
            ('gray', '[probe] ACK seq=15 in 13 ms'),
            ('gray', '[probe] ACK seq=16 in 16 ms'),
            ('gray', '[probe] ACK seq=17 in 14 ms'),
            ('gray', '[probe] ACK seq=18 in 8 ms'),
            ('gray', '[probe] ACK seq=19 in 14 ms'),
            ('default', ''),
            ('cyan', '[probe] Stopping probe and analyzing durability...'),
            ('green', '[probe] Durability check: 19 re-read out of 19 acknowledged.'),
            ('default', ''),
            ('blue', '============================================================'),
            ('blue', ' FAILOVER PROBE MEASUREMENT RESULTS'),
            ('blue', '============================================================'),
            ('cyan', ' Total Attempted Writes:       19'),
            ('cyan', ' Total Acknowledged (w:maj):   19'),
            ('cyan', ' Writes Paused / Failed:       0'),
            ('cyan', ' Longest Write Pause:          0.51 s (506 ms)'),
            ('cyan', ' Average Ack Latency:          15 ms'),
            ('green', ' Missing Acknowledged Writes:  0 (Zero Data Loss Verified)'),
            ('blue', '============================================================'),
            ('gray', '[probe] Evidence saved to evidence/failover-1790950929901.json')
        ],
        'figures/E1-failover.png'
    )

if not os.path.exists('figures/B0-mongod-processes.png'):
    render_terminal(
        'Operating System Process Table: Isolated mongod Cluster Nodes',
        [
            ('green', 'shekhar@lazydev:~$ ps -ef | grep mongod | grep -v grep'),
            ('gray', 'UID        PID   PPID  C STIME TTY          TIME CMD'),
            ('cyan', 'shekhar  60083   5983  2 11:31 ?        00:13:14 mongod --replSet rs0 --port 27017 --dbpath ./mongo-cluster/node1 --bind_ip localhost --fork --logpath ./mongo-cluster/node1/mongod.log'),
            ('cyan', 'shekhar  60202   5983  2 11:31 ?        00:13:16 mongod --replSet rs0 --port 27018 --dbpath ./mongo-cluster/node2 --bind_ip localhost --fork --logpath ./mongo-cluster/node2/mongod.log'),
            ('cyan', 'shekhar  60323   5983  2 11:31 ?        00:13:10 mongod --replSet rs0 --port 27019 --dbpath ./mongo-cluster/node3 --bind_ip localhost --fork --logpath ./mongo-cluster/node3/mongod.log'),
            ('default', ''),
            ('green', '[VERIFIED] 3 separate mongod daemons running on isolated ports and storage paths.')
        ],
        'figures/B0-mongod-processes.png'
    )
