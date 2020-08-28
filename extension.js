/**
 * A GNOME extension for controlling and monitoring your ProtonVPN connection.
 *
 * Written in JavaScript. This extension requires GJS, GLib, Gio and all other imports
 * listed below to function properly.
 *
 * @link   https://github.com/ceiphr/gse-protonvpn-status
 * @author Ari Birnbaum (ceiphr).
 */

const { St, Clutter, Gio, GLib, GObject } = imports.gi;
const { panelMenu, popupMenu, main, messageTray } = imports.ui;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const AggregateMenu = main.panel.statusArea.aggregateMenu;

let vpnStatusIndicator;

/**
 * u/ndhlms recommended using a Gio.Subprocess for handling commands
 * and getting the command result without halting GNOME's main thread.
 *
 * https://andyholmes.github.io/articles/subprocesses-in-gjs.html
 *
 * If we issued the ProtonVPN status command without a Gio.Subprocess,
 * we would need to wait until we got a response. The status command takes
 * roughly ~1 seconds to respond which means GNOME would freeze for one second
 * every time getStatus() is called. Running a Gio.Subprocess to handle this
 * command and returning a Promise solves this problem.
 *
 * @param {Array} 	argv		Command to be run in a Gio.Subprocess
 * @param {*} 		input
 * @param {*} 		cancellable
 */
function execCommunicate(argv, input = null, cancellable = null) {
	let flags =
		Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE;

	let proc = Gio.Subprocess.new(argv, flags);

	return new Promise((resolve, reject) => {
		proc.communicate_utf8_async(input, null, (proc, res) => {
			try {
				let [, stdout, stderr] = proc.communicate_utf8_finish(res);
				let status = proc.get_exit_status();

				if (status !== 0) {
					throw new Gio.IOErrorEnum({
						code: Gio.io_error_from_errno(status),
						message: stderr ? stderr.trim() : GLib.strerror(status),
					});
				}

				resolve(stdout.trim());
			} catch (e) {
				reject(e);
			}
		});
	});
}

/**
 * Get Settings
 * https://youtu.be/OM_Wli15oCc
 */
function getSettings() {
	let GioSSS = Gio.SettingsSchemaSource;
	let schemaSource = GioSSS.new_from_directory(
		Extension.dir.get_child("schemas").get_path(),
		GioSSS.get_default(),
		false
	);
	let schemaObj = schemaSource.lookup(
		"org.gnome.shell.extensions.protonvpn-status",
		true
	);

	if (!schemaObj) {
		throw new Error("ProtonVPN Status can't find schemas.");
	}

	return new Gio.Settings({ settings_schema: schemaObj });
}

/**
 * Custom implementation of gnome-shell's
 * notify for notifying the user of errors.
 *
 * @param {String} msg		The title of the notification
 * @param {String} details	The body of the notification
 */
function errorNotify(msg, details) {
	let source = new messageTray.Source(
		"ProtonVPN Status",
		"dialog-error-symbolic"
	);

	main.messageTray.add(source);
	let notification = new messageTray.Notification(source, msg, details);
	notification.setTransient(true);
	source.notify(notification);
}

/**
 * Custom implementation of gnome-shell's
 * notify for VPN connectivity notifications.
 *
 * @param {String} msg		The title of the notification
 * @param {String} details	The body of the notification
 */
function notify(msg, details) {
	let source = new messageTray.Source(
		"ProtonVPN Status",
		"network-vpn-symbolic"
	);

	// Overrides the use of "network-vpn-symbolic" so notif.svg is used instead.
	source.createIcon = function (size) {
		let gicon = Gio.icon_new_for_string(Extension.path + "/notif.svg");
		return new St.Icon({ gicon: gicon, icon_size: size });
	};

	main.messageTray.add(source);
	let notification = new messageTray.Notification(source, msg, details);
	notification.setTransient(true);
	source.notify(notification);
}

