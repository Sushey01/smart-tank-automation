# Design research

Notes taken before the tank-only UI, from water-tank products and from the browser and Telegram rules used for alarms.

## Sources consulted

- MyTank, Telemetry2U, SIOTA, Watmonitor, and TankLens: fill percent and litres together, a rising or falling indication, threshold marks, and a history chart.
- Node-RED water-tank gauge and Grafana stat panels: one vessel, numeric value, and threshold bands.
- Home Assistant Lovelace: rounded cards, icon plus state name, sparkline, theme toggle.
- Chrome autoplay policy and MDN autoplay guide: an `AudioContext` stays suspended until a user gesture, so an alarm button has to run `resume()` inside the click.
- Telegram Bot API `sendMessage`: HTTPS POST to `https://api.telegram.org/bot<token>/sendMessage` with `chat_id` and `text`. The token is a secret.

## Patterns adopted

1. **One glanceable tank.** Percent, litres, trend word (rising, falling, or steady), and a time estimate. The vessel shows 25% and 85% marks.
2. **Status is icon + text + colour.** Online, offline, overflow, and dry-run each have a label.
3. **History answers “how long”.** A minute or hour chart, last-hour min and max, litres per hour, and CSV of the table the operator is looking at.
4. **Last seen and RSSI.** A quiet sensor is visible without adding another device.
5. **Cluster page.** Three node cards, 2 s poll, banner when the primary name changes.
6. **Empty, loading, and error on every view.** If the API process is down, the message names `npm run server`.
7. **Siren after a click.** Arming creates or resumes the audio context. The sound is a two-tone sweep from an oscillator, with no audio file. Silence stops it. Disarmed is the safe default on a new browser profile until the operator opts in; the choice is remembered in `localStorage`, and the next visit still needs a click before sound can start.
8. **One Telegram message per transition.** Overflow or dry-run sends once when it starts and once when it clears, so a 3-second publish loop does not flood the chat.

## Patterns rejected

- Remote pump or valve commands. Actuator strings stay display-only.
- Water-quality probes, flow meters, CCTV, and weather. They are other products.
- Climate and power cards. This build is one tank.
- An MP3 siren hosted on a CDN. A synthesised tone needs no asset and still respects autoplay.
- Putting the bot token in the React bundle. Telegram is called only from the Node process.
