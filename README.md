# AirPlay Toggle

A GNOME Shell extension that adds an **AirPlay** button to Quick Settings, so AirPlay (RAOP) speakers only show up in your sound output list when you actually want them.

## Why this exists

PipeWire can discover AirPlay speakers on your network, such as AV receivers, smart speakers, Apple TVs and Macs, and add them as ordinary audio outputs. Fedora turns this on by default (through the `pipewire-config-raop` package), so every AirPlay device on your Wi-Fi shows up as a sound output.

That becomes a problem whenever your current output disappears. When a monitor with HDMI or DisplayPort audio goes to sleep, its audio output vanishes, and WirePlumber moves your audio to the next available output. That can be the AV receiver in the living room. AirPlay sinks start at **100% volume**, so the receiver wakes up and the next notification sound comes through it at full volume.

There is no "never fall back to this device" setting, so the reliable fix is to keep AirPlay discovery off until you need it. This extension makes that a single click:

- **Off** (the default after each login): no AirPlay outputs exist, so audio can't fall back to them.
- **On**: PipeWire discovers AirPlay speakers and you can pick one in the sound settings as usual.

The button loads and unloads PipeWire's `module-raop-discover` at runtime with `pactl`. Nothing is restarted, and other audio is not interrupted.

## Requirements

- GNOME Shell 45 or later
- PipeWire with `pipewire-pulse` (or PulseAudio with its RAOP/zeroconf modules)
- `pactl`
- The PipeWire RAOP module and a running Avahi daemon (`avahi-daemon`) for discovery

| Distro | AirPlay on by default? | Packages needed for the toggle to work |
|---|---|---|
| Fedora | **Yes** (`pipewire-config-raop`), so do step 1 below | everything is installed by default |
| Arch | No | `pipewire-pulse`, `pipewire-zeroconf`, `libpulse` (pactl), `avahi` with `avahi-daemon` running |
| Debian / Ubuntu | No | `pipewire-pulse`, `libpipewire-0.3-modules`, `pulseaudio-utils` (pactl), `avahi-daemon` |

## Installation

### 1. Turn off always-on discovery (Fedora, or any setup that loads RAOP from PipeWire config)

If AirPlay speakers appear even though you never enabled them, PipeWire's configuration loads discovery at startup, and the extension can't unload that. In that case the toggle shows the subtitle *"Always on (PipeWire config)"*. To turn it off:

```sh
mkdir -p ~/.config/pipewire/pipewire.conf.d
cp extras/50-raop.conf ~/.config/pipewire/pipewire.conf.d/
systemctl --user restart pipewire pipewire-pulse wireplumber
```

On Fedora you can also run `sudo dnf remove pipewire-config-raop`.

### 2. Install the extension

From [extensions.gnome.org](https://extensions.gnome.org/) (once published), or from source:

```sh
make install
# log out and back in (required on Wayland), then:
gnome-extensions enable airplay-toggle@ekorre.hr
```

## Caveats

- The toggle always starts **off** after you log in or restart PipeWire. That is deliberate, because off is the safe state.
- While AirPlay is **on**, the fallback problem can still happen. Turn it off when you're done.

## Building a release

```sh
make pack   # → airplay-toggle@ekorre.hr.shell-extension.zip, ready to upload to extensions.gnome.org
```

## License

GPL-2.0-or-later. See [LICENSE](LICENSE).
