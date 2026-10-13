// SPDX-License-Identifier: GPL-2.0-or-later

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {QuickToggle, SystemIndicator} from 'resource:///org/gnome/shell/ui/quickSettings.js';

// Loaded at runtime through pipewire-pulse (or PulseAudio), so it can be unloaded again.
const RUNTIME_MODULE = 'module-raop-discover';
// Loaded by the PipeWire daemon from its config (Fedora's pipewire-config-raop does this).
// It cannot be unloaded via pactl.
const DAEMON_MODULE = 'libpipewire-module-raop-discover';

function run(argv) {
    return new Promise((resolve, reject) => {
        const proc = Gio.Subprocess.new(argv,
            Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);
        proc.communicate_utf8_async(null, null, (p, res) => {
            try {
                const [, stdout, stderr] = p.communicate_utf8_finish(res);
                if (p.get_successful())
                    resolve(stdout);
                else
                    reject(new Error(stderr.trim() || `${argv.join(' ')} failed`));
            } catch (e) {
                reject(e);
            }
        });
    });
}

async function loadedModules() {
    const out = await run(['pactl', 'list', 'modules', 'short']);
    const names = out.split('\n').map(l => l.split('\t')[1]);
    return {
        runtime: names.includes(RUNTIME_MODULE),
        daemon: names.includes(DAEMON_MODULE),
    };
}

const AirPlayToggle = GObject.registerClass(
class AirPlayToggle extends QuickToggle {
    constructor() {
        super({title: 'AirPlay', iconName: 'audio-speakers-symbolic', toggleMode: true});
        this._busy = false;
        this._destroyed = false;
        this.connect('destroy', () => (this._destroyed = true));
        this.connect('clicked', () => this._apply(this.checked));
        this._sync();
    }

    async _sync() {
        if (!GLib.find_program_in_path('pactl')) {
            this.checked = false;
            this.subtitle = 'pactl not found';
            return null;
        }
        try {
            const state = await loadedModules();
            if (this._destroyed)
                return null;
            this.checked = state.runtime || state.daemon;
            this.subtitle = state.daemon ? 'Always on (PipeWire config)' : null;
            return state;
        } catch (e) {
            console.error(`AirPlay Toggle: ${e.message}`);
            return null;
        }
    }

    async _apply(enable) {
        if (this._busy)
            return;
        this._busy = true;
        try {
            const state = await loadedModules();
            if (enable && !state.runtime && !state.daemon)
                await run(['pactl', 'load-module', RUNTIME_MODULE]);
            else if (!enable && state.runtime)
                await run(['pactl', 'unload-module', RUNTIME_MODULE]);

            if (!enable && state.daemon) {
                Main.notify('AirPlay Toggle',
                    'AirPlay discovery is loaded by your PipeWire configuration and cannot be ' +
                    'turned off at runtime. Set module.raop = false in ' +
                    '~/.config/pipewire/pipewire.conf.d/ (see the extension README).');
            }
        } catch (e) {
            Main.notifyError('AirPlay Toggle', e.message);
        } finally {
            this._busy = false;
            if (!this._destroyed)
                await this._sync();
        }
    }
});

const Indicator = GObject.registerClass(
class Indicator extends SystemIndicator {
    constructor() {
        super();
        this.quickSettingsItems.push(new AirPlayToggle());
    }
});

export default class AirPlayToggleExtension extends Extension {
    enable() {
        this._indicator = new Indicator();
        Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicator);
    }

    disable() {
        this._indicator.quickSettingsItems.forEach(i => i.destroy());
        this._indicator.destroy();
        this._indicator = null;
    }
}
