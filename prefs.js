'use strict';

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();


function init() {
}

function buildPrefsWidget() {

    // Copy the same GSettings code from `extension.js`
    let gschema = Gio.SettingsSchemaSource.new_from_directory(
        Me.dir.get_child('schemas').get_path(),
        Gio.SettingsSchemaSource.get_default(),
        false
    );

    this.settings = new Gio.Settings({
        settings_schema: gschema.lookup('org.gnome.shell.extensions.protonvpn-status', true)
    });

    // Create a parent widget that we'll return from this function
    let prefsWidget = new Gtk.Grid({
        margin: 18,
        column_spacing: 12,
        row_spacing: 12,
        visible: true
    });

    // Add a simple title and add it to the prefsWidget
    let title = new Gtk.Label({
        // As described in "Extension Translations", the following template
        // lit
        // prefs.js:88: warning: RegExp literal terminated too early
        //label: `<b>${Me.metadata.name} Extension Preferences</b>`,
        label: '<b>' + Me.metadata.name + ' Extension Preferences</b>',
        halign: Gtk.Align.START,
        use_markup: true,
        visible: true
    });
    prefsWidget.attach(title, 0, 0, 2, 1);

    // Create a label to describe our button and add it to the prefsWidget
    let buttonLabel = new Gtk.Label({
        label: 'Reset Panel Items:',
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(buttonLabel, 0, 1, 1, 1);

    // Create a 'Reset' button and add it to the prefsWidget
    let button = new Gtk.Button({
        label: 'Reset Panel',
        visible: true
    });
    prefsWidget.attach(button, 1, 1, 1, 1);

    // Connect the ::clicked signal to reset the stored settings
    button.connect('clicked', (button) => this.settings.reset('panel-states'));

    // Create a label & switch for `show-indicator`
    let toggleLabel = new Gtk.Label({
        label: 'Start ProtonVPN on boot:',
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(toggleLabel, 0, 2, 1, 1);

    let auto_start_on_login = new Gtk.Switch({
        active: this.settings.get_boolean ('auto-start-on-login'),
        halign: Gtk.Align.END,
        visible: true
    });
    prefsWidget.attach(auto_start_on_login, 1, 2, 1, 1);

    // Bind the switch to the `show-indicator` key
    this.settings.bind(
        'auto-start-on-login',
        auto_start_on_login,
        'active',
        Gio.SettingsBindFlags.DEFAULT
    );

    // Return our widget which will be added to the window
    return prefsWidget;
}