class ProtonVPN {
	constructor() {
		this._commands = {
			// Waiting for new release of the ProtonVPN linux-cli client to use this.
			// connect: "pkexec protonvpn connect -f",
			// disconnect: "pkexec protonvpn disconnect",

			// Extension can run sudo commands if the following guide is used as a work around
			// https://github.com/ProtonVPN/linux-cli/blob/master/USAGE.md#disable-sudo-password-query
			connect: "sudo protonvpn connect -f", // -f tells the linux-cli client to use the fastest server
			disconnect: "sudo protonvpn disconnect",
		};
	}

	/**
	 * Call the linux-cli client to connect.
	 */
	connect() {
		let success = GLib.spawn_command_line_async(this._commands.connect);

		if (success) {
			vpnStatusIndicator.update("Connecting");
			notify("ProtonVPN", "Connecting...");
		} else {
			logError(new Error("Invalid result of ProtonVPN connect."));
			errorNotify(
				"ProtonVPN Status Extension",
				"Unknown ProtonVPN response. \nIs ProtonVPN installed? Can \
				this extension issue commands to ProtonVPN?"
			);
			vpnStatusIndicator.update("Disconnected");
		}
	}

	/**
	 * Call the linux-cli client to disconnect.
	 */
	disconnect() {
		let success = GLib.spawn_command_line_async(this._commands.disconnect);

		if (success) {
			vpnStatusIndicator.update("Disconnecting");
			notify("ProtonVPN", "Disconnecting...");
		} else {
			logError(new Error("Invalid result of ProtonVPN disconnect."));
			errorNotify(
				"ProtonVPN Status Extension",
				"Unknown ProtonVPN response. \nIs ProtonVPN installed? Can \
				this extension issue commands to ProtonVPN?"
			);
			vpnStatusIndicator.update("Disconnected");
		}
	}

	/**
	 * Call the linux-cli client to get the status of the VPN connection.
	 * Either the current status from the linux-cli client is returned or "Waiting" is returned.
	 *
	 * "Waiting" means the client gave an unexpected response, so we'll wait until the next _refresh()
	 * call to see if the client will give an expected response.
	 *
	 * @returns {String}	Current status of VPN connection or "Waiting"
	 */
	getStatus() {
		// status checking command is "protonvpn status," sudo isn't required
		let argv = ["protonvpn", "status"];

		execCommunicate(argv)
			.then((result) => {
				let rawStatus = result.toString().trim();

				const splitStatus = rawStatus.split("\n");
				const connectionLine = splitStatus.find((line) =>
					line.includes("Status:")
				);
				this._vpnCurrentState = connectionLine
					? connectionLine.replace("Status:", "").trim()
					: "Waiting";

				vpnStatusIndicator.update(this._vpnCurrentState);
			})
			.catch((e) => {
				logError(
					new Error(
						`Unknown ProtonVPN status: ${e}. 
						Is ProtonVPN installed? 
						Can this extension issue commands to ProtonVPN?`
					)
				);
			});
	}
}

