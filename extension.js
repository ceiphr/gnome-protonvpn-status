const { St, Clutter, Gio, GLib, GObject } = imports.gi;
const { panelMenu, popupMenu, main } = imports.ui;
const AggregateMenu = main.panel.statusArea.aggregateMenu;
const Lang = imports.lang;
const Mainloop = imports.mainloop;

let vpnStatusIndicator;
let vpnCurrentState;

class ProtonVPN {
	constructor() {
		this._commands = {
			connect: "sudo protonvpn connect -f",
			disconnect: "sudo protonvpn disconnect",
		};
	}

	/**
	 * Call ProtonVPN Command Line Tool to connect to the VPN Service
	 */
	connect() {
		GLib.spawn_command_line_async(this._commands.connect);
		GLib.spawn_command_line_async(
			"notify-send ProtonVPN Connecting... -i network-vpn-symbolic"
		);
	}

	/**
	 * Call ProtonVPN Command Line Tool to disconnect to the VPN Service
	 */
	disconnect() {
		GLib.spawn_command_line_async(this._commands.disconnect);
		GLib.spawn_command_line_async(
			"notify-send ProtonVPN Disconnecting... -i network-vpn-symbolic"
		);
	}

	/**
	 * Call ProtonVPN Command Line Tool to get the status of the VPN connection
	 *
	 * @returns {status: string}
	 */
	getStatus() {
		// const data = GLib.spawn_command_line_sync(this._commands.status)[1];
		// https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/5d5ca80d179ce424e3cf202f3715004654b089d5/js/ui/components/networkAgent.js#L387
		let argv = ["protonvpn", "status"]; // status checking command is "protonvpn status"
		let [
			success_,
			pid,
			stdin,
			stdout,
			stderr,
		] = GLib.spawn_async_with_pipes(
			null /* pwd */,
			argv,
			null /* envp */,
			GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD,
			null /* child_setup */
		);

		if (success_ && pid != 0) {
			this._childPid = pid;
			this._stdin = new Gio.UnixOutputStream({
				fd: stdin,
				close_fd: true,
			});
			this._stdout = new Gio.UnixInputStream({
				fd: stdout,
				close_fd: true,
			});
			GLib.close(stderr);
			this._dataStdout = new Gio.DataInputStream({
				base_stream: this._stdout,
			});
			// Waiting for an answer
			GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, function (pid) {
				GLib.spawn_close_pid(pid);
				let rawStatus = this._dataStdout.toString().trim();

				const splitStatus = rawStatus.split("\n");
				const connectionLine = splitStatus.find((line) =>
					line.includes("Status:")
				);
				vpnCurrentState = connectionLine
					? connectionLine.replace("Status:", "").trim()
					: "Loading...";
			});
		}
		return vpnCurrentState;
	}
}

const VPNStatusIndicator = GObject.registerClass(
	class VPNStatusIndicator extends panelMenu.SystemIndicator {
		_init() {
			super._init();

			// Add the indicator to the indicator bar
			this._indicator = this._addIndicator();
			this._indicator.icon_name = "network-vpn-symbolic";
			this._indicator.visible = false;

			// Build a menu

			// main item with the header section
			this._item = new popupMenu.PopupSubMenuMenuItem("ProtonVPN", true);
			this._item.icon.icon_name = "network-vpn-symbolic";
			this._item.label.clutter_text.x_expand = true;
			this.menu.addMenuItem(this._item);

			// Initiate ProtonVPN handler
			this.pvpn = new ProtonVPN();

			// Add elements to the UI
			AggregateMenu._indicators.insert_child_at_index(this.indicators, 0);
			AggregateMenu.menu.addMenuItem(this.menu, 4);
		}

		enable() {
			this._refresh();
		}

		/**
		 * Call ProtonVPN Command Line Tool to connect to the VPN Service
		 *
		 * @private
		 */
		_connect() {
			this.pvpn.connect();
		}

		/**
		 * Call ProtonVPN Command Line Tool to connect to the VPN Service
		 *
		 * @private
		 */
		_disconnect() {
			this.pvpn.disconnect();
		}

		/**
		 * Call ProtonVPN Command Line Tool to get the current status of the connection
		 *
		 * @private
		 */
		_refresh() {
			this._update(this.pvpn.getStatus());

			if (this._timeout) {
				Mainloop.source_remove(this._timeout);
				this._timeout = null;
			}
			// the refresh function will be called every 10 sec.
			this._timeout = Mainloop.timeout_add_seconds(
				10,
				Lang.bind(this, this._refresh)
			);
		}
		/**
		 * Updates the widgets based on the vpn status
		 *
		 * @param vpnStatus
		 * @private
		 */
		_update(vpnStatus) {
			// Update the panel button
			this._item.label.text = `ProtonVPN ${vpnStatus}`;

			if (vpnStatus == "Connected") {
				this._indicator.visible = true;

				if (!this._disconnectAction)
					this._disconnectAction = this._item.menu.addAction(
						"Disconnect",
						this._disconnect.bind(this)
					);

				if (this._connectAction) {
					this._connectAction.destroy();
					this._connectAction = null;
				}
			} else {
				this._indicator.visible = false;

				if (!this._connectAction)
					this._connectAction = this._item.menu.addAction(
						"Connect",
						this._connect.bind(this)
					);

				if (this._disconnectAction) {
					this._disconnectAction.destroy();
					this._disconnectAction = null;
				}
			}
		}

		destroy() {
			if (this._timeout) Mainloop.source_remove(this._timeout);
			this._timeout = undefined;
			// Call destroy on the parent
			this._indicator.destroy();
			this._item.destroy();
		}
	}
);

function init() {}

function enable() {
	// Init the indicator
	vpnStatusIndicator = new VPNStatusIndicator();
	vpnStatusIndicator.enable();
}

function disable() {
	// Remove the indicator from the panel
	vpnStatusIndicator.destroy();
	vpnStatusIndicator = null;
}