const VPNStatusIndicator = GObject.registerClass(
	class VPNStatusIndicator extends panelMenu.SystemIndicator {
		/**
		 * Initialize the extension.
		 *
		 * Create the indicator (the VPN icon in the status bar). Create the menu
		 * item that allows you to connect/disconnect from ProtonVPN. Add these two new
		 * elements to GNOME's user interface.
		 */
		_init() {
			super._init();

			this.settings = getSettings();

			// Add the indicator to the indicator bar
			this._indicator = this._addIndicator();
			this._indicator.icon_name = "network-vpn-symbolic";
			this._indicator.visible = false;

			// Build a menu

			// Menu item with the header section
			this._item = new popupMenu.PopupSubMenuMenuItem("ProtonVPN", true);
			this._item.icon.icon_name = "network-vpn-symbolic";
			this._item.label.clutter_text.x_expand = true;
			this.menu.addMenuItem(this._item);

			// Initiate ProtonVPN handler
			this.pvpn = new ProtonVPN();

			// Add elements to the UI
			AggregateMenu._indicators.insert_child_at_index(this.indicators, 0);
			AggregateMenu.menu.addMenuItem(this.menu, 4);
			this._connectItem = this._item.menu.addAction(
				"Connect",
				this._toggleConnection.bind(this)
			);
		}

		/**
		 * Start the extension's _refresh loop for
		 * checking the VPN connection status.
		 */
		enable() {
			this._refresh();
		}

		/**
		 * Determine whether to connect or disconnect based on
		 * _connectItem's current label.
		 *
		 * @private
		 */
		_toggleConnection() {
			if (this._connectItem.label.text == "Connect") this._connect();
			else if (this._connectItem.label.text == "Disconnect")
				this._disconnect();
		}

		/**
		 * Call the linux-cli client to connect.
		 *
		 * @private
		 */
		_connect() {
			this.pvpn.connect();
		}

		/**
		 * Call the linux-cli client to disconnect.
		 *
		 * @private
		 */
		_disconnect() {
			this.pvpn.disconnect();
		}

		/**
		 * Call the linux-cli client to get the status of the VPN connection.
		 * Refreshes every 20 seconds to update the status information.
		 *
		 * @private
		 */
		_refresh() {
			this.pvpn.getStatus();

			if (this._timeout) {
				Mainloop.source_remove(this._timeout);
				this._timeout = null;
			}

			// the refresh function will be called every 20 sec.
			this._timeout = Mainloop.timeout_add_seconds(
				this.settings.get_int("status-refresh-rate"),
				Lang.bind(this, this._refresh)
			);
		}

		/**
		 * Update the user interface elements we've created in _init()
		 * based on the vpnStatus string.
		 *
		 * @param {String} vpnStatus		Current status of your ProtonVPN connection
		 */
		update(vpnStatus) {
			// Update the panel button
			this._item.label.text = `ProtonVPN ${vpnStatus}`;

			// u/Rafostar suggested cleaning up this section with a switch statement and white space
			// https://www.reddit.com/r/gnome/comments/gshaj5/a_gnome_extension_for_handling_the_protonvpn_cli/fs70mvx?utm_source=share&utm_medium=web2x
			switch (vpnStatus) {
				case "Connected":
					this._indicator.icon_name = "network-vpn-symbolic";
					this._indicator.visible = true;
					this._connectItem.label.text = "Disconnect";
					break;
				// Transition states
				case "Connecting":
				case "Disconnecting":
				case "Waiting":
					this._indicator.icon_name =
						"network-vpn-acquiring-symbolic";
					this._indicator.visible = true;
					this._connectItem.label.text = vpnStatus;
					break;
				case "Disconnected":
					this._indicator.visible = false;
					this._connectItem.label.text = "Connect";
					break;
				default:
					logError(
						new Error(
							`Unknown ProtonVPN status: ${vpnStatus}. 
							Is ProtonVPN installed? 
							Can this extension issue commands to ProtonVPN?`
						)
					);
					break;
			}
		}

		/**
		 * Remove the extension's _refresh loop. Remove the indicator from
		 * the status bar. Destroy all elements created in _init() and
		 * set them to null.
		 */
		destroy() {
			if (this._timeout) Mainloop.source_remove(this._timeout);
			this._timeout = undefined;

			AggregateMenu._indicators.remove_actor(this.indicators);
			this._indicator.destroy();
			this._indicator = null;

			this._item.destroy();
			this._item = null;
		}
	}
);

function init() {}

/**
 * Initialize the VPN status indicator
 */
function enable() {
	vpnStatusIndicator = new VPNStatusIndicator();
	vpnStatusIndicator.enable();
}

/**
 * Remove the indicator from the panel and user menu.
 * Destroys extension's elements and refresh loop.
 */
function disable() {
	vpnStatusIndicator.destroy();
	vpnStatusIndicator = null;
}